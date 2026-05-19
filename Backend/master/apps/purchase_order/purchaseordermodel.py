import uuid

from django.db import models


def _uid():
    return uuid.uuid4().hex[:18]


class PurchaseOrder(models.Model):
    id = models.AutoField(primary_key=True)
    unique_id = models.CharField(max_length=50, unique=True, default=_uid, editable=False)
    po_unique_id = models.CharField(max_length=50)
    type_of_po = models.IntegerField(default=1, blank=True, null=True)
    po_num = models.CharField(max_length=250)
    po_date = models.DateField()
    department = models.CharField(max_length=250)
    gst_option = models.CharField(max_length=10)
    gst_value = models.CharField(max_length=100, blank=True, null=True)
    executive_name = models.CharField(max_length=250)
    bill_address = models.CharField(max_length=250)
    contact_name = models.CharField(max_length=250)
    contact_number = models.CharField(max_length=100)
    landline_number = models.CharField(max_length=100, blank=True, null=True)
    acc_vertical = models.CharField(max_length=30, blank=True, null=True)
    acc_sector = models.CharField(max_length=30, blank=True, null=True)
    email = models.CharField(max_length=100)
    district = models.CharField(max_length=250)
    pin = models.CharField(max_length=100)
    po_prepared_by = models.CharField(max_length=100, blank=True, null=True)
    po_type = models.CharField(max_length=100)
    no_of_po = models.CharField(max_length=100)
    total_qty = models.CharField(max_length=50, blank=True, null=True)
    total_amount = models.CharField(max_length=255, blank=True, null=True)
    delivery_due_dates = models.CharField(max_length=100, blank=True, null=True)
    ld_per_day = models.CharField(max_length=100, blank=True, null=True)
    ld_maximum_val = models.CharField(max_length=100, blank=True, null=True)
    warranty = models.CharField(max_length=100, blank=True, null=True)
    warranty_duration = models.CharField(max_length=100, blank=True, null=True)
    ins_reqired = models.CharField(max_length=100, blank=True, null=True)
    insurence_required = models.CharField(max_length=10, blank=True, null=True)
    insurence_types = models.TextField(blank=True, null=True)
    other_insurance_type = models.TextField(blank=True, null=True)
    ld_required = models.CharField(max_length=10, blank=True, null=True)
    ld_installation_due_date = models.CharField(max_length=20, blank=True, null=True)
    ld_delivery_due_date = models.CharField(max_length=20, blank=True, null=True)
    ld_date_type = models.CharField(max_length=11, blank=True, null=True)
    bg = models.CharField(max_length=100, blank=True, null=True)
    bg_month = models.CharField(max_length=100, blank=True, null=True)
    file_name = models.CharField(max_length=250, blank=True, null=True)
    file_org_name = models.CharField(max_length=250, blank=True, null=True)
    no_of_consignee = models.CharField(max_length=100, blank=True, null=True)
    status = models.IntegerField(default=0)
    qc_status = models.IntegerField(default=0)
    proceed_bg = models.IntegerField(default=0)
    dc_required = models.CharField(max_length=100, blank=True, null=True)
    dc_status_bill = models.IntegerField(default=0)
    reject_reason = models.TextField(blank=True, null=True)
    po_cancel_file = models.CharField(max_length=100, blank=True, null=True)
    po_cancel_file_orgname = models.CharField(max_length=100, blank=True, null=True)
    ld = models.CharField(max_length=30, blank=True, null=True)
    tat = models.CharField(max_length=30, blank=True, null=True)
    amc = models.CharField(max_length=30, blank=True, null=True)
    apd = models.CharField(max_length=30, blank=True, null=True)
    state_name = models.CharField(max_length=100, blank=True, null=True)
    mq_status = models.IntegerField(default=0, blank=True, null=True)
    start_date = models.DateField(blank=True, null=True)
    end_date = models.DateField(blank=True, null=True)
    amc_percentae = models.CharField(max_length=30, blank=True, null=True)
    amcvalue = models.CharField(max_length=30, blank=True, null=True)
    amc_required = models.CharField(max_length=10, blank=True, null=True)
    amcfile_names = models.CharField(max_length=60, blank=True, null=True)
    amcfile_org_names = models.CharField(max_length=60, blank=True, null=True)
    bank_required = models.CharField(max_length=10, blank=True, null=True)
    product_sts = models.IntegerField(default=0)
    consignee_sts = models.IntegerField(default=0)
    assign_sts = models.IntegerField(default=0)
    po_com_sts = models.IntegerField(default=0)
    is_active = models.IntegerField(default=1)
    is_delete = models.IntegerField(default=0)
    updated_at = models.DateTimeField(db_column="updated", auto_now=True)
    created_at = models.DateTimeField(db_column="created", auto_now_add=True)
    acc_year = models.CharField(max_length=50)
    session_id = models.CharField(max_length=50)
    sess_user_type = models.CharField(max_length=50)
    sess_user_id = models.CharField(max_length=50)
    sess_company_id = models.CharField(max_length=50)
    sess_branch_id = models.CharField(max_length=50)

    class Meta:
        db_table = "po_form"

    @property
    def qty(self):
        return self.total_qty

    @property
    def net_value(self):
        return self.total_amount

    @property
    def no_of_item(self):
        return self.no_of_po

    @property
    def no_of_con(self):
        return self.no_of_consignee

    @property
    def exe_name(self):
        return self.executive_name


