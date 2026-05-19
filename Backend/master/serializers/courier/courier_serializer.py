from rest_framework import serializers
import re

from master.apps.courier.couriermodels import Courier


class CourierSerializer(serializers.ModelSerializer):
    is_active_display = serializers.SerializerMethodField()

    class Meta:
        model = Courier
        fields = "__all__"

    def get_is_active_display(self, obj):
        return "Active" if obj.is_active else "Inactive"

    def validate_courier_name(self, value):
        value = value.strip()

        if not re.fullmatch(r"[A-Za-z ]+", value):
            raise serializers.ValidationError("Courier Name allows only alphabets.")

        qs = Courier.objects.filter(courier_name__iexact=value, is_delete=False)
        if self.instance is not None:
            qs = qs.exclude(pk=self.instance.pk)
        if qs.exists():
            raise serializers.ValidationError("This courier name is already registered. Please enter another courier.")
        return value
