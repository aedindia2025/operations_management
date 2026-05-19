import json
import os
import uuid
from datetime import datetime
from functools import lru_cache

from django.conf import settings
from django.db import connection, transaction
from django.http import FileResponse, Http404
from django.utils.decorators import method_decorator
from django.views.decorators.clickjacking import xframe_options_exempt
from rest_framework import status
from rest_framework.parsers import FormParser, MultiPartParser
from rest_framework.response import Response
from rest_framework.views import APIView

from master.apps.department.departmentmodel import DepartmentCreation, DepartmentCreationSublist
from master.apps.district.districtmodel import DistrictCreation
from master.apps.executive_creation.executivecreation_model import ExecutiveName
from master.apps.state.statemodel import StateCreation
from master.apps.user.usermodel import UserCreation
from master.serializers.invoice.invoice_serializer import (
    InvoiceListQuerySerializer,
    InvoiceSaveSerializer,
)
from master.tenant import request_company_id


def _rows(cur):
    cols = [c[0] for c in cur.description]
    return [dict(zip(cols, row)) for row in cur.fetchall()]


def _uid(prefix=""):
    return f"{prefix}{uuid.uuid4().hex[:18]}"


def _fmt_date(value):
    if not value:
        return ""
    text = str(value)
    for fmt in ("%Y-%m-%d", "%d-%m-%Y", "%Y-%m-%d %H:%M:%S"):
        try:
            return datetime.strptime(text[:10], fmt).strftime("%d-%m-%Y")
        except ValueError:
            continue
    return text


def _norm_date(value):
    text = str(value or "").strip()
    if not text:
        return ""
    for fmt in ("%Y-%m-%d", "%d-%m-%Y", "%d/%m/%Y"):
        try:
            return datetime.strptime(text, fmt).strftime("%Y-%m-%d")
        except ValueError:
            continue
    return text


def _safe_int(value, default=0):
    try:
        text = str(value if value is not None else "").strip()
        if not text:
            return default
        return int(float(text))
    except (TypeError, ValueError):
        return default


def _normalize_dc_number(value):
    return str(value or "").strip()


def _duplicate_dc_exists(dc_number, exclude_unique_id=""):
    normalized = _normalize_dc_number(dc_number)
    if not normalized:
        return False
    exclude = str(exclude_unique_id or "").strip()
    with connection.cursor() as cur:
        cur.execute(
            """
            SELECT 1
            FROM invoice_creation_main
            WHERE is_delete = 0
              AND COALESCE(TRIM(dc_number), '') <> ''
              AND UPPER(TRIM(dc_number)) = UPPER(%s)
              AND (%s = '' OR unique_id <> %s)
            LIMIT 1
            """,
            [normalized, exclude, exclude],
        )
        return bool(cur.fetchone())


def _media_root():
    path = os.path.join(settings.MEDIA_ROOT, "invoice")
    os.makedirs(path, exist_ok=True)
    return path


def _save_upload(file_obj, prefix):
    original = os.path.basename(getattr(file_obj, "name", "upload.bin"))
    filename = f"{prefix}_{uuid.uuid4().hex[:8]}_{original}"
    with open(os.path.join(_media_root(), filename), "wb+") as fh:
        for chunk in file_obj.chunks():
            fh.write(chunk)
    return filename, original


def _file_url(path):
    return f"/api/master{path}"


def _department_name(unique_id):
    if not unique_id:
        return ""
    try:
        item = DepartmentCreation.objects.filter(unique_id=unique_id, is_delete=0).order_by("-id").first()
        if item:
            return item.department or unique_id
        item = DepartmentCreation.objects.filter(empty=unique_id, is_delete=0).order_by("-id").first()
        if item:
            return item.department or unique_id
    except Exception:
        pass
    return unique_id


def _ledger_name(unique_id):
    if not unique_id:
        return ""
    try:
        item = DepartmentCreationSublist.objects.filter(unique_id=unique_id, is_delete=0).order_by("-id").first()
        if item:
            return item.ledger_name or unique_id
        item = DepartmentCreation.objects.filter(unique_id=unique_id, is_delete=0).order_by("-id").first()
        if item:
            return item.ledger_name or item.department or unique_id
    except Exception:
        pass
    return unique_id


def _team_member_name(staff_id):
    if not staff_id:
        return ""
    try:
        item = UserCreation.objects.filter(staff_id=staff_id, is_delete=0).order_by("-s_no").first()
        if item:
            return item.staff_name or staff_id
    except Exception:
        pass
    return staff_id


@lru_cache(maxsize=1024)
def _staff_name(value):
    text = str(value or "").strip()
    if not text:
        return ""
    try:
        item = UserCreation.objects.filter(staff_id=text, is_delete=0).order_by("-s_no").first()
        if item:
            return item.staff_name or text
    except Exception:
        pass
    try:
        item = UserCreation.objects.filter(unique_id=text, is_delete=0).order_by("-s_no").first()
        if item:
            return item.staff_name or text
    except Exception:
        pass
    try:
        item = UserCreation.objects.filter(user_name=text, is_delete=0).order_by("-s_no").first()
        if item:
            return item.staff_name or text
    except Exception:
        pass
    try:
        item = UserCreation.objects.filter(staff_name=text, is_delete=0).order_by("-s_no").first()
        if item:
            return item.staff_name or text
    except Exception:
        pass
    return text


