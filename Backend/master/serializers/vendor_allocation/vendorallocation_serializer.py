from rest_framework import serializers
from master.apps.vendor_allocation.vendorallocation_model import (
    DispatchList,
    OperationInvoiceCreation as InvoiceCreationMain,
)


# ────────────────────────────────────────────────────────────────────── #
#  Dispatch Create serializer  (createupdate case)                        #
# ────────────────────────────────────────────────────────────────────── #
class DispatchCreateSerializer(serializers.Serializer):
    po_num              = serializers.CharField()
    po_date             = serializers.CharField(allow_blank=True, default="")
    con_contact_name    = serializers.CharField(allow_blank=True, default="")
    con_address         = serializers.CharField(allow_blank=True, default="")
    con_contact_number  = serializers.CharField(allow_blank=True, default="")
    invoice_date        = serializers.CharField(allow_blank=True, default="")
    invoice_no          = serializers.CharField()
    invoice_auto_id     = serializers.CharField(allow_blank=True, default="")
    dispatch_status     = serializers.IntegerField(default=0)
    stock_id            = serializers.CharField(allow_blank=True, default="")
    dispatch_date       = serializers.CharField(allow_blank=True, default="")
    mode_of_delivery    = serializers.IntegerField(default=0)
    name_of_courier     = serializers.CharField(allow_blank=True, default="")
    pod_no              = serializers.CharField(allow_blank=True, default="")
    po_unique_id        = serializers.CharField(allow_blank=True, default="")
    po_form_unique_id   = serializers.CharField(allow_blank=True, default="")
    consignee_unique_id = serializers.CharField(allow_blank=True, default="")
    unique_id           = serializers.CharField(allow_blank=True, default="")
    my_no               = serializers.CharField(allow_blank=True, default="")


# ────────────────────────────────────────────────────────────────────── #
#  Vendor Bulk Assignment serializer                                      #
# ────────────────────────────────────────────────────────────────────── #
class VendorBulkAssignSerializer(serializers.Serializer):
    """
    Used by vendor_allocation_update and team_allocation_update cases.
    Assigns engineer/vendor to multiple invoice_creation_main rows.
    """
    invoice_ids        = serializers.ListField(child=serializers.CharField())
    bulk_eng_type      = serializers.CharField()           # own-engineer / outsource-vendor / inhouse
    bulk_eng_name      = serializers.CharField()           # engineer or vendor unique_id
    vendor_bulk_timeline = serializers.CharField(allow_blank=True, default="")
    team_mem           = serializers.CharField(allow_blank=True, default="")
    ven_assign_date    = serializers.CharField(allow_blank=True, default="")
    assign_no          = serializers.CharField(allow_blank=True, default="")
    vendor_ins_date    = serializers.CharField(allow_blank=True, default="")
    rate               = serializers.CharField(allow_blank=True, default="")
    gst                = serializers.CharField(allow_blank=True, default="")
    total_amount       = serializers.CharField(allow_blank=True, default="")
    product_rows       = serializers.ListField(child=serializers.DictField(), required=False, default=list)


# ────────────────────────────────────────────────────────────────────── #
#  Pending list row serializer (datatable case)                           #
# ────────────────────────────────────────────────────────────────────── #
class VendorPendingRowSerializer(serializers.Serializer):
    s_no                = serializers.IntegerField()
    po_num              = serializers.CharField()
    po_date             = serializers.CharField()
    invoice_no          = serializers.CharField()
    invoice_date        = serializers.CharField()
    dc_number           = serializers.CharField()
    dc_date             = serializers.CharField()
    department_name     = serializers.CharField()
    district            = serializers.CharField()
    state               = serializers.CharField()
    cons_details        = serializers.CharField()
    team_member         = serializers.CharField()
    eng_name_id         = serializers.CharField()
    eng_type            = serializers.CharField()
    invoice_qty         = serializers.IntegerField()
    vendor_timeline     = serializers.CharField()
    vendor_bulk_sts     = serializers.IntegerField()
    unique_id           = serializers.CharField()
    consignee_unique_id = serializers.CharField()


# ────────────────────────────────────────────────────────────────────── #
#  Completed list row serializer (completed_datatable case)               #
# ────────────────────────────────────────────────────────────────────── #
class VendorCompletedRowSerializer(serializers.Serializer):
    s_no                 = serializers.IntegerField()
    po_num               = serializers.CharField()
    po_date              = serializers.CharField()
    invoice_no           = serializers.CharField()
    invoice_date         = serializers.CharField()
    dc_number            = serializers.CharField()
    dc_date              = serializers.CharField()
    department_name      = serializers.CharField()
    district             = serializers.CharField()
    state                = serializers.CharField()
    cons_details         = serializers.CharField()
    team_member          = serializers.CharField()
    eng_name_id          = serializers.CharField()
    invoice_qty          = serializers.IntegerField()
    vendor_timeline      = serializers.CharField()
    ageing               = serializers.CharField()
    assign_date          = serializers.CharField()
    vendor_ins_date      = serializers.CharField()
    installation_com_date = serializers.CharField()
    unique_id            = serializers.CharField()
    consignee_unique_id  = serializers.CharField()


# ────────────────────────────────────────────────────────────────────── #
#  Transit (fixed_datatable) row serializer                               #
# ────────────────────────────────────────────────────────────────────── #
class DispatchTransitRowSerializer(serializers.Serializer):
    s_no             = serializers.IntegerField()
    po_num           = serializers.CharField()
    po_date          = serializers.CharField()
    ledger_name      = serializers.CharField()
    con_address      = serializers.CharField()
    invoice_no       = serializers.CharField()
    invoice_date     = serializers.CharField()
    invoice_value    = serializers.CharField()
    mode_of_delivery = serializers.CharField()
    name_of_courier  = serializers.CharField()
    pod_no           = serializers.CharField()
    dispatch_date    = serializers.CharField()
    unique_id        = serializers.CharField()


# ────────────────────────────────────────────────────────────────────── #
#  Delivery (deleivery_datatable) row serializer                          #
# ────────────────────────────────────────────────────────────────────── #
class DispatchDeliveryRowSerializer(serializers.Serializer):
    s_no            = serializers.IntegerField()
    po_num          = serializers.CharField()
    po_date         = serializers.CharField()
    ledger_name     = serializers.CharField()
    con_address     = serializers.CharField()
    invoice_no      = serializers.CharField()
    invoice_date    = serializers.CharField()
    pod_no          = serializers.CharField()
    delivery_status = serializers.CharField()
    delivery_date   = serializers.CharField()
    delivery_proof  = serializers.CharField()
    unique_id       = serializers.CharField()
