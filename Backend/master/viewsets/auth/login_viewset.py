from collections import defaultdict
from datetime import date
import hashlib
import logging

from django.db.models import Q
from rest_framework import status
from rest_framework.generics import GenericAPIView
from rest_framework.response import Response

from master.apps.user.usermodel import UserCreation
from master.apps.tenant.tenantmodel import TenantCompany
from master.apps.user_permission.userpermissionmodel import UserPermission
from master.apps.user_screen.userscreenmodel import UserScreen
from master.apps.user_type.usertypemodel import UserType
from master.apps.vendor_creation.vendormodel import VendorCreation
from master.tenant import actor_branch_id, actor_company_id
from master.tenant_db import make_tenant_token, split_tenant_token, use_company_database
from master.viewsets.user_permission.user_permission_viewset import _safe_lookup_query


FULL_ACCESS_ROLE_NAMES = {"product_owner", "productowner"}
OWNER_ONLY_SCREEN_KEYS = {
    "companycreation",
    "main",
    "mainscreen",
    "screenmain",
    "tenant",
    "tenantcreation",
    "tenants",
    "userscreen",
    "userscreenmain",
}
logger = logging.getLogger(__name__)


def normalize_company_code(value):
    return str(value or "").strip().upper().replace(" ", "-")


def normalize_role_name(value):
    return "".join(ch for ch in str(value or "").strip().lower() if ch.isalnum() or ch == "_").replace("__", "_")


def normalize_screen_key(value):
    return "".join(ch for ch in str(value or "").strip().lower() if ch.isalnum())


def user_login_lookup(username):
    return (
        Q(user_name__iexact=username)
        | Q(staff_name__iexact=username)
        | Q(staff_id__iexact=username)
        | Q(email_id__iexact=username)
    )


def password_lookup(password):
    raw_password = str(password or "")
    return (
        Q(password=raw_password)
        | Q(en_password=raw_password)
        | Q(en_password=hashlib.md5(raw_password.encode()).hexdigest())
    )


def vendor_login_lookup(username):
    return (
        Q(user_name__iexact=username)
        | Q(name__iexact=username)
        | Q(vendor_id__iexact=username)
        | Q(mail_id__iexact=username)
    )


def vendor_password_lookup(password):
    return Q(password=str(password or ""))


def has_full_screen_access(role, company_id):
    return normalize_role_name(role) in FULL_ACCESS_ROLE_NAMES


def user_role_name(user, using=None):
    try:
        qs = UserType.objects
        if using:
            qs = qs.using(using)
        return qs.get(unique_id=user.user_type_unique_id, is_delete=0).user_type
    except UserType.DoesNotExist:
        return ""


def is_owner_only_screen(screen):
    return (
        normalize_screen_key(getattr(screen, "folder_name", "")) in OWNER_ONLY_SCREEN_KEYS
        or normalize_screen_key(getattr(screen, "screen_name", "")) in OWNER_ONLY_SCREEN_KEYS
    )


def resolve_login_company(data):
    company_id = (data.get("company_id") or data.get("sess_company_id") or "").strip()
    company_code = normalize_company_code(data.get("company_code") or data.get("code"))
    company_name = (data.get("company_name") or "").strip()

    if company_id:
        return TenantCompany.objects.using("master").filter(unique_id=company_id, is_delete=0, is_active=1).first()
    if company_code:
        return TenantCompany.objects.using("master").filter(company_code=company_code, is_delete=0, is_active=1).first()
    if company_name:
        return TenantCompany.objects.using("master").filter(company_name__iexact=company_name, is_delete=0, is_active=1).first()
    return None


def fetch_main_screen_rows():
    rows = _safe_lookup_query(
        "SELECT unique_id, screen_main_name, order_no FROM user_screen_main WHERE is_delete = 0 ORDER BY order_no, screen_main_name",
        "SELECT unique_id, screen_main_name, order_no FROM user_screen_main ORDER BY order_no, screen_main_name",
    )
    return [
        {
            "unique_id": row[0],
            "name": row[1],
            "order_no": row[2] if len(row) > 2 and row[2] is not None else 0,
        }
        for row in rows
    ]


