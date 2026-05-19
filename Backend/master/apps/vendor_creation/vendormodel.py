import uuid
from django.db import models


def _uid():
    return uuid.uuid4().hex[:18]


class VendorCreation(models.Model):
    unique_id                  = models.CharField(max_length=100, unique=True, default=_uid, editable=False)
    vendor_user_type_unique_id = models.CharField(max_length=100, blank=True, null=True)  # FK user_type
    vendor_id                  = models.CharField(max_length=100, blank=True, null=True)
    company_name               = models.CharField(max_length=255)
    name                       = models.CharField(max_length=255)
    contact_no                 = models.CharField(max_length=15)
    alt_contact_no             = models.CharField(max_length=15,  blank=True, null=True)
    mail_id                    = models.CharField(max_length=255, blank=True, null=True)
    pan_no                     = models.CharField(max_length=20,  blank=True, null=True)
    gst_no                     = models.CharField(max_length=20,  blank=True, null=True)
    address                    = models.TextField(blank=True, null=True)
    state_name                 = models.CharField(max_length=100, blank=True, null=True)  # FK state unique_id
    district_name              = models.CharField(max_length=100, blank=True, null=True)  # FK district unique_id
    zone_name                  = models.CharField(max_length=100, blank=True, null=True)
    pincode                    = models.CharField(max_length=10,  blank=True, null=True)
    # Bank details
    bank_name                  = models.CharField(max_length=255, blank=True, null=True)
    branch_name                = models.CharField(max_length=255, blank=True, null=True)
    account_no                 = models.CharField(max_length=30,  blank=True, null=True)
    ifsc_code                  = models.CharField(max_length=20,  blank=True, null=True)
    acc_holder_name            = models.CharField(max_length=255, blank=True, null=True)
    # Login credentials
    user_name                  = models.CharField(max_length=100, blank=True, null=True)
    password                   = models.CharField(max_length=255, blank=True, null=True)
    confirm_password           = models.CharField(max_length=255, blank=True, null=True)
    # File attachments
    pan_attach_file_name       = models.CharField(max_length=255, blank=True, null=True)
    pan_attach_file_org_name   = models.CharField(max_length=255, blank=True, null=True)
    bank_proof                 = models.CharField(max_length=255, blank=True, null=True)
    bank_proof_org_name        = models.CharField(max_length=255, blank=True, null=True)

    is_active  = models.IntegerField(default=1)   # 1=Active 0=Inactive
    is_delete  = models.IntegerField(default=0)   # 0=Not Deleted 1=Deleted
    acc_year   = models.CharField(max_length=50, blank=True, default="")
    session_id = models.CharField(max_length=50, blank=True, default="")
    sess_user_type = models.CharField(max_length=50, blank=True, default="")
    sess_user_id = models.CharField(max_length=50, blank=True, default="")
    sess_company_id = models.CharField(max_length=50, blank=True, default="")
    sess_branch_id = models.CharField(max_length=50, blank=True, default="")
    created_at = models.DateTimeField(db_column="created", auto_now_add=True)
    updated_at = models.DateTimeField(db_column="updated", auto_now=True)

    class Meta:
        db_table = 'vendor_creation'

    def __str__(self):
        return self.company_name

    @property
    def is_authenticated(self):
        return True

    @property
    def is_anonymous(self):
        return False

    @property
    def staff_name(self):
        return self.name or self.company_name or self.user_name or ""

    @property
    def staff_id(self):
        return self.vendor_id or self.unique_id

    @property
    def user_type_unique_id(self):
        return self.vendor_user_type_unique_id or ""
