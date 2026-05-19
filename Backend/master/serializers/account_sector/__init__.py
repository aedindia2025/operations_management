from rest_framework import serializers
from master.apps.account_sector.accountsectormodel import AccountSector


class AccountSectorSerializer(serializers.ModelSerializer):
    class Meta:
        model  = AccountSector
        fields = ['unique_id', 'sector_name', 'is_active']


class AccountSectorInputSerializer(serializers.Serializer):
    sector_name = serializers.CharField(max_length=100)
    is_active   = serializers.ChoiceField(
                      choices=[(1, 'Active'), (0, 'Inactive')], default=1
                  )