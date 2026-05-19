from rest_framework import serializers
import re
from master.apps.unit_creation.unitcreation_model import UnitCreation


class UnitCreationSerializer(serializers.ModelSerializer):

    is_active_display = serializers.SerializerMethodField()

    class Meta:
        model   = UnitCreation
        fields  = [
            "id",
            "unit_name",
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
    #  Validation — duplicate unit name check                             #
    # ------------------------------------------------------------------ #
    def validate_unit_name(self, value):
        value = value.strip()
        if not re.fullmatch(r"[A-Za-z ]+", value):
            raise serializers.ValidationError("Unit Name allows only alphabets.")
        unique_id = self.instance.unique_id if self.instance else None

        qs = UnitCreation.objects.filter(
            unit_name__iexact=value,
            is_delete=0,
        )
        if unique_id:
            qs = qs.exclude(unique_id=unique_id)

        if qs.exists():
            raise serializers.ValidationError("Unit name already exists.")
        return value

    def validate_description(self, value):
        value = (value or "").strip()
        if value and not re.fullmatch(r"[A-Za-z0-9, ]+", value):
            raise serializers.ValidationError("Description allows only alphabets, numbers, spaces, and commas.")
        return value
