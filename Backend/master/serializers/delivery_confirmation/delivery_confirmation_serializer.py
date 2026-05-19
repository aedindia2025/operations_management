from rest_framework import serializers

from master.apps.delivery_confirmation.delivery_confirmation_model import (
    DeliveryDispatchList as DispatchList,
    DeliveryDcNumStatus as DcNumStatus,
)


# ---------------------------------------------------------------------------
# Delivery Confirmation – Approve (single record via form1.php / update1.php)
# ---------------------------------------------------------------------------

class DeliveryConfirmationSerializer(serializers.Serializer):
    """
    Used for POST /delivery-confirmation/confirm/
    Maps to PHP case 'deleivery_confirmation'
    """
    person_name         = serializers.CharField(max_length=255, required=True)
    contact_no          = serializers.CharField(max_length=15, required=True)
    pro_rec_date        = serializers.DateField(required=True)
    remarks             = serializers.CharField(required=False, allow_blank=True)
    dc_number           = serializers.CharField(max_length=100, required=True)
    consignee_unique_id = serializers.CharField(max_length=100, required=True)
    unique_id           = serializers.CharField(max_length=100, required=True)
    delv_con            = serializers.ChoiceField(
        choices=[("Confirmation", "Confirmation"), ("Not_deliverd", "Not Delivered")],
        required=True,
    )

    def validate_contact_no(self, value):
        if not value.isdigit() or len(value) != 10:
            raise serializers.ValidationError("Contact number must be exactly 10 digits.")
        return value


# ---------------------------------------------------------------------------
# Bulk Approve (pending_list.php – approve multiple checkboxes)
# ---------------------------------------------------------------------------

class DeliveryConfirmationBulkSerializer(serializers.Serializer):
    """
    Used for POST /delivery-confirmation/bulk-confirm/
    Maps to PHP case 'deleivery_confirmation1'
    """
    person_name         = serializers.CharField(max_length=255, required=True)
    contact_no          = serializers.CharField(max_length=15, required=True)
    pro_rec_date        = serializers.DateField(required=True)
    remarks             = serializers.CharField(required=False, allow_blank=True)
    dc_number           = serializers.CharField(max_length=100, required=True)
    consignee_unique_id = serializers.CharField(max_length=100, required=True)
    unique_id           = serializers.CharField(max_length=100, required=True)

    def validate_contact_no(self, value):
        if not value.isdigit() or len(value) != 10:
            raise serializers.ValidationError("Contact number must be exactly 10 digits.")
        return value


# ---------------------------------------------------------------------------
# Read serializer – Dispatch List detail (form1.php view mode)
# ---------------------------------------------------------------------------

class DispatchDetailSerializer(serializers.ModelSerializer):
    """
    Used for GET /delivery-confirmation/detail/<unique_id>/
    Returns all fields needed to render the form (view mode).
    """
    mode_of_delivery_label = serializers.SerializerMethodField()
    status_label           = serializers.SerializerMethodField()

    class Meta:
        model  = DispatchList
        fields = [
            "unique_id", "dc_number", "dc_date",
            "po_form_unique_id", "invoice_no", "invoice_date", "invoice_auto_id", "po_date",
            "consignee", "consignee_unique_id",
            "dispatch_date", "delivery_date",
            "mode_of_delivery", "mode_of_delivery_label",
            "name_of_courier", "pod_no", "delivery_proof", "file_name",
            "status", "status_label",
            "rec_person_name", "rec_contact_no", "pro_rec_date",
            "deliv_remarks", "delv_conf_date", "delv_conf_person",
        ]

    def get_mode_of_delivery_label(self, obj):
        mapping = {"1": "Hand", "2": "Courier"}
        return mapping.get(obj.mode_of_delivery, obj.mode_of_delivery)

    def get_status_label(self, obj):
        mapping = {"2": "Pending", "3": "Confirmed", "5": "Not Delivered"}
        return mapping.get(obj.status, obj.status)


# ---------------------------------------------------------------------------
# DataTable serializers (list views)
# ---------------------------------------------------------------------------

class PendingDatatableSerializer(serializers.ModelSerializer):
    """
    Minimal fields returned for the pending-list datatable.
    Maps to PHP case 'deleivery_datatable' and 'deleivery_datatable1'.
    """
    status_label           = serializers.SerializerMethodField()
    mode_of_delivery_label = serializers.SerializerMethodField()

    class Meta:
        model  = DispatchList
        fields = [
            "unique_id", "dc_number", "dc_date", "po_form_unique_id",
            "invoice_no", "invoice_date", "po_date",
            "consignee_unique_id",
            "name_of_courier", "mode_of_delivery", "mode_of_delivery_label",
            "delivery_date", "delivery_proof",
            "status", "status_label",
        ]

    def get_status_label(self, obj):
        mapping = {"2": "Pending", "3": "Confirmed", "5": "Not Delivered"}
        return mapping.get(obj.status, obj.status)

    def get_mode_of_delivery_label(self, obj):
        mapping = {"1": "Hand", "2": "Courier"}
        return mapping.get(obj.mode_of_delivery, obj.mode_of_delivery)


class CompletedDatatableSerializer(serializers.ModelSerializer):
    """
    Fields for the completed/confirmed delivery datatable.
    Maps to PHP case 'deleivery_comdatatable'.
    """
    status_label           = serializers.SerializerMethodField()
    mode_of_delivery_label = serializers.SerializerMethodField()

    class Meta:
        model  = DispatchList
        fields = [
            "unique_id", "dc_number", "dc_date", "po_form_unique_id",
            "invoice_no", "invoice_date", "po_date",
            "consignee_unique_id",
            "name_of_courier", "mode_of_delivery", "mode_of_delivery_label",
            "delivery_date", "delivery_proof",
            "status", "status_label",
            "rec_person_name", "rec_contact_no", "pro_rec_date",
            "deliv_remarks", "delv_conf_date", "delv_conf_person",
        ]

    def get_status_label(self, obj):
        mapping = {"2": "Pending", "3": "Confirmed", "5": "Not Delivered"}
        return mapping.get(obj.status, obj.status)

    def get_mode_of_delivery_label(self, obj):
        mapping = {"1": "Hand", "2": "Courier"}
        return mapping.get(obj.mode_of_delivery, obj.mode_of_delivery)