def fetch_section_rows():
    rows = _safe_lookup_query(
        "SELECT unique_id, screen_main_unique_id, section_name, order_no FROM user_screen_sections WHERE is_delete = 0 ORDER BY order_no, section_name",
        "SELECT unique_id, screen_main_unique_id, section_name, order_no FROM user_screen_sections ORDER BY order_no, section_name",
    )
    return [
        {
            "unique_id": row[0],
            "main_screen_unique_id": row[1],
            "name": row[2],
            "order_no": row[3] if len(row) > 3 and row[3] is not None else 0,
        }
        for row in rows
    ]


def build_full_menu_tree():
    main_rows = fetch_main_screen_rows()
    main_map = {row["unique_id"]: row for row in main_rows}

    section_rows = fetch_section_rows()
    section_map = {row["unique_id"]: row for row in section_rows}

    screens = list(
        UserScreen.objects.filter(
            is_delete=0,
            is_active=1,
        ).order_by("order_no", "screen_name")
    )

    main_screen_ids = sorted({screen.main_screen_unique_id for screen in screens if screen.main_screen_unique_id})
    section_ids = sorted({screen.screen_section_unique_id for screen in screens if screen.screen_section_unique_id})
    screen_ids = sorted({screen.unique_id for screen in screens if screen.unique_id})

    grouped = {}
    for screen in screens:
        main_id = screen.main_screen_unique_id or ""
        section_id = screen.screen_section_unique_id or ""

        main_entry = grouped.setdefault(
            main_id,
            {
                "unique_id": main_id,
                "name": main_map.get(main_id, {}).get("name", main_id),
                "order_no": main_map.get(main_id, {}).get("order_no", 0),
                "sections": {},
            },
        )

        section_source = section_map.get(section_id, {})
        section_entry = main_entry["sections"].setdefault(
            section_id,
            {
                "unique_id": section_id,
                "name": section_source.get("name", ""),
                "order_no": section_source.get("order_no", 0),
                "screens": [],
            },
        )
        section_entry["screens"].append(
            {
                "unique_id": screen.unique_id,
                "name": screen.screen_name,
                "folder_name": screen.folder_name or "",
                "icon_name": screen.icon_name or "",
                "main_screen_unique_id": main_id,
                "section_unique_id": section_id,
                "actions": sorted({item for item in (screen.actions or "").split(",") if item}),
            }
        )

    menus = []
    for main_id, main_entry in sorted(grouped.items(), key=lambda item: (item[1]["order_no"], item[1]["name"])):
        sections = []
        for section_id, section_entry in sorted(
            main_entry["sections"].items(),
            key=lambda item: (item[1]["order_no"], item[1]["name"]),
        ):
            section_entry["screens"] = sorted(section_entry["screens"], key=lambda item: item["name"].lower())
            sections.append(section_entry)
        menus.append(
            {
                "unique_id": main_id,
                "name": main_entry["name"],
                "sections": sections,
            }
        )

    return {
        "main_screens": main_screen_ids,
        "sections": section_ids,
        "screens": screen_ids,
        "menus": menus,
    }


