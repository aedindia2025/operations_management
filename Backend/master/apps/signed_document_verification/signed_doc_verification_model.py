from django.db import models


class SignDocVerificationDetail(models.Model):
    """
    Maps to MySQL table: sign_doc_verification_detail
    Stores each verification submission (DC / IR / SNR).
    """

    unique_id                = models.CharField(max_length=100, primary_key=True)

    # PO / Invoice linkage
    form_main_unique_id      = models.CharField(max_length=100, blank=True, null=True)
    po_num                   = models.CharField(max_length=100, blank=True, null=True)
    po_date                  = models.CharField(max_length=20,  blank=True, null=True)
    invoice_no               = models.CharField(max_length=100, blank=True, null=True)
    bill_no                  = models.CharField(max_length=100, blank=True, null=True)
    dc_number                = models.CharField(max_length=100, blank=True, null=True)
    invoice_date             = models.DateField(blank=True, null=True)

    # Consignee
    con_contact_name         = models.CharField(max_length=255, blank=True, null=True)
    con_address              = models.TextField(blank=True, null=True)
    con_unique_id            = models.CharField(max_length=100, blank=True, null=True)

    # DC document
    dc_received_status       = models.CharField(max_length=50,  blank=True, null=True)
    dc_signed_date           = models.DateField(blank=True, null=True)

    # IR document
    ir_status                = models.CharField(max_length=50,  blank=True, null=True)
    ir_signed_date           = models.DateField(blank=True, null=True)

    # SNR document
    snr_status               = models.CharField(max_length=50,  blank=True, null=True)
    snr_signed_date          = models.DateField(blank=True, null=True)
    snr_verify_status        = models.IntegerField(default=0)

    # Product / BG
    po_product_name          = models.CharField(max_length=255, blank=True, null=True)
    with_bg                  = models.CharField(max_length=10,  blank=True, null=True)
    without_bg               = models.CharField(max_length=10,  blank=True, null=True)

    # Verification flags
    # '0'=Pending  '1'=Mismatch  '2'=Verified
    status_app               = models.CharField(max_length=10,  blank=True, null=True)
    reject_reason            = models.TextField(blank=True, null=True)
    doc_chn                  = models.CharField(max_length=255, blank=True, null=True)

    # Internal tracking flags (sts / sts1 / sts2)
    sts                      = models.CharField(max_length=10,  blank=True, null=True)
    sts1                     = models.CharField(max_length=10,  blank=True, null=True)
    sts2                     = models.CharField(max_length=10,  blank=True, null=True)

    ins_unique_id            = models.CharField(max_length=100, blank=True, null=True)

    # Approval meta
    inv_verify_approvedby    = models.CharField(max_length=255, blank=True, null=True)
    inv_verify_approved_date = models.DateTimeField(blank=True, null=True)
    inv_verify_status        = models.IntegerField(default=0)

    # Soft delete
    is_delete                = models.IntegerField(default=0)

    class Meta:
        db_table = "sign_doc_verification_detail"
        managed  = False

    def __str__(self):
        return f"{self.invoice_no} | {self.dc_number}"


class InstallationDetailsSublist(models.Model):
    """
    Maps to MySQL table: installation_details_sublist
    Tracks document_verification_status per installation sub-record.
    """

    unique_id                    = models.CharField(max_length=100, primary_key=True)
    po_form_unique_id            = models.CharField(max_length=100, blank=True, null=True)
    consignee_unique_id          = models.CharField(max_length=100, blank=True, null=True)
    invoice_no                   = models.CharField(max_length=100, blank=True, null=True)
    dc_number                    = models.CharField(max_length=100, blank=True, null=True)
    ins_unique_id                = models.CharField(max_length=100, blank=True, null=True)
    documents_type1              = models.CharField(max_length=10,  blank=True, null=True)

    # '0'=Pending  '1'=Mismatch  '2'=Verified
    document_verification_status = models.CharField(max_length=10,  blank=True, null=True)

    sign_mismatch_status         = models.CharField(max_length=10,  blank=True, null=True)
    sign_reject_reason           = models.TextField(blank=True, null=True)

    is_delete                    = models.IntegerField(default=0)

    class Meta:
        db_table = "installation_details_sublist"
        managed  = False

    def __str__(self):
        return f"{self.invoice_no} | {self.dc_number}"


