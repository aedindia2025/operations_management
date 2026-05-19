from rest_framework import serializers
from master.apps.Accounts_Team_Bill_Approval.accounts_team_model import AccountsTeamBillApproval

class AccountsTeamBillApprovalSerializer(serializers.ModelSerializer):
    class Meta:
        model = AccountsTeamBillApproval
        fields = "__all__"
