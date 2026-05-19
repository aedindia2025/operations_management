"""
master/serializers/security_deposit_serializer.py

Serializers for the Security Deposit (partial-payment / bill-submission) module.
Mirrors the data shapes returned/accepted by crud.php, form.php, and view.php.
"""

from rest_framework import serializers


# ─────────────────────────────────────────────────────────────────────────────
# Helper
# ─────────────────────────────────────────────────────────────────────────────

def _indian_money(value) -> str:
    """Python port of moneyFormatIndia1() / indian_format_value() in PHP."""
    try:
        val = round(float(value or 0))
        s = str(val)
        last3 = s[-3:]
        rest = s[:-3]
        if rest:
            import re
            rest = re.sub(r"\B(?=(\d{2})+(?!\d))", ",", rest)
            return f"{rest},{last3}"
        return last3
    except Exception:
        return str(value or "0")


def _claim_value_cal(claim_percent, invoice_value) -> float:
    """Port of claim_value_cal() PHP function."""
    try:
        return round((float(invoice_value) * float(claim_percent)) / 100)
    except Exception:
        return 0.0


def _remaining_percent(claim_pct) -> int:
    """100 minus the stored claim percent (e.g. 75 → 25)."""
    try:
        return 100 - int(claim_pct)
    except Exception:
        return 0


# ─────────────────────────────────────────────────────────────────────────────
# Datatable row  (tab 1 – bill_submission_sub list)
# ─────────────────────────────────────────────────────────────────────────────

class SecurityDepositListSerializer(serializers.Serializer):
    """
    Output shape for the main datatable (PHP case 'datatable').
    All heavy computation is done in the viewset; this serializer
    just declares/validates the expected keys.
    """

    s_no            = serializers.IntegerField(read_only=True)
    bill_details    = serializers.CharField(read_only=True)   # bill_no + bill_created_date
    po_details      = serializers.CharField(read_only=True)   # po_num + po_date
    invoice_details = serializers.CharField(read_only=True)   # invoice_no + invoice_date
    customer_details= serializers.CharField(read_only=True)   # dept + district + state
    invoice_value   = serializers.CharField(read_only=True)   # formatted
    claim_percentage= serializers.CharField(read_only=True)   # remaining % label
    claim_value     = serializers.CharField(read_only=True)   # calculated formatted
    bill_form_unique_id = serializers.CharField(read_only=True)
    po_date         = serializers.CharField(read_only=True)
    invoice_date    = serializers.CharField(read_only=True)
    po_num          = serializers.CharField(read_only=True)
    invoice_no      = serializers.CharField(read_only=True)
    bill_no         = serializers.CharField(read_only=True)
    bill_created_date = serializers.CharField(read_only=True)
    partial_bill_status = serializers.CharField(read_only=True)


# ─────────────────────────────────────────────────────────────────────────────
# Partial-payment datatable row  (tab 2 – partial_bill_datatable)
# ─────────────────────────────────────────────────────────────────────────────

class PartialBillListSerializer(serializers.Serializer):
    """Output shape for PHP case 'partial_bill_datatable'."""

    file_org_name   = serializers.CharField(read_only=True)
    s_no            = serializers.IntegerField(read_only=True)
    bg_details      = serializers.CharField(read_only=True)
    po_details      = serializers.CharField(read_only=True)
    invoice_details = serializers.CharField(read_only=True)
    customer_details= serializers.CharField(read_only=True)
    invoice_qty     = serializers.CharField(read_only=True)
    invoice_value   = serializers.CharField(read_only=True)
    claim_amount    = serializers.CharField(read_only=True)
    unique_id       = serializers.CharField(read_only=True)
    ledger_name     = serializers.CharField(read_only=True)
    ledger_no       = serializers.CharField(read_only=True)
    bg_date         = serializers.CharField(read_only=True)
    bg_num          = serializers.CharField(read_only=True)
    po_date         = serializers.CharField(read_only=True)
    invoice_date    = serializers.CharField(read_only=True)
    invoice_no      = serializers.CharField(read_only=True)
    po_num          = serializers.CharField(read_only=True)


# ─────────────────────────────────────────────────────────────────────────────
# Partial-payment modal datatable  (PHP case 'partial_payment_datatable')
# ─────────────────────────────────────────────────────────────────────────────

