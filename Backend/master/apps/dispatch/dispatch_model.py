import uuid

from django.db import models


def _uid():
    return uuid.uuid4().hex[:18]


class Dispatch(models.Model):
    id = models.AutoField(primary_key=True)
    unique_id = models.CharField(max_length=50, unique=True, default=_uid, editable=False)
    dc_number = models.CharField(max_length=50, blank=True, null=True)
    dc_date = models.CharField(max_length=30, blank=True, null=True)
    po_num = models.CharField(max_length=250, blank=True, null=True)
    po_date = models.CharField(max_length=30, blank=True, null=True)
    po_unique_id = models.CharField(max_length=50, blank=True, null=True)
    po_form_unique_id = models.CharField(max_length=50, blank=True, null=True)
    invoice_no = models.CharField(max_length=50, blank=True, null=True)
    invoice_date = models.CharField(max_length=50, blank=True, null=True)
    invoice_auto_id = models.CharField(max_length=50, blank=True, null=True)
    stock_id = models.CharField(max_length=50, blank=True, null=True)
    consignee = models.CharField(max_length=250, blank=True, null=True)
    consignee_unique_id = models.CharField(max_length=50, blank=True, null=True)
    con_address = models.CharField(max_length=250, blank=True, null=True)
    con_contact_number = models.CharField(max_length=50, blank=True, null=True)
    dispatch_date = models.CharField(max_length=50, blank=True, null=True)
    mode_of_delivery = models.CharField(max_length=100, blank=True, null=True)
    name_of_courier = models.CharField(max_length=100, blank=True, null=True)
    pod_no = models.CharField(max_length=50, blank=True, null=True)
    date = models.CharField(max_length=30, blank=True, null=True)
    partial_sts = models.IntegerField(blank=True, null=True)
    status = models.CharField(max_length=10, blank=True, null=True)
    delivery_status = models.CharField(max_length=10, blank=True, null=True)
    engineer_name = models.CharField(max_length=100, blank=True, null=True)
    engg_type = models.CharField(max_length=50, blank=True, null=True)
    rate = models.CharField(max_length=100, blank=True, null=True)
    gst = models.CharField(max_length=50, blank=True, null=True)
    total_amount = models.CharField(max_length=100, blank=True, null=True)
    vendor_timeline = models.CharField(max_length=50, blank=True, null=True)
    vendor_bulk_sts = models.CharField(max_length=10, blank=True, null=True)
    vendor_team_sts = models.CharField(max_length=10, blank=True, null=True)
    delivery_date = models.CharField(max_length=50, blank=True, null=True)
    delivery_proof = models.CharField(max_length=200, blank=True, null=True)
    einvoice_file = models.CharField(max_length=80, blank=True, null=True)
    einvoice_file_org = models.CharField(max_length=80, blank=True, null=True)
    file_org_name = models.CharField(max_length=200, blank=True, null=True)
    file_name = models.CharField(max_length=255, blank=True, null=True)
    pod_proof = models.CharField(max_length=255, blank=True, null=True)
    podfile_org_name = models.CharField(max_length=255, blank=True, null=True)
    rec_person_name = models.CharField(max_length=50, blank=True, null=True)
    rec_contact_no = models.CharField(max_length=30, blank=True, null=True)
    pro_rec_date = models.CharField(max_length=30, blank=True, null=True)
    deliv_remarks = models.CharField(max_length=30, blank=True, null=True)
    delv_conf_person = models.CharField(max_length=30, blank=True, null=True)
    delv_conf_date = models.CharField(max_length=30, blank=True, null=True)
    is_active = models.IntegerField(default=1)
    is_delete = models.IntegerField(default=0)
    acc_year = models.CharField(max_length=50, blank=True, null=True)
    session_id = models.CharField(max_length=50, blank=True, null=True)
    sess_user_type = models.CharField(max_length=50, blank=True, null=True)
    sess_user_id = models.CharField(max_length=50, blank=True, null=True)
    sess_company_id = models.CharField(max_length=50, blank=True, null=True)
    sess_branch_id = models.CharField(max_length=50, blank=True, null=True)
    created_at = models.DateTimeField(db_column="created", auto_now_add=True)
    updated_at = models.DateTimeField(db_column="updated", auto_now=True)

    class Meta:
        db_table = "dispatch_list"
        managed = False

    def __str__(self):
        return self.dc_number or self.invoice_no or self.unique_id