def _executive_name(unique_id):
    text = str(unique_id or "").strip()
    if not text:
        return ""
    try:
        item = (
            ExecutiveName.objects
            .filter(is_delete=0)
            .filter(unique_id=text)
            .order_by("-s_no")
            .first()
        )
        if item:
            return item.executive_name or text
    except Exception:
        pass
    try:
        item = UserCreation.objects.filter(staff_id=text, is_delete=0).order_by("-s_no").first()
        if item:
            return item.staff_name or text
    except Exception:
        pass
    try:
        item = UserCreation.objects.filter(unique_id=text, is_delete=0).order_by("-s_no").first()
        if item:
            return item.staff_name or text
    except Exception:
        pass
    try:
        item = (
            ExecutiveName.objects
            .filter(is_delete=0)
            .filter(executive_name=text)
            .order_by("-s_no")
            .first()
        )
        if item:
            return item.executive_name or text
    except Exception:
        pass
    return text


def _district_name(unique_id):
    if not unique_id:
        return ""
    try:
        item = DistrictCreation.objects.filter(unique_id=unique_id, is_delete=0).order_by("-id").first()
        if item:
            return item.district_name or unique_id
    except Exception:
        pass
    return unique_id


def _state_name(unique_id):
    if not unique_id:
        return ""
    try:
        item = StateCreation.objects.filter(unique_id=unique_id, is_delete=0).order_by("-id").first()
        if item:
            return item.state_name or unique_id
    except Exception:
        pass
    return unique_id


def _item_serial_payload(items_json):
    try:
        raw = json.loads(items_json or "[]")
    except json.JSONDecodeError:
        return []
    return raw if isinstance(raw, list) else []


def _next_invoice_auto_id():
    prefix = datetime.now().strftime("INV-%y%m-")
    with connection.cursor() as cur:
        cur.execute("SELECT COUNT(*) FROM invoice_creation_main WHERE invoice_auto_id LIKE %s", [f"{prefix}%"])
        count = int(cur.fetchone()[0] or 0) + 1
    return f"{prefix}{count:04d}"


def _serial_exists(serial_no, exclude_unique_id=""):
    serials = [part.strip() for part in str(serial_no or "").split(",") if part.strip()]
    if not serials:
        return False
    conditions = []
    params = []
    for serial in serials:
        conditions.append("FIND_IN_SET(%s, ser_no) > 0")
        params.append(serial)
    sql = f"SELECT COUNT(unique_id) FROM invoice_creation WHERE is_delete = 0 AND ({' OR '.join(conditions)})"
    if exclude_unique_id:
        sql += " AND unique_id <> %s"
        params.append(exclude_unique_id)
    with connection.cursor() as cur:
        cur.execute(sql, params)
        count = int(cur.fetchone()[0] or 0)
    return count > 0


def _serial_no_update(data):
    unique_id = str(data.get("unique_id") or "").strip()
    dc_number = str(data.get("dc_number") or "").strip()
    serial_numbers = str(data.get("ser_qty") or "").strip()
    serial_selection = str(data.get("seril_no_selc") or "").strip()
    spec_srl_no = data.get("spec_srl_no") or ""
    mon_ser_no = str(data.get("mon_ser_qty") or "").strip()
    if not unique_id:
        return {"status": False, "msg": "error", "error": "Missing item unique id."}, status.HTTP_400_BAD_REQUEST
    if serial_selection == "With" and _serial_exists(serial_numbers):
        return {"status": False, "msg": "duplicate", "error": "Already Exists in Database!."}, status.HTTP_200_OK
    with transaction.atomic(), connection.cursor() as cur:
        cur.execute(
            """
            UPDATE invoice_creation
            SET ser_no=%s, mon_ser_no=%s, seril_no_selc=%s, spec_srl_no=%s, ser_num_up_status=1
            WHERE unique_id=%s AND is_delete=0
            """,
            [serial_numbers, mon_ser_no, serial_selection, spec_srl_no or None, unique_id],
        )
        if dc_number:
            cur.execute(
                """
                UPDATE invoice_creation_main
                SET serial_number_status=1
                WHERE dc_number=%s AND is_delete=0
                """,
                [dc_number],
            )
    return {"status": True, "msg": "update"}, status.HTTP_200_OK


def _update_serial_no(data):
    unique_id = str(data.get("unique_id") or "").strip()
    serial_numbers = str(data.get("serial_no") or "").strip()
    if not unique_id:
        return {"status": False, "msg": "error", "error": "Missing item unique id."}, status.HTTP_400_BAD_REQUEST
    if _serial_exists(serial_numbers, exclude_unique_id=unique_id):
        return {"status": False, "msg": "duplicate", "error": "Already Exists in Database!."}, status.HTTP_200_OK
    with transaction.atomic(), connection.cursor() as cur:
        cur.execute(
            """
            UPDATE invoice_creation
            SET ser_no=%s
            WHERE unique_id=%s AND is_delete=0
            """,
            [serial_numbers, unique_id],
        )
    return {"status": True, "msg": "update_ser"}, status.HTTP_200_OK


