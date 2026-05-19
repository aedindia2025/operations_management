import os
from decimal import Decimal, InvalidOperation

from rest_framework import serializers

from master.apps.account_sector.accountsectormodel import AccountSector
from master.apps.account_vertical.accountverticalmodel import AccountVertical
from master.apps.department.departmentmodel import DepartmentCreation
from master.apps.district.districtmodel import DistrictCreation
from master.apps.executive_creation.executivecreation_model import ExecutiveName
from master.apps.insurance_type.insurance_type_models import InsuranceType
from master.apps.item_creation.itemcreationmodel import ItemCreation, ItemCreationSub
from master.apps.purchase_order.purchaseordermodel import (
    PurchaseOrderAmc,
    PurchaseOrder,
    PurchaseOrderAssign,
    PurchaseOrderConsignee,
    PurchaseOrderProduct,
)
from master.apps.state.statemodel import StateCreation
from master.apps.user.usermodel import UserCreation


def _to_decimal(value):
    if value in (None, ""):
        return Decimal("0")
    try:
        return Decimal(str(value).replace(",", ""))
    except (InvalidOperation, ValueError):
        return Decimal("0")


class PurchaseOrderProductSerializer(serializers.ModelSerializer):
    tender_name = serializers.SerializerMethodField()
    item_description = serializers.SerializerMethodField()
    item_code_display = serializers.SerializerMethodField()

    class Meta:
        model = PurchaseOrderProduct
        fields = "__all__"

    def get_tender_name(self, obj):
        tender = ItemCreation.objects.filter(tender_code=obj.tender_code, is_delete=0).order_by("-id").first()
        return tender.tender_name if tender else ""

    def _get_item_row(self, obj):
        raw = (obj.item_code or "").strip()
        if not raw:
            return None

        item = ItemCreationSub.objects.filter(unique_id=raw, is_delete=0).order_by("-id").first()
        if item:
            return item

        item = ItemCreationSub.objects.filter(item_code=raw, is_delete=0).order_by("-id").first()
        if item:
            return item

        return ItemCreationSub.objects.filter(tender_code=raw, is_delete=0).order_by("-id").first()

    def get_item_code_display(self, obj):
        item = self._get_item_row(obj)
        if item:
            return item.item_code or item.tender_code or obj.item_code
        return obj.item_code or ""

    def get_item_description(self, obj):
        item = self._get_item_row(obj)
        return item.item_description if item else ""


class PurchaseOrderConsigneeSerializer(serializers.ModelSerializer):
    state_name_display = serializers.SerializerMethodField()
    district_name_display = serializers.SerializerMethodField()
    assigned_team_member_display = serializers.SerializerMethodField()

    class Meta:
        model = PurchaseOrderConsignee
        fields = "__all__"

    def get_state_name_display(self, obj):
        state = StateCreation.objects.filter(unique_id=obj.con_state_name, is_delete=0).order_by("-id").first()
        return state.state_name if state else ""

    def get_district_name_display(self, obj):
        district = DistrictCreation.objects.filter(unique_id=obj.con_district, is_delete=0).order_by("-id").first()
        return district.district_name if district else ""

    def get_assigned_team_member_display(self, obj):
        team_mem = str(obj.team_mem or "").strip()
        if not team_mem:
            return ""
        user = UserCreation.objects.filter(staff_id=team_mem, is_delete=0).order_by("-s_no").first()
        if user and user.staff_name:
            return user.staff_name
        return team_mem


class PurchaseOrderAssignSerializer(serializers.ModelSerializer):
    class Meta:
        model = PurchaseOrderAssign
        fields = "__all__"


class PurchaseOrderAmcSerializer(serializers.ModelSerializer):
    amc_file_url = serializers.SerializerMethodField()
    po_file_url = serializers.SerializerMethodField()

    class Meta:
        model = PurchaseOrderAmc
        fields = "__all__"

    def _build_file_url(self, folder, filename):
        if not filename:
            return ""
        base = f"/api/master/purchase-order/files/{folder}/{filename}/"
        return base

    def get_amc_file_url(self, obj):
        return self._build_file_url("amc", obj.amcfile_names)

    def get_po_file_url(self, obj):
        return self._build_file_url("po_copy", obj.po_file_name)


