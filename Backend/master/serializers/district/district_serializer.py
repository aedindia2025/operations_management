from rest_framework import serializers
from master.apps.district.districtmodel import DistrictCreation


class DistrictCreationSerializer(serializers.ModelSerializer):
    class Meta:
        model  = DistrictCreation
        fields = ['unique_id', 'district_name', 'state_name', 'is_active']


class DistrictInputSerializer(serializers.Serializer):
    district_name = serializers.CharField(max_length=100)
    state_name    = serializers.CharField(max_length=50)   # state unique_id
    is_active     = serializers.ChoiceField(
                        choices=[(1, 'Active'), (0, 'Inactive')], default=1
                    )