import uuid

from django.db.models import Q
from rest_framework import status
from rest_framework.generics import GenericAPIView
from rest_framework.response import Response
from rest_framework.generics import RetrieveUpdateDestroyAPIView
from master.apps.user_type.usertypemodel import UserType
from master.serializers.user_type import UserTypeInputSerializer, UserTypeSerializer
from master.tenant import apply_tenant_audit, tenant_queryset


def generate_unique_id():
    return uuid.uuid4().hex[:18]


class UserTypeListCreateView(GenericAPIView):
    serializer_class = UserTypeInputSerializer

    def get(self, request):
        search = request.query_params.get("search", "").strip()
        start = int(request.query_params.get("start", 0))
        length = request.query_params.get("length", "10")
        draw = int(request.query_params.get("draw", 1))

        qs = tenant_queryset(request, UserType.objects.filter(is_delete=0), include_global=True).order_by("user_type")

        if search:
            qs = qs.filter(
                Q(user_type__icontains=search) | Q(under_user_type__icontains=search)
            )

        total = qs.count()
        if length != "-1":
            qs = qs[start : start + int(length)]

        data = []
        for i, obj in enumerate(qs, start=start + 1):
            data.append(
                {
                    "s_no": i,
                    "user_type": obj.user_type,
                    "under_user_type": obj.under_user_type or "",
                    "is_active": "Active" if obj.is_active == 1 else "Inactive",
                    "unique_id": obj.unique_id,
                }
            )

        return Response(
            {
                "draw": draw,
                "recordsTotal": total,
                "recordsFiltered": total,
                "data": data,
            }
        )

    def post(self, request):
        serializer = UserTypeInputSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(
                {"status": 0, "msg": "error", "errors": serializer.errors},
                status=status.HTTP_400_BAD_REQUEST,
            )

        data = serializer.validated_data

        duplicate = UserType.objects.filter(
            user_type__iexact=data["user_type"], is_delete=0
        ).exists()
        if duplicate:
            return Response(
                {"status": 1, "msg": "already", "error": "User Type already exists"},
                status=status.HTTP_409_CONFLICT,
            )

        obj = UserType.objects.create(
            unique_id=generate_unique_id(),
            user_type=data["user_type"],
            under_user_type=data.get("under_user_type") or "",
            is_active=data.get("is_active", 1),
            session_id="",
            sess_user_type="",
            sess_user_id="",
        )
        apply_tenant_audit(obj, request)
        obj.save()
        return Response(
            {"status": 1, "msg": "create", "data": UserTypeSerializer(obj).data},
            status=status.HTTP_201_CREATED,
        )



class UserTypeDetailView(RetrieveUpdateDestroyAPIView):
    queryset = UserType.objects.filter(is_delete=0)
    serializer_class = UserTypeInputSerializer
    lookup_field = "unique_id"

    def _get_object(self, request, unique_id):
        try:
            return tenant_queryset(request, UserType.objects.filter(unique_id=unique_id, is_delete=0), include_global=True).first()
        except UserType.DoesNotExist:
            return None

    def get(self, request, unique_id):
        obj = self._get_object(request, unique_id)
        if not obj:
            return Response(
                {"status": 0, "error": "Not found"},
                status=status.HTTP_404_NOT_FOUND,
            )
        return Response({"status": 1, "data": UserTypeSerializer(obj).data})

    def put(self, request, unique_id):
        obj = self._get_object(request, unique_id)
        if not obj:
            return Response(
                {"status": 0, "error": "Not found"},
                status=status.HTTP_404_NOT_FOUND,
            )

        serializer = UserTypeInputSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(
                {"status": 0, "msg": "error", "errors": serializer.errors},
                status=status.HTTP_400_BAD_REQUEST,
            )

        data = serializer.validated_data

        duplicate = UserType.objects.filter(
            user_type__iexact=data["user_type"], is_delete=0
        ).exclude(unique_id=unique_id).exists()
        if duplicate:
            return Response(
                {
                    "status": 1,
                    "msg": "already",
                    "error": "User Type name already in use",
                },
                status=status.HTTP_409_CONFLICT,
            )

        obj.user_type = data["user_type"]
        obj.under_user_type = data.get("under_user_type") or ""
        obj.is_active = data.get("is_active", obj.is_active)
        obj.session_id = obj.session_id or ""
        obj.sess_user_type = obj.sess_user_type or ""
        obj.sess_user_id = obj.sess_user_id or ""
        apply_tenant_audit(obj, request)
        obj.save()
        return Response(
            {"status": 1, "msg": "update", "data": UserTypeSerializer(obj).data}
        )

    def delete(self, request, unique_id):
        obj = self._get_object(request, unique_id)
        if not obj:
            return Response(
                {"status": 0, "msg": "error"},
                status=status.HTTP_404_NOT_FOUND,
            )
        obj.is_delete = 1
        apply_tenant_audit(obj, request)
        obj.save()
        return Response({"status": 1, "msg": "success_delete"})