def build_menu_tree(user_type_unique_id, company_id="", role=""):
    if has_full_screen_access(role, company_id):
        return build_full_menu_tree()

    filters = {
        "is_delete": 0,
        "is_active": 1,
        "user_type": user_type_unique_id,
        "sess_company_id": company_id or "",
    }
    permissions = list(UserPermission.objects.filter(**filters))
    if not permissions:
        return {"main_screens": [], "sections": [], "screens": [], "menus": []}

    main_screen_ids = sorted({row.main_screen_unique_id for row in permissions if row.main_screen_unique_id})
    section_ids = sorted({row.section_unique_id for row in permissions if row.section_unique_id})
    screen_ids = sorted({row.screen_unique_id for row in permissions if row.screen_unique_id})

    main_rows = fetch_main_screen_rows()
    main_map = {row["unique_id"]: row for row in main_rows}

    section_rows = fetch_section_rows()
    section_map = {row["unique_id"]: row for row in section_rows}

    actions_by_screen = defaultdict(set)
    for row in permissions:
        if row.screen_unique_id and row.action_unique_id:
            actions_by_screen[row.screen_unique_id].add(row.action_unique_id)

    screens = list(
        UserScreen.objects.filter(
            unique_id__in=screen_ids,
            is_delete=0,
            is_active=1,
        ).order_by("order_no", "screen_name")
    )
    if company_id:
        screens = [screen for screen in screens if not is_owner_only_screen(screen)]
        screen_ids = sorted({screen.unique_id for screen in screens if screen.unique_id})
        section_ids = sorted({screen.screen_section_unique_id for screen in screens if screen.screen_section_unique_id})
        main_screen_ids = sorted({screen.main_screen_unique_id for screen in screens if screen.main_screen_unique_id})

    grouped = {}
    for screen in screens:
        main_id = screen.main_screen_unique_id or ""
        section_id = screen.screen_section_unique_id or ""

        main_entry = grouped.setdefault(
            main_id,
            {
                "unique_id": main_id,
                "name": main_map.get(main_id, {}).get("name", main_id),
                "order_no": main_map.get(main_id, {}).get("order_no", 0),
                "sections": {},
            },
        )

        section_source = section_map.get(section_id, {})
        section_entry = main_entry["sections"].setdefault(
            section_id,
            {
                "unique_id": section_id,
                "name": section_source.get("name", ""),
                "order_no": section_source.get("order_no", 0),
                "screens": [],
            },
        )
        section_entry["screens"].append(
            {
                "unique_id": screen.unique_id,
                "name": screen.screen_name,
                "folder_name": screen.folder_name or "",
                "icon_name": screen.icon_name or "",
                "main_screen_unique_id": main_id,
                "section_unique_id": section_id,
                "actions": sorted(actions_by_screen.get(screen.unique_id, set())),
            }
        )

    menus = []
    for main_id, main_entry in sorted(grouped.items(), key=lambda item: (item[1]["order_no"], item[1]["name"])):
        sections = []
        for section_id, section_entry in sorted(
            main_entry["sections"].items(),
            key=lambda item: (item[1]["order_no"], item[1]["name"]),
        ):
            section_entry["screens"] = sorted(section_entry["screens"], key=lambda item: item["name"].lower())
            sections.append(section_entry)
        menus.append(
            {
                "unique_id": main_id,
                "name": main_entry["name"],
                "sections": sections,
            }
        )

    return {
        "main_screens": main_screen_ids,
        "sections": section_ids,
        "screens": screen_ids,
        "menus": menus,
    }


def current_acc_year():
    today = date.today()
    if today.month >= 4:
        return f"{today.year}-{today.year + 1}"
    return f"{today.year - 1}-{today.year}"


def actor_session_payload(actor_type, actor):
    if actor_type == "vendor":
        return {
            "staff_id": actor.vendor_id or actor.unique_id,
            "acc_year": getattr(actor, "acc_year", "") or current_acc_year(),
            "session_id": getattr(actor, "session_id", "") or actor.unique_id,
            "sess_user_type": actor.vendor_user_type_unique_id or "",
            "sess_user_id": actor.unique_id,
            "sess_company_id": actor_company_id(actor),
            "sess_branch_id": actor_branch_id(actor),
        }

    return {
        "staff_id": actor.staff_id,
        "acc_year": current_acc_year(),
        "session_id": actor.unique_id,
        "sess_user_type": actor.user_type_unique_id,
        "sess_user_id": actor.unique_id,
        "sess_company_id": actor_company_id(actor),
        "sess_branch_id": actor_branch_id(actor),
    }


def set_login_session(request, actor_type, actor):
    if not hasattr(request, "session"):
        return

    session_values = actor_session_payload(actor_type, actor)
    try:
        request.session["acc_year"] = session_values["acc_year"]
        request.session["session_id"] = session_values["session_id"]
        request.session["sess_user_type"] = session_values["sess_user_type"]
        request.session["sess_user_id"] = session_values["sess_user_id"]
        request.session["sess_company_id"] = session_values["sess_company_id"]
        request.session["sess_branch_id"] = session_values["sess_branch_id"]
        request.session["unique_id"] = actor.unique_id
        request.session["user_type_unique_id"] = session_values["sess_user_type"]
        request.session["staff_id"] = session_values["staff_id"]
        request.session["staff_name"] = getattr(actor, "staff_name", "") or getattr(actor, "name", "") or ""
        request.session.save()
    except Exception:
        # Some environments do not have the django_session table yet.
        # Login should still succeed because the frontend authenticates with Bearer token.
        return


