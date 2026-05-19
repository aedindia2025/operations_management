import uuid
from django.db import models


def _uid():
    return uuid.uuid4().hex[:18]


def _item_uid():
    return f"item_{uuid.uuid4().hex[:12]}"


class ItemCreation(models.Model):
    """
    Main tender / item creation table.
    PHP table: item_creation
    """
    TENDER_TYPE_CHOICES = [
        (1, 'Open Tender'),
        (2, 'Limited Tender'),
    ]

    unique_id              = models.CharField(max_length=100, unique=True, default=_uid, editable=False)
    tender_name            = models.CharField(max_length=255)
    tender_code            = models.CharField(max_length=100)
    tender_no              = models.CharField(max_length=100)
    tender_type            = models.IntegerField(choices=TENDER_TYPE_CHOICES, default=1)
    validity_from          = models.DateField(null=True, blank=True)
    validity_to            = models.DateField(null=True, blank=True)
    validity_date_extension = models.DateField(null=True, blank=True)
    is_active              = models.IntegerField(default=1)   # 1=Active 0=Inactive
    is_delete              = models.IntegerField(default=0)   # 0=Not Deleted 1=Deleted
    acc_year               = models.CharField(max_length=50, blank=True, default="")
    session_id             = models.CharField(max_length=50, blank=True, default="")
    sess_user_type         = models.CharField(max_length=50, blank=True, default="")
    sess_user_id           = models.CharField(max_length=50, blank=True, default="")
    sess_company_id        = models.CharField(max_length=50, blank=True, default="")
    sess_branch_id         = models.CharField(max_length=50, blank=True, default="")
    created_at             = models.DateTimeField(auto_now_add=True, db_column='created')
    updated_at             = models.DateTimeField(auto_now=True, db_column='updated')

    class Meta:
        db_table = 'item_creation'

    def __str__(self):
        return self.tender_name


class ItemCreationSub(models.Model):
    """
    Sub items (item details) linked to a tender.
    PHP table: item_creation_sub
    """
    unique_id           = models.CharField(max_length=100, unique=True, default=_item_uid, editable=False)
    tender_code         = models.CharField(max_length=100)          # FK → ItemCreation.tender_code
    item_code           = models.CharField(max_length=100)
    item_description    = models.CharField(max_length=500, blank=True, null=True)
    item_specification  = models.TextField(blank=True, null=True)
    brand               = models.CharField(max_length=255, blank=True, null=True)
    product_category    = models.CharField(max_length=255, blank=True, null=True)
    short_category      = models.CharField(max_length=255, blank=True, null=True)
    rc_net_price        = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    gst                 = models.DecimalField(max_digits=5,  decimal_places=2, default=0)
    rc_unit_price       = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    warranty_in_yrs     = models.CharField(max_length=100, blank=True, null=True)
    is_active           = models.IntegerField(default=1)
    is_delete           = models.IntegerField(default=0)
    acc_year            = models.CharField(max_length=50, blank=True, default="")
    session_id          = models.CharField(max_length=50, blank=True, default="")
    sess_user_type      = models.CharField(max_length=50, blank=True, default="")
    sess_user_id        = models.CharField(max_length=50, blank=True, default="")
    sess_company_id     = models.CharField(max_length=50, blank=True, default="")
    sess_branch_id      = models.CharField(max_length=50, blank=True, default="")
    created_at          = models.DateTimeField(auto_now_add=True, db_column='created')
    updated_at          = models.DateTimeField(auto_now=True, db_column='updated')

    class Meta:
        db_table = 'item_creation_sub'

    def __str__(self):
        return f"{self.tender_code} - {self.item_code}"
