import uuid

from django.db import models


def _uuid_value():
    return uuid.uuid4().hex[:18]


class StockPositionMain(models.Model):
    STATUS_CHOICES = [
        (0, "Pending"),
        (1, "Processing"),
        (2, "Complete"),
    ]

    id = models.AutoField(primary_key=True)
    unique_id = models.CharField(max_length=50, unique=True, default=_uuid_value, editable=False)
    form_main_unique_id = models.CharField(max_length=100)
    batch_id = models.CharField(max_length=30, blank=True, null=True)
    po_unique_id = models.CharField(max_length=100, blank=True, null=True)
    po_num = models.CharField(max_length=250, blank=True, null=True)
    stock_id = models.CharField(max_length=50, blank=True, null=True)
    no_of_con = models.CharField(max_length=10, blank=True, null=True)
    no_of_item = models.CharField(max_length=10, blank=True, null=True)
    executive_name = models.CharField(max_length=100, blank=True, null=True)
    stock_qty = models.CharField(max_length=50, default="0")
    stock_value = models.CharField(max_length=50, default="0")
    department = models.CharField(max_length=100, blank=True, null=True)
    billed_qty = models.CharField(max_length=50, blank=True, null=True)
    status = models.IntegerField(choices=STATUS_CHOICES, default=0)
    inv_status_assign = models.IntegerField(default=0)
    part_no = models.CharField(max_length=250, blank=True, null=True)
    remarks = models.CharField(max_length=250, blank=True, null=True)
    part_no_file = models.CharField(max_length=250, blank=True, null=True)
    part_no_file_orgname = models.CharField(max_length=250, blank=True, null=True)
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
    po_date = models.DateField(blank=True, null=True)
    stock_date = models.DateField(blank=True, null=True)

    class Meta:
        db_table = "stock_position_main"

    def __str__(self):
        return self.stock_id or self.unique_id


class StockPosition(models.Model):
    id = models.AutoField(primary_key=True)
    unique_id = models.CharField(max_length=50, unique=True, default=_uuid_value, editable=False, blank=True, null=True)
    form_main_unique_id = models.CharField(max_length=100)
    batch_id = models.CharField(max_length=30, blank=True, null=True)
    stock_id = models.CharField(max_length=50)
    total_qty = models.CharField(max_length=10, blank=True, null=True)
    net_value = models.CharField(max_length=20, blank=True, null=True)
    po_unique_id = models.CharField(max_length=100, blank=True, null=True)
    po_num = models.CharField(max_length=250, blank=True, null=True)
    no_of_consignee = models.CharField(max_length=80, blank=True, null=True)
    no_of_item = models.CharField(max_length=100, blank=True, null=True)
    executive_name = models.CharField(max_length=100, blank=True, null=True)
    product_unique_id = models.CharField(max_length=80)
    item_code = models.CharField(max_length=100)
    product = models.CharField(max_length=255)
    product_tax = models.CharField(max_length=50, blank=True, null=True)
    item_qty = models.CharField(max_length=10)
    unit_price = models.CharField(max_length=50)
    net_price = models.CharField(max_length=100, blank=True, null=True)
    billed_qty = models.CharField(max_length=10, blank=True, null=True)
    stock_qty = models.CharField(max_length=10, blank=True, null=True)
    remaining_qty = models.CharField(max_length=10, blank=True, null=True)
    status = models.IntegerField(default=0)
    part_no = models.CharField(max_length=250, blank=True, null=True)
    remarks = models.TextField(blank=True, null=True)
    remqty = models.CharField(max_length=100, blank=True, null=True)
    part_no_file = models.CharField(max_length=250, blank=True, null=True)
    part_no_file_orgname = models.CharField(max_length=250, blank=True, null=True)
    update_stock_qty = models.CharField(max_length=100, blank=True, null=True)
    update_stock_value = models.CharField(max_length=100, blank=True, null=True)
    stock_value = models.CharField(max_length=100, blank=True, null=True)
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
    po_date = models.DateField(blank=True, null=True)
    stock_date = models.DateField(blank=True, null=True)

    class Meta:
        db_table = "stock_position"

    def __str__(self):
        return f"{self.stock_id} - {self.item_code}"


class StockPositionSublist(models.Model):
    id = models.AutoField(primary_key=True)
    unique_id = models.CharField(max_length=50, unique=True, default=_uuid_value, editable=False, blank=True, null=True)
    form_main_unique_id = models.CharField(max_length=100)
    batch_id = models.CharField(max_length=30, blank=True, null=True)
    stock_id = models.CharField(max_length=50)
    stock_sub_id = models.CharField(max_length=30, blank=True, null=True)
    stock_date = models.DateField(blank=True, null=True)
    total_qty = models.CharField(max_length=10, blank=True, null=True)
    net_value = models.CharField(max_length=250, blank=True, null=True)
    po_unique_id = models.CharField(max_length=100, blank=True, null=True)
    po_num = models.CharField(max_length=250, blank=True, null=True)
    po_date = models.DateField(blank=True, null=True)
    no_of_consignee = models.CharField(max_length=80, blank=True, null=True)
    no_of_item = models.CharField(max_length=100, blank=True, null=True)
    executive_name = models.CharField(max_length=100, blank=True, null=True)
    product_unique_id = models.CharField(max_length=80)
    item_code = models.CharField(max_length=100)
    product = models.CharField(max_length=250)
    product_tax = models.CharField(max_length=50, blank=True, null=True)
    item_qty = models.CharField(max_length=10)
    unit_price = models.CharField(max_length=50)
    net_price = models.CharField(max_length=100, blank=True, null=True)
    billed_qty = models.CharField(max_length=10, blank=True, null=True)
    stock_qty = models.CharField(max_length=10, blank=True, null=True)
    remaining_qty = models.CharField(max_length=10, blank=True, null=True)
    bal_qty = models.CharField(max_length=100, blank=True, null=True)
    remqty = models.CharField(max_length=100, blank=True, null=True)
    status = models.IntegerField(default=0)
    part_no = models.CharField(max_length=250, blank=True, null=True)
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
        db_table = "stock_position_sublist"

    def __str__(self):
        return f"{self.stock_id} - {self.item_code}"
