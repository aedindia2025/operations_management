from rest_framework import serializers
import re
from master.apps.consignee_creation.consigneecreation_model import ConsigneeCreation


class ConsigneeCreationSerializer(serializers.ModelSerializer):

    is_active_display    = serializers.SerializerMethodField()
    consignee_district_name = serializers.SerializerMethodField()

    class Meta:
        model  = ConsigneeCreation
        fields = [
            "id",
            "consignee_address",
            "consignee_district",
            "consignee_district_name",
            "consignee_pincode",
            "consignee_contactnumber",
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

    def get_consignee_district_name(self, obj):
        """
        PHP datatable query:
        (SELECT district_name FROM district_creation
         WHERE district_creation.unique_id = consignee_creation.consignee_district)
        """
        from master.apps.district.districtmodel import DistrictCreation
        try:
            district = DistrictCreation.objects.get(
                unique_id=obj.consignee_district,
                is_delete=0,
            )
            return district.district_name
        except Exception:
            return ""

    # ------------------------------------------------------------------ #
    #  Field-level validation                                             #
    # ------------------------------------------------------------------ #
    def validate_consignee_address(self, value):
        value = (value or "").strip()
        if not re.fullmatch(r"[A-Za-z0-9, ]+", value):
            raise serializers.ValidationError(
                "Consignee Address allows only alphabets, numbers, spaces, and commas."
            )
        return value

    def validate_consignee_pincode(self, value):
        if not value.isdigit() or len(value) != 6:
            raise serializers.ValidationError("Pincode must be exactly 6 digits.")
        return value

    def validate_consignee_contactnumber(self, value):
        if not value.isdigit() or len(value) != 10:
            raise serializers.ValidationError("Contact number must be exactly 10 digits.")
        return value
