from rest_framework import serializers
from master.models import StateCreation


class StateCreationSerializer(serializers.ModelSerializer):
    class Meta:
        model  = StateCreation
        fields = ['unique_id', 'state_name', 'short_name', 'is_active']


class StateInputSerializer(serializers.Serializer):
    state_name = serializers.CharField(max_length=100)
    short_name = serializers.CharField(max_length=20, required=False, allow_blank=True)
    is_active  = serializers.ChoiceField(choices=[(1, 'Active'), (0, 'Inactive')], default=1)