def _source_detail(unique_id):
    sql = """
    SELECT icm.*, pf.department po_department, pf.executive_name po_executive_name, pf.district po_district, pf.state_name po_state_name,
           COALESCE(pf.gst_option, '') po_gst_option,
           pf.contact_name po_contact_name, pf.contact_number po_contact_number, pf.email po_email, pf.file_name po_file_name,
           COALESCE(NULLIF(pf.po_num, ''), NULLIF(icm.po_num, ''), '') resolved_po_num,
           csd.con_contact_name, csd.con_address, csd.con_branch, csd.con_branch_code, csd.billing_address, csd.billing_gst_no,
           csd.con_district, csd.zone, csd.con_state_name, csd.con_pincode, csd.con_contact_number, csd.alter_contact_name, csd.alter_number, csd.consignee_gst,
           invs.dc_file_name, invs.file_org_name, invs.ir_file_name, invs.ir_file_org_name, invs.file_invoice, invs.invoice_file_org_name
    FROM invoice_creation_main icm
    LEFT JOIN po_form pf ON pf.unique_id = icm.form_main_unique_id AND pf.is_delete = 0
    LEFT JOIN consignee_details_sub csd ON csd.unique_id = icm.consignee_unique_id AND csd.is_delete = 0
    LEFT JOIN invoice_sublist invs ON invs.invoice_id = icm.unique_id AND invs.is_delete = 0
    WHERE icm.unique_id = %s AND icm.is_delete = 0
    ORDER BY invs.id DESC
    LIMIT 1
    """
    with connection.cursor() as cur:
        cur.execute(sql, [unique_id])
        data = _rows(cur)
    return data[0] if data else None


def _item_rows(main):
    sql = """
    SELECT unique_id, item_code, product, item_qty, invoice_qty, stock_id, ser_no, seril_no_selc, product_unique_id,
           spec_srl_no, mon_ser_no
    FROM invoice_creation
    WHERE is_delete = 0 AND consignee_id = %s AND (po_unique_id = %s OR po_unique_id = %s)
    ORDER BY id ASC
    """
    with connection.cursor() as cur:
        cur.execute(sql, [main.get("consignee_unique_id", ""), main.get("form_main_unique_id", ""), main.get("po_unique_id", "")])
        rows = _rows(cur)
    items = []
    for idx, row in enumerate(rows, start=1):
        order_qty = _safe_int(row.get("item_qty"), 0)
        bill_qty = _safe_int(row.get("invoice_qty"), 0)
        items.append({
            "s_no": idx,
            "unique_id": row.get("unique_id", ""),
            "item_code": row.get("item_code") or "",
            "name": row.get("product") or "",
            "part_no": row.get("item_code") or "",
            "order_qty": order_qty,
            "bill_qty": bill_qty,
            "stock_qty": order_qty,
            "invoice_bill_qty": bill_qty,
            "remaining_qty": max(order_qty - bill_qty, 0),
            "serial_selection": row.get("seril_no_selc") or "",
            "serial_numbers": row.get("ser_no") or "",
            "spec_serial_count": max(_safe_int(row.get("spec_srl_no"), 1), 1),
            "mon_serial_numbers": row.get("mon_ser_no") or "",
            "stock_id": row.get("stock_id") or "",
            "product_unique_id": row.get("product_unique_id") or "",
        })
    return items


def _doc_rows(request, main):
    sql = """
    SELECT unique_id, consignee, ledger_name, ledger_no, dc_number, dc_date, invoice_no, invoice_date,
           dc_file_name, file_org_name, ir_file_name, ir_file_org_name, file_invoice, invoice_file_org_name
    FROM invoice_sublist
    WHERE invoice_id = %s AND is_delete = 0
    ORDER BY id DESC
    """
    with connection.cursor() as cur:
        cur.execute(sql, [main.get("unique_id", "")])
        rows = _rows(cur)

    result = []
    for idx, row in enumerate(rows, start=1):
        dc_file_name = row.get("dc_file_name") or ""
        ir_file_name = row.get("ir_file_name") or ""
        invoice_file_name = row.get("file_invoice") or ""
        result.append({
            "s_no": idx,
            "unique_id": row.get("unique_id") or "",
            "consignee_name": row.get("consignee") or "",
            "ledger_display": " / ".join(part for part in [row.get("ledger_name") or "", row.get("ledger_no") or ""] if part),
            "dc_display": " / ".join(part for part in [row.get("dc_number") or "", _fmt_date(row.get("dc_date"))] if part),
            "invoice_display": " / ".join(part for part in [row.get("invoice_no") or "", _fmt_date(row.get("invoice_date"))] if part),
            "dc_file_url": _file_url(f"/invoice-dc/files/{dc_file_name}/") if dc_file_name else "",
            "dc_original_name": row.get("file_org_name") or "",
            "ir_file_url": _file_url(f"/invoice-dc/files/{ir_file_name}/") if ir_file_name else "",
            "ir_original_name": row.get("ir_file_org_name") or "",
            "invoice_file_url": _file_url(f"/invoice-dc/files/{invoice_file_name}/") if invoice_file_name else "",
            "invoice_original_name": row.get("invoice_file_org_name") or "",
        })
    return result


def _invoice_status_text(value):
    status_map = {
        "0": "Pending",
        "1": "Approved",
        "2": "Rejected",
        "3": "Completed",
        "4": "Verified",
    }
    return status_map.get(str(value or "0"), "Pending")


def _approval_status_text(value):
    status_map = {
        "0": "Pending",
        "1": "Approved",
        "2": "Rejected",
    }
    return status_map.get(str(value or "0"), "Pending")


