from django.db import models


class VendorBillVendorCreation(models.Model):
    """Vendor master data (read-only reference table)."""

    unique_id = models.CharField(max_length=100, primary_key=True)
    company_name = models.CharField(max_length=255, blank=True, null=True)
    name = models.CharField(max_length=255, blank=True, null=True)
    contact_no = models.CharField(max_length=50, blank=True, null=True)
    mail_id = models.CharField(max_length=255, blank=True, null=True)
    pan_no = models.CharField(max_length=50, blank=True, null=True)
    gst_no = models.CharField(max_length=50, blank=True, null=True)
    address = models.TextField(blank=True, null=True)
    account_no = models.CharField(max_length=100, blank=True, null=True)
    ifsc_code = models.CharField(max_length=20, blank=True, null=True)
    bank_name = models.CharField(max_length=255, blank=True, null=True)
    branch_name = models.CharField(max_length=255, blank=True, null=True)
    bank_proof = models.CharField(max_length=255, blank=True, null=True)
    pan_attach_file_name = models.CharField(max_length=255, blank=True, null=True)
    acc_holder_name = models.CharField(max_length=255, blank=True, null=True)

    class Meta:
        db_table = "vendor_creation"
        managed = False


class VendorBillCreation(models.Model):
    id = models.BigAutoField(primary_key=True)
    unique_id = models.CharField(max_length=50, unique=True)
    name = models.CharField(max_length=150)
    is_active = models.IntegerField(default=1)
    is_delete = models.CharField(max_length=10, default="0")
    created_at = models.DateTimeField(auto_now_add=True, null=True)
    updated_at = models.DateTimeField(auto_now=True, null=True)

    class Meta:
        db_table = "vendor_bill_creation"


class VendorBillInvoiceVerificationTable(models.Model):
    """Invoice verification table (read/write)."""

    unique_id = models.CharField(max_length=100, primary_key=True)
    engineer_name = models.CharField(max_length=100, blank=True, null=True)
    dc_number = models.CharField(max_length=100, blank=True, null=True)
    invoice_no = models.CharField(max_length=100, blank=True, null=True)
    inv_verfiy_attach = models.CharField(max_length=255, blank=True, null=True)
    inv_verfiy_attach_org_name = models.CharField(max_length=255, blank=True, null=True)
    po_ven_filename = models.CharField(max_length=255, blank=True, null=True)
    po_ven_orgfilename = models.CharField(max_length=255, blank=True, null=True)
    veninvid = models.CharField(max_length=100, blank=True, null=True)
    vendor_inv_attach_approval = models.CharField(max_length=100, blank=True, null=True)
    vendor_inv_attach_approval_date = models.DateField(blank=True, null=True)
    veninvstatus = models.IntegerField(default=0)
    vendor_payment_allocated = models.IntegerField(default=0)
    vendor_bill_no = models.CharField(max_length=100, blank=True, null=True)
    user_vendor_invoice_id = models.CharField(max_length=100, blank=True, null=True)
    signed_complete_status = models.IntegerField(default=0)
    dc_required = models.CharField(max_length=10, blank=True, null=True)

    class Meta:
        db_table = "invoice_verfication_table"
        managed = False


