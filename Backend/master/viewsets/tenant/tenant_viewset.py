import hashlib

from django.db import connections
from rest_framework import status
from rest_framework.generics import GenericAPIView
from rest_framework.response import Response

from master.apps.tenant.tenantmodel import TenantBranch, TenantCompany
from master.apps.user.usermodel import UserCreation
from master.apps.user_type.usertypemodel import UserType
from master.serializers.tenant import TenantBranchSerializer, TenantCompanySerializer
from master.tenant import first_non_empty, request_company_id
from master.tenant_db import provision_company_database, tenant_database_name, use_company_database


def normalize_company_code(value):
    return str(value or "").strip().upper().replace(" ", "-")


def product_owner_only(request):
    user = getattr(request, "user", None)
    if not getattr(user, "is_authenticated", False):
        return Response({"status": 0, "msg": "unauthorized", "detail": "Authentication required."}, status=status.HTTP_401_UNAUTHORIZED)
    role_id = str(getattr(user, "user_type_unique_id", "") or "").strip().lower()
    try:
        role_name = (
            UserType.objects.filter(unique_id=getattr(user, "user_type_unique_id", ""), is_delete=0)
            .values_list("user_type", flat=True)
            .first()
            or ""
        )
    except Exception:
        role_name = ""
    normalized_role = "".join(ch for ch in str(role_name or role_id).strip().lower() if ch.isalnum() or ch == "_")
    if normalized_role not in {"product_owner", "productowner"}:
        return Response({"status": 0, "msg": "forbidden", "detail": "Only product owner can manage tenants."}, status=status.HTTP_403_FORBIDDEN)
    return None


def owner_password_matches(user, password):
    raw_password = str(password or "")
    if not raw_password:
        return False
    stored_password = str(getattr(user, "password", "") or "")
    stored_hash = str(getattr(user, "en_password", "") or "")
    return raw_password == stored_password or hashlib.md5(raw_password.encode()).hexdigest() == stored_hash


def use_master_unique_validators(serializer):
    for field in serializer.fields.values():
        for validator in getattr(field, "validators", []):
            queryset = getattr(validator, "queryset", None)
            if queryset is not None:
                validator.queryset = queryset.using("master")


def tenant_admin_user_payload(company):
    try:
        with use_company_database(company):
            qs = UserCreation.objects.filter(sess_company_id=company.unique_id, is_delete=0)
            admin_type = UserType.objects.filter(user_type__iexact="SuperAdmin", is_delete=0).order_by("s_no").first()
            if admin_type:
                user = qs.filter(user_type_unique_id=admin_type.unique_id).order_by("s_no").first()
            else:
                user = None
            if not user:
                user = qs.filter(staff_id__iexact=f"{company.company_code}-ADMIN").order_by("s_no").first()
            if not user:
                user = qs.order_by("s_no").first()
            if not user:
                return None
            return {
                "unique_id": user.unique_id,
                "name": user.staff_name,
                "staff_id": user.staff_id,
                "username": user.user_name,
                "password": user.password,
                "email": user.email_id,
                "mobile": user.mobile_no,
            }
    except Exception:
        return None


DEFAULT_SETUP_SOURCE_COMPANY_ID = "comp5fa3b1c2a3bab70290"
SETUP_TABLES = [
    "user_screen_main",
    "user_screen_sections",
    "user_screen_actions",
    "user_screen",
    "user_type",
]


def sql_quote(value):
    return "'" + str(value).replace("\\", "\\\\").replace("'", "''") + "'"


def table_columns(cursor, db_name, table_name):
    cursor.execute(f"SHOW COLUMNS FROM `{db_name}`.`{table_name}`")
    return [row[0] for row in cursor.fetchall()]


def clone_setup_table(cursor, source_db, target_db, table_name, source_company_id, target_company_id):
    columns = [
        column
        for column in table_columns(cursor, source_db, table_name)
        if column not in {"s_no", "created", "updated", "created_at", "updated_at"}
    ]
    target_columns = set(table_columns(cursor, target_db, table_name))
    columns = [column for column in columns if column in target_columns]
    if not columns:
        return 0

    insert_columns = ", ".join(f"`{column}`" for column in columns)
    select_columns = []
    for column in columns:
        if column == "sess_company_id":
            select_columns.append(f"{sql_quote(target_company_id)} AS `{column}`")
        else:
            select_columns.append(f"`src`.`{column}`")

    source_filter = "COALESCE(`src`.`is_delete`, 0) = 0"
    if "sess_company_id" in columns:
        source_filter += f" AND COALESCE(`src`.`sess_company_id`, '') IN ('', {sql_quote(source_company_id)})"

    duplicate_filter = ""
    if "unique_id" in columns:
        duplicate_filter = (
            f" AND NOT EXISTS ("
            f"SELECT 1 FROM `{target_db}`.`{table_name}` `dst` "
            f"WHERE `dst`.`unique_id` = `src`.`unique_id`"
            f")"
        )

    sql = f"""
        INSERT INTO `{target_db}`.`{table_name}` ({insert_columns})
        SELECT {", ".join(select_columns)}
        FROM `{source_db}`.`{table_name}` `src`
        WHERE {source_filter}
        {duplicate_filter}
    """
    cursor.execute(sql)
    return cursor.rowcount


