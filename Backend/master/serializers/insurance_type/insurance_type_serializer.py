from rest_framework import serializers
import re
from master.apps.insurance_type.insurance_type_models import InsuranceType

class InsuranceTypeSerializer(serializers.ModelSerializer):

    is_active_display = serializers.SerializerMethodField()

    class Meta:
        model = InsuranceType
        fields = '__all__'
        read_only_fields = ['unique_id', 'created_at', 'updated_at']

    def get_is_active_display(self, obj):
        return "Active" if obj.is_active else "Inactive"

    def validate_insurance_name(self, value):
        value = value.strip()

        if not re.fullmatch(r"[A-Za-z ]+", value):
            raise serializers.ValidationError("Insurance Type must contain only alphabets.")

        queryset = InsuranceType.objects.filter(insurance_name__iexact=value, is_delete="0")
        if self.instance:
            queryset = queryset.exclude(pk=self.instance.pk)
        if queryset.exists():
            raise serializers.ValidationError(
                "This insurance type name is already registered. Please enter another type."
            )
        return value
