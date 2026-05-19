from rest_framework import serializers

from master.apps.Consignee_Stock_Assign.consignee_stock_model import ConsigneeStock

class ConsigneeStockSerializer(serializers.ModelSerializer):
    class Meta:
        model = ConsigneeStock
        fields = '__all__'
