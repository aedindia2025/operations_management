from rest_framework import serializers

from master.apps.pincode_creation.pincodemodel import PincodeCreation


class PincodeCreationSerializer(serializers.ModelSerializer):
    state_name_display = serializers.SerializerMethodField()
    district_name_display = serializers.SerializerMethodField()
    city_name_display = serializers.SerializerMethodField()
    is_active_display = serializers.SerializerMethodField()

    class Meta:
        model = PincodeCreation
        fields = [
            "unique_id",
            "state_name",
            "district_name",
            "city_name",
            "pincode",
            "is_active",
            "is_delete",
            "state_name_display",
            "district_name_display",
            "city_name_display",
            "is_active_display",
        ]
        read_only_fields = ["unique_id"]

    def get_state_name_display(self, obj):
        from master.apps.state.statemodel import StateCreation

        try:
            state = (
                StateCreation.objects
                .filter(unique_id=obj.state_name, is_delete=0)
                .order_by("-id")
                .first()
            )
            return state.state_name if state else obj.state_name
        except Exception:
            return obj.state_name

    def get_district_name_display(self, obj):
        from master.apps.district.districtmodel import DistrictCreation

        try:
            district = (
                DistrictCreation.objects
                .filter(unique_id=obj.district_name, is_delete=0)
                .order_by("-id")
                .first()
            )
            return district.district_name if district else obj.district_name
        except Exception:
            return obj.district_name

    def get_city_name_display(self, obj):
        from master.apps.city.citymodel import CityCreation

        try:
            city = (
                CityCreation.objects
                .filter(unique_id=obj.city_name, is_delete=0)
                .order_by("-id")
                .first()
            )
            return city.city_name if city else obj.city_name
        except Exception:
            return obj.city_name

    def get_is_active_display(self, obj):
        return "Active" if obj.is_active == 1 else "Inactive"

    def validate_pincode(self, value):
        value = (value or "").strip()
        if not value.isdigit() or len(value) != 6:
            raise serializers.ValidationError("Pincode must be exactly 6 digits.")

        qs = PincodeCreation.objects.filter(pincode=value, is_delete=0)
        if self.instance:
            qs = qs.exclude(unique_id=self.instance.unique_id)
        if qs.exists():
            raise serializers.ValidationError("Pincode already exists.")
        return value