def _approval_block(status_value, approved_by, approved_date, reject_reason):
    approved = str(status_value or "0") == "1"
    approved_name = _staff_name(approved_by)
    return {
        "status": "approved" if approved else "rejected",
        "status_icon": "approved" if approved else "rejected",
        "label_by": "Approved By" if approved else "Reject By",
        "label_date": "Approved Date" if approved else "Rejected Date",
        "by": approved_name or "",
        "date": _fmt_date(approved_date),
        "reason": "" if approved else (reject_reason or ""),
    }


def _payload(request, main):
    items = _item_rows(main)
    district_name = _district_name(main.get("po_district")) or (main.get("con_district") or "")
    state_name = _state_name(main.get("po_state_name")) or (main.get("con_state_name") or "")
    department_display = _department_name(main.get("po_department") or main.get("ledger_name") or "")
    ledger_display = _ledger_name(main.get("ledger_name") or "")
    po_file_name = main.get("po_file_name") or ""
    dc_file_name = main.get("dc_file_name") or ""
    ir_file_name = main.get("ir_file_name") or ""
    invoice_file_name = main.get("file_invoice") or ""
    return {
        "unique_id": main.get("unique_id") or "",
        "source_unique_id": main.get("unique_id") or "",
        "form_main_unique_id": main.get("form_main_unique_id") or "",
        "po_unique_id": main.get("po_unique_id") or "",
        "po_num": main.get("resolved_po_num") or main.get("po_num") or "",
        "po_date": _fmt_date(main.get("po_date")),
        "stock_id": main.get("stock_id") or "",
        "stock_date": _fmt_date(main.get("stock_date")),
        "department": main.get("po_department") or main.get("ledger_name") or "",
        "department_display": department_display,
        "gst_option": main.get("po_gst_option") or "",
        "customer_name": department_display,
        "customer_details": department_display,
        "district_name": district_name,
        "state_name": state_name,
        "customer_location": ", ".join(part for part in [district_name, state_name] if part),
        "executive_name": main.get("po_executive_name") or main.get("executive_name") or "",
        "executive_display": _executive_name(main.get("po_executive_name") or main.get("executive_name") or ""),
        "team_member": _team_member_name(main.get("team_mem") or ""),
        "billing_address": main.get("billing_address") or "",
        "billing_gst_no": main.get("billing_gst_no") or "",
        "consignee_name": main.get("con_contact_name") or "",
        "consignee_address": main.get("con_address") or "",
        "branch": main.get("con_branch") or "",
        "branch_code": main.get("con_branch_code") or "",
        "zone": main.get("zone") or "",
        "pincode": main.get("con_pincode") or "",
        "contact_name": main.get("con_contact_name") or main.get("po_contact_name") or "",
        "contact_number": main.get("con_contact_number") or main.get("po_contact_number") or "",
        "alternate_contact_name": main.get("alter_contact_name") or "",
        "alternate_contact_number": main.get("alter_number") or "",
        "consignee_gst_no": main.get("consignee_gst") or "",
        "email": main.get("po_email") or "",
        "ledger_name": main.get("ledger_name") or "",
        "ledger_display": ledger_display,
        "ledger_no": main.get("ledger_no") or "",
        "invoice_auto_id": main.get("invoice_auto_id") or "",
        "no_of_items": len(items),
        "dc_number": main.get("dc_number") or "",
        "dc_date": _fmt_date(main.get("dc_date")),
        "invoice_no": main.get("invoice_no") or "",
        "invoice_date": _fmt_date(main.get("invoice_date")),
        "invoice_qty": _safe_int(main.get("invoice_qty"), 0),
        "invoice_value": str(main.get("invoice_value") or "0"),
        "invoice_doc_status": str(main.get("invoice_doc_status") or "0"),
        "invoice_doc_status_label": _invoice_status_text(main.get("invoice_doc_status")),
        "doc_approval_sts": str(main.get("doc_approval_sts") or "0"),
        "acc_team_status": str(main.get("ac_team_verifiy_status") or "0"),
        "approved_by": main.get("approved_by") or "",
        "approved_date": _fmt_date(main.get("approved_date")),
        "ac_team_approved_by": main.get("ac_team_approved_by") or "",
        "ac_approved_date": _fmt_date(main.get("ac_approved_date")),
        "reject_reason_elcot": main.get("reject_reason_elcot") or "",
        "operation_team": _approval_block(main.get("doc_approval_sts"), main.get("approved_by"), main.get("approved_date"), main.get("reject_reason_elcot")),
        "accounts_team": _approval_block(main.get("ac_team_verifiy_status"), main.get("ac_team_approved_by"), main.get("ac_approved_date"), main.get("reject_reason_elcot")),
        "po_file_url": _file_url(f"/purchase-order/files/po_copy/{po_file_name}/") if po_file_name else "",
        "dc_file_url": _file_url(f"/invoice-dc/files/{dc_file_name}/") if dc_file_name else "",
        "ir_file_url": _file_url(f"/invoice-dc/files/{ir_file_name}/") if ir_file_name else "",
        "invoice_file_url": _file_url(f"/invoice-dc/files/{invoice_file_name}/") if invoice_file_name else "",
        "dc_original_name": main.get("file_org_name") or "",
        "ir_original_name": main.get("ir_file_org_name") or "",
        "invoice_original_name": main.get("invoice_file_org_name") or "",
        "doc_rows": _doc_rows(request, main),
        "items": items,
    }