def clone_permissions(cursor, source_db, target_db, source_company_id, target_company_id):
    table_name = "user_screen_permission"
    columns = [
        column
        for column in table_columns(cursor, source_db, table_name)
        if column not in {"s_no", "created", "updated", "created_at", "updated_at"}
    ]
    target_columns = set(table_columns(cursor, target_db, table_name))
    columns = [column for column in columns if column in target_columns]
    if not columns:
        return 0

    insert_columns = ", ".join(f"`{column}`" for column in columns)
    select_columns = []
    for column in columns:
        if column == "unique_id":
            select_columns.append(f"LEFT(REPLACE(UUID(), '-', ''), 18) AS `{column}`")
        elif column == "sess_company_id":
            select_columns.append(f"{sql_quote(target_company_id)} AS `{column}`")
        else:
            select_columns.append(f"`src`.`{column}`")

    sql = f"""
        INSERT INTO `{target_db}`.`{table_name}` ({insert_columns})
        SELECT {", ".join(select_columns)}
        FROM `{source_db}`.`{table_name}` `src`
        WHERE COALESCE(`src`.`is_delete`, 0) = 0
          AND COALESCE(`src`.`sess_company_id`, '') IN ('', {sql_quote(source_company_id)})
          AND NOT EXISTS (
              SELECT 1
              FROM `{target_db}`.`{table_name}` `dst`
              WHERE `dst`.`user_type` = `src`.`user_type`
                AND `dst`.`main_screen_unique_id` = `src`.`main_screen_unique_id`
                AND COALESCE(`dst`.`section_unique_id`, '') = COALESCE(`src`.`section_unique_id`, '')
                AND `dst`.`screen_unique_id` = `src`.`screen_unique_id`
                AND `dst`.`action_unique_id` = `src`.`action_unique_id`
                AND COALESCE(`dst`.`sess_company_id`, '') = {sql_quote(target_company_id)}
          )
          AND NOT EXISTS (
              SELECT 1
              FROM `{source_db}`.`user_screen` `screen`
              WHERE `screen`.`unique_id` = `src`.`screen_unique_id`
                AND COALESCE(`screen`.`is_delete`, 0) = 0
                AND LOWER(COALESCE(`screen`.`folder_name`, '')) = 'user_screen'
          )
    """
    cursor.execute(sql)
    return cursor.rowcount


def clone_default_setup_to_tenant(company, source_company_id=DEFAULT_SETUP_SOURCE_COMPANY_ID):
    source_db = connections["master"].settings_dict["NAME"]
    target_db = tenant_database_name(company)
    cloned = {}
    with connections["master"].cursor() as cursor:
        for table_name in SETUP_TABLES:
            cloned[table_name] = clone_setup_table(cursor, source_db, target_db, table_name, source_company_id, company.unique_id)
        cloned["user_screen_permission"] = clone_permissions(cursor, source_db, target_db, source_company_id, company.unique_id)
    return cloned


