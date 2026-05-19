from rest_framework import serializers
from master.apps.vendor_creation.vendormodel import VendorCreation


class VendorCreationSerializer(serializers.ModelSerializer):

    state_name_display    = serializers.SerializerMethodField()
    district_name_display = serializers.SerializerMethodField()
    is_active_display     = serializers.SerializerMethodField()

    class Meta:
        model  = VendorCreation
        fields = [
            'unique_id',
            'vendor_user_type_unique_id',
            'vendor_id',
            'company_name',
            'name',
            'contact_no',
            'alt_contact_no',
            'mail_id',
            'pan_no',
            'gst_no',
            'address',
            'state_name',
            'district_name',
            'zone_name',
            'pincode',
            'bank_name',
            'branch_name',
            'account_no',
            'ifsc_code',
            'acc_holder_name',
            'user_name',
            'password',
            'confirm_password',
            'pan_attach_file_name',
            'pan_attach_file_org_name',
            'bank_proof',
            'bank_proof_org_name',
            'is_active',
            'is_delete',
            'state_name_display',
            'district_name_display',
            'is_active_display',
        ]
        read_only_fields = ['unique_id']

    # ── Display helpers ──────────────────────────────────────── #
    def get_state_name_display(self, obj):
        try:
            from master.apps.state.statemodel import StateCreation
            state = StateCreation.objects.get(unique_id=obj.state_name)
            return state.state_name
        except Exception:
            return obj.state_name

    def get_district_name_display(self, obj):
        try:
            from master.apps.district.districtmodel import DistrictCreation
            district = DistrictCreation.objects.get(unique_id=obj.district_name)
            return district.district_name
        except Exception:
            return obj.district_name

    def get_is_active_display(self, obj):
        return "Active" if obj.is_active == 1 else "Inactive"

    def validate_contact_no(self, value):
        value = str(value or "").strip()
        if not value:
            raise serializers.ValidationError("Contact No is required.")
        if not value.isdigit() or len(value) != 10 or value[0] not in "6789":
            raise serializers.ValidationError("Contact No must be 10 digits and start with 6, 7, 8, or 9.")
        return value

    def validate_alt_contact_no(self, value):
        value = str(value or "").strip()
        if not value:
            return value
        if not value.isdigit() or len(value) != 10 or value[0] not in "6789":
            raise serializers.ValidationError("Alt Contact No must be 10 digits and start with 6, 7, 8, or 9.")
        return value