def _list_payload(main):
    district_name = _district_name(main.get("po_district")) or (main.get("con_district") or "")
    state_name = _state_name(main.get("po_state_name")) or (main.get("con_state_name") or "")
    department_display = _department_name(main.get("po_department") or main.get("ledger_name") or "")
    assign_qty = _safe_int(main.get("assign_qty"), 0)
    bill_qty = _safe_int(main.get("bill_qty"), _safe_int(main.get("invoice_qty"), 0))
    remaining_qty = max(assign_qty - bill_qty, 0)
    return {
        "unique_id": main.get("unique_id") or "",
        "po_num": main.get("resolved_po_num") or main.get("po_num") or "",
        "po_date": _fmt_date(main.get("po_date")),
        "stock_id": main.get("stock_id") or "",
        "customer_name": department_display,
        "customer_location": ", ".join(part for part in [district_name, state_name] if part),
        "billing_address": main.get("billing_address") or "",
        "billing_gst_no": main.get("billing_gst_no") or "",
        "consignee_name": main.get("con_contact_name") or "",
        "consignee_address": main.get("con_address") or "",
        "branch": main.get("con_branch") or "",
        "branch_code": main.get("con_branch_code") or "",
        "district_name": district_name,
        "zone": main.get("zone") or "",
        "state_name": state_name,
        "pincode": main.get("con_pincode") or "",
        "contact_name": main.get("con_contact_name") or "",
        "contact_number": main.get("con_contact_number") or "",
        "alternate_contact_name": main.get("alter_contact_name") or "",
        "alternate_contact_number": main.get("alter_number") or "",
        "consignee_gst_no": main.get("consignee_gst") or "",
        "executive_name": main.get("po_executive_name") or main.get("executive_name") or "",
        "executive_display": _executive_name(main.get("po_executive_name") or main.get("executive_name") or ""),
        "team_member": _team_member_name(main.get("team_mem") or ""),
        "dc_number": main.get("dc_number") or "",
        "invoice_no": main.get("invoice_no") or "",
        "assign_qty": assign_qty,
        "remaining_qty": remaining_qty,
        "bill_qty": bill_qty,
        "balance_qty": remaining_qty,
        "invoice_qty": bill_qty,
        "invoice_value": str(main.get("invoice_value") or "0"),
        "invoice_doc_status": str(main.get("invoice_doc_status") or "0"),
        "invoice_doc_status_label": _invoice_status_text(main.get("invoice_doc_status")),
        "reject_reason_elcot": main.get("reject_reason_elcot") or "",
        "doc_approval_status": _approval_status_text(main.get("doc_approval_sts")),
        "ac_approval_status": _approval_status_text(main.get("ac_team_verifiy_status")),
        "consignee_verify_status": str(main.get("cons_verify_sts") or "0"),
        "status": "Completed" if (main.get("invoice_no") or "").strip() and str(main.get("cons_verify_sts") or "0") == "1" and _safe_int(main.get("has_doc_row"), 0) > 0 else "Pending",
    }


