from django.db import models


# ────────────────────────────────────────────────────────────────────── #
#  dispatch_list  (main dispatch record)                                  #
# ────────────────────────────────────────────────────────────────────── #
class DispatchList(models.Model):
    po_num               = models.CharField(max_length=100)
    po_date              = models.DateField(null=True, blank=True)
    consignee            = models.CharField(max_length=255, blank=True)
    con_address          = models.CharField(max_length=500, blank=True)
    con_contact_number   = models.CharField(max_length=20, blank=True)
    invoice_date         = models.DateField(null=True, blank=True)
    invoice_no           = models.CharField(max_length=100)
    invoice_auto_id      = models.CharField(max_length=100, blank=True)
    stock_id             = models.CharField(max_length=50, blank=True)
    dispatch_date        = models.DateField(null=True, blank=True)
    mode_of_delivery     = models.IntegerField(default=0)  # 1=Hand, 2=Courier
    name_of_courier      = models.CharField(max_length=255, blank=True)
    pod_no               = models.CharField(max_length=100, blank=True)
    status               = models.IntegerField(default=1)
    po_unique_id         = models.CharField(max_length=100, blank=True)
    po_form_unique_id    = models.CharField(max_length=100, blank=True)
    consignee_unique_id  = models.CharField(max_length=100, blank=True)
    file_name            = models.CharField(max_length=255, blank=True)
    file_org_name        = models.CharField(max_length=255, blank=True)
    is_delete            = models.IntegerField(default=0)
    unique_id            = models.CharField(max_length=100, unique=True)
    created_at           = models.DateTimeField(auto_now_add=True)
    updated_at           = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "dispatch_list"

    def __str__(self):
        return f"{self.invoice_no} - {self.po_num}"


# ────────────────────────────────────────────────────────────────────── #
#  invoice_creation_main  (vendor bulk assignment fields)                 #
# ────────────────────────────────────────────────────────────────────── #
class OperationInvoiceCreation(models.Model):
    """
    Existing table — only the fields used in vendor_allocation are listed.
    Vendor allocation updates: bulk_eng_type, bulk_eng_name,
    vendor_bulk_timeline, vendor_bulk_sts, team_mem, ven_assign_date.
    """
    form_main_unique_id    = models.CharField(max_length=100)
    invoice_no             = models.CharField(max_length=100)
    invoice_auto_id        = models.CharField(max_length=100, blank=True)
    dc_number              = models.CharField(max_length=100, blank=True)
    dc_date                = models.DateField(null=True, blank=True)
    po_date                = models.CharField(max_length=50, blank=True)
    invoice_date           = models.CharField(max_length=50, blank=True)
    invoice_qty            = models.IntegerField(default=0)
    invoice_value          = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    invoice_doc_status     = models.IntegerField(default=0)
    dispatch_status        = models.IntegerField(default=0)
    vendor_bulk_sts        = models.IntegerField(default=0)   # 0=Pending 1=Assigned
    bulk_eng_type          = models.CharField(max_length=50, blank=True)
    bulk_eng_name          = models.CharField(max_length=100, blank=True)
    vendor_bulk_timeline   = models.CharField(max_length=100, blank=True)
    vendor_ins_date        = models.DateField(null=True, blank=True)
    team_mem               = models.CharField(max_length=100, blank=True)
    ven_assign_date        = models.DateField(null=True, blank=True)
    date                   = models.DateField(null=True, blank=True)
    consignee_unique_id    = models.CharField(max_length=100, blank=True)
    ledger_name            = models.CharField(max_length=255, blank=True)
    ledger_no              = models.CharField(max_length=100, blank=True)
    ac_team_verifiy_status = models.IntegerField(default=0)
    ac_team_approved_by    = models.CharField(max_length=255, blank=True)
    approved_by            = models.CharField(max_length=255, blank=True)
    approved_date          = models.DateField(null=True, blank=True)
    reject_reason_elcot    = models.TextField(blank=True)
    is_delete              = models.IntegerField(default=0)
    unique_id              = models.CharField(max_length=100, unique=True)
    created_at             = models.CharField(db_column="created", max_length=100, blank=True)
    updated_at             = models.CharField(db_column="updated", max_length=100, blank=True)

    class Meta:
        db_table = "invoice_creation_main"

    def __str__(self):
        return self.invoice_no

    @property
    def file_name(self):
        return ""

    @property
    def dc_file_name(self):
        return ""

    @property
    def ir_file_name(self):
        return ""

    @property
    def file_invoice(self):
        return ""

    @property
    def invoice_file_org_name(self):
        return ""
