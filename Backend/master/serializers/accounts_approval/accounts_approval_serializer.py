from rest_framework import serializers

from master.apps.department.departmentmodel import DepartmentCreation, DepartmentCreationSublist
from master.apps.executive_creation.executivecreation_model import ExecutiveName
from master.apps.operation_approval.operationapprovalmodel import InvoiceSublist
from master.apps.vendor_allocation.vendorallocation_model import OperationInvoiceCreation as InvoiceCreationMain
from master.apps.purchase_order.purchaseordermodel import PurchaseOrder, PurchaseOrderConsignee
from master.apps.user.usermodel import UserCreation


def _get_po(obj):
    if not getattr(obj, "form_main_unique_id", None):
        return None
    return PurchaseOrder.objects.filter(unique_id=obj.form_main_unique_id, is_delete=0).first()


def _get_consignee(obj):
    if not getattr(obj, "consignee_unique_id", None):
        return None
    return PurchaseOrderConsignee.objects.filter(unique_id=obj.consignee_unique_id, is_delete=0).first()


def _get_staff_by_staff_id(staff_id):
    if not staff_id:
        return None
    return UserCreation.objects.filter(staff_id=staff_id, is_delete=0).first()


def _get_user_display(value):
    text = str(value or "").strip()
    if not text:
        return None

    user = UserCreation.objects.filter(staff_id=text, is_delete=0).first()
    if user and user.staff_name:
        return user.staff_name

    user = UserCreation.objects.filter(unique_id=text, is_delete=0).first()
    if user and user.staff_name:
        return user.staff_name

    return None


def _resolve_department_name(value):
    text = str(value or "").strip()
    if not text:
        return ""

    sub = DepartmentCreationSublist.objects.filter(unique_id=text, is_delete=0).first()
    if sub and sub.ledger_name:
        return sub.ledger_name

    dept = DepartmentCreation.objects.filter(unique_id=text, is_delete=0).first()
    if dept and dept.department:
        return dept.department

    return text


def _resolve_person_name(value):
    text = str(value or "").strip()
    if not text:
        return ""

    staff = UserCreation.objects.filter(staff_id=text, is_delete=0).first()
    if staff and staff.staff_name:
        return staff.staff_name

    staff = UserCreation.objects.filter(unique_id=text, is_delete=0).first()
    if staff and staff.staff_name:
        return staff.staff_name

    executive = ExecutiveName.objects.filter(unique_id=text, is_delete=0).first()
    if executive and executive.executive_name:
        return executive.executive_name

    return text


def _get_invoice_items(obj):
    """Fetch items for the invoice"""
    # Import here to avoid circular dependency
    from master.viewsets.accounts_approval.accounts_approval_viewset import _get_item_rows
    
    form_main_unique_id = getattr(obj, "form_main_unique_id", "")
    consignee_unique_id = getattr(obj, "consignee_unique_id", "")
    dc_number = getattr(obj, "dc_number", "")
    
    return _get_item_rows(form_main_unique_id, consignee_unique_id, dc_number)