class InvoiceListView(APIView):
    def get(self, request):
        ser = InvoiceListQuerySerializer(data=request.query_params)
        ser.is_valid(raise_exception=True)
        data = ser.validated_data
        where = ["icm.is_delete = 0"]
        params = []
        company_id = request_company_id(request)
        if company_id:
            where.append("pf.sess_company_id = %s")
            params.append(company_id)
        active_doc_exists = (
            "EXISTS ("
            "SELECT 1 FROM invoice_sublist invs "
            "WHERE invs.invoice_id = icm.unique_id "
            "AND invs.is_delete = 0"
            ")"
        )
        if data.get("tab") == "pending":
            where.append(
                "((icm.invoice_no IS NULL OR icm.invoice_no = '') "
                "OR COALESCE(csd.cons_verify_sts, '0') <> '1' "
                f"OR NOT {active_doc_exists})"
            )
        else:
            where.append(
                "(icm.invoice_no IS NOT NULL AND icm.invoice_no <> '' "
                "AND COALESCE(csd.cons_verify_sts, '0') = '1' "
                f"AND {active_doc_exists})"
            )
        if data.get("team_member"):
            where.append("icm.team_mem = %s")
            params.append(data["team_member"])
        if data.get("from_date"):
            where.append("DATE(icm.po_date) >= %s")
            params.append(_norm_date(data["from_date"]))
        if data.get("to_date"):
            where.append("DATE(icm.po_date) <= %s")
            params.append(_norm_date(data["to_date"]))
        if data.get("search"):
            like = f"%{data['search'].strip()}%"
            where.append("(" + " OR ".join([
                "COALESCE(NULLIF(pf.po_num, ''), NULLIF(icm.po_num, ''), '') LIKE %s",
                "COALESCE(csd.con_contact_name, '') LIKE %s",
                "COALESCE(csd.con_address, '') LIKE %s",
                "COALESCE(icm.invoice_no, '') LIKE %s",
                "COALESCE(icm.dc_number, '') LIKE %s",
            ]) + ")")
            params.extend([like] * 5)
        sql = f"""
        SELECT icm.*, pf.department po_department, pf.executive_name po_executive_name, pf.district po_district, pf.state_name po_state_name,
               pf.file_name po_file_name, COALESCE(NULLIF(pf.po_num, ''), NULLIF(icm.po_num, ''), '') resolved_po_num,
               csd.con_contact_name, csd.con_address, csd.con_branch, csd.con_branch_code, csd.billing_address, csd.billing_gst_no,
               csd.con_district, csd.zone, csd.con_state_name, csd.con_pincode, csd.con_contact_number, csd.alter_contact_name, csd.alter_number, csd.consignee_gst,
               csd.cons_verify_sts,
               COALESCE((
                   SELECT SUM(ic.item_qty)
                   FROM invoice_creation ic
                   WHERE ic.is_delete = 0
                     AND ic.consignee_id = icm.consignee_unique_id
                     AND (ic.po_unique_id = icm.form_main_unique_id OR ic.po_unique_id = icm.po_unique_id)
               ), 0) AS assign_qty,
               COALESCE((
                   SELECT SUM(ic.invoice_qty)
                   FROM invoice_creation ic
                   WHERE ic.is_delete = 0
                     AND ic.consignee_id = icm.consignee_unique_id
                     AND (ic.po_unique_id = icm.form_main_unique_id OR ic.po_unique_id = icm.po_unique_id)
               ), 0) AS bill_qty,
               CASE WHEN EXISTS (
                   SELECT 1
                   FROM invoice_sublist invs
                   WHERE invs.invoice_id = icm.unique_id
                     AND invs.is_delete = 0
               ) THEN 1 ELSE 0 END AS has_doc_row
        FROM invoice_creation_main icm
        LEFT JOIN (
            SELECT MAX(id) AS id, unique_id
            FROM po_form
            WHERE is_delete = 0
            GROUP BY unique_id
        ) pf_latest ON pf_latest.unique_id = icm.form_main_unique_id
        LEFT JOIN po_form pf ON pf.id = pf_latest.id
        LEFT JOIN (
            SELECT MAX(id) AS id, unique_id
            FROM consignee_details_sub
            WHERE is_delete = 0
            GROUP BY unique_id
        ) csd_latest ON csd_latest.unique_id = icm.consignee_unique_id
        LEFT JOIN consignee_details_sub csd ON csd.id = csd_latest.id
        WHERE {' AND '.join(where)}
        ORDER BY icm.id DESC
        """
        with connection.cursor() as cur:
            cur.execute(sql, params)
            rows = _rows(cur)
        result = []
        for idx, row in enumerate(rows, start=1):
            try:
                payload = _list_payload(row)
            except Exception:
                payload = {
                    "unique_id": row.get("unique_id") or "",
                    "po_num": row.get("resolved_po_num") or row.get("po_num") or "",
                    "po_date": _fmt_date(row.get("po_date")),
                    "customer_name": row.get("po_department") or row.get("ledger_name") or "",
                    "customer_location": "",
                    "consignee_name": row.get("con_contact_name") or "",
                    "contact_number": row.get("con_contact_number") or "",
                    "executive_name": row.get("po_executive_name") or row.get("executive_name") or "",
                    "executive_display": _executive_name(row.get("po_executive_name") or row.get("executive_name") or ""),
                    "team_member": row.get("team_mem") or "",
                    "dc_number": row.get("dc_number") or "",
                    "invoice_no": row.get("invoice_no") or "",
                    "invoice_qty": _safe_int(row.get("invoice_qty"), 0),
                    "invoice_value": str(row.get("invoice_value") or "0"),
                    "consignee_verify_status": str(row.get("cons_verify_sts") or "0"),
                    "status": "Completed" if (row.get("invoice_no") or "").strip() and str(row.get("cons_verify_sts") or "0") == "1" and _safe_int(row.get("has_doc_row"), 0) > 0 else "Pending",
                }
            payload["s_no"] = idx
            result.append(payload)
        return Response({"status": True, "recordsTotal": len(result), "recordsFiltered": len(result), "data": result})


class InvoiceSourceDetailView(APIView):
    def get(self, request, source_unique_id):
        main = _source_detail(source_unique_id)
        if not main:
            return Response({"status": False, "message": "Invoice record not found."}, status=404)
        return Response({"status": True, "data": _payload(request, main)})


class InvoiceCreateView(APIView):
    parser_classes = [MultiPartParser, FormParser]

    def post(self, request):
        action = str(request.data.get("action") or "").strip()
        if action == "serial_no_update":
            payload, code = _serial_no_update(request.data)
            return Response(payload, status=code)
        if action == "update_serial_no":
            payload, code = _update_serial_no(request.data)
            return Response(payload, status=code)
        ser = InvoiceSaveSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        data = dict(ser.validated_data)
        source_unique_id = data.get("source_unique_id", "")
        main = _source_detail(source_unique_id)
        if not main:
            return Response({"status": False, "message": "Invoice source not found."}, status=404)
        if (main.get("invoice_no") or "").strip():
            return Response({"status": False, "message": "Invoice already created for this row."}, status=400)
        try:
            _save_invoice(request, main, data, creating=True)
        except ValueError as exc:
            return Response({"status": False, "message": str(exc)}, status=400)
        return Response({"status": True, "msg": "create", "message": "Invoice saved successfully."}, status=status.HTTP_201_CREATED)


class InvoiceDetailView(APIView):
    parser_classes = [MultiPartParser, FormParser]

    def get(self, request, unique_id):
        main = _source_detail(unique_id)
        if not main:
            return Response({"status": False, "message": "Invoice record not found."}, status=404)
        return Response({"status": True, "data": _payload(request, main)})

    def put(self, request, unique_id):
        main = _source_detail(unique_id)
        if not main:
            return Response({"status": False, "message": "Invoice record not found."}, status=404)
        ser = InvoiceSaveSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        data = dict(ser.validated_data)
        try:
            _save_invoice(request, main, data, creating=False)
        except ValueError as exc:
            return Response({"status": False, "message": str(exc)}, status=400)
        return Response({"status": True, "msg": "update", "message": "Invoice updated successfully."})


