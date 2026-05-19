from rest_framework import serializers


class InvoiceListQuerySerializer(serializers.Serializer):
    tab = serializers.ChoiceField(choices=["pending", "completed"], default="pending", required=False)
    search = serializers.CharField(required=False, allow_blank=True, default="")
    from_date = serializers.CharField(required=False, allow_blank=True, default="")
    to_date = serializers.CharField(required=False, allow_blank=True, default="")
    team_member = serializers.CharField(required=False, allow_blank=True, default="")


class InvoiceSaveSerializer(serializers.Serializer):
    source_unique_id = serializers.CharField(required=False, allow_blank=True, default="")
    dc_number = serializers.CharField(required=False, allow_blank=True, default="")
    dc_date = serializers.CharField(required=False, allow_blank=True, default="")
    invoice_no = serializers.CharField(required=False, allow_blank=True, default="")
    invoice_date = serializers.CharField(required=False, allow_blank=True, default="")
    ledger_name = serializers.CharField(required=False, allow_blank=True, default="")
    ledger_no = serializers.CharField(required=False, allow_blank=True, default="")
    items_json = serializers.CharField(required=False, allow_blank=True, default="[]")
