from rest_framework import serializers
from master.apps.item_creation.itemcreationmodel import ItemCreation, ItemCreationSub


# ============================================================ #
#  Item Creation Sub Serializer                                #
# ============================================================ #
class ItemCreationSubSerializer(serializers.ModelSerializer):

    class Meta:
        model  = ItemCreationSub
        fields = [
            'unique_id',
            'tender_code',
            'item_code',
            'item_description',
            'item_specification',
            'brand',
            'product_category',
            'short_category',
            'rc_net_price',
            'gst',
            'rc_unit_price',
            'warranty_in_yrs',
            'is_active',
        ]
        read_only_fields = ['unique_id']

    # ── rc_unit_price auto calculate ─────────────────────────── #
    def validate(self, data):
        rc_net_price = data.get('rc_net_price', 0)
        gst          = data.get('gst', 0)
        warranty     = data.get('warranty_in_yrs', 0)

        for field_name, field_value, label in [
            ("rc_net_price", rc_net_price, "RC Net Price"),
            ("gst", gst, "GST %"),
            ("warranty_in_yrs", warranty, "Warranty In Months"),
        ]:
            try:
                float(field_value)
            except (TypeError, ValueError):
                raise serializers.ValidationError({field_name: f"{label} allows only numbers."})

        # PHP logic: rc_unit_price = rc_net_price / (1 + gst/100)
        if gst and float(gst) > 0:
            data['rc_unit_price'] = round(float(rc_net_price) / (1 + float(gst) / 100), 2)
        else:
            data['rc_unit_price'] = rc_net_price
        return data


# ============================================================ #
#  Item Creation Main Serializer                               #
# ============================================================ #
class ItemCreationSerializer(serializers.ModelSerializer):

    validity_date_extension = serializers.DateField(required=False, allow_null=True)
    tender_type_display = serializers.SerializerMethodField()
    is_active_display   = serializers.SerializerMethodField()

    class Meta:
        model  = ItemCreation
        fields = [
            'unique_id',
            'tender_name',
            'tender_code',
            'tender_no',
            'tender_type',
            'validity_from',
            'validity_to',
            'validity_date_extension',
            'is_active',
            'is_delete',
            'tender_type_display',
            'is_active_display',
        ]
        read_only_fields = ['unique_id']

    def get_tender_type_display(self, obj):
        return dict(ItemCreation.TENDER_TYPE_CHOICES).get(obj.tender_type, '-')

    def get_is_active_display(self, obj):
        return "Active" if obj.is_active == 1 else "Inactive"

    # ── Duplicate tender_code check ──────────────────────────── #
    def validate_tender_code(self, value):
        unique_id = self.instance.unique_id if self.instance else None
        qs = ItemCreation.objects.filter(tender_code__iexact=value, is_delete=0)
        if unique_id:
            qs = qs.exclude(unique_id=unique_id)
        if qs.exists():
            raise serializers.ValidationError("Tender code already exists.")
        return value

    # ── Validity date check ───────────────────────────────────── #
    def validate(self, data):
        v_from = data.get('validity_from')
        v_to   = data.get('validity_to')
        if v_from and v_to and v_from > v_to:
            raise serializers.ValidationError(
                "Validity From date cannot be after Validity To date."
            )
        return data

