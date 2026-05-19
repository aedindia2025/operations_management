from django.db import models


class PaymentBillSubmissionMain(models.Model):
    id = models.AutoField(primary_key=True)
    unique_id = models.CharField(max_length=100, blank=True, null=True)
    bill_form_main_unique_id = models.CharField(max_length=100, unique=True)
    bill_no = models.CharField(max_length=100, blank=True, null=True)
    consignee_unique_id = models.CharField(max_length=100, blank=True, null=True)
    po_num = models.CharField(max_length=100, blank=True, null=True)
    po_date = models.DateField(blank=True, null=True)
    invoice_no = models.TextField(blank=True, null=True)
    invoice_date = models.DateField(blank=True, null=True)
    invoice_value = models.DecimalField(max_digits=15, decimal_places=2, default=0)
    invoice_qty = models.DecimalField(max_digits=15, decimal_places=2, default=0)
    bill_submission_date = models.DateField(blank=True, null=True)
    e_no = models.CharField(max_length=100, blank=True, null=True)
    payement_receive = models.DecimalField(max_digits=15, decimal_places=2, default=0)
    payment_status = models.IntegerField(default=0)
    payment_date = models.DateField(blank=True, null=True)
    ld_amount = models.DecimalField(max_digits=15, decimal_places=2, default=0)
    ld_days = models.IntegerField(default=0)
    claim_amount = models.DecimalField(max_digits=15, decimal_places=2, default=0)
    file_name = models.CharField(max_length=255, blank=True, null=True)
    file_org_name = models.CharField(max_length=255, blank=True, null=True)
    acc_year = models.CharField(max_length=50, blank=True, null=True)
    is_delete = models.IntegerField(default=0)
    created_at = models.DateTimeField(db_column="created", blank=True, null=True)
    updated_at = models.DateTimeField(db_column="updated", blank=True, null=True)

    class Meta:
        db_table = "bill_submission_main_table"
        managed = False


class PaymentBillSubmissionSub(models.Model):
    id = models.AutoField(primary_key=True)
    unique_id = models.CharField(max_length=100, blank=True, null=True)
    bill_form_unique_id = models.CharField(max_length=100, blank=True, null=True)
    bill_no = models.CharField(max_length=100, blank=True, null=True)
    consignee_unique_id = models.CharField(max_length=100, blank=True, null=True)
    po_num = models.CharField(max_length=100, blank=True, null=True)
    po_date = models.DateField(blank=True, null=True)
    invoice_no = models.CharField(max_length=100, blank=True, null=True)
    invoice_date = models.DateField(blank=True, null=True)
    invoice_value = models.DecimalField(max_digits=15, decimal_places=2, default=0)
    invoice_qty = models.DecimalField(max_digits=15, decimal_places=2, default=0)
    bill_submission_date = models.DateField(blank=True, null=True)
    e_no = models.CharField(max_length=100, blank=True, null=True)
    payment_status = models.IntegerField(default=0)
    payment_date = models.DateField(blank=True, null=True)
    ld_amount = models.DecimalField(max_digits=15, decimal_places=2, default=0)
    ld_days = models.IntegerField(default=0)
    claim_percentage = models.DecimalField(max_digits=6, decimal_places=2, default=0)
    gst = models.DecimalField(max_digits=5, decimal_places=2, default=0)
    gst_value = models.DecimalField(max_digits=15, decimal_places=2, default=0)
    tds = models.DecimalField(max_digits=5, decimal_places=2, default=0)
    tds_value = models.DecimalField(max_digits=15, decimal_places=2, default=0)
    ld = models.DecimalField(max_digits=15, decimal_places=2, default=0)
    tran_amt = models.DecimalField(max_digits=15, decimal_places=2, default=0)
    rem_amt = models.DecimalField(max_digits=15, decimal_places=2, default=0)
    file_name = models.CharField(max_length=255, blank=True, null=True)
    file_org_name = models.CharField(max_length=255, blank=True, null=True)
    acc_year = models.CharField(max_length=50, blank=True, null=True)
    is_delete = models.IntegerField(default=0)
    created_at = models.DateTimeField(db_column="created", blank=True, null=True)
    updated_at = models.DateTimeField(db_column="updated", blank=True, null=True)

    class Meta:
        db_table = "bill_submission_sub"
        managed = False


class PaymentConsigneeDetail(models.Model):
    id = models.AutoField(primary_key=True)
    unique_id = models.CharField(max_length=100, unique=True)
    con_contact_name = models.CharField(max_length=255, blank=True, null=True)
    con_address = models.TextField(blank=True, null=True)
    pincode = models.CharField(db_column="con_pincode", max_length=100, blank=True, null=True)
    contact_number = models.CharField(db_column="con_contact_number", max_length=100, blank=True, null=True)
    email = models.CharField(db_column="cons_email_id", max_length=255, blank=True, null=True)
    district = models.CharField(db_column="con_district", max_length=255, blank=True, null=True)
    state_name = models.CharField(db_column="con_state_name", max_length=100, blank=True, null=True)

    class Meta:
        db_table = "consignee_details_sub"
        managed = False


class PaymentUserScreenPermission(models.Model):
    s_no = models.AutoField(primary_key=True)
    unique_id = models.CharField(max_length=100, blank=True, null=True)
    user_type = models.CharField(max_length=100)
    screen_unique_id = models.CharField(max_length=100)
    action_unique_id = models.CharField(max_length=100)
    is_delete = models.IntegerField(default=0)

    class Meta:
        db_table = "user_screen_permission"
        managed = False
