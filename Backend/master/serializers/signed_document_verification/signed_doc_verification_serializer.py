from rest_framework import serializers
from master.apps.signed_document_verification.signed_doc_verification_model import (
    SignDocVerificationDetail,
)


# ─────────────────────────────────────────────────────────────────────────────
# Document Verification Status choices
# '0' = Pending  |  '1' = Mismatch  |  '2' = Verified
# ─────────────────────────────────────────────────────────────────────────────
DOC_STATUS_CHOICES = [("0", "Pending"), ("1", "Mismatch"), ("2", "Verified")]


# ─────────────────────────────────────────────────────────────────────────────
# Create / Update Serializer  (PHP case 'createupdate')
# ─────────────────────────────────────────────────────────────────────────────

class SignDocVerificationCreateUpdateSerializer(serializers.Serializer):
    """
    Used for POST /signed-doc-verification/save/
    Handles both Mismatch (status=1) and Verified (status=2) submissions.
    Maps to PHP case 'createupdate'.
    """

    # Identity
    unique_id            = serializers.CharField(max_length=100, required=False, allow_blank=True)
    form_main_unique_id  = serializers.CharField(max_length=100, required=True)
    ins_unique_id        = serializers.CharField(max_length=100, required=True)

    # PO / Invoice
    po_num               = serializers.CharField(max_length=100, required=True)
    po_date              = serializers.CharField(max_length=20,  required=True)
    invoice_no           = serializers.CharField(max_length=100, required=True)
    dc_number            = serializers.CharField(max_length=100, required=True)
    invoice_date         = serializers.DateField(required=True)

    # Consignee
    con_contact_name     = serializers.CharField(max_length=255, required=True)
    con_address          = serializers.CharField(required=True)
    con_unique_id        = serializers.CharField(max_length=100, required=True)

    # DC document
    dc_received_status   = serializers.CharField(required=False, allow_blank=True)
    dc_signed_date       = serializers.DateField(required=False, allow_null=True)

    # IR document
    ir_status            = serializers.CharField(required=False, allow_blank=True)
    ir_signed_date       = serializers.DateField(required=False, allow_null=True)

    # SNR document
    snr_status           = serializers.CharField(required=False, allow_blank=True)
    snr_signed_date      = serializers.DateField(required=False, allow_null=True)
    snr_verify_status    = serializers.IntegerField(required=False, default=0)

    # Product / BG
    po_product_name      = serializers.CharField(required=False, allow_blank=True)
    with_bg              = serializers.CharField(required=False, allow_blank=True)
    without_bg           = serializers.CharField(required=False, allow_blank=True)

    # Verification decision
    # '0'=Pending  '1'=Mismatch  '2'=Verified
    status               = serializers.ChoiceField(choices=DOC_STATUS_CHOICES, required=True)
    reject_reason        = serializers.CharField(required=False, allow_blank=True)
    doc_chn              = serializers.CharField(required=False, allow_blank=True)

    # Internal flags  (sts=DC  sts1=IR  sts2=SNR)
    sts                  = serializers.CharField(required=False, allow_blank=True)
    sts1                 = serializers.CharField(required=False, allow_blank=True)
    sts2                 = serializers.CharField(required=False, allow_blank=True)

    # DC-num signed complete status  (optional, triggers dc_num_status update)
    signed_complete_status = serializers.CharField(required=False, allow_blank=True, allow_null=True)

    def validate(self, data):
        status = data.get("status")
        if status == "1" and not data.get("reject_reason"):
            raise serializers.ValidationError(
                {"reject_reason": "Reject reason is required for Mismatch status."}
            )
        if status == "2":
            if not data.get("doc_chn"):
                raise serializers.ValidationError(
                    {"doc_chn": "Document change note is required for Verified status."}
                )
        return data


# ─────────────────────────────────────────────────────────────────────────────
# DataTable List Serializer  (PHP case 'datatable')
# ─────────────────────────────────────────────────────────────────────────────

class SignDocVerificationListSerializer(serializers.ModelSerializer):
    """
    Used for POST /signed-doc-verification/list/
    Minimal read-only fields returned for the DataTable.
    Maps to PHP case 'datatable'.
    """
    document_verification_status_label = serializers.SerializerMethodField()

    class Meta:
        model  = SignDocVerificationDetail
        fields = [
            "unique_id",
            "form_main_unique_id",
            "ins_unique_id",
            "po_num",
            "po_date",
            "invoice_no",
            "dc_number",
            "invoice_date",
            "con_contact_name",
            "con_address",
            "con_unique_id",
            "dc_received_status",
            "dc_signed_date",
            "ir_status",
            "ir_signed_date",
            "snr_status",
            "snr_signed_date",
            "snr_verify_status",
            "po_product_name",
            "status_app",
            "document_verification_status_label",
            "inv_verify_approvedby",
            "inv_verify_approved_date",
            "inv_verify_status",
        ]

    def get_document_verification_status_label(self, obj):
        mapping = {"0": "Pending", "1": "Mismatch", "2": "Verified"}
        return mapping.get(obj.status_app, obj.status_app)


# ─────────────────────────────────────────────────────────────────────────────
# Form Detail Serializer  (PHP form.php / verified_view.php  GET)
# ─────────────────────────────────────────────────────────────────────────────

class SignDocVerificationDetailSerializer(serializers.ModelSerializer):
    """
    Used for GET /signed-doc-verification/detail/<consignee_unique_id>/
    Full record for the edit/view form.
    Maps to PHP form.php GET block.
    """
    status_label = serializers.SerializerMethodField()

    class Meta:
        model  = SignDocVerificationDetail
        fields = "__all__"

    def get_status_label(self, obj):
        mapping = {"0": "Pending", "1": "Mismatch", "2": "Verified"}
        return mapping.get(obj.status_app, obj.status_app)


# ─────────────────────────────────────────────────────────────────────────────
# Excel Export Serializer  (PHP excel.php / excel1.php)
# ─────────────────────────────────────────────────────────────────────────────

class SignDocVerificationExcelSerializer(serializers.ModelSerializer):
    """
    Used for GET /signed-doc-verification/export/
    Flat fields needed for Excel export — mirrors excel.php columns.
    Columns: S.No, PO No, PO Date, Consignee, Location, Invoice No,
             Invoice Date, Status, Total Value (invoice_value from view).
    """
    document_verification_status_label = serializers.SerializerMethodField()

    class Meta:
        model  = SignDocVerificationDetail
        fields = [
            "po_num",
            "po_date",
            "con_contact_name",
            "con_address",
            "invoice_no",
            "invoice_date",
            "document_verification_status_label",
            "status_app",
        ]

    def get_document_verification_status_label(self, obj):
        mapping = {"0": "Pending", "1": "Mismatch", "2": "Verified"}
        return mapping.get(obj.status_app, obj.status_app)