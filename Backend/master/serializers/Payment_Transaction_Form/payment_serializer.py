from rest_framework import serializers
from master.apps.Payment_Transaction_Form.paymentmodel import PaymentTransaction

class PaymentTransactionSerializer(serializers.ModelSerializer):
    class Meta:
        model = PaymentTransaction
        fields = "__all__"
