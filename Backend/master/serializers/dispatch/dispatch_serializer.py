from rest_framework import serializers

from master.apps.dispatch.dispatch_model import Dispatch


class DispatchSerializer(serializers.ModelSerializer):
    po_date = serializers.DateField(required=False, allow_null=True, input_formats=["%Y-%m-%d", "%d-%m-%Y", "%d/%m/%Y"])
    invoice_date = serializers.DateField(required=False, allow_null=True, input_formats=["%Y-%m-%d", "%d-%m-%Y", "%d/%m/%Y"])
    dc_date = serializers.DateField(required=False, allow_null=True, input_formats=["%Y-%m-%d", "%d-%m-%Y", "%d/%m/%Y"])
    dispatch_date = serializers.DateField(required=False, allow_null=True, input_formats=["%Y-%m-%d", "%d-%m-%Y", "%d/%m/%Y"])
    delivery_date = serializers.DateField(required=False, allow_null=True, input_formats=["%Y-%m-%d", "%d-%m-%Y", "%d/%m/%Y"])

    class Meta:
        model = Dispatch
        fields = "__all__"

    def _text_value(self, attrs, *keys):
        initial = getattr(self, "initial_data", {}) or {}
        for key in keys:
            value = attrs.get(key, serializers.empty)
            if value is not serializers.empty and value is not None:
                return str(value).strip()
            raw_value = initial.get(key, serializers.empty)
            if raw_value is not serializers.empty and raw_value is not None:
                return str(raw_value).strip()
        return ""

    def validate(self, attrs):
        attrs = super().validate(attrs)

        text_aliases = {
            "consignee": ("consignee", "con_contact_name", "consignee_name"),
            "con_address": ("con_address", "address", "consignee_address"),
            "con_contact_number": ("con_contact_number", "contact_number", "consignee_contact"),
            "name_of_courier": ("name_of_courier", "courier_name"),
            "pod_no": ("pod_no", "tracking_no"),
            "po_num": ("po_num", "dispatch_no", "po_number"),
            "invoice_no": ("invoice_no",),
            "invoice_auto_id": ("invoice_auto_id",),
            "po_unique_id": ("po_unique_id",),
            "po_form_unique_id": ("po_form_unique_id", "unique_id"),
            "consignee_unique_id": ("consignee_unique_id",),
            "stock_id": ("stock_id",),
            "dc_number": ("dc_number", "dc_no"),
        }

        for target, keys in text_aliases.items():
            if not attrs.get(target):
                value = self._text_value(attrs, *keys)
                if value:
                    attrs[target] = value

        if attrs.get("mode_of_delivery") in (None, ""):
            mode_value = self._text_value(attrs, "mode_of_delivery")
            attrs["mode_of_delivery"] = mode_value or "0"

        if attrs.get("status") in (None, ""):
            status_value = self._text_value(attrs, "status")
            attrs["status"] = status_value or "1"

        for key in (
            "consignee",
            "con_address",
            "con_contact_number",
            "name_of_courier",
            "pod_no",
            "po_num",
            "invoice_no",
            "invoice_auto_id",
            "po_unique_id",
            "po_form_unique_id",
            "consignee_unique_id",
            "stock_id",
            "dc_number",
            "delivery_status",
            "delivery_proof",
            "pod_proof",
            "einvoice_file",
            "file_name",
            "file_org_name",
            "podfile_org_name",
        ):
            if attrs.get(key) is None:
                attrs[key] = ""

        return attrs