class TenantCompanyListCreateView(GenericAPIView):
    serializer_class = TenantCompanySerializer

    def get(self, request):
        denied = product_owner_only(request)
        if denied:
            return denied
        qs = TenantCompany.objects.using("master").filter(is_delete=0).order_by("company_name")
        return Response({"status": 1, "data": TenantCompanySerializer(qs, many=True).data})

    def post(self, request):
        denied = product_owner_only(request)
        if denied:
            return denied
        data = request.data.copy()
        company_code = normalize_company_code(data.get("company_code") or data.get("code"))
        if not company_code:
            return Response(
                {"status": 0, "msg": "error", "detail": "company_code is required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        data["company_code"] = company_code
        admin_username = first_non_empty(data.get("admin_username"), data.get("username"))
        admin_password = first_non_empty(data.get("admin_password"), data.get("password"))
        if not admin_username:
            admin_username = "admin"
        if not admin_password:
            admin_password = f"{company_code}@&^^!N"

        if not first_non_empty(data.get("db_name")):
            data["db_name"] = f"otm_{company_code.lower().replace('-', '_')}"
        serializer = TenantCompanySerializer(data=data)
        use_master_unique_validators(serializer)
        if not serializer.is_valid():
            return Response({"status": 0, "msg": "error", "errors": serializer.errors}, status=status.HTTP_400_BAD_REQUEST)

        company = TenantCompany.objects.using("master").create(**serializer.validated_data)
        try:
            provision_company_database(company)
        except Exception as exc:
            company.is_active = 0
            company.save(using="master", update_fields=["is_active", "updated"])
            return Response(
                {
                    "status": 0,
                    "msg": "database_error",
                    "detail": f"Company saved, but database creation failed: {exc}",
                },
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

        cloned_setup = clone_default_setup_to_tenant(company, first_non_empty(data.get("clone_source_company"), DEFAULT_SETUP_SOURCE_COMPANY_ID))

        with use_company_database(company):
            TenantCompany.objects.update_or_create(
                unique_id=company.unique_id,
                defaults={
                    "company_code": company.company_code,
                    "company_name": company.company_name,
                    "legal_name": company.legal_name,
                    "contact_name": company.contact_name,
                    "contact_email": company.contact_email,
                    "contact_no": company.contact_no,
                    "gst_no": company.gst_no,
                    "pan_no": company.pan_no,
                    "address": company.address,
                    "db_name": tenant_database_name(company),
                    "db_host": company.db_host,
                    "db_port": company.db_port,
                    "db_user": company.db_user,
                    "subscription_plan": company.subscription_plan,
                    "subscription_status": company.subscription_status,
                    "is_active": company.is_active,
                    "is_delete": company.is_delete,
                },
            )
            branch = TenantBranch.objects.create(
                company_id=company.unique_id,
                branch_code="MAIN",
                branch_name=first_non_empty(data.get("branch_name"), "Main Branch"),
                contact_no=first_non_empty(data.get("contact_no")),
                address=first_non_empty(data.get("address")),
                is_default=1,
            )

            admin_user_type = first_non_empty(data.get("admin_user_type"), data.get("user_type_unique_id"))
            if not admin_user_type:
                super_admin_type = UserType.objects.filter(user_type__iexact="SuperAdmin", is_delete=0).order_by("s_no").first()
                admin_user_type = super_admin_type.unique_id if super_admin_type else ""
            if not admin_user_type:
                return Response(
                    {"status": 0, "msg": "error", "detail": "SuperAdmin user type was not found after setup clone."},
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR,
                )

            admin_user = UserCreation.objects.create(
                staff_name=first_non_empty(data.get("admin_name"), data.get("contact_name"), "Company Admin"),
                staff_id=first_non_empty(data.get("admin_staff_id"), f"{company_code}-ADMIN"),
                user_type_unique_id=admin_user_type,
                mobile_no=first_non_empty(data.get("admin_mobile"), data.get("contact_no")),
                email_id=first_non_empty(data.get("admin_email"), data.get("contact_email")),
                user_name=admin_username,
                address=first_non_empty(data.get("address")),
                password=admin_password,
                en_password=hashlib.md5(admin_password.encode()).hexdigest(),
                sess_company_id=company.unique_id,
                sess_branch_id=branch.unique_id,
            )

        return Response(
            {
                "status": 1,
                "msg": "create",
                "company": TenantCompanySerializer(company).data,
                "branch": TenantBranchSerializer(branch).data,
                "admin_user": {
                    "unique_id": admin_user.unique_id,
                    "username": admin_user.user_name,
                    "password": admin_password,
                    "sess_company_id": admin_user.sess_company_id,
                    "sess_branch_id": admin_user.sess_branch_id,
                },
                "cloned_setup": cloned_setup,
            },
            status=status.HTTP_201_CREATED,
        )


class TenantCompanyDetailView(GenericAPIView):
    serializer_class = TenantCompanySerializer

    def get_company(self, unique_id):
        return (
            TenantCompany.objects.using("master")
            .filter(unique_id=unique_id, is_delete=0)
            .first()
        )

    def get(self, request, unique_id):
        denied = product_owner_only(request)
        if denied:
            return denied

        company = self.get_company(unique_id)
        if not company:
            return Response({"status": 0, "msg": "not_found", "detail": "Tenant company not found."}, status=status.HTTP_404_NOT_FOUND)

        return Response(
            {
                "status": 1,
                "company": TenantCompanySerializer(company).data,
                "admin_user": tenant_admin_user_payload(company),
            }
        )

    def patch(self, request, unique_id):
        denied = product_owner_only(request)
        if denied:
            return denied

        company = self.get_company(unique_id)
        if not company:
            return Response({"status": 0, "msg": "not_found", "detail": "Tenant company not found."}, status=status.HTTP_404_NOT_FOUND)

        data = request.data.copy()
        if "company_code" in data:
            data["company_code"] = normalize_company_code(data.get("company_code"))
        serializer = TenantCompanySerializer(company, data=data, partial=True)
        use_master_unique_validators(serializer)
        if not serializer.is_valid():
            return Response({"status": 0, "msg": "error", "errors": serializer.errors}, status=status.HTTP_400_BAD_REQUEST)

        updated_company = serializer.save()
        tenant_updates = {"company": 0, "branches": 0}
        try:
            with use_company_database(updated_company):
                tenant_updates["company"] = TenantCompany.objects.filter(unique_id=updated_company.unique_id).update(
                    company_code=updated_company.company_code,
                    company_name=updated_company.company_name,
                    legal_name=updated_company.legal_name,
                    contact_name=updated_company.contact_name,
                    contact_email=updated_company.contact_email,
                    contact_no=updated_company.contact_no,
                    gst_no=updated_company.gst_no,
                    pan_no=updated_company.pan_no,
                    address=updated_company.address,
                    db_name=tenant_database_name(updated_company),
                    db_host=updated_company.db_host,
                    db_port=updated_company.db_port,
                    db_user=updated_company.db_user,
                    subscription_plan=updated_company.subscription_plan,
                    subscription_status=updated_company.subscription_status,
                    is_active=updated_company.is_active,
                    is_delete=updated_company.is_delete,
                )
                tenant_updates["branches"] = TenantBranch.objects.filter(company_id=updated_company.unique_id, is_default=1).update(
                    contact_no=updated_company.contact_no,
                    address=updated_company.address,
                    is_active=updated_company.is_active,
                )
        except Exception as exc:
            return Response(
                {
                    "status": 0,
                    "msg": "tenant_update_error",
                    "detail": f"Tenant database could not be updated: {exc}",
                },
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

        return Response(
            {
                "status": 1,
                "msg": "update",
                "company": TenantCompanySerializer(updated_company).data,
                "updated": tenant_updates,
            }
        )

    def put(self, request, unique_id):
        return self.patch(request, unique_id)

    def delete(self, request, unique_id):
        denied = product_owner_only(request)
        if denied:
            return denied

        company = self.get_company(unique_id)
        if not company:
            return Response({"status": 0, "msg": "not_found", "detail": "Tenant company not found."}, status=status.HTTP_404_NOT_FOUND)

        owner_password = first_non_empty(request.data.get("owner_password"), request.data.get("password"))
        if not owner_password_matches(request.user, owner_password):
            return Response({"status": 0, "msg": "invalid_password", "detail": "Owner password is incorrect."}, status=status.HTTP_403_FORBIDDEN)

        confirm_code = normalize_company_code(request.data.get("confirm_company_code") or request.data.get("company_code"))
        if confirm_code != company.company_code:
            return Response(
                {"status": 0, "msg": "confirm_mismatch", "detail": "Company code confirmation does not match."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        tenant_updates = {"company": 0, "branches": 0, "users": 0}
        try:
            with use_company_database(company):
                tenant_updates["company"] = TenantCompany.objects.filter(unique_id=company.unique_id).update(
                    is_active=0,
                    is_delete=1,
                    subscription_status="deleted",
                )
                tenant_updates["branches"] = TenantBranch.objects.filter(company_id=company.unique_id).update(
                    is_active=0,
                    is_delete=1,
                )
                tenant_updates["users"] = UserCreation.objects.filter(sess_company_id=company.unique_id).update(
                    is_active=0,
                    is_delete=1,
                )
        except Exception as exc:
            return Response(
                {
                    "status": 0,
                    "msg": "tenant_delete_error",
                    "detail": f"Tenant database could not be disabled: {exc}",
                },
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

        company.is_active = 0
        company.is_delete = 1
        company.subscription_status = "deleted"
        company.save(using="master", update_fields=["is_active", "is_delete", "subscription_status", "updated"])

        return Response(
            {
                "status": 1,
                "msg": "success_delete",
                "detail": "Tenant disabled and removed from active company list.",
                "disabled": tenant_updates,
            }
        )


class TenantCompanyResolveView(GenericAPIView):
    serializer_class = TenantCompanySerializer
    authentication_classes = []
    permission_classes = []

    def get(self, request):
        code = normalize_company_code(request.query_params.get("company_code") or request.query_params.get("code"))
        name = str(request.query_params.get("company_name") or request.query_params.get("name") or "").strip()

        qs = TenantCompany.objects.using("master").filter(is_delete=0, is_active=1)
        if code:
            qs = qs.filter(company_code=code)
        elif name:
            qs = qs.filter(company_name__iexact=name)
        else:
            return Response(
                {"status": 0, "msg": "error", "detail": "company_code or company_name is required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        company = qs.first()
        if not company:
            return Response({"status": 0, "msg": "not_found", "detail": "Company not found."}, status=status.HTTP_404_NOT_FOUND)

        return Response({"status": 1, "company": TenantCompanySerializer(company).data})