def build_user_payload(user):
    company_id = actor_company_id(user)
    company = resolve_company_payload(company_id)
    try:
        role = UserType.objects.get(unique_id=user.user_type_unique_id, is_delete=0).user_type
    except UserType.DoesNotExist:
        role = ""

    try:
        permissions = build_menu_tree(user.user_type_unique_id, company_id, role)
    except Exception:
        permissions = {"main_screens": [], "sections": [], "screens": [], "menus": []}

    return {
        "id": user.unique_id,
        "unique_id": user.unique_id,
        "staff_id": user.staff_id,
        "username": user.user_name,
        "name": user.staff_name,
        "role": role,
        "user_type_unique_id": user.user_type_unique_id,
        "acc_year": current_acc_year(),
        "session_id": user.unique_id,
        "sess_user_type": user.user_type_unique_id,
        "sess_user_id": user.unique_id,
        "sess_company_id": company_id,
        "company_code": company["company_code"],
        "company_name": company["company_name"],
        "sess_branch_id": actor_branch_id(user),
        "main_screens": permissions["main_screens"],
        "sections": permissions["sections"],
        "screens": permissions["screens"],
        "menus": permissions["menus"],
    }


def build_vendor_payload(vendor):
    company_id = actor_company_id(vendor)
    company = resolve_company_payload(company_id)
    try:
        role = UserType.objects.get(unique_id=vendor.vendor_user_type_unique_id, is_delete=0).user_type
    except UserType.DoesNotExist:
        role = ""

    try:
        permissions = build_menu_tree(vendor.vendor_user_type_unique_id, company_id, role)
    except Exception:
        permissions = {"main_screens": [], "sections": [], "screens": [], "menus": []}

    return {
        "id": vendor.unique_id,
        "unique_id": vendor.unique_id,
        "staff_id": vendor.vendor_id or vendor.unique_id,
        "username": vendor.user_name or "",
        "name": vendor.name or vendor.company_name or vendor.user_name or "",
        "role": role,
        "user_type_unique_id": vendor.vendor_user_type_unique_id or "",
        "acc_year": getattr(vendor, "acc_year", "") or current_acc_year(),
        "session_id": getattr(vendor, "session_id", "") or vendor.unique_id,
        "sess_user_type": vendor.vendor_user_type_unique_id or "",
        "sess_user_id": vendor.unique_id,
        "sess_company_id": company_id,
        "company_code": company["company_code"],
        "company_name": company["company_name"],
        "sess_branch_id": actor_branch_id(vendor),
        "main_screens": permissions["main_screens"],
        "sections": permissions["sections"],
        "screens": permissions["screens"],
        "menus": permissions["menus"],
    }


def resolve_company_payload(company_id):
    if not company_id:
        return {"company_code": "", "company_name": "Product Owner"}
    company = (
        TenantCompany.objects.using("master")
        .filter(unique_id=company_id, is_delete=0)
        .first()
    )
    if not company:
        return {"company_code": "", "company_name": ""}
    return {
        "company_code": company.company_code or "",
        "company_name": company.company_name or "",
    }


def resolve_authenticated_actor(token):
    _company_code, token = split_tenant_token(token)
    user = (
        UserCreation.objects
        .filter(unique_id=token, is_delete=0, is_active=1)
        .order_by("-s_no")
        .first()
    )
    if user:
        return "user", user

    vendor = (
        VendorCreation.objects
        .filter(unique_id=token, is_delete=0, is_active=1)
        .order_by("-updated_at", "-created_at")
        .first()
    )
    if vendor:
        return "vendor", vendor

    return "", None


def build_actor_payload(actor_type, actor):
    if actor_type == "vendor":
        return build_vendor_payload(actor)
    return build_user_payload(actor)


