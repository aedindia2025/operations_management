import uuid

from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView

from master.apps.courier.couriermodels import Courier
from master.serializers.courier.courier_serializer import CourierSerializer
from master.tenant import apply_tenant_audit, tenant_queryset, tenant_save_kwargs


def generate_unique_id():
    return uuid.uuid4()


class CourierListView(APIView):
    def get(self, request):
        search = request.query_params.get("search", "").strip()
        page = int(request.query_params.get("page", 1))
        length = int(request.query_params.get("length", 10))

        qs = tenant_queryset(request, Courier.objects.filter(is_delete=False), include_global=False).order_by("-created_at", "-id")
        if search:
            qs = qs.filter(courier_name__icontains=search)

        deduped_rows = []
        seen_names = set()
        for row in qs:
            normalized_name = (row.courier_name or "").strip().lower()
            if normalized_name in seen_names:
                continue
            seen_names.add(normalized_name)
            deduped_rows.append(row)

        total = len(deduped_rows)
        start = (page - 1) * length
        rows = deduped_rows[start : start + length]

        serializer = CourierSerializer(rows, many=True)
        return Response(
            {
                "status": True,
                "recordsTotal": total,
                "recordsFiltered": total,
                "data": serializer.data,
            }
        )


class CourierCreateView(APIView):
    def post(self, request):
        data = request.data.copy()
        data["unique_id"] = data.get("unique_id") or generate_unique_id()

        serializer = CourierSerializer(data=data)
        if serializer.is_valid():
            serializer.save(**tenant_save_kwargs(request, Courier))
            return Response(
                {"status": True, "msg": "create", "data": serializer.data},
                status=status.HTTP_201_CREATED,
            )

        return Response(
            {"status": False, "msg": "error", "error": serializer.errors},
            status=status.HTTP_400_BAD_REQUEST,
        )


class CourierDetailView(APIView):
    def _get_object(self, request, unique_id):
        return (
            tenant_queryset(request, Courier.objects.filter(unique_id=unique_id, is_delete=False), include_global=False)
            .order_by("-id")
            .first()
        )

    def get(self, request, unique_id):
        obj = self._get_object(request, unique_id)
        if not obj:
            return Response(
                {"status": False, "msg": "error", "error": "Courier not found."},
                status=status.HTTP_404_NOT_FOUND,
            )
        return Response({"status": True, "data": CourierSerializer(obj).data})

    def put(self, request, unique_id):
        obj = self._get_object(request, unique_id)
        if not obj:
            return Response(
                {"status": False, "msg": "error", "error": "Courier not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        serializer = CourierSerializer(obj, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save(**tenant_save_kwargs(request, Courier))
            return Response({"status": True, "msg": "update", "data": serializer.data})

        return Response(
            {"status": False, "msg": "error", "error": serializer.errors},
            status=status.HTTP_400_BAD_REQUEST,
        )

    def delete(self, request, unique_id):
        obj = self._get_object(request, unique_id)
        if not obj:
            return Response(
                {"status": False, "msg": "error", "error": "Courier not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        obj.is_delete = True
        apply_tenant_audit(obj, request)
        obj.save(
            update_fields=[
                "is_delete",
                "acc_year",
                "session_id",
                "sess_user_type",
                "sess_user_id",
                "sess_company_id",
                "sess_branch_id",
            ]
        )
        return Response({"status": True, "msg": "success_delete"})