class PartialPaymentDatatableSerializer(serializers.Serializer):
    """Output shape for PHP case 'partial_payment_datatable'."""

    chek_box        = serializers.CharField(read_only=True)
    s_no            = serializers.IntegerField(read_only=True)
    bg_no           = serializers.CharField(read_only=True)
    bill_details    = serializers.CharField(read_only=True)
    po_details      = serializers.CharField(read_only=True)
    invoice_details = serializers.CharField(read_only=True)
    customer_details= serializers.CharField(read_only=True)
    invoice_value   = serializers.CharField(read_only=True)
    claim_percentage= serializers.CharField(read_only=True)
    claim_value     = serializers.CharField(read_only=True)
    bill_form_unique_id = serializers.CharField(read_only=True)
    po_date         = serializers.CharField(read_only=True)
    invoice_date    = serializers.CharField(read_only=True)
    po_num          = serializers.CharField(read_only=True)
    invoice_no      = serializers.CharField(read_only=True)
    bill_no         = serializers.CharField(read_only=True)
    bill_created_date = serializers.CharField(read_only=True)
    partial_bill_status = serializers.CharField(read_only=True)
    bg_value        = serializers.CharField(read_only=True)
    invoice_qty     = serializers.CharField(read_only=True)


# ─────────────────────────────────────────────────────────────────────────────
# Bill-generate datatable  (PHP case 'bill_generate_datatable')
# ─────────────────────────────────────────────────────────────────────────────

class BillGenerateDatatableSerializer(serializers.Serializer):
    """Output for the bill-generation listing (PHP case 'bill_generate_datatable')."""

    s_no            = serializers.IntegerField(read_only=True)
    bill_details    = serializers.CharField(read_only=True)
    po_num          = serializers.CharField(read_only=True)
    customer_details= serializers.CharField(read_only=True)
    invcount        = serializers.IntegerField(read_only=True)
    invoice_value   = serializers.CharField(read_only=True)
    claim_amount    = serializers.CharField(read_only=True)
    claimamnt       = serializers.CharField(read_only=True)   # calculated claim value
    bg_num          = serializers.CharField(read_only=True)
    view            = serializers.CharField(read_only=True)   # eye-icon link
    invoice_no      = serializers.CharField(read_only=True)
    invoice_date    = serializers.CharField(read_only=True)
    bill_status     = serializers.CharField(read_only=True)
    po_date         = serializers.CharField(read_only=True)
    bill_no         = serializers.CharField(read_only=True)
    bill_form_main_unique_id = serializers.CharField(read_only=True)
    bill_created_dates = serializers.CharField(read_only=True)


# ─────────────────────────────────────────────────────────────────────────────
# Create/Update – partial payment entry  (PHP case 'createupdate')
# ─────────────────────────────────────────────────────────────────────────────

class SecurityDepositCreateUpdateSerializer(serializers.Serializer):
    """Request body for create/update of a single bill_submission_form row."""

    bill_form_main_unique_id = serializers.CharField()
    po_num          = serializers.CharField()
    po_date         = serializers.CharField()
    invoice_no      = serializers.CharField()
    invoice_date    = serializers.CharField()
    invoice_value   = serializers.DecimalField(max_digits=20, decimal_places=2)
    invoice_qty     = serializers.CharField(required=False, allow_blank=True, default="")
    claim_amount    = serializers.DecimalField(max_digits=5, decimal_places=2,
                                               help_text="Percentage to claim (e.g. 25)")
    bill_status     = serializers.CharField(default="1")
    unique_id       = serializers.CharField(required=False, allow_blank=True, default="")


# ─────────────────────────────────────────────────────────────────────────────
# Bulk partial bill creation  (PHP case 'partial_bill_main')
# ─────────────────────────────────────────────────────────────────────────────

class PartialBillMainSerializer(serializers.Serializer):
    """Request body for bulk partial bill creation (bill_submission_main_table insert)."""

    bill_form_unique_id = serializers.CharField()
    po_num          = serializers.CharField()
    po_date         = serializers.CharField()
    claim_percent   = serializers.DecimalField(max_digits=5, decimal_places=2)
    invoice_no      = serializers.ListField(child=serializers.CharField())
    invoice_date    = serializers.ListField(child=serializers.CharField())
    invoice_value   = serializers.ListField(child=serializers.DecimalField(max_digits=20, decimal_places=2))
    invoice_qty     = serializers.ListField(child=serializers.CharField())
    bg_num          = serializers.ListField(child=serializers.CharField(), required=False, default=list)
    bg_date         = serializers.ListField(child=serializers.CharField(), required=False, default=list)
    bg_value        = serializers.ListField(child=serializers.CharField(), required=False, default=list)
    claim_value     = serializers.DecimalField(max_digits=20, decimal_places=2,
                                               help_text="Pre-computed claim value sent by frontend")


# ─────────────────────────────────────────────────────────────────────────────
# Partial bill sub-table  (PHP case 'partial_bill_creation_add_update')
# ─────────────────────────────────────────────────────────────────────────────

