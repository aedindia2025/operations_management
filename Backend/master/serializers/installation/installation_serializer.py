from rest_framework import serializers


class InstallationListQuerySerializer(serializers.Serializer):
    tab = serializers.ChoiceField(
        choices=["pending", "uploaded", "dcir_pending", "dcir_completed"],
        default="pending",
        required=False,
    )
    search = serializers.CharField(required=False, allow_blank=True, default="")
    from_date = serializers.CharField(required=False, allow_blank=True, default="")
    to_date = serializers.CharField(required=False, allow_blank=True, default="")
    date_type = serializers.CharField(required=False, allow_blank=True, default="")
    opt = serializers.CharField(required=False, allow_blank=True, default="")
    opt1 = serializers.CharField(required=False, allow_blank=True, default="")
    district = serializers.CharField(required=False, allow_blank=True, default="")
    team_member = serializers.CharField(required=False, allow_blank=True, default="")
    engg_type = serializers.CharField(required=False, allow_blank=True, default="")
    installation_status = serializers.CharField(required=False, allow_blank=True, default="")
    dc_delivery_status = serializers.CharField(required=False, allow_blank=True, default="")
    screen_id_val = serializers.CharField(required=False, allow_blank=True, default="")
    user_type_unique_id = serializers.CharField(required=False, allow_blank=True, default="")
    engineer_id = serializers.CharField(required=False, allow_blank=True, default="")
    user_unique_id = serializers.CharField(required=False, allow_blank=True, default="")
    page = serializers.IntegerField(required=False, default=1, min_value=1)
    length = serializers.IntegerField(required=False, default=25, min_value=1)


class InstallationSaveSerializer(serializers.Serializer):
    source_unique_id = serializers.CharField(required=False, allow_blank=True, default="")
    unique_id = serializers.CharField(required=False, allow_blank=True, default="")
    po_form_unique_id = serializers.CharField(required=False, allow_blank=True, default="")
    po_auto_id = serializers.CharField(required=False, allow_blank=True, default="")
    po_num = serializers.CharField(required=False, allow_blank=True, default="")
    po_date = serializers.CharField(required=False, allow_blank=True, default="")
    invoice_auto_id = serializers.CharField(required=False, allow_blank=True, default="")
    invoice_no = serializers.CharField(required=False, allow_blank=True, default="")
    invoice_date = serializers.CharField(required=False, allow_blank=True, default="")
    consignee_unique_id = serializers.CharField(required=False, allow_blank=True, default="")
    dc_number = serializers.CharField(required=False, allow_blank=True, default="")
    engineer_name = serializers.CharField(required=False, allow_blank=True, default="")
    engg_type = serializers.CharField(required=False, allow_blank=True, default="")
    installation_com_date = serializers.CharField(required=False, allow_blank=True, default="")
    eng_remarks = serializers.CharField(required=False, allow_blank=True, default="")
    in_charge = serializers.CharField(required=False, allow_blank=True, default="")
    gst_percent = serializers.CharField(required=False, allow_blank=True, default="")
    ttl_amnt = serializers.CharField(required=False, allow_blank=True, default="")
    documents_type = serializers.CharField(required=False, allow_blank=True, default="0")
    documents_type1 = serializers.CharField(required=False, allow_blank=True, default="0")
    documents_type2 = serializers.CharField(required=False, allow_blank=True, default="0")
    dc_received_sts = serializers.CharField(required=False, allow_blank=True, default="")
    dc_cus_signed_date = serializers.CharField(required=False, allow_blank=True, default="")
    ir_rec_status = serializers.CharField(required=False, allow_blank=True, default="")
    ir_cus_signed_date = serializers.CharField(required=False, allow_blank=True, default="")
    snr_rec_status = serializers.CharField(required=False, allow_blank=True, default="")
    snr_cus_signed_date = serializers.CharField(required=False, allow_blank=True, default="")
    team_mem = serializers.CharField(required=False, allow_blank=True, default="")


class InstallationDispatchSaveSerializer(serializers.Serializer):
    dc_dispatch_mode = serializers.CharField(required=False, allow_blank=True, default="")
    name_of_courier = serializers.CharField(required=False, allow_blank=True, default="")
    dc_pod_no = serializers.CharField(required=False, allow_blank=True, default="")
    dc_pod_date = serializers.CharField(required=False, allow_blank=True, default="")
    ir_dispatch_mode = serializers.CharField(required=False, allow_blank=True, default="")
    ins_name_of_courier = serializers.CharField(required=False, allow_blank=True, default="")
    ir_pod_no = serializers.CharField(required=False, allow_blank=True, default="")
    ir_pod_date = serializers.CharField(required=False, allow_blank=True, default="")
    snr_dispatch_mode = serializers.CharField(required=False, allow_blank=True, default="")
    snr_name_courier = serializers.CharField(required=False, allow_blank=True, default="")
    snr_pod_no = serializers.CharField(required=False, allow_blank=True, default="")
    snr_pod_date = serializers.CharField(required=False, allow_blank=True, default="")
    without_snr = serializers.CharField(required=False, allow_blank=True, default="")
