import uuid

from django.db import models


def _uid():
    return uuid.uuid4().hex[:18]


class TenantCompany(models.Model):
    unique_id = models.CharField(max_length=50, unique=True, default=_uid, editable=False)
    company_code = models.CharField(max_length=50, unique=True)
    company_name = models.CharField(max_length=255)
    legal_name = models.CharField(max_length=255, blank=True, default="")
    contact_name = models.CharField(max_length=150, blank=True, default="")
    contact_email = models.CharField(max_length=150, blank=True, default="")
    contact_no = models.CharField(max_length=20, blank=True, default="")
    gst_no = models.CharField(max_length=30, blank=True, default="")
    pan_no = models.CharField(max_length=30, blank=True, default="")
    address = models.TextField(blank=True, default="")
    db_name = models.CharField(max_length=100, blank=True, default="")
    db_host = models.CharField(max_length=150, blank=True, default="")
    db_port = models.CharField(max_length=10, blank=True, default="")
    db_user = models.CharField(max_length=100, blank=True, default="")
    db_password = models.CharField(max_length=255, blank=True, default="")
    subscription_plan = models.CharField(max_length=50, blank=True, default="standard")
    subscription_status = models.CharField(max_length=30, blank=True, default="active")
    is_active = models.IntegerField(default=1)
    is_delete = models.IntegerField(default=0)
    created = models.DateTimeField(auto_now_add=True)
    updated = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "tenant_company"

    def __str__(self):
        return self.company_name


class TenantBranch(models.Model):
    unique_id = models.CharField(max_length=50, unique=True, default=_uid, editable=False)
    company_id = models.CharField(max_length=50)
    branch_code = models.CharField(max_length=50, blank=True, default="")
    branch_name = models.CharField(max_length=150)
    contact_no = models.CharField(max_length=20, blank=True, default="")
    address = models.TextField(blank=True, default="")
    is_default = models.IntegerField(default=0)
    is_active = models.IntegerField(default=1)
    is_delete = models.IntegerField(default=0)
    created = models.DateTimeField(auto_now_add=True)
    updated = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "tenant_branch"
        indexes = [
            models.Index(fields=["company_id"]),
        ]

    def __str__(self):
        return f"{self.branch_name} ({self.company_id})"