class PurchaseOrderSerializer(serializers.ModelSerializer):
    department_display = serializers.SerializerMethodField()
    state_name_display = serializers.SerializerMethodField()
    district_name_display = serializers.SerializerMethodField()
    executive_name_display = serializers.SerializerMethodField()
    acc_sector_display = serializers.SerializerMethodField()
    acc_vertical_display = serializers.SerializerMethodField()
    insurance_type_labels = serializers.SerializerMethodField()
    file_url = serializers.SerializerMethodField()
    cancel_file_url = serializers.SerializerMethodField()
    amc_file_url = serializers.SerializerMethodField()
    product_count = serializers.SerializerMethodField()
    product_qty = serializers.SerializerMethodField()
    consignee_count = serializers.SerializerMethodField()
    po_value = serializers.SerializerMethodField()
    products = serializers.SerializerMethodField()
    consignees = serializers.SerializerMethodField()

    class Meta:
        model = PurchaseOrder
        fields = "__all__"

    def _build_file_url(self, folder, filename):
        if not filename:
            return ""
        base = f"/api/master/purchase-order/files/{folder}/{filename}/"
        return base

    def get_department_display(self, obj):
        row = DepartmentCreation.objects.filter(unique_id=obj.department, is_delete=0).order_by("-id").first()
        return row.department if row else obj.department

    def get_state_name_display(self, obj):
        row = StateCreation.objects.filter(unique_id=obj.state_name, is_delete=0).order_by("-id").first()
        return row.state_name if row else obj.state_name

    def get_district_name_display(self, obj):
        row = DistrictCreation.objects.filter(unique_id=obj.district, is_delete=0).order_by("-id").first()
        return row.district_name if row else obj.district

    def get_executive_name_display(self, obj):
        executive_qs = ExecutiveName.objects.filter(unique_id=obj.executive_name, is_delete=0)
        if obj.sess_company_id:
            executive_qs = executive_qs.filter(sess_company_id__in=["", obj.sess_company_id])
        row = executive_qs.order_by("-s_no").first()
        if row:
            return row.executive_name
        user_qs = UserCreation.objects.filter(unique_id=obj.executive_name, is_delete=0)
        if obj.sess_company_id:
            user_qs = user_qs.filter(sess_company_id=obj.sess_company_id)
        user = user_qs.order_by("-s_no").first()
        return user.staff_name if user else obj.executive_name

    def get_acc_sector_display(self, obj):
        row = AccountSector.objects.filter(unique_id=obj.acc_sector, is_delete="0").order_by("-id").first()
        return row.sector_name if row else obj.acc_sector

    def get_acc_vertical_display(self, obj):
        row = AccountVertical.objects.filter(unique_id=obj.acc_vertical, is_delete="0").order_by("-created").first()
        return row.account_name if row else obj.acc_vertical

    def get_insurance_type_labels(self, obj):
        raw = obj.insurence_types or ""
        ids = [item.strip() for item in raw.split(",") if item.strip()]
        labels = []
        for unique_id in ids:
            insurance = InsuranceType.objects.filter(unique_id=unique_id, is_delete=0).order_by("-id").first()
            labels.append(insurance.insurance_name if insurance else unique_id)
        return labels

    def get_file_url(self, obj):
        return self._build_file_url("po_copy", obj.file_name)

    def get_cancel_file_url(self, obj):
        return self._build_file_url("po_cancel", obj.po_cancel_file)

    def get_amc_file_url(self, obj):
        return self._build_file_url("amc", obj.amcfile_names)

    def get_product_count(self, obj):
        return PurchaseOrderProduct.objects.filter(form_main_unique_id=obj.unique_id, is_delete=0).count()

    def get_product_qty(self, obj):
        rows = PurchaseOrderProduct.objects.filter(form_main_unique_id=obj.unique_id, is_delete=0).values_list("qty", flat=True)
        return sum(int(value or 0) for value in rows)

    def get_consignee_count(self, obj):
        return PurchaseOrderConsignee.objects.filter(form_main_unique_id=obj.unique_id, is_delete=0).count()

    def get_po_value(self, obj):
        total = _to_decimal(obj.total_amount)
        if total:
            return str(total)
        rows = PurchaseOrderProduct.objects.filter(form_main_unique_id=obj.unique_id, is_delete=0)
        return str(sum((_to_decimal(row.total_value) for row in rows), Decimal("0")))

    def get_products(self, obj):
        if self.context.get("include_children") is False:
            return []
        rows = PurchaseOrderProduct.objects.filter(form_main_unique_id=obj.unique_id, is_delete=0).order_by("id")
        return PurchaseOrderProductSerializer(rows, many=True, context=self.context).data

    def get_consignees(self, obj):
        if self.context.get("include_children") is False:
            return []
        rows = PurchaseOrderConsignee.objects.filter(form_main_unique_id=obj.unique_id, is_delete=0).order_by("id")
        return PurchaseOrderConsigneeSerializer(rows, many=True, context=self.context).data


