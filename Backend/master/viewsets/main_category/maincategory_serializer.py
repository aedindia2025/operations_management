import uuid
from rest_framework.views    import APIView
from rest_framework.response import Response
from rest_framework          import status

from master.apps.main_category.maincategory_model             import MainCategory
from master.serializers.main_category.maincategory_serializer import MainCategorySerializer
from master.tenant import apply_tenant_audit, tenant_queryset, tenant_save_kwargs


# ────────────────────────────────────────────────────────────────────── #
#  Helper                                                                 #
# ────────────────────────────────────────────────────────────────────── #
def generate_unique_id():
    return uuid.uuid4().hex[:18]


# ────────────────────────────────────────────────────────────────────── #
#  List  (GET — DataTable)                                                #
# ────────────────────────────────────────────────────────────────────── #
class MainCategoryListView(APIView):
    """
    GET  /main-category/list/
    """

    def get(self, request):
        search = request.query_params.get("search", "").strip()
        page   = int(request.query_params.get("page", 1))
        length = int(request.query_params.get("length", 10))

        qs = tenant_queryset(request, MainCategory.objects.filter(is_delete=0), include_global=False).order_by("-id")

        if search:
            qs = qs.filter(main_category__icontains=search)

        total = qs.count()
        start = (page - 1) * length
        qs    = qs[start: start + length]

        serializer = MainCategorySerializer(qs, many=True)

        return Response({
            "status"          : True,
            "recordsTotal"    : total,
            "recordsFiltered" : total,
            "data"            : serializer.data,
        })


# ────────────────────────────────────────────────────────────────────── #
#  Create  (POST)                                                         #
# ────────────────────────────────────────────────────────────────────── #
class MainCategoryCreateView(APIView):
    """
    POST /main-category/create/
    """

    def post(self, request):
        data             = request.data.copy()
        data["unique_id"] = generate_unique_id()

        serializer = MainCategorySerializer(data=data)
        if serializer.is_valid():
            serializer.save(**tenant_save_kwargs(request, MainCategory))
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
class MainCategoryDetailView(APIView):
    """
    GET    /main-category/<unique_id>/
    PUT    /main-category/<unique_id>/update/
    DELETE /main-category/<unique_id>/delete/
    """

    def _get_object(self, request, unique_id):
        return tenant_queryset(request, MainCategory.objects.filter(unique_id=unique_id, is_delete=0), include_global=False).first()

    # ── Retrieve ──────────────────────────────────────────────────── #
    def get(self, request, unique_id):
        obj = self._get_object(request, unique_id)
        if not obj:
            return Response({
                "status" : False,
                "msg"    : "error",
                "error"  : "Main category not found.",
            }, status=status.HTTP_404_NOT_FOUND)

        serializer = MainCategorySerializer(obj)
        return Response({"status": True, "data": serializer.data})

    # ── Update ────────────────────────────────────────────────────── #
    def put(self, request, unique_id):
        obj = self._get_object(request, unique_id)
        if not obj:
            return Response({
                "status" : False,
                "msg"    : "error",
                "error"  : "Main category not found.",
            }, status=status.HTTP_404_NOT_FOUND)

        serializer = MainCategorySerializer(obj, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save(**tenant_save_kwargs(request, MainCategory))
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
                "error"  : "Main category not found.",
            }, status=status.HTTP_404_NOT_FOUND)

        obj.is_delete = 1
        apply_tenant_audit(obj, request)
        obj.save()
        return Response({"status": True, "msg": "success_delete"})

