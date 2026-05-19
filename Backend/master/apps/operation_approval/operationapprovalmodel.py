import uuid
from django.db import models


class InvoiceCreationMain(models.Model):
    """
    Main invoice table.
    PHP table: invoice_creation_main
    """
    DOC_APPROVAL_CHOICES = [
        (0, 'Pending'),
        (1, 'Approved'),
        (2, 'Not Approved'),
    ]

    unique_id           = models.CharField(max_length=100, unique=True, default=uuid.uuid4, editable=False)
    form_main_unique_id = models.CharField(max_length=100, blank=True, null=True)  # FK → po_form.unique_id
    consignee_unique_id = models.CharField(max_length=100, blank=True, null=True)  # FK → consignee_details_sub
    invoice_auto_id     = models.CharField(max_length=100, blank=True, null=True)  # INV-YYMM-0001
    invoice_no          = models.CharField(max_length=100, blank=True, null=True)
    invoice_date        = models.DateField(null=True, blank=True)
    invoice_value       = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    dc_number           = models.CharField(max_length=100, blank=True, null=True)
    dc_date             = models.DateField(null=True, blank=True)
    team_mem            = models.CharField(max_length=100, blank=True, null=True)  # FK → user.staff_id
    ledger_name         = models.CharField(max_length=255, blank=True, null=True)
    ledger_no           = models.CharField(max_length=100, blank=True, null=True)
    # Approval fields
    doc_approval_sts    = models.IntegerField(choices=DOC_APPROVAL_CHOICES, default=0)
    invoice_doc_status  = models.IntegerField(default=0)
    approved_by         = models.CharField(max_length=255, blank=True, null=True)
    approved_date       = models.DateField(null=True, blank=True)
    reject_reason_elcot = models.TextField(blank=True, null=True)

    is_active  = models.IntegerField(default=1)
    is_delete  = models.IntegerField(default=0)
    created_at = models.DateTimeField(db_column='created', auto_now_add=True)
    updated_at = models.DateTimeField(db_column='updated', auto_now=True)

    class Meta:
        db_table = 'invoice_creation_main'

    def __str__(self):
        return self.invoice_no or self.unique_id

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


class InvoiceCreation(models.Model):
    unique_id = models.CharField(max_length=100, unique=True, default=uuid.uuid4, editable=False)
    dc_num = models.CharField(max_length=100, blank=True, null=True)
    dc_date = models.DateField(null=True, blank=True)
    invoice_no = models.CharField(max_length=100, blank=True, null=True)
    invoice_date = models.DateField(null=True, blank=True)
    ledger_name = models.CharField(max_length=255, blank=True, null=True)
    ledger_no = models.CharField(max_length=100, blank=True, null=True)
    is_delete = models.IntegerField(default=0)

    class Meta:
        db_table = 'invoice_creation'


class InvoiceSublist(models.Model):
    """
    Invoice sublist — DC/IR doc approval status per invoice.
    PHP table: invoice_sublist
    """
    unique_id       = models.CharField(max_length=100, unique=True, default=uuid.uuid4, editable=False)
    invoice_id      = models.CharField(max_length=100)   # FK → invoice_creation_main.unique_id
    dc_num          = models.CharField(max_length=100, blank=True, null=True)
    dc_date         = models.DateField(null=True, blank=True)
    invoice_no      = models.CharField(max_length=100, blank=True, null=True)
    invoice_date    = models.DateField(null=True, blank=True)
    ledger_name     = models.CharField(max_length=255, blank=True, null=True)
    ledger_no       = models.CharField(max_length=100, blank=True, null=True)
    dc_file_name    = models.CharField(max_length=255, blank=True, null=True)
    ir_file_name    = models.CharField(max_length=255, blank=True, null=True)
    file_invoice    = models.CharField(max_length=255, blank=True, null=True)
    invoice_file_org_name = models.CharField(max_length=255, blank=True, null=True)
    doc_approval_sts = models.IntegerField(default=0)
    reject_reason   = models.TextField(blank=True, null=True)
    is_delete       = models.IntegerField(default=0)
    created_at      = models.DateTimeField(auto_now_add=True)
    updated_at      = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'invoice_sublist'

    def __str__(self):
        return self.invoice_id


class InvoiceVerificationTable(models.Model):
    """
    Invoice verification tracking.
    PHP table: invoice_verfication_table
    """
    unique_id        = models.CharField(max_length=100, unique=True, default=uuid.uuid4, editable=False)
    dc_number        = models.CharField(max_length=100, blank=True, null=True)
    doc_approval_sts = models.IntegerField(default=0)
    invoice_doc_status = models.IntegerField(default=0)
    approved_by      = models.CharField(max_length=255, blank=True, null=True)
    approved_date    = models.DateField(null=True, blank=True)
    is_delete        = models.IntegerField(default=0)
    created_at       = models.DateTimeField(auto_now_add=True)
    updated_at       = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'invoice_verfication_table'

    def __str__(self):
        return self.dc_number or self.unique_id
