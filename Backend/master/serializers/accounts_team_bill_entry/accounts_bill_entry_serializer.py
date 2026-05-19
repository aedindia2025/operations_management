from rest_framework import serializers
from master.apps.accounts_team_bill_entry.accounts_bill_entry_model import AccountsTeamBillEntry

class AccountsTeamBillEntrySerializer(serializers.ModelSerializer):
    class Meta:
        model = AccountsTeamBillEntry
        fields = "__all__"