class VendorPaymentMain(models.Model):
    """Main table that groups payment entries per vendor bill."""

    id = models.AutoField(primary_key=True)
    unique_id = models.CharField(max_length=100, unique=True)
    main_unique_id = models.CharField(max_length=100, blank=True, null=True)
    bill_no = models.CharField(max_length=100, blank=True, null=True)
    bill_date = models.DateTimeField(blank=True, null=True)
    po_form_unique_id = models.CharField(max_length=100, blank=True, null=True)
    po_num = models.CharField(max_length=100, blank=True, null=True)
    vendor_id = models.CharField(max_length=100, blank=True, null=True)
    rate = models.DecimalField(max_digits=15, decimal_places=2, default=0)
    gst = models.DecimalField(max_digits=5, decimal_places=2, default=0)
    dc_date = models.CharField(max_length=100, blank=True, null=True)
    total_amount = models.DecimalField(max_digits=15, decimal_places=2, default=0)
    invoice_no = models.TextField(blank=True, null=True)
    dc_num = models.TextField(blank=True, null=True)
    amount = models.DecimalField(max_digits=15, decimal_places=2, default=0)
    invoice_qty = models.DecimalField(max_digits=15, decimal_places=2, default=0)
    inv_verfiy_attach = models.CharField(max_length=255, blank=True, null=True)
    inv_verfiy_attach_org_name = models.CharField(max_length=255, blank=True, null=True)
    veninvverifyid = models.CharField(max_length=100, blank=True, null=True)
    vendor_inv_attach_approval = models.CharField(max_length=100, blank=True, null=True)
    vendor_inv_attach_approval_date = models.DateField(blank=True, null=True)
    veninvstatus = models.IntegerField(default=1)
    vendor_payment_allocated = models.IntegerField(default=1)
    user_vendor_invoice_id = models.CharField(max_length=100, blank=True, null=True)
    vendor_name = models.CharField(max_length=250, blank=True, null=True)
    po_ven_filename = models.CharField(max_length=255, blank=True, null=True)
    po_ven_orgfilename = models.CharField(max_length=255, blank=True, null=True)
    vendor_bill_created_by = models.CharField(max_length=100, blank=True, null=True)
    vendor_bill_created_date = models.DateTimeField(blank=True, null=True)
    acc_year = models.CharField(max_length=50, blank=True, null=True)
    session_id = models.CharField(max_length=50, blank=True, null=True)
    sess_user_type = models.CharField(max_length=50, blank=True, null=True)
    sess_user_id = models.CharField(max_length=50, blank=True, null=True)
    sess_company_id = models.CharField(max_length=50, blank=True, null=True)
    sess_branch_id = models.CharField(max_length=50, blank=True, null=True)
    is_delete = models.IntegerField(default=0)

    class Meta:
        db_table = "vendor_payment_details_main"
        managed = False


