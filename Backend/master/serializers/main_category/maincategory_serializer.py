from rest_framework import serializers
import re
from master.apps.main_category.maincategory_model import MainCategory


class MainCategorySerializer(serializers.ModelSerializer):

    is_active_display = serializers.SerializerMethodField()

    class Meta:
        model  = MainCategory
        fields = [
            "id",
            "main_category",
            "description",
            "is_active",
            "is_active_display",
            "unique_id",
            "acc_year",
            "session_id",
            "sess_user_type",
            "sess_user_id",
            "sess_company_id",
            "sess_branch_id",
        ]

    def get_is_active_display(self, obj):
        return "Active" if obj.is_active == 1 else "Inactive"

    # ------------------------------------------------------------------ #
    #  Validation — duplicate main_category name check                    #
    # ------------------------------------------------------------------ #
    def validate_main_category(self, value):
        value = value.strip()
        if not re.fullmatch(r"[A-Za-z ]+", value):
            raise serializers.ValidationError("Main Category allows only alphabets.")
        unique_id = self.instance.unique_id if self.instance else None

        qs = MainCategory.objects.filter(
            main_category__iexact=value,
            is_delete=0,
        )
        if unique_id:
            qs = qs.exclude(unique_id=unique_id)

        if qs.exists():
            raise serializers.ValidationError("Main category already exists.")
        return value

    def validate_description(self, value):
        value = (value or "").strip()
        if value and not re.fullmatch(r"[A-Za-z ]+", value):
            raise serializers.ValidationError("Description allows only alphabets.")
        return value
