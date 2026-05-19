import uuid
from rest_framework.views    import APIView
from rest_framework.response import Response
from rest_framework          import status

from master.apps.consignee_creation.consigneecreation_model         import ConsigneeCreation
from master.serializers.consignee_creation.consigneecreation_serializer import ConsigneeCreationSerializer
from master.tenant import apply_tenant_audit, tenant_queryset, tenant_save_kwargs


# ────────────────────────────────────────────────────────────────────── #
#  Helper                                                                 #
# ────────────────────────────────────────────────────────────────────── #
def generate_unique_id():
    return uuid.uuid4().hex[:18]


# ────────────────────────────────────────────────────────────────────── #
#  List  (GET — DataTable)                                                #
# ────────────────────────────────────────────────────────────────────── #
class ConsigneeCreationListView(APIView):
    """
    GET  /consignee-creation/list/
    Returns consignee list; district name resolved via serializer
    (mirrors PHP subquery on district_creation table)
    """

    def get(self, request):
        search = request.query_params.get("search", "").strip()
        page   = int(request.query_params.get("page", 1))
        length = int(request.query_params.get("length", 10))

        qs = tenant_queryset(request, ConsigneeCreation.objects.filter(is_delete=0), include_global=False).order_by("-id")

        if search:
            qs = qs.filter(consignee_address__icontains=search)

        total = qs.count()
        start = (page - 1) * length
        qs    = qs[start: start + length]

        serializer = ConsigneeCreationSerializer(qs, many=True)

        return Response({
            "status"          : True,
            "recordsTotal"    : total,
            "recordsFiltered" : total,
            "data"            : serializer.data,
        })


# ────────────────────────────────────────────────────────────────────── #
#  Create  (POST)                                                         #
# ────────────────────────────────────────────────────────────────────── #
class ConsigneeCreationCreateView(APIView):
    """
    POST /consignee-creation/create/
    """

    def post(self, request):
        data              = request.data.copy()
        data["unique_id"] = generate_unique_id()

        serializer = ConsigneeCreationSerializer(data=data)
        if serializer.is_valid():
            serializer.save(**tenant_save_kwargs(request, ConsigneeCreation))
            return Response({
                "status" : True,
                "msg"    : "create",
                "data"   : serializer.data,
            }, status=status.HTTP_201_CREATED)

        return Response({
            "status" : False,
            "msg"    : "error",
            "error"  : serializer.errors,
        }, status=status.HTTP_400_BAD_REQUEST)


# ────────────────────────────────────────────────────────────────────── #
#  Retrieve / Update / Delete                                             #
# ────────────────────────────────────────────────────────────────────── #
class ConsigneeCreationDetailView(APIView):
    """
    GET    /consignee-creation/<unique_id>/
    PUT    /consignee-creation/<unique_id>/update/
    DELETE /consignee-creation/<unique_id>/delete/
    """

    def _get_object(self, request, unique_id):
        return (
            tenant_queryset(request, ConsigneeCreation.objects.filter(unique_id=unique_id, is_delete=0), include_global=False)
            .order_by("-id")
            .first()
        )

    # ── Retrieve ──────────────────────────────────────────────────── #
    def get(self, request, unique_id):
        obj = self._get_object(request, unique_id)
        if not obj:
            return Response({
                "status" : False,
                "msg"    : "error",
                "error"  : "Consignee not found.",
            }, status=status.HTTP_404_NOT_FOUND)

        serializer = ConsigneeCreationSerializer(obj)
        return Response({"status": True, "data": serializer.data})

    # ── Update ────────────────────────────────────────────────────── #
    def put(self, request, unique_id):
        obj = self._get_object(request, unique_id)
        if not obj:
            return Response({
                "status" : False,
                "msg"    : "error",
                "error"  : "Consignee not found.",
            }, status=status.HTTP_404_NOT_FOUND)

        serializer = ConsigneeCreationSerializer(obj, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save(**tenant_save_kwargs(request, ConsigneeCreation))
            return Response({
                "status" : True,
                "msg"    : "update",
                "data"   : serializer.data,
            })

        return Response({
            "status" : False,
            "msg"    : "error",
            "error"  : serializer.errors,
        }, status=status.HTTP_400_BAD_REQUEST)

    # ── Soft Delete ───────────────────────────────────────────────── #
    def delete(self, request, unique_id):
        obj = self._get_object(request, unique_id)
        if not obj:
            return Response({
                "status" : False,
                "msg"    : "error",
                "error"  : "Consignee not found.",
            }, status=status.HTTP_404_NOT_FOUND)

        obj.is_delete = 1
        apply_tenant_audit(obj, request)
        obj.save()
        return Response({"status": True, "msg": "success_delete"})


# ────────────────────────────────────────────────────────────────────── #
#  District Dropdown Option                                               #
# ────────────────────────────────────────────────────────────────────── #
class ConsigneeDistrictOptionView(APIView):
    """
    GET /consignee-creation/options/districts/
    Returns district list for form dropdown
    (PHP: district_option() function in form.php)
    """

    def get(self, request):
        from master.apps.district.districtmodel import DistrictCreation

        districts = DistrictCreation.objects.filter(
            is_delete=0,
            is_active=1,
        ).values("unique_id", "district_name").order_by("district_name")

        data = [
            {"value": d["unique_id"], "label": d["district_name"]}
            for d in districts
        ]

        return Response({"status": True, "data": data})