class VendorPaymentDetail(models.Model):
    """Sub-table: one row per DC entry inside a vendor bill."""

    id = models.AutoField(primary_key=True)
    unique_id = models.CharField(max_length=100, unique=True)
    main_unique_id = models.CharField(max_length=100, blank=True, null=True)
    bill_no = models.CharField(max_length=100, blank=True, null=True)
    bill_date = models.DateTimeField(blank=True, null=True)
    po_num = models.CharField(max_length=100, blank=True, null=True)
    po_form_unique_id = models.CharField(max_length=100, blank=True, null=True)
    invoice_no = models.CharField(max_length=100, blank=True, null=True)
    invoice_qty = models.DecimalField(max_digits=15, decimal_places=2, default=0)
    dc_num = models.CharField(max_length=100, blank=True, null=True)
    dc_date = models.CharField(max_length=50, blank=True, null=True)
    rate = models.DecimalField(max_digits=15, decimal_places=2, default=0)
    gst = models.DecimalField(max_digits=5, decimal_places=2, default=0)
    amount = models.DecimalField(max_digits=15, decimal_places=2, default=0)
    total_amount = models.DecimalField(max_digits=15, decimal_places=2, default=0)
    vendor_name = models.CharField(max_length=255, blank=True, null=True)
    vendor_id = models.CharField(max_length=100, blank=True, null=True)
    inv_verfiy_attach = models.CharField(max_length=255, blank=True, null=True)
    inv_verfiy_attach_org_name = models.CharField(max_length=255, blank=True, null=True)
    po_ven_filename = models.CharField(max_length=255, blank=True, null=True)
    po_ven_orgfilename = models.CharField(max_length=255, blank=True, null=True)
    veninvverifyid = models.CharField(max_length=100, blank=True, null=True)
    vendor_inv_attach_approval = models.CharField(max_length=100, blank=True, null=True)
    vendor_inv_attach_approval_date = models.DateField(blank=True, null=True)
    veninvstatus = models.IntegerField(default=1)
    vendor_bill_created_by = models.CharField(max_length=100, blank=True, null=True)
    vendor_bill_created_date = models.DateTimeField(blank=True, null=True)
    # Approval workflow fields
    vendor_bill_approval = models.CharField(max_length=100, blank=True, null=True)
    vendor_bill_approval_date = models.DateTimeField(blank=True, null=True)
    vendor_bill_app_status = models.IntegerField(default=0)
    vendor_account_approved_by = models.CharField(max_length=100, blank=True, null=True)
    vendor_account_approval_date = models.DateTimeField(blank=True, null=True)
    acc_ent_sts = models.IntegerField(default=0)
    finance_approved_by = models.CharField(max_length=100, blank=True, null=True)
    finance_approved_date = models.DateTimeField(blank=True, null=True)
    finance_approval = models.IntegerField(default=0)
    managment_team_approvedby = models.CharField(max_length=100, blank=True, null=True)
    managment_team_approvaldate = models.DateTimeField(blank=True, null=True)
    managment_team_approval_sts = models.IntegerField(default=0)
    accounts_approval = models.IntegerField(default=0)
    acctotalpaybleamount = models.DecimalField(
        max_digits=15, decimal_places=2, default=0
    )
    transaction_date = models.DateField(blank=True, null=True)
    transaction_id = models.CharField(max_length=100, blank=True, null=True)
    vendor_bill_reject_reason = models.TextField(blank=True, null=True)
    vendor_bill_rejected_by = models.CharField(max_length=100, blank=True, null=True)
    acc_year = models.CharField(max_length=50, blank=True, null=True)
    session_id = models.CharField(max_length=50, blank=True, null=True)
    sess_user_type = models.CharField(max_length=50, blank=True, null=True)
    sess_user_id = models.CharField(max_length=50, blank=True, null=True)
    sess_company_id = models.CharField(max_length=50, blank=True, null=True)
    sess_branch_id = models.CharField(max_length=50, blank=True, null=True)
    is_delete = models.IntegerField(default=0)
    created = models.DateTimeField(auto_now_add=True, blank=True, null=True)

    class Meta:
        db_table = "vendor_payment_details"
        managed = False


class BillSubmissionMainTable(models.Model):
    id = models.AutoField(primary_key=True)
    unique_id = models.CharField(max_length=100, unique=True)
    bill_form_main_unique_id = models.CharField(max_length=100, blank=True, null=True)
    po_num = models.CharField(max_length=250, blank=True, null=True)
    po_date = models.CharField(max_length=50, blank=True, null=True)
    customer_name = models.CharField(max_length=100, blank=True, null=True)
    con_contact_name = models.CharField(max_length=250, blank=True, null=True)
    con_address = models.TextField(blank=True, null=True)
    bill_no = models.CharField(max_length=100, blank=True, null=True)
    invoice_no = models.TextField(blank=True, null=True)
    invoice_date = models.CharField(max_length=50, blank=True, null=True)
    invoice_value = models.CharField(max_length=250, blank=True, null=True)
    invoice_qty = models.CharField(max_length=50, blank=True, null=True)
    consignee_unique_id = models.CharField(max_length=50, blank=True, null=True)
    claim_amount = models.CharField(max_length=50, blank=True, null=True)
    claimamt = models.CharField(max_length=100, blank=True, null=True)
    bg_num = models.CharField(max_length=200, blank=True, null=True)
    bg_id = models.CharField(max_length=200, blank=True, null=True)
    bg_date = models.CharField(max_length=100, blank=True, null=True)
    bg_value = models.CharField(max_length=100, blank=True, null=True)
    bg_doc = models.CharField(max_length=100, blank=True, null=True)
    bill_checkbox = models.CharField(max_length=50, blank=True, null=True)
    bill_submission_date = models.CharField(max_length=100, blank=True, null=True)
    e_no = models.CharField(max_length=150, blank=True, null=True)
    elcot_ent_status = models.CharField(max_length=20, blank=True, null=True)
    is_active = models.IntegerField(default=0)
    bill_status = models.CharField(max_length=40, blank=True, null=True)
    payment_date = models.CharField(max_length=100, blank=True, null=True)
    bill_created_date = models.DateField(blank=True, null=True)
    payement_receive = models.CharField(max_length=100, blank=True, null=True)
    status = models.CharField(max_length=50, blank=True, null=True)
    file_name = models.CharField(max_length=100, blank=True, null=True)
    file_org_name = models.CharField(max_length=100, blank=True, null=True)
    ld_amount = models.CharField(max_length=100, blank=True, null=True)
    ld_days = models.CharField(max_length=50, blank=True, null=True)
    cancel_invoice_no = models.TextField(blank=True, null=True)
    rem_inv_no = models.TextField(blank=True, null=True)
    dc_number = models.CharField(max_length=30, blank=True, null=True)
    dc_date = models.CharField(max_length=30, blank=True, null=True)
    partial_bill_status = models.CharField(max_length=11, blank=True, null=True)
    inv_cancel_status = models.IntegerField(default=0)
    payment_status = models.IntegerField(default=0)
    is_delete = models.IntegerField(default=0)

    class Meta:
        db_table = "bill_submission_main_table"
        managed = False


