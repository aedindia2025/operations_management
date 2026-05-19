from rest_framework import serializers
from master.apps.operation_approval.operationapprovalmodel import (
    InvoiceCreationMain,
    InvoiceSublist,
    InvoiceVerificationTable,
)
from master.apps.purchase_order.purchaseordermodel import PurchaseOrder


class InvoiceSublistSerializer(serializers.ModelSerializer):
    class Meta:
        model  = InvoiceSublist
        fields = '__all__'
        read_only_fields = ['unique_id']


class InvoiceVerificationSerializer(serializers.ModelSerializer):
    class Meta:
        model  = InvoiceVerificationTable
        fields = '__all__'
        read_only_fields = ['unique_id']


class InvoiceCreationMainSerializer(serializers.ModelSerializer):

    doc_approval_display = serializers.SerializerMethodField()
    department_display   = serializers.SerializerMethodField()
    team_member_display  = serializers.SerializerMethodField()
    con_address          = serializers.SerializerMethodField()

    class Meta:
        model  = InvoiceCreationMain
        fields = '__all__'
        read_only_fields = ['unique_id']

    def get_doc_approval_display(self, obj):
        return dict(InvoiceCreationMain.DOC_APPROVAL_CHOICES).get(obj.doc_approval_sts, 'Pending')

    def get_department_display(self, obj):
        try:
            po = PurchaseOrder.objects.get(unique_id=obj.form_main_unique_id, is_delete=0)
            return po.department
        except Exception:
            return ''

    def get_team_member_display(self, obj):
        try:
            from master.apps.user.usermodel import UserCreation
            user = UserCreation.objects.get(staff_id=obj.team_mem)
            return user.staff_name
        except Exception:
            return obj.team_mem

    def get_con_address(self, obj):
        try:
            from master.apps.consignee_creation.consigneecreationmodel import ConsigneeDetailsSub
            con = ConsigneeDetailsSub.objects.get(unique_id=obj.consignee_unique_id, is_delete=0)
            return con.con_address
        except Exception:
            return ''
