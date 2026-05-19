from rest_framework import serializers
from master.apps.account_vertical.accountverticalmodel import AccountVertical


class AccountVerticalSerializer(serializers.ModelSerializer):
    class Meta:
        model  = AccountVertical
        fields = ['unique_id', 'account_name', 'is_active']


class AccountVerticalInputSerializer(serializers.Serializer):
    account_name = serializers.CharField(max_length=100)
    is_active    = serializers.ChoiceField(
                       choices=[(1, 'Active'), (0, 'Inactive')], default=1
                   )