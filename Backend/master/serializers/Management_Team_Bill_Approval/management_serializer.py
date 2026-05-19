from rest_framework import serializers
from master.apps.Management_Team_Bill_Approval.management_model import ManagementApproval

class ManagementApprovalSerializer(serializers.ModelSerializer):
    class Meta:
        model = ManagementApproval
        fields = "__all__"
