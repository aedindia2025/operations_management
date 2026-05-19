from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView

from master.apps.product_category.productcategory_model import ProductCategory
from master.serializers.product_category.productcategory_serializer import ProductCategorySerializer


class ProductCategoryListView(APIView):
    def get(self, request):
        search = request.query_params.get("search", "").strip()
        page = int(request.query_params.get("page", 1))
        length = int(request.query_params.get("length", 10))

        qs = ProductCategory.objects.filter(is_delete=0).order_by("-unique_id")
        if search:
            qs = qs.filter(category_name__icontains=search)

        total = qs.count()
        start = (page - 1) * length
        qs = qs[start : start + length]

        serializer = ProductCategorySerializer(qs, many=True)
        return Response(
            {
                "status": True,
                "recordsTotal": total,
                "recordsFiltered": total,
                "data": serializer.data,
            }
        )


class ProductCategoryCreateView(APIView):
    def post(self, request):
        serializer = ProductCategorySerializer(data=request.data)

        if serializer.is_valid():
            serializer.save()
            return Response({"status": True, "msg": "create", "data": serializer.data}, status=status.HTTP_201_CREATED)

        return Response({"status": False, "msg": "error", "error": serializer.errors}, status=status.HTTP_400_BAD_REQUEST)


class ProductCategoryDetailView(APIView):
    def _get_object(self, unique_id):
        try:
            return ProductCategory.objects.get(unique_id=unique_id, is_delete=0)
        except ProductCategory.DoesNotExist:
            return None

    def get(self, request, unique_id):
        obj = self._get_object(unique_id)
        if not obj:
            return Response({"status": False, "msg": "error", "error": "Category not found."}, status=status.HTTP_404_NOT_FOUND)
        return Response({"status": True, "data": ProductCategorySerializer(obj).data})

    def put(self, request, unique_id):
        obj = self._get_object(unique_id)
        if not obj:
            return Response({"status": False, "msg": "error", "error": "Category not found."}, status=status.HTTP_404_NOT_FOUND)

        serializer = ProductCategorySerializer(obj, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response({"status": True, "msg": "update", "data": serializer.data})

        return Response({"status": False, "msg": "error", "error": serializer.errors}, status=status.HTTP_400_BAD_REQUEST)

    def delete(self, request, unique_id):
        obj = self._get_object(unique_id)
        if not obj:
            return Response({"status": False, "msg": "error", "error": "Category not found."}, status=status.HTTP_404_NOT_FOUND)

        obj.is_delete = 1
        obj.save()
        return Response({"status": True, "msg": "success_delete"})
