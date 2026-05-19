from rest_framework import serializers
from master.apps.Stockposition.stockpositionmodel import (
    StockPositionMain,
    StockPosition,
    StockPositionSublist,
)


class StockPositionSublistSerializer(serializers.ModelSerializer):
    class Meta:
        model  = StockPositionSublist
        fields = '__all__'
        read_only_fields = ['unique_id']


class StockPositionSerializer(serializers.ModelSerializer):
    class Meta:
        model  = StockPosition
        fields = '__all__'
        read_only_fields = ['unique_id']


class StockPositionMainSerializer(serializers.ModelSerializer):

    status_display     = serializers.SerializerMethodField()
    department_display = serializers.SerializerMethodField()
    executive_display  = serializers.SerializerMethodField()

    class Meta:
        model  = StockPositionMain
        fields = '__all__'
        read_only_fields = ['unique_id', 'stock_id']

    def get_status_display(self, obj):
        return dict(StockPositionMain.STATUS_CHOICES).get(obj.status, '-')

    def get_department_display(self, obj):
        try:
            from master.apps.department.departmentmodel import DepartmentCreation
            dept = DepartmentCreation.objects.get(unique_id=obj.department)
            return dept.department
        except Exception:
            return obj.department

    def get_executive_display(self, obj):
        try:
            from master.apps.user.usermodel import UserCreation
            user = UserCreation.objects.get(unique_id=obj.executive_name)
            return user.staff_name
        except Exception:
            return obj.executive_name