class PurchaseOrderProduct(models.Model):
    id = models.AutoField(primary_key=True)
    unique_id = models.CharField(max_length=35, unique=True, default=_uid, editable=False)
    form_main_unique_id = models.CharField(max_length=100, blank=True, null=True)
    screen_unique_id = models.CharField(max_length=100, blank=True, null=True)
    no_of_items = models.CharField(max_length=20, blank=True, null=True)
    tender_code = models.TextField(blank=True, null=True)
    item_code = models.TextField(blank=True, null=True)
    product = models.TextField(blank=True, null=True)
    qty = models.CharField(max_length=20, blank=True, null=True)
    unit_price = models.CharField(max_length=100, blank=True, null=True)
    net_price = models.CharField(max_length=20, blank=True, null=True)
    tax = models.CharField(max_length=100, blank=True, null=True)
    total_value = models.CharField(max_length=100, blank=True, null=True)
    net_value = models.CharField(max_length=100, blank=True, null=True)
    insta_due_days = models.CharField(max_length=50, blank=True, null=True)
    document_required = models.CharField(max_length=20, blank=True, null=True)
    warranty_starts = models.CharField(max_length=20, blank=True, null=True)
    bg_required = models.CharField(max_length=10, blank=True, null=True)
    bg_percen = models.CharField(max_length=30, blank=True, null=True)
    bg_month = models.CharField(max_length=50, blank=True, null=True)
    rem_qty = models.CharField(max_length=50, blank=True, null=True)
    assign_qty = models.CharField(max_length=50, blank=True, null=True)
    billed_qty = models.CharField(max_length=50, blank=True, null=True)
    con_serial_no = models.CharField(max_length=50, blank=True, null=True)
    assign_int_val = models.CharField(max_length=230, blank=True, null=True)
    delivery_due_dates = models.CharField(max_length=250, blank=True, null=True)
    ld_type = models.CharField(max_length=10, blank=True, null=True)
    ld_per_day = models.CharField(max_length=250, blank=True, null=True)
    ld_maximum_val = models.CharField(max_length=250, blank=True, null=True)
    warranty = models.CharField(max_length=250, blank=True, null=True)
    warranty_duration = models.CharField(max_length=250, blank=True, null=True)
    is_active = models.IntegerField(default=1)
    is_delete = models.IntegerField(default=0)
    updated_at = models.DateTimeField(db_column="updated", auto_now=True)
    created_at = models.DateTimeField(db_column="created", auto_now_add=True)
    acc_year = models.CharField(max_length=50, blank=True, null=True)
    session_id = models.CharField(max_length=50, blank=True, null=True)
    sess_user_type = models.CharField(max_length=50, blank=True, null=True)
    sess_user_id = models.CharField(max_length=50, blank=True, null=True)
    sess_company_id = models.CharField(max_length=50, blank=True, null=True)
    sess_branch_id = models.CharField(max_length=50, blank=True, null=True)

    class Meta:
        db_table = "product_details_sub"


