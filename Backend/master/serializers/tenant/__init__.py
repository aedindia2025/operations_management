from rest_framework import serializers

from master.apps.tenant.tenantmodel import TenantBranch, TenantCompany


class TenantCompanySerializer(serializers.ModelSerializer):
    class Meta:
        model = TenantCompany
        fields = [
            "unique_id",
            "company_code",
            "company_name",
            "legal_name",
            "contact_name",
            "contact_email",
            "contact_no",
            "gst_no",
            "pan_no",
            "address",
            "db_name",
            "db_host",
            "db_port",
            "db_user",
            "subscription_plan",
            "subscription_status",
            "is_active",
            "is_delete",
            "created",
            "updated",
        ]
        read_only_fields = ["unique_id", "created", "updated"]


class TenantBranchSerializer(serializers.ModelSerializer):
    class Meta:
        model = TenantBranch
        fields = [
            "unique_id",
            "company_id",
            "branch_code",
            "branch_name",
            "contact_no",
            "address",
            "is_default",
            "is_active",
            "is_delete",
            "created",
            "updated",
        ]
        read_only_fields = ["unique_id", "created", "updated"]
