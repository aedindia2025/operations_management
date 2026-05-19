from rest_framework import serializers
from master.apps.vendor_bill_creation.vendorbillcreationmodel import VendorBillCreation


class VendorBillCreationSerializer(serializers.ModelSerializer):
    is_active_display = serializers.SerializerMethodField()

    class Meta:
        model = VendorBillCreation
        fields = ["unique_id", "name", "is_active", "is_active_display"]

    def get_is_active_display(self, obj):
        return "Active" if int(obj.is_active) == 1 else "Inactive"


class VendorBillCreationInputSerializer(serializers.Serializer):
    name = serializers.CharField(max_length=150)
    is_active = serializers.ChoiceField(choices=[(1, "Active"), (0, "Inactive")], default=1)