class BillSubmissionSub(models.Model):
    id = models.AutoField(primary_key=True)
    unique_id = models.CharField(max_length=100, blank=True, null=True)
    bill_form_unique_id = models.CharField(max_length=50, blank=True, null=True)
    po_num = models.CharField(max_length=250, blank=True, null=True)
    po_date = models.CharField(max_length=100, blank=True, null=True)
    con_contact_name = models.CharField(max_length=100, blank=True, null=True)
    con_address = models.TextField(blank=True, null=True)
    invoice_no = models.CharField(max_length=50, blank=True, null=True)
    invoice_date = models.CharField(max_length=50, blank=True, null=True)
    invoice_value = models.CharField(max_length=250, blank=True, null=True)
    invoice_qty = models.CharField(max_length=50, blank=True, null=True)
    invoice_auto_id = models.CharField(max_length=50, blank=True, null=True)
    bill_checkbox = models.CharField(max_length=50, blank=True, null=True)
    consignee_unique_id = models.CharField(max_length=50, blank=True, null=True)
    bill_submission_date = models.CharField(max_length=150, blank=True, null=True)
    e_no = models.CharField(max_length=100, blank=True, null=True)
    elcot_ent_status = models.CharField(max_length=10, blank=True, null=True)
    payment_status = models.CharField(max_length=50, blank=True, null=True)
    payment_date = models.CharField(max_length=50, blank=True, null=True)
    payment_received = models.CharField(max_length=50, blank=True, null=True)
    is_active = models.IntegerField(default=0)
    bill_status = models.CharField(max_length=100, blank=True, null=True)
    sd_status = models.CharField(max_length=10, blank=True, null=True)
    status = models.CharField(max_length=50, blank=True, null=True)
    ld_amount = models.CharField(max_length=100, blank=True, null=True)
    ld_days = models.CharField(max_length=50, blank=True, null=True)
    ins_unique_id = models.CharField(max_length=50, blank=True, null=True)
    file_name = models.CharField(max_length=100, blank=True, null=True)
    file_org_name = models.CharField(max_length=100, blank=True, null=True)
    claim_status = models.IntegerField(default=0)
    claim_percentage = models.IntegerField(default=0)
    claimamt = models.CharField(max_length=100, blank=True, null=True)
    gst = models.CharField(max_length=250, blank=True, null=True)
    gst_value = models.CharField(max_length=250, blank=True, null=True)
    tds = models.CharField(max_length=250, blank=True, null=True)
    tds_value = models.CharField(max_length=250, blank=True, null=True)
    ld = models.CharField(max_length=250, blank=True, null=True)
    rem_amt = models.IntegerField(default=0)
    trans_id = models.CharField(max_length=100, blank=True, null=True)
    trans_date = models.CharField(max_length=50, blank=True, null=True)
    tran_amt = models.IntegerField(default=0)
    ttl_amount = models.CharField(max_length=100, blank=True, null=True)
    balance_amount = models.CharField(max_length=100, blank=True, null=True)
    partial_bill_status = models.CharField(max_length=11, blank=True, null=True)
    bill_no = models.CharField(max_length=100, blank=True, null=True)
    bill_created_date = models.DateField(blank=True, null=True)
    is_delete = models.IntegerField(default=0)
    inv_cancel_status = models.IntegerField(default=0)

    class Meta:
        db_table = "bill_submission_sub"
        managed = False


