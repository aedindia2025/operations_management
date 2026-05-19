from rest_framework import serializers
from master.apps.product_category.productcategory_model import ProductCategory

class ProductCategorySerializer(serializers.ModelSerializer):
    is_active_display = serializers.SerializerMethodField()

    class Meta:
        model = ProductCategory
        fields = "__all__"

    def get_is_active_display(self, obj):
        return "Active" if obj.is_active == 1 else "Inactive"

    # ✅ Duplicate category check
    def validate_category_name(self, value):
        unique_id = self.instance.unique_id if self.instance else None

        qs = ProductCategory.objects.filter(
            category_name__iexact=value,
            is_delete=0
        )

        if unique_id:
            qs = qs.exclude(unique_id=unique_id)

        if qs.exists():
            raise serializers.ValidationError("Category already exists")

        return value