class PurchaseOrderConsignee(models.Model):
    id = models.IntegerField(primary_key=True)
    unique_id = models.CharField(max_length=35, unique=True, default=_uid, editable=False)
    form_main_unique_id = models.CharField(max_length=100, blank=True, null=True)
    screen_unique_id = models.CharField(max_length=100, blank=True, null=True)
    no_of_consignee = models.CharField(max_length=100, blank=True, null=True)
    team_mem = models.CharField(max_length=50, blank=True, null=True)
    con_assign_qty = models.CharField(max_length=100, blank=True, null=True)
    con_address = models.TextField(blank=True, null=True)
    con_district = models.CharField(max_length=250, blank=True, null=True)
    con_state_name = models.CharField(max_length=60, blank=True, null=True)
    con_pincode = models.CharField(max_length=100, blank=True, null=True)
    zone = models.CharField(max_length=100, blank=True, null=True)
    billing_address = models.CharField(max_length=250, blank=True, null=True)
    con_branch = models.CharField(max_length=250, blank=True, null=True)
    con_contact_name = models.CharField(max_length=250, blank=True, null=True)
    con_contact_number = models.CharField(max_length=100, blank=True, null=True)
    con_lan_num = models.CharField(max_length=100)
    consignee_gst = models.CharField(max_length=30, blank=True, null=True)
    inv_cons_status = models.IntegerField(default=0, blank=True, null=True)
    cons_verify_sts = models.CharField(max_length=10, default="0", blank=True, null=True)
    batch_id = models.CharField(max_length=50, blank=True, null=True)
    batch_status = models.IntegerField(default=0)
    po_number = models.CharField(max_length=250, blank=True, null=True)
    batch_entry_date = models.DateField()
    consignee_received_date = models.DateField()
    assign_team_member = models.CharField(max_length=30, blank=True, null=True)
    con_branch_code = models.CharField(max_length=255, blank=True, null=True)
    alter_contact_name = models.CharField(max_length=255, blank=True, null=True)
    alter_number = models.CharField(max_length=255, blank=True, null=True)
    cons_email_id = models.CharField(max_length=255, blank=True, null=True)
    zone_code = models.CharField(max_length=255, blank=True, null=True)
    billing_gst_no = models.CharField(max_length=100, blank=True, null=True)
    region = models.CharField(max_length=100, blank=True, null=True)
    is_active = models.IntegerField(default=1)
    is_delete = models.IntegerField(default=0)
    updated_at = models.DateTimeField(db_column="updated", auto_now=True)
    created_at = models.DateTimeField(db_column="created", auto_now_add=True)
    acc_year = models.CharField(max_length=50, blank=True, null=True)
    session_id = models.CharField(max_length=50, blank=True, null=True)
    sess_user_type = models.CharField(max_length=50, blank=True, null=True)
    sess_user_id = models.CharField(max_length=50, blank=True, null=True)
    sess_company_id = models.CharField(max_length=50, blank=True, null=True)
    sess_branch_id = models.CharField(max_length=50, blank=True, null=True)

    class Meta:
        db_table = "consignee_details_sub"