class InstallationDetails(models.Model):
    """
    Maps to MySQL table: installation_details
    Main installation record — cleared when mismatch is detected.
    """

    unique_id              = models.CharField(max_length=100, primary_key=True)
    po_form_unique_id      = models.CharField(max_length=100, blank=True, null=True)
    consignee_unique_id    = models.CharField(max_length=100, blank=True, null=True)
    invoice_no             = models.CharField(max_length=100, blank=True, null=True)
    dc_number              = models.CharField(max_length=100, blank=True, null=True)

    # DC document fields
    dc_file                = models.TextField(blank=True, null=True)
    dc_received_sts        = models.CharField(max_length=50,  blank=True, null=True)
    dc_cus_signed_date     = models.DateField(blank=True, null=True)
    dc_original_name       = models.TextField(blank=True, null=True)
    documents_type         = models.CharField(max_length=50, blank=True, null=True)
    dc_required            = models.CharField(max_length=10, blank=True, null=True)

    # IR document fields
    ir_file                = models.TextField(blank=True, null=True)
    ir_rec_status          = models.CharField(max_length=50,  blank=True, null=True)
    ir_cus_signed_date     = models.DateField(blank=True, null=True)
    ir_original_name       = models.TextField(blank=True, null=True)
    documents_type1        = models.CharField(max_length=50, blank=True, null=True)

    # SNR document fields
    snr_file               = models.TextField(blank=True, null=True)
    snr_rec_status         = models.CharField(max_length=50,  blank=True, null=True)
    snr_cus_signed_date    = models.DateField(blank=True, null=True)
    snr_original_name      = models.TextField(blank=True, null=True)
    documents_type2        = models.CharField(max_length=50, blank=True, null=True)
    snr_verify_status      = models.IntegerField(default=0)

    sign_mismatch_status   = models.CharField(max_length=10,  blank=True, null=True)
    sign_reject_reason     = models.TextField(blank=True, null=True)

    is_delete              = models.IntegerField(default=0)

    class Meta:
        db_table = "installation_details"
        managed  = False

    def __str__(self):
        return f"{self.invoice_no} | {self.dc_number}"


class DcIrDocDispatchDetails(models.Model):
    """
    Maps to MySQL table: dc_ir_doc_dispatch_details
    Tracks DC / IR / SNR courier dispatch info per invoice+dc_number.
    """

    unique_id           = models.CharField(max_length=100, primary_key=True)
    po_form_unique_id   = models.CharField(max_length=100, blank=True, null=True)
    consignee_unique_id = models.CharField(max_length=100, blank=True, null=True)
    invoice_no          = models.CharField(max_length=100, blank=True, null=True)
    dc_number           = models.CharField(max_length=100, blank=True, null=True)

    # DC dispatch
    dc_dispatch_mode    = models.CharField(max_length=50,  blank=True, null=True)
    name_of_courier     = models.CharField(max_length=255, blank=True, null=True)
    dc_pod_no           = models.CharField(max_length=100, blank=True, null=True)
    dc_pod_date         = models.DateField(blank=True, null=True)

    # IR dispatch
    ir_dispatch_mode    = models.CharField(max_length=50,  blank=True, null=True)
    ins_name_of_courier = models.CharField(max_length=255, blank=True, null=True)
    ir_pod_no           = models.CharField(max_length=100, blank=True, null=True)
    ir_pod_date         = models.DateField(blank=True, null=True)

    # SNR dispatch
    snr_dispatch_mode   = models.CharField(max_length=50,  blank=True, null=True)
    snr_name_courier    = models.CharField(max_length=255, blank=True, null=True)
    snr_pod_no          = models.CharField(max_length=100, blank=True, null=True)
    snr_pod_date        = models.DateField(blank=True, null=True)

    sign_mismatch_status = models.CharField(max_length=10, blank=True, null=True)
    sign_reject_reason   = models.TextField(blank=True, null=True)

    is_delete            = models.IntegerField(default=0)

    class Meta:
        db_table = "dc_ir_doc_dispatch_details"
        managed  = False

    def __str__(self):
        return f"{self.invoice_no} | {self.dc_number}"


class DcNumStatus(models.Model):
    """
    Maps to MySQL table: dc_num_status
    Tracks signed_complete_status per PO / invoice.
    """

    dc_number              = models.CharField(max_length=100, primary_key=True)
    form_main_unique_id    = models.CharField(max_length=100, blank=True, null=True)
    invoice_no             = models.CharField(max_length=100, blank=True, null=True)
    signed_complete_status = models.CharField(max_length=10,  blank=True, null=True)
    dc_sign_doc_date       = models.DateTimeField(blank=True, null=True)

    class Meta:
        db_table = "dc_num_status"
        managed  = False

    def __str__(self):
        return self.dc_number


class SignedDocInvoiceVerificationTable(models.Model):
    """
    Maps to MySQL table: invoice_verfication_table
    Updated when signed_complete_status is set to 2.
    """

    unique_id              = models.CharField(max_length=100, primary_key=True)
    form_main_unique_id    = models.CharField(max_length=100, blank=True, null=True)
    invoice_no             = models.CharField(max_length=100, blank=True, null=True)
    signed_complete_status = models.CharField(max_length=10,  blank=True, null=True)

    class Meta:
        db_table = "invoice_verfication_table"
        managed  = False

    def __str__(self):
        return f"{self.form_main_unique_id} | {self.invoice_no}"