class InvoiceDocRowDeleteView(APIView):
    def delete(self, request, unique_id):
        with transaction.atomic(), connection.cursor() as cur:
            cur.execute(
                """
                SELECT 1
                FROM invoice_sublist
                WHERE unique_id = %s AND is_delete = 0
                LIMIT 1
                """,
                [unique_id],
            )
            if not cur.fetchone():
                return Response({"status": False, "message": "Document row not found."}, status=404)
            cur.execute(
                """
                UPDATE invoice_sublist
                SET is_delete = 1
                WHERE unique_id = %s AND is_delete = 0
                """,
                [unique_id],
            )
        return Response({"status": True, "message": "Document row deleted successfully."})


class InvoiceDeleteView(APIView):
    def delete(self, request, unique_id):
        main = _source_detail(unique_id)
        if not main:
            return Response({"status": False, "message": "Invoice record not found."}, status=404)

        invoice_no = str(main.get("invoice_no") or "").strip()
        dc_number = str(main.get("dc_number") or "").strip()
        if invoice_no and dc_number:
            with connection.cursor() as cur:
                cur.execute(
                    """
                    SELECT bill_no
                    FROM sign_doc_verification_detail
                    WHERE invoice_no = %s
                      AND dc_number = %s
                      AND is_delete = 0
                    LIMIT 1
                    """,
                    [invoice_no, dc_number],
                )
                bill_row = cur.fetchone()
                if bill_row and bill_row[0]:
                    return Response(
                        {"status": False, "message": "Cannot delete invoice record. Bill has already been created for this record."},
                        status=400,
                    )

        invoice_auto_id = str(main.get("invoice_auto_id") or "").strip()
        form_main_unique_id = str(main.get("form_main_unique_id") or main.get("po_unique_id") or "").strip()
        stock_id = str(main.get("stock_id") or "").strip()

        with transaction.atomic(), connection.cursor() as cur:
            cur.execute(
                """
                UPDATE invoice_creation_main
                SET is_delete = 1
                WHERE unique_id = %s
                  AND is_delete = 0
                """,
                [unique_id],
            )
            cur.execute(
                """
                UPDATE invoice_sublist
                SET is_delete = 1
                WHERE invoice_id = %s
                  AND is_delete = 0
                """,
                [unique_id],
            )
            if invoice_auto_id:
                cur.execute(
                    """
                    UPDATE invoice_creation
                    SET is_delete = 1,
                        ser_no = '',
                        mon_ser_no = '',
                        seril_no_selc = '',
                        spec_srl_no = NULL,
                        dc_num = '',
                        dc_date = NULL,
                        invoice_no = '',
                        invoice_date = NULL,
                        ledger_name = '',
                        ledger_no = '',
                        invoice_auto_id = ''
                    WHERE invoice_auto_id = %s
                      AND is_delete = 0
                    """,
                    [invoice_auto_id],
                )
                try:
                    cur.execute(
                        """
                        UPDATE invoice_creation_main_payment_data
                        SET is_delete = 1
                        WHERE unique_id = %s
                        """,
                        [unique_id],
                    )
                except Exception:
                    pass

            if form_main_unique_id and stock_id:
                cur.execute(
                    """
                    SELECT COALESCE(SUM(invoice_qty), 0)
                    FROM invoice_creation
                    WHERE stock_id = %s
                      AND po_unique_id = %s
                      AND is_delete = 0
                    """,
                    [stock_id, form_main_unique_id],
                )
                active_qty = _safe_int((cur.fetchone() or [0])[0], 0)
                stock_status = 0 if active_qty <= 0 else 1
                cur.execute(
                    """
                    UPDATE stock_position_main
                    SET billed_qty = %s,
                        status = %s
                    WHERE form_main_unique_id = %s
                      AND stock_id = %s
                      AND is_delete = 0
                    """,
                    [active_qty, stock_status, form_main_unique_id, stock_id],
                )

        return Response({"status": True, "message": "Invoice record deleted successfully."})