class LoginView(GenericAPIView):
    authentication_classes = []
    permission_classes = []

    def post(self, request):
        try:
            data = request.data if request.data and hasattr(request.data, 'get') else {}
            username = (data.get("username") or data.get("user_name") or "").strip()
            password = data.get("password") or ""
            company = resolve_login_company(data)
            company_was_sent = any(data.get(key) for key in ("company_id", "sess_company_id", "company_code", "code", "company_name"))

            if not username or not password:
                return Response(
                    {"status": 0, "msg": "empty", "detail": "Please enter username and password."},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            if company_was_sent and not company:
                return Response(
                    {"status": 0, "msg": "company_not_found", "detail": "Company code/name is invalid or inactive."},
                    status=status.HTTP_401_UNAUTHORIZED,
                )

            context = use_company_database(company) if company else None
            if context:
                context.__enter__()
            try:
                user_manager = UserCreation.objects
                user_role_db = None
                if not company:
                    user_manager = user_manager.using("master")
                    user_role_db = "master"
                user_qs = user_manager.filter(
                    user_login_lookup(username),
                    password_lookup(password),
                    is_delete=0,
                    is_active=1,
                )
                if company:
                    user_qs = user_qs.filter(sess_company_id=company.unique_id)
                user = user_qs.order_by("-s_no").first()

                if user:
                    if not company and not has_full_screen_access(user_role_name(user, user_role_db), ""):
                        owner_users = [
                            candidate
                            for candidate in user_qs.order_by("-s_no")[:20]
                            if has_full_screen_access(user_role_name(candidate, user_role_db), "")
                        ]
                        if not owner_users:
                            return Response(
                                {"status": 0, "msg": "company_required", "detail": "Company code is required for company users."},
                                status=status.HTTP_401_UNAUTHORIZED,
                            )
                        user = owner_users[0]
                    set_login_session(request, "user", user)
                    user_data = build_user_payload(user)
                    token = make_tenant_token(company.company_code, user.unique_id) if company else user.unique_id
                    return Response(
                        {
                            "status": 1,
                            "msg": "success_login",
                            "access_token": token,
                            "user": user_data,
                        }
                    )

                if not company:
                    return Response(
                        {"status": 0, "msg": "incorrect", "detail": "Incorrect username or password."},
                        status=status.HTTP_401_UNAUTHORIZED,
                    )

                vendor_qs = VendorCreation.objects.filter(
                    vendor_login_lookup(username),
                    vendor_password_lookup(password),
                    is_delete=0,
                    is_active=1,
                )
                if company:
                    vendor_qs = vendor_qs.filter(sess_company_id=company.unique_id)
                vendor = vendor_qs.order_by("-updated_at", "-created_at", "-unique_id").first()

                if not vendor:
                    return Response(
                        {"status": 0, "msg": "incorrect", "detail": "Incorrect username or password."},
                        status=status.HTTP_401_UNAUTHORIZED,
                    )

                set_login_session(request, "vendor", vendor)
                vendor_data = build_vendor_payload(vendor)
                token = make_tenant_token(company.company_code, vendor.unique_id) if company else vendor.unique_id
                return Response(
                    {
                        "status": 1,
                        "msg": "success_login",
                        "access_token": token,
                        "user": vendor_data,
                    }
                )
            finally:
                if context:
                    context.__exit__(None, None, None)
        except Exception as exc:
            logger.exception(
                "Login failed with an unexpected error. company_code=%r username=%r",
                (request.data.get("company_code") or request.data.get("code") or "") if hasattr(request.data, "get") else "",
                (request.data.get("username") or request.data.get("user_name") or "") if hasattr(request.data, "get") else "",
            )
            return Response(
                {"status": 0, "msg": "error", "detail": str(exc)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )


class CurrentUserView(GenericAPIView):
    authentication_classes = []
    permission_classes = []

    def get(self, request):
        auth_header = request.headers.get("Authorization", "")
        token = auth_header.replace("Bearer", "", 1).strip()
        if not token:
            token = (request.query_params.get("token") or "").strip()

        if not token:
            return Response(
                {"status": 0, "msg": "unauthorized", "detail": "Missing token."},
                status=status.HTTP_401_UNAUTHORIZED,
            )

        company_code, _actor_token = split_tenant_token(token)
        company = None
        if company_code:
            company = (
                TenantCompany.objects.using("master")
                .filter(company_code=company_code, is_delete=0, is_active=1)
                .first()
            )

        context = use_company_database(company) if company else None
        if context:
            context.__enter__()
        try:
            actor_type, actor = resolve_authenticated_actor(token)
            if not actor:
                return Response(
                    {"status": 0, "msg": "unauthorized", "detail": "Invalid token."},
                    status=status.HTTP_401_UNAUTHORIZED,
                )

            return Response(
                {
                    "status": 1,
                    "msg": "success",
                    "company_id": actor_company_id(actor),
                    "user": build_actor_payload(actor_type, actor),
                }
            )
        finally:
            if context:
                context.__exit__(None, None, None)