class PartialBillCreationAddUpdateSerializer(serializers.Serializer):
    """Request body for inserting a row into bill_submission_sub."""

    bill_form_unique_id = serializers.CharField()
    po_num          = serializers.CharField()
    po_date         = serializers.CharField()
    invoice_no      = serializers.CharField()
    invoice_date    = serializers.CharField()
    invoice_value   = serializers.DecimalField(max_digits=20, decimal_places=2)
    invoice_qty     = serializers.CharField(required=False, allow_blank=True)
    claim_amount    = serializers.DecimalField(max_digits=20, decimal_places=2,
                                               help_text="Computed claim value (₹)")
    claim_percent   = serializers.DecimalField(max_digits=5, decimal_places=2,
                                               help_text="Remaining % (e.g. 25)")


# ─────────────────────────────────────────────────────────────────────────────
# View page  (PHP view.php – bill detail with invoice sub-table)
# ─────────────────────────────────────────────────────────────────────────────

class BillInvoiceRowSerializer(serializers.Serializer):
    """One row in the view-page invoice table."""

    invoice_no      = serializers.CharField()
    invoice_date    = serializers.CharField()
    invoice_qty     = serializers.CharField()
    invoice_value   = serializers.CharField()   # formatted
    claimamt        = serializers.CharField()   # formatted
    consignee_name  = serializers.CharField()
    consignee_address = serializers.CharField()
    consignee_district = serializers.CharField()
    consignee_state = serializers.CharField()
    consignee_pincode = serializers.CharField()


class BillViewSerializer(serializers.Serializer):
    """Full response shape for the bill view page (PHP view.php)."""

    # Customer block
    department      = serializers.CharField()
    customer_address= serializers.CharField()
    customer_district = serializers.CharField()
    customer_state  = serializers.CharField()
    customer_pincode= serializers.CharField()
    customer_contact= serializers.CharField()
    customer_email  = serializers.CharField()

    # PO & Bill block
    po_num          = serializers.CharField()
    po_date         = serializers.CharField()
    bill_no         = serializers.CharField()

    # BG block (only when partial_bill_status != 3)
    show_bg         = serializers.BooleanField()
    bg_num          = serializers.CharField(allow_blank=True)
    bg_date         = serializers.CharField(allow_blank=True)
    bg_value        = serializers.CharField(allow_blank=True)
    bg_percen       = serializers.CharField(allow_blank=True)

    # Invoice sub-table
    invoices        = BillInvoiceRowSerializer(many=True)


# ─────────────────────────────────────────────────────────────────────────────
# Form page  (PHP form.php – partial payment edit form data)
# ─────────────────────────────────────────────────────────────────────────────

class PaymentFormDataSerializer(serializers.Serializer):
    """
    Response shape for the payment edit form (PHP form.php).
    Sent to the frontend so it can pre-fill fields.
    """

    # PO & Invoice block
    po_num          = serializers.CharField()
    po_date         = serializers.CharField()
    invoice_no      = serializers.CharField()
    invoice_date    = serializers.CharField()
    invoice_value   = serializers.CharField()       # formatted
    invoice_qty     = serializers.CharField()
    bill_no         = serializers.CharField()
    e_no            = serializers.CharField(allow_blank=True)
    bg               = serializers.CharField(allow_blank=True)   # "With Bg" or ""
    bill_submission_date = serializers.CharField(allow_blank=True)

    # Customer block
    department      = serializers.CharField()
    customer_address= serializers.CharField()
    customer_district = serializers.CharField()
    customer_state  = serializers.CharField()
    customer_pincode= serializers.CharField()
    customer_contact= serializers.CharField()
    customer_email  = serializers.CharField()

    # Existing sub-form entry (if any)
    existing_unique_id = serializers.CharField(allow_blank=True)
    existing_claim_amount = serializers.CharField(allow_blank=True)

    # Available claim-amount options derived from current claim_amount
    claim_amount_options = serializers.ListField(
        child=serializers.DictField()
    )


# ─────────────────────────────────────────────────────────────────────────────
# Customer Details lookup  (PHP case 'customerDetails')
# ─────────────────────────────────────────────────────────────────────────────

class CustomerDetailsSerializer(serializers.Serializer):
    """Response for the customer-details lookup endpoint."""

    po_number       = serializers.CharField()
    po_date         = serializers.CharField()
    department      = serializers.CharField()
    address         = serializers.CharField()
    district        = serializers.CharField()
    state           = serializers.CharField()
    contact         = serializers.CharField()
    email           = serializers.CharField()
