from rest_framework import serializers
from master.apps.city.citymodel import CityCreation


class CityCreationSerializer(serializers.ModelSerializer):

    state_name_display    = serializers.SerializerMethodField()
    district_name_display = serializers.SerializerMethodField()
    is_active_display     = serializers.SerializerMethodField()

    class Meta:
        model  = CityCreation
        fields = [
            'unique_id',
            'state_name',
            'district_name',
            'city_name',
            'is_active',
            'is_delete',
            'state_name_display',
            'district_name_display',
            'is_active_display',
        ]
        read_only_fields = ['unique_id']

    # ------------------------------------------------------------------ #
    #  Display helpers (join state / district names for list view)        #
    # ------------------------------------------------------------------ #
    def get_state_name_display(self, obj):
        from master.apps.state.statemodel import StateCreation
        try:
            state = StateCreation.objects.get(unique_id=obj.state_name)
            return state.state_name
        except Exception:
            return obj.state_name

    def get_district_name_display(self, obj):
        from master.apps.district.districtmodel import DistrictCreation
        try:
            district = DistrictCreation.objects.get(unique_id=obj.district_name)
            return district.district_name
        except Exception:
            return obj.district_name

    def get_is_active_display(self, obj):
        return "Active" if obj.is_active == 1 else "Inactive"

    # ------------------------------------------------------------------ #
    #  Validation – duplicate city name check                             #
    # ------------------------------------------------------------------ #
    def validate_city_name(self, value):
        request  = self.context.get('request')
        unique_id = self.instance.unique_id if self.instance else None

        qs = CityCreation.objects.filter(
            city_name__iexact=value,
            is_delete=0
        )
        if unique_id:
            qs = qs.exclude(unique_id=unique_id)

        if qs.exists():
            raise serializers.ValidationError("City name already exists.")
        return value