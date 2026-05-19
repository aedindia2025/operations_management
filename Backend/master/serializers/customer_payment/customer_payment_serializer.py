from rest_framework import serializers


# ─── List serializers (read-only, mirrors view_payment_entry_list) ─────────────

class PaymentListSerializer(serializers.Serializer):
    """
    Used for the Pending / Completed DataTable (GET /api/payment/list/).
    All monetary values are returned as Indian-formatted strings so the
    React table can display them directly – matching the PHP indian_format()
    helper.
    """
    s_no             = serializers.IntegerField()
    unique_id        = serializers.CharField()
    bill_no          = serializers.CharField()
    po_num           = serializers.CharField()
    customer         = serializers.CharField()     # con_contact_name
    invoice_no       = serializers.CharField()
    invoice_value    = serializers.CharField()     # formatted
    claim_percentage = serializers.CharField()
    claimamt         = serializers.CharField()     # formatted claim amount
    payment_status   = serializers.IntegerField()


# ─── Detail serializer (for the modal / view.php equivalent) ──────────────────

class PaymentDetailSerializer(serializers.Serializer):
    bill_no              = serializers.CharField()
    invoice_no           = serializers.CharField()
    customer             = serializers.CharField()
    address              = serializers.CharField()
    pincode              = serializers.CharField()
    contact_name         = serializers.CharField()
    contact_number       = serializers.CharField()
    email                = serializers.CharField()
    bill_created_date    = serializers.CharField()
    bill_submission_date = serializers.CharField()
    po_num               = serializers.CharField()
    po_date              = serializers.CharField()
    invoice_date         = serializers.CharField()
    invoice_value        = serializers.CharField()
    trans_date           = serializers.CharField()
    trans_id             = serializers.CharField(allow_blank=True)
    tran_amt             = serializers.CharField()
    payment_received     = serializers.CharField()
    ld_amount            = serializers.CharField()
    gst_value            = serializers.CharField()
    tds_value            = serializers.CharField()
    payment_date         = serializers.CharField()
    claimamt             = serializers.CharField()
    e_no                 = serializers.CharField()
    district             = serializers.CharField()
    state_name           = serializers.CharField()
    ttl_amount           = serializers.CharField()
    balance_amount       = serializers.CharField()


# ─── Create / Update serializer ────────────────────────────────────────────────

class PaymentCreateUpdateSerializer(serializers.Serializer):
    unique_id        = serializers.CharField()
    bill_no          = serializers.CharField()
    my_inv_no        = serializers.CharField()
    payement_receive = serializers.DecimalField(max_digits=15, decimal_places=2)
    payment_status   = serializers.IntegerField()
    payment_date     = serializers.DateField()
    ld_amount        = serializers.DecimalField(max_digits=15, decimal_places=2)
    ld_days          = serializers.IntegerField(default=0)
    claim_amount     = serializers.DecimalField(max_digits=6,  decimal_places=2, default=0)
    gst              = serializers.DecimalField(max_digits=5,  decimal_places=2, default=0)
    gst_value        = serializers.DecimalField(max_digits=15, decimal_places=2, default=0)
    tds              = serializers.DecimalField(max_digits=5,  decimal_places=2, default=0)
    tds_value        = serializers.DecimalField(max_digits=15, decimal_places=2, default=0)
    ld               = serializers.DecimalField(max_digits=15, decimal_places=2, default=0)
    tran_amt         = serializers.DecimalField(max_digits=15, decimal_places=2, default=0)
    rem_amt          = serializers.DecimalField(max_digits=15, decimal_places=2, default=0)


# ─── Bill Cancel serializer ────────────────────────────────────────────────────

class BillCancelSerializer(serializers.Serializer):
    unique_id      = serializers.CharField()
    bill_no        = serializers.CharField()
    invoice_no     = serializers.CharField()
    reject_reason  = serializers.CharField(allow_blank=True, required=False)
