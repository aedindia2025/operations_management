import hashlib
import uuid

from django.db.models import Q
from rest_framework import status
from rest_framework.generics import GenericAPIView
from rest_framework.response import Response

from master.apps.user.usermodel import UserCreation
from master.apps.user_type.usertypemodel import UserType
from master.apps.executive_creation.executivecreation_model import ExecutiveName
from master.serializers.user import UserCreationInputSerializer, UserCreationSerializer
from master.tenant import actor_branch_id, request_company_id, tenant_queryset


EXECUTIVE_USER_TYPE = "69b0115ced3bd96390"


def generate_unique_id():
    return uuid.uuid4().hex[:18]


def is_executive_user_type(user_type_unique_id):
    user_type_unique_id = str(user_type_unique_id or "").strip()
    if user_type_unique_id == EXECUTIVE_USER_TYPE:
        return True
    label = (
        UserType.objects
        .filter(unique_id=user_type_unique_id, is_delete=0)
        .values_list("user_type", flat=True)
        .first()
    )
    return "executive" in str(label or "").strip().lower()


def sync_executive_name_for_user(user, is_executive):
    existing = ExecutiveName.objects.filter(unique_id=user.unique_id).first()
    if not is_executive:
        if existing and existing.is_delete == 0:
            existing.is_delete = 1
            existing.save(update_fields=["is_delete", "updated_at"])
        return

    defaults = {
        "under_user_type": user.user_type_unique_id,
        "executive_name": user.staff_name,
        "is_active": user.is_active,
        "is_delete": 0,
        "sess_company_id": user.sess_company_id,
        "sess_branch_id": user.sess_branch_id,
    }
    if existing:
        for key, value in defaults.items():
            setattr(existing, key, value)
        existing.save()
    else:
        ExecutiveName.objects.create(unique_id=user.unique_id, **defaults)


class UserTypeOptionsView(GenericAPIView):
    def get(self, request):
        rows = tenant_queryset(request, UserType.objects.filter(is_delete=0), include_global=True).order_by("user_type")
        data = [{"unique_id": row.unique_id, "label": row.user_type} for row in rows]
        return Response({"status": 1, "data": data})


class UserCreationListCreateView(GenericAPIView):
    serializer_class = UserCreationInputSerializer

    def get(self, request):
        search = request.query_params.get("search", "").strip()
        user_type_unique_id = request.query_params.get("user_type_unique_id", "").strip()
        start = int(request.query_params.get("start", 0))
        length = request.query_params.get("length", "10")
        draw = int(request.query_params.get("draw", 1))

        qs = tenant_queryset(request, UserCreation.objects.filter(is_delete=0), include_global=False).order_by("staff_name")
        if user_type_unique_id:
            qs = qs.filter(user_type_unique_id=user_type_unique_id)
        if search:
            qs = qs.filter(
                Q(staff_name__icontains=search)
                | Q(user_name__icontains=search)
                | Q(mobile_no__icontains=search)
                | Q(email_id__icontains=search)
            )

        total = qs.count()
        if length != "-1":
            qs = qs[start : start + int(length)]

        data = []
        for i, obj in enumerate(qs, start=start + 1):
            row = UserCreationSerializer(obj).data
            row["s_no"] = i
            row["is_active"] = "Active" if obj.is_active == 1 else "Inactive"
            data.append(row)

        return Response({"draw": draw, "recordsTotal": total, "recordsFiltered": total, "data": data})

    def post(self, request):
        serializer = UserCreationInputSerializer(data=request.data)
        if not serializer.is_valid():
            return Response({"status": 0, "msg": "error", "errors": serializer.errors}, status=status.HTTP_400_BAD_REQUEST)

        data = serializer.validated_data
        unique_id = request.data.get("unique_id", "")
        company_id = request_company_id(request)
        branch_id = actor_branch_id(getattr(request, "user", None))
        if not company_id:
            return Response(
                {"status": 0, "msg": "error", "error": "Company context missing. Please login with company code."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        duplicate = UserCreation.objects.filter(
            user_name__iexact=data["user_name"],
            staff_name__iexact=data["staff_name"],
            sess_company_id=company_id,
            is_delete=0,
        )
        if unique_id:
            duplicate = duplicate.exclude(unique_id=unique_id)
        if duplicate.exists():
            return Response({"status": 1, "msg": "already", "error": "User already exists"}, status=status.HTTP_409_CONFLICT)

        payload = {
            "staff_name": data["staff_name"],
            "staff_id": data["staff_id"],
            "user_type_unique_id": data["user_type_unique_id"],
            "mobile_no": data["mobile_no"],
            "email_id": data["email_id"],
            "user_name": data["user_name"],
            "address": data.get("address") or "",
            "password": data["password"],
            "en_password": hashlib.md5(data["password"].encode()).hexdigest(),
            "is_active": data.get("is_active", 1),
            "sess_company_id": company_id,
            "sess_branch_id": branch_id,
        }

        if unique_id:
            obj = UserCreation.objects.get(unique_id=unique_id, sess_company_id=company_id, is_delete=0)
            for key, value in payload.items():
                setattr(obj, key, value)
            obj.save()
            msg = "update"
        else:
            obj = UserCreation.objects.create(unique_id=generate_unique_id(), **payload)
            msg = "create"

        sync_executive_name_for_user(obj, is_executive_user_type(obj.user_type_unique_id))

        return Response({"status": 1, "msg": msg, "data": UserCreationSerializer(obj).data})


class UserCreationDetailView(GenericAPIView):
    def get_object(self, unique_id):
        return None

    def get_tenant_object(self, request, unique_id):
        try:
            return UserCreation.objects.get(unique_id=unique_id, sess_company_id=request_company_id(request), is_delete=0)
        except UserCreation.DoesNotExist:
            return None

    def get(self, request, unique_id):
        obj = self.get_tenant_object(request, unique_id)
        if not obj:
            return Response({"status": 0, "error": "Not found"}, status=status.HTTP_404_NOT_FOUND)
        return Response({"status": 1, "data": UserCreationSerializer(obj).data})

    def delete(self, request, unique_id):
        obj = self.get_tenant_object(request, unique_id)
        if not obj:
            return Response({"status": 0, "error": "Not found"}, status=status.HTTP_404_NOT_FOUND)
        obj.is_delete = 1
        obj.save()
        sync_executive_name_for_user(obj, False)
        return Response({"status": 1, "msg": "success_delete"})