class PurchaseOrderAssign(models.Model):
    id = models.AutoField(primary_key=True)
    unique_id = models.CharField(max_length=50, unique=True, default=_uid, editable=False)
    form_main_unique_id = models.CharField(max_length=100)
    po_unique_id = models.CharField(max_length=80, blank=True, null=True)
    con_unique_id = models.CharField(max_length=80, blank=True, null=True)
    con_name = models.TextField(blank=True, null=True)
    con_contact_no = models.CharField(max_length=255, blank=True, null=True)
    con_address = models.TextField(blank=True, null=True)
    con_assign_team_member = models.CharField(max_length=30, blank=True, null=True)
    unit_price = models.CharField(max_length=100, blank=True, null=True)
    item_tax = models.CharField(max_length=50, blank=True, null=True)
    po_num = models.CharField(max_length=250, blank=True, null=True)
    po_date = models.CharField(max_length=80, blank=True, null=True)
    no_of_consignee = models.CharField(max_length=80, blank=True, null=True)
    no_of_item = models.CharField(max_length=100, blank=True, null=True)
    executive_name = models.CharField(max_length=80, blank=True, null=True)
    product_unique_id = models.CharField(max_length=80, blank=True, null=True)
    item_code = models.TextField(blank=True, null=True)
    product = models.TextField(blank=True, null=True)
    qty = models.IntegerField()
    assign_qty = models.IntegerField()
    rem_qty = models.IntegerField(blank=True, null=True)
    assign_value = models.DecimalField(max_digits=16, decimal_places=2, blank=True, null=True)
    status = models.IntegerField(default=0)
    batch_id = models.CharField(max_length=250, blank=True, null=True)
    po_number = models.CharField(max_length=250, blank=True, null=True)
    is_active = models.IntegerField(default=1)
    is_delete = models.IntegerField(default=0)
    updated_at = models.DateTimeField(db_column="updated", auto_now=True)
    created_at = models.DateTimeField(db_column="created", auto_now_add=True)
    acc_year = models.CharField(max_length=50, blank=True, null=True)
    session_id = models.CharField(max_length=50, blank=True, null=True)
    sess_user_type = models.CharField(max_length=50, blank=True, null=True)
    sess_user_id = models.CharField(max_length=50, blank=True, null=True)
    sess_company_id = models.CharField(max_length=50, blank=True, null=True)
    sess_branch_id = models.CharField(max_length=50, blank=True, null=True)

    class Meta:
        db_table = "po_product_assign_details"


class PurchaseOrderAmc(models.Model):
    id = models.AutoField(primary_key=True)
    unique_id = models.CharField(max_length=250, unique=True, default=_uid, editable=False)
    form_main_unique_id = models.CharField(max_length=100, blank=True, null=True)
    po_no = models.CharField(max_length=100, blank=True, null=True)
    po_unique_id = models.CharField(max_length=30)
    batch_id = models.CharField(max_length=100, blank=True, null=True)
    start_date = models.DateField(blank=True, null=True)
    end_date = models.DateField(blank=True, null=True)
    amc_percentae = models.CharField(max_length=50, blank=True, null=True)
    amcvalue = models.CharField(max_length=50, blank=True, null=True)
    amc_tax = models.CharField(max_length=100, blank=True, null=True)
    amc_unit_price = models.CharField(max_length=100, blank=True, null=True)
    amc_remarks = models.TextField(blank=True, null=True)
    amcfile_names = models.CharField(max_length=255, blank=True, null=True)
    amcfile_org_names = models.CharField(max_length=50, blank=True, null=True)
    po_file_name = models.CharField(max_length=255, blank=True, null=True)
    po_file_org_name = models.CharField(max_length=255, blank=True, null=True)
    is_active = models.IntegerField(default=1)
    is_delete = models.IntegerField(default=0)
    acc_year = models.CharField(max_length=30, blank=True, null=True)
    session_id = models.CharField(max_length=30, blank=True, null=True)
    sess_user_type = models.CharField(max_length=30, blank=True, null=True)
    sess_user_id = models.CharField(max_length=30, blank=True, null=True)
    sess_company_id = models.CharField(max_length=30, blank=True, null=True)
    sess_branch_id = models.CharField(max_length=50, blank=True, null=True)

    class Meta:
        db_table = "amcrequired"