def _save_invoice(request, main, data, creating):
    dc_file_name = main.get("dc_file_name") or ""
    dc_file_org_name = main.get("file_org_name") or ""
    ir_file_name = main.get("ir_file_name") or ""
    ir_file_org_name = main.get("ir_file_org_name") or ""
    invoice_file_name = main.get("file_invoice") or ""
    invoice_file_org_name = main.get("invoice_file_org_name") or ""
    if request.FILES.get("dc_file"):
        dc_file_name, dc_file_org_name = _save_upload(request.FILES["dc_file"], "dc")
    if request.FILES.get("ir_file"):
        ir_file_name, ir_file_org_name = _save_upload(request.FILES["ir_file"], "ir")
    if request.FILES.get("invoice_file"):
        invoice_file_name, invoice_file_org_name = _save_upload(request.FILES["invoice_file"], "invoice")
    invoice_auto_id = main.get("invoice_auto_id") or _next_invoice_auto_id()
    dc_number = _normalize_dc_number(data.get("dc_number", ""))
    dc_date = _norm_date(data.get("dc_date", "")) or None
    invoice_no = data.get("invoice_no", "").strip()
    invoice_date = _norm_date(data.get("invoice_date", "")) or None
    ledger_name = data.get("ledger_name", "").strip()
    ledger_no = data.get("ledger_no", "").strip()
    items = _item_serial_payload(data.get("items_json", "[]"))
    if _duplicate_dc_exists(dc_number, exclude_unique_id=main.get("unique_id", "")):
        raise ValueError(f"DC Number '{dc_number}' already exists.")
    with transaction.atomic(), connection.cursor() as cur:
        cur.execute(
            """
            UPDATE invoice_creation_main
            SET dc_number=%s, dc_date=%s, invoice_no=%s, invoice_date=%s, ledger_name=%s, ledger_no=%s,
                invoice_auto_id=%s, invoice_doc_status=%s
            WHERE unique_id=%s AND is_delete=0
            """,
            [dc_number, dc_date, invoice_no, invoice_date, ledger_name, ledger_no, invoice_auto_id, 1 if invoice_no else 0, main.get("unique_id")],
        )
        cur.execute(
            """
            UPDATE invoice_creation
            SET dc_num=%s, dc_date=%s, invoice_no=%s, invoice_date=%s, ledger_name=%s, ledger_no=%s, invoice_auto_id=%s
            WHERE is_delete=0 AND consignee_id=%s AND (po_unique_id=%s OR po_unique_id=%s)
            """,
            [dc_number, dc_date, invoice_no, invoice_date, ledger_name, ledger_no, invoice_auto_id, main.get("consignee_unique_id", ""), main.get("form_main_unique_id", ""), main.get("po_unique_id", "")],
        )
        for item in items:
            cur.execute(
                """
                UPDATE invoice_creation
                SET ser_no=%s, seril_no_selc=%s, invoice_qty=%s
                WHERE unique_id=%s AND is_delete=0
                """,
                [item.get("serial_numbers", ""), item.get("serial_selection", ""), item.get("invoice_bill_qty") or item.get("bill_qty") or 0, item.get("unique_id")],
            )
        cur.execute("SELECT unique_id FROM invoice_sublist WHERE invoice_id=%s AND is_delete=0 ORDER BY id DESC LIMIT 1", [main.get("unique_id")])
        row = cur.fetchone()
        if row:
            cur.execute(
                """
                UPDATE invoice_sublist
                SET po_unique_id=%s, po_num=%s, dc_number=%s, dc_date=%s, excutive_name=%s, consignee=%s, consignee_unique_id=%s,
                    form_main_unique_id=%s, ledger_name=%s, ledger_no=%s, invoice_no=%s, dc_file_name=%s, file_org_name=%s,
                    ir_file_name=%s, ir_file_org_name=%s, file_invoice=%s, invoice_file_org_name=%s, po_date=%s, invoice_date=%s
                WHERE unique_id=%s
                """,
                [main.get("po_unique_id", ""), main.get("resolved_po_num") or main.get("po_num") or "", dc_number, dc_date, main.get("po_executive_name") or main.get("executive_name") or "", main.get("con_contact_name") or "", main.get("consignee_unique_id") or "", main.get("form_main_unique_id") or "", ledger_name, ledger_no, invoice_no, dc_file_name, dc_file_org_name, ir_file_name, ir_file_org_name, invoice_file_name, invoice_file_org_name, main.get("po_date"), invoice_date, row[0]],
            )
        else:
            cur.execute(
                """
                INSERT INTO invoice_sublist (
                    unique_id, invoice_id, po_unique_id, po_num, dc_number, dc_date, excutive_name, no_of_consignee,
                    consignee, consignee_unique_id, form_main_unique_id, ledger_name, ledger_no, invoice_no, doc_approval_sts,
                    ac_team_verifiy_status, dc_file_name, file_org_name, ir_file_name, ir_file_org_name, file_invoice,
                    invoice_file_org_name, is_active, is_delete, po_date, invoice_date, serial_no
                ) VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,0,0,%s,%s,%s,%s,%s,%s,1,0,%s,%s,%s)
                """,
                [_uid(), main.get("unique_id"), main.get("po_unique_id", ""), main.get("resolved_po_num") or main.get("po_num") or "", dc_number, dc_date, main.get("po_executive_name") or main.get("executive_name") or "", 1, main.get("con_contact_name") or "", main.get("consignee_unique_id") or "", main.get("form_main_unique_id") or "", ledger_name, ledger_no, invoice_no, dc_file_name, dc_file_org_name, ir_file_name, ir_file_org_name, invoice_file_name, invoice_file_org_name, main.get("po_date"), invoice_date, ", ".join([str(x.get("serial_numbers", "")).strip() for x in items if str(x.get("serial_numbers", "")).strip()])],
            )


@method_decorator(xframe_options_exempt, name="dispatch")
class InvoiceFileView(APIView):
    authentication_classes = []
    permission_classes = []

    def get(self, request, filename):
        safe = os.path.basename(filename)
        path = os.path.join(_media_root(), safe)
        if not os.path.exists(path):
            raise Http404("File not found.")
        return FileResponse(open(path, "rb"), as_attachment=False, filename=safe)


class LedgerOptionsView(APIView):
    def get(self, request):
        department = request.GET.get("department", "").strip()
        if not department:
            return Response({"status": False, "message": "Department is required."}, status=400)
        with connection.cursor() as cur:
            cur.execute(
                """
                SELECT DISTINCT unique_id, ledger_name, ledger_no
                FROM view_po_ledger_list
                WHERE department_unique_id = %s OR department = %s
                ORDER BY ledger_name
                """,
                [department, department]
            )
            rows = _rows(cur)
        return Response({"status": True, "data": rows})