class BillSubmissionForm(models.Model):
    id = models.AutoField(primary_key=True)
    unique_id = models.CharField(max_length=100, blank=True, null=True)
    bill_form_main_unique_id = models.CharField(max_length=100, blank=True, null=True)
    po_num = models.CharField(max_length=250, blank=True, null=True)
    po_date = models.CharField(max_length=100, blank=True, null=True)
    customer_name = models.CharField(max_length=100, blank=True, null=True)
    con_contact_name = models.CharField(max_length=250, blank=True, null=True)
    con_address = models.TextField(blank=True, null=True)
    invoice_no = models.CharField(max_length=50, blank=True, null=True)
    invoice_date = models.CharField(max_length=50, blank=True, null=True)
    invoice_value = models.CharField(max_length=250, blank=True, null=True)
    invoice_qty = models.CharField(max_length=50, blank=True, null=True)
    file_name = models.CharField(max_length=100, blank=True, null=True)
    consignee_unique_id = models.CharField(max_length=50, blank=True, null=True)
    scanned_dc_copy = models.CharField(max_length=100, blank=True, null=True)
    dc_original_name = models.CharField(max_length=100, blank=True, null=True)
    snr_original_name = models.CharField(max_length=100, blank=True, null=True)
    scanned_snr_copy = models.CharField(max_length=100, blank=True, null=True)
    scanned_ir_copy = models.CharField(max_length=100, blank=True, null=True)
    ir_original_name = models.CharField(max_length=100, blank=True, null=True)
    invoice_copy = models.CharField(max_length=100, blank=True, null=True)
    invoice_original_name = models.CharField(max_length=100, blank=True, null=True)
    installation_reference_no = models.CharField(max_length=50, blank=True, null=True)
    supplier_invoice_number = models.CharField(max_length=50, blank=True, null=True)
    claim_amount = models.CharField(max_length=50, blank=True, null=True)
    bill_status = models.CharField(max_length=50, blank=True, null=True)
    bill_no = models.CharField(max_length=100, blank=True, null=True)
    partial_bill_status = models.IntegerField(default=0)
    claim_amt = models.CharField(max_length=100, blank=True, null=True)
    bill_reject_reason = models.TextField(blank=True, null=True)
    payment_cancel_reason = models.TextField(blank=True, null=True)
    dc_number = models.CharField(max_length=20, blank=True, null=True)
    dc_date = models.CharField(max_length=30, blank=True, null=True)
    is_active = models.IntegerField(default=0)
    status = models.CharField(max_length=50, blank=True, null=True)
    ins_unique_id = models.CharField(max_length=100, blank=True, null=True)
    is_delete = models.IntegerField(default=0)
    inv_cancel_status = models.IntegerField(default=0)

    class Meta:
        db_table = "bill_submission_form"
        managed = False


class VendorBillSignDocVerificationDetail(models.Model):
    id = models.AutoField(primary_key=True)
    unique_id = models.CharField(max_length=100, blank=True, null=True)
    form_main_unique_id = models.CharField(max_length=100, blank=True, null=True)
    invoice_no = models.CharField(max_length=100, blank=True, null=True)
    bill_status = models.IntegerField(default=0)
    bill_no = models.CharField(max_length=100, blank=True, null=True)
    inv_cancel_status = models.IntegerField(default=0)
    inv_cancel_reason = models.TextField(blank=True, null=True)
    is_delete = models.IntegerField(default=0)

    class Meta:
        db_table = "sign_doc_verification_detail"
        managed = False