class AccountsApprovalListSerializer(serializers.ModelSerializer):
    sno = serializers.SerializerMethodField()
    po_num = serializers.SerializerMethodField()
    po_date = serializers.SerializerMethodField()
    department_name = serializers.SerializerMethodField()
    con_address = serializers.SerializerMethodField()
    team_member = serializers.SerializerMethodField()
    po_file = serializers.SerializerMethodField()
    dc_file = serializers.SerializerMethodField()
    ir_file = serializers.SerializerMethodField()
    invoice_file = serializers.SerializerMethodField()
    ac_verify_status = serializers.SerializerMethodField()
    approved_by_name = serializers.SerializerMethodField()
    invoice_value_fmt = serializers.SerializerMethodField()
    ac_team_verifiy_status = serializers.SerializerMethodField()
    ac_team_approved_by = serializers.SerializerMethodField()

    class Meta:
        model = InvoiceCreationMain
        fields = [
            "sno",
            "unique_id",
            "po_num",
            "po_date",
            "department_name",
            "con_address",
            "team_member",
            "invoice_no",
            "invoice_date",
            "dc_number",
            "dc_date",
            "invoice_value",
            "invoice_value_fmt",
            "po_file",
            "dc_file",
            "ir_file",
            "invoice_file",
            "ac_verify_status",
            "ac_team_verifiy_status",
            "approved_by_name",
            "ac_team_approved_by",
        ]

    def get_sno(self, obj):
        return getattr(obj, "_sno", None)

    def get_po_num(self, obj):
        po = _get_po(obj)
        return po.po_num if po else ""

    def get_po_date(self, obj):
        po = _get_po(obj)
        return po.po_date if po else None

    def get_con_address(self, obj):
        consignee = _get_consignee(obj)
        return consignee.con_address if consignee else ""

    def get_department_name(self, obj):
        po = _get_po(obj)
        return _resolve_department_name(po.department if po and po.department else "")

    def get_team_member(self, obj):
        name = _resolve_person_name(obj.team_mem)
        if name:
            return name
        po = _get_po(obj)
        return _resolve_person_name(po.executive_name if po and po.executive_name else "")

    def _get_sublist_file(self, obj, field):
        sub = InvoiceSublist.objects.filter(invoice_id=obj.unique_id, is_delete=0).values_list(field, flat=True).first()
        return sub or ""

    def get_po_file(self, obj):
        po = _get_po(obj)
        return obj.file_name or (po.file_name if po and po.file_name else "")

    def get_dc_file(self, obj):
        return obj.dc_file_name or self._get_sublist_file(obj, "dc_file_name")

    def get_ir_file(self, obj):
        return obj.ir_file_name or self._get_sublist_file(obj, "ir_file_name")

    def get_invoice_file(self, obj):
        return obj.file_invoice or self._get_sublist_file(obj, "file_invoice")

    def get_ac_verify_status(self, obj):
        mapping = {4: "Approved", 2: "Not Approval", "4": "Approved", "2": "Not Approval"}
        return mapping.get(obj.invoice_doc_status, "Pending")

    def get_ac_team_verifiy_status(self, obj):
        return obj.ac_team_verifiy_status

    def get_approved_by_name(self, obj):
        approved_by = getattr(obj, "approved_by", "") or getattr(obj, "ac_team_approved_by", "")
        if approved_by:
            display_name = _get_user_display(approved_by)
            return display_name if display_name else approved_by
        return "--"

    def get_ac_team_approved_by(self, obj):
        return (getattr(obj, "approved_by", "") or getattr(obj, "ac_team_approved_by", "") or "")

    def get_invoice_value_fmt(self, obj):
        try:
            value = float(obj.invoice_value or 0)
            s = f"{value:,.2f}"
            parts = s.split(".")
            integer_part = parts[0].replace(",", "")
            if len(integer_part) > 3:
                last3 = integer_part[-3:]
                rest = integer_part[:-3]
                groups = []
                while len(rest) > 2:
                    groups.append(rest[-2:])
                    rest = rest[:-2]
                if rest:
                    groups.append(rest)
                groups.reverse()
                integer_part = ",".join(groups) + "," + last3
            return f"{integer_part}.{parts[1]}"
        except Exception:
            return str(obj.invoice_value or "0.00")


class AccountsApprovalDetailSerializer(AccountsApprovalListSerializer):
    department_name = serializers.SerializerMethodField()
    customer_address = serializers.SerializerMethodField()
    vendor_contact = serializers.SerializerMethodField()
    vendor_email = serializers.SerializerMethodField()
    consignee_name = serializers.SerializerMethodField()
    consignee_address = serializers.SerializerMethodField()
    consignee_contact = serializers.SerializerMethodField()
    approved_date = serializers.SerializerMethodField()
    reject_reason = serializers.CharField(source="reject_reason_elcot", read_only=True)
    items = serializers.SerializerMethodField()

    class Meta(AccountsApprovalListSerializer.Meta):
        fields = AccountsApprovalListSerializer.Meta.fields + [
            "department_name",
            "customer_address",
            "vendor_contact",
            "vendor_email",
            "consignee_name",
            "consignee_address",
            "consignee_contact",
            "approved_date",
            "reject_reason",
            "items",
        ]

    def get_department_name(self, obj):
        po = _get_po(obj)
        return _resolve_department_name(po.department if po and po.department else "")

    def get_customer_address(self, obj):
        po = _get_po(obj)
        return po.bill_address if po and po.bill_address else ""

    def get_vendor_contact(self, obj):
        po = _get_po(obj)
        return po.contact_number if po and po.contact_number else ""

    def get_vendor_email(self, obj):
        po = _get_po(obj)
        return po.email if po and po.email else ""

    def get_consignee_name(self, obj):
        consignee = _get_consignee(obj)
        return consignee.con_contact_name if consignee and consignee.con_contact_name else ""

    def get_consignee_address(self, obj):
        consignee = _get_consignee(obj)
        return consignee.con_address if consignee and consignee.con_address else ""

    def get_consignee_contact(self, obj):
        consignee = _get_consignee(obj)
        return consignee.con_contact_number if consignee and consignee.con_contact_number else ""

    def get_approved_date(self, obj):
        return obj.approved_date
    
    def get_items(self, obj):
        return _get_invoice_items(obj)


