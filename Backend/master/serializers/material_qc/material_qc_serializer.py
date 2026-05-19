from rest_framework import serializers
from master.apps.material_qc.material_qc_model import MaterialQC

class MaterialQCSerializer(serializers.ModelSerializer):
    class Meta:
        model = MaterialQC
        fields = '__all__'