class PendingListSerializer(serializers.ModelSerializer):
    sno = serializers.SerializerMethodField()
    po_num = serializers.SerializerMethodField()
    department_name = serializers.SerializerMethodField()
    con_address = serializers.SerializerMethodField()
    po_date = serializers.SerializerMethodField()
    po_file = serializers.SerializerMethodField()
    dc_file = serializers.SerializerMethodField()
    ir_file = serializers.SerializerMethodField()
    invoice_file = serializers.SerializerMethodField()
    compare_file = serializers.SerializerMethodField()
    ac_verify_status = serializers.SerializerMethodField()
    approved_by_name = serializers.SerializerMethodField()
    ac_team_verifiy_status = serializers.SerializerMethodField()
    ac_team_approved_by = serializers.SerializerMethodField()

    class Meta:
        model = InvoiceCreationMain
        fields = [
            "sno",
            "unique_id",
            "po_num",
            "department_name",
            "dc_number",
            "dc_date",
            "invoice_no",
            "invoice_date",
            "po_date",
            "con_address",
            "po_file",
            "dc_file",
            "ir_file",
            "invoice_file",
            "compare_file",
            "ac_team_verifiy_status",
            "ac_verify_status",
            "ac_team_approved_by",
            "approved_by_name",
        ]

    def get_sno(self, obj):
        return getattr(obj, "_sno", None)

    def get_po_num(self, obj):
        po = _get_po(obj)
        return po.po_num if po else ""

    def get_po_date(self, obj):
        po = _get_po(obj)
        return po.po_date if po else None

    def get_department_name(self, obj):
        po = _get_po(obj)
        return po.department if po and po.department else ""

    def get_con_address(self, obj):
        consignee = _get_consignee(obj)
        return consignee.con_address if consignee else ""

    def _get_sublist_file(self, obj, field):
        sub = InvoiceSublist.objects.filter(invoice_id=obj.unique_id, is_delete=0).values_list(field, flat=True).first()
        return sub or ""

    def get_po_file(self, obj):
        po = _get_po(obj)
        return obj.file_name or (po.file_name if po and po.file_name else "")

    def get_dc_file(self, obj):
        return obj.dc_file_name or self._get_sublist_file(obj, "dc_file_name")

    def get_ir_file(self, obj):
        return obj.ir_file_name or self._get_sublist_file(obj, "ir_file_name")

    def get_invoice_file(self, obj):
        return obj.file_invoice or self._get_sublist_file(obj, "file_invoice")

    def get_compare_file(self, obj):
        return obj.invoice_file_org_name or self._get_sublist_file(obj, "invoice_file_org_name")

    def get_ac_verify_status(self, obj):
        mapping = {4: "Approved", 2: "Not Approval", "4": "Approved", "2": "Not Approval"}
        return mapping.get(obj.invoice_doc_status, "Pending")

    def get_ac_team_verifiy_status(self, obj):
        return obj.ac_team_verifiy_status

    def get_approved_by_name(self, obj):
        approved_by = getattr(obj, "approved_by", "") or getattr(obj, "ac_team_approved_by", "")
        if approved_by:
            display_name = _get_user_display(approved_by)
            return display_name if display_name else approved_by
        return "--"

    def get_ac_team_approved_by(self, obj):
        return (getattr(obj, "approved_by", "") or getattr(obj, "ac_team_approved_by", "") or "")


class AccountsApprovalUpdateSerializer(serializers.Serializer):
    invoice_unique_id = serializers.CharField()
    dc_number = serializers.CharField()
    ac_team_verifiy_status = serializers.ChoiceField(choices=[("1", "Approve"), ("2", "Reject")])
    ac_reason_reject = serializers.CharField(required=False, allow_blank=True, default="")
    approved_by = serializers.CharField()


class OverallApprovalSerializer(serializers.Serializer):
    invoice_unique_ids = serializers.ListField(child=serializers.CharField(), allow_empty=False)
    dc_numbers = serializers.ListField(child=serializers.CharField(), allow_empty=False)
    approved_by = serializers.CharField()
