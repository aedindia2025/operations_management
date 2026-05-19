import os, uuid
from datetime import datetime, timedelta
from django.conf import settings
from django.db import connection, transaction
from django.http import FileResponse, Http404
from django.utils.decorators import method_decorator
from django.views.decorators.clickjacking import xframe_options_exempt
from rest_framework import status
from rest_framework.parsers import FormParser, MultiPartParser
from rest_framework.response import Response
from rest_framework.views import APIView
from master.serializers.installation.installation_serializer import (
    InstallationDispatchSaveSerializer,
    InstallationListQuerySerializer,
    InstallationSaveSerializer,
)
from master.tenant import request_company_id

EXECUTIVE_TYPE_UID = "69b0115ced3bd96390"
TEAM_FILTER_ALLOW = {"5f97fc3257f2525529", "65deef78ba17d65741"}
TEAM_FILTER_DENY = {"67e7997ad327489044", "66a3334baa22534432", "65efd9a94bcdb30916"}
ENG_SCOPE_DENY_PENDING = {"5f97fc3257f2525529", "65deef78ba17d65741", "65efd97b4df4040205", "65fac54da3aac66007"}
ENG_SCOPE_DENY_COMPLETED = {"5f97fc3257f2525529", "65deef78ba17d65741", "65efd97b4df4040205", "65efd9a94bcdb30916", "65fac54da3aac66007"}


def _uid(prefix=""): return f"{prefix}{uuid.uuid4().hex[:18]}"
def _rows(cur):
    cols = [c[0] for c in cur.description]
    return [dict(zip(cols, row)) for row in cur.fetchall()]

def _media_root():
    path = os.path.join(settings.MEDIA_ROOT, "installation")
    os.makedirs(path, exist_ok=True)
    return path

def _save_upload(file_obj, prefix):
    original = os.path.basename(getattr(file_obj, "name", "upload.bin"))
    filename = f"{prefix}_{uuid.uuid4().hex[:8]}_{original}"
    with open(os.path.join(_media_root(), filename), "wb+") as fh:
        for chunk in file_obj.chunks(): fh.write(chunk)
    return filename, original

def _fmt_date(value):
    if not value: return ""
    txt = str(value)
    for fmt in ("%Y-%m-%d", "%d-%m-%Y", "%Y/%m/%d", "%d/%m/%Y"):
        try: return datetime.strptime(txt[:10], fmt).strftime("%d-%m-%Y")
        except ValueError: pass
    return txt

def _norm_date(value):
    txt = str(value or "").strip()
    if not txt: return ""
    for fmt in ("%Y-%m-%d", "%d-%m-%Y", "%d/%m/%Y"):
        try: return datetime.strptime(txt, fmt).strftime("%Y-%m-%d")
        except ValueError: pass
    return txt

def _sql_date(value):
    norm = _norm_date(value)
    return norm or None

def _parse_date_value(value):
    if not value:
        return None
    txt = str(value).strip()
    for fmt in ("%Y-%m-%d", "%d-%m-%Y", "%Y/%m/%d", "%d/%m/%Y"):
        try:
            return datetime.strptime(txt[:10], fmt)
        except ValueError:
            pass
    return None

def _safe_days(value):
    try:
        txt = str(value if value is not None else "").strip()
        if not txt:
            return 0
        return int(float(txt))
    except (TypeError, ValueError):
        return 0

def _add_days_display(base_date, days):
    if not base_date or days <= 0:
        return ""
    try:
        return (base_date + timedelta(days=days)).strftime("%d-%m-%Y")
    except Exception:
        return ""

def _normalize_item_text(value):
    return "".join(str(value or "").upper().split())

def _installation_engg_type(value):
    text = str(value or "").strip().lower()
    if text in {"1", "own engineer", "own-engineer"}:
        return "1"
    if text in {"2", "outsource vendor", "outsource-vendor"}:
        return "2"
    if text == "inhouse":
        return "inhouse"
    return str(value or "").strip()[:10]

def _main_engg_type(value):
    text = str(value or "").strip().lower()
    if text in {"1", "own engineer", "own-engineer"}:
        return "own-engineer"
    if text in {"2", "outsource vendor", "outsource-vendor"}:
        return "outsource-vendor"
    if text == "inhouse":
        return "inhouse"
    return str(value or "").strip()

def _one(sql, params=None, default=""):
    with connection.cursor() as cur:
        cur.execute(sql, params or [])
        row = cur.fetchone()
    return row[0] if row and row[0] is not None else default


def _dc_required_sql(inst_alias: str, po_alias: str, po_key_expr: str):
    return f"""
    CASE
        WHEN COALESCE(NULLIF(TRIM({inst_alias}.dc_required), ''), NULLIF(TRIM({po_alias}.dc_required), ''), '0') = '1'
             OR EXISTS (
                 SELECT 1
                 FROM product_details_sub pds
                 WHERE pds.form_main_unique_id = {po_key_expr}
                   AND pds.is_delete = 0
                   AND COALESCE(NULLIF(TRIM(pds.document_required), ''), '0') = 'dc_required'
                 LIMIT 1
             )
        THEN '1'
        ELSE '0'
    END
    """

def _status(data):
    dc, ir, snr = data.get("documents_type") == "DC", data.get("documents_type1") == "IR", data.get("documents_type2") == "SNR"
    if dc and ir and snr: return "2"
    if dc and snr: return "1"
    if data.get("engineer_name") or data.get("installation_com_date"): return "4"
    return "0"

def _next_install_id():
    prefix = datetime.now().strftime("INS-%y%m-")
    count = int(_one("SELECT COUNT(*) FROM installation_details_sublist WHERE installation_id LIKE %s", [f"{prefix}%"], 0) or 0) + 1
    return f"{prefix}{count:04d}"

def _map_row(row):
    pof = row.get("po_file_name") or ""
    dcf = row.get("dc_signed_file") or row.get("dc_file") or row.get("carry_dc_file") or ""
    irf = row.get("ir_signed_file") or row.get("ir_file") or ""
    snrf = row.get("snr_signed_file") or row.get("snr_file") or row.get("carry_snr_file") or ""
    invf = row.get("invoice_file_name") or ""
    return {
        "source_unique_id": row.get("source_unique_id", ""), "unique_id": row.get("unique_id") or "", "po_form_unique_id": row.get("po_form_unique_id", ""),
        "po_auto_id": row.get("po_auto_id", ""), "po_num": row.get("po_num", ""), "po_date": _fmt_date(row.get("po_date")),
        "ledger_name": row.get("ledger_name") or "", "district": row.get("district_name") or "", "state": row.get("state_name") or "",
        "team_member": row.get("team_member") or "", "team_member_id": row.get("team_mem") or "", "engineer_name": row.get("engineer_display") or "", "engineer_name_id": row.get("engineer_name") or "",
        "invoice_no": row.get("invoice_no", ""), "invoice_date": _fmt_date(row.get("invoice_date")), "dc_number": row.get("dc_number", ""), "dc_date": _fmt_date(row.get("dc_date")),
        "invoice_value": row.get("invoice_value") or "0", "installation_alloc_date": _fmt_date(row.get("installation_alloc_date") or row.get("vendor_ins_date")),
        "consignee_unique_id": row.get("consignee_unique_id") or "", "consignee_name": row.get("consignee_name") or "", "con_address": row.get("con_address") or "",
        "po_file_url": f"/api/master/purchase-order/files/po_copy/{pof}/" if pof else "", "dc_file_url": f"/api/master/installation/files/{dcf}/" if dcf else "", "ir_file_url": f"/api/master/installation/files/{irf}/" if irf else "", "invoice_file_url": f"/api/master/purchase-order/files/invoice/{invf}/" if invf else "",
        "snr_file_url": f"/api/master/installation/files/{snrf}/" if snrf else "",
        "documents_type": row.get("documents_type") or "0", "documents_type1": row.get("documents_type1") or "0", "documents_type2": row.get("documents_type2") or "0",
        "dc_required": row.get("dc_required") or "0", "dc_received_sts": row.get("dc_received_sts") or "", "ir_rec_status": row.get("ir_rec_status") or "", "snr_rec_status": row.get("snr_rec_status") or "",
        "canDelete": str(row.get("can_delete") or "0").strip().lower() in {"1", "true", "yes"},
        "status": str(row.get("installation_status") or "0"), "dc_delivery_status": str(row.get("dc_delivery_status") or "0"),
    }

def _detail_payload(detail):
    data = _map_row(detail)
    dc_status = detail.get("dc_received_sts") or detail.get("carry_dc_received_sts") or ""
    dc_signed_date = detail.get("dc_cus_signed_date") or detail.get("carry_dc_cus_signed_date") or ""
    snr_status = detail.get("snr_rec_status") or detail.get("carry_snr_rec_status") or ""
    snr_signed_date = detail.get("snr_cus_signed_date") or detail.get("carry_snr_cus_signed_date") or ""
    documents_type = detail.get("documents_type") if str(detail.get("documents_type") or "0") != "0" else ("DC" if (detail.get("carry_dc_file") or detail.get("carry_dc_original_name")) else "0")
    documents_type2 = detail.get("documents_type2") if str(detail.get("documents_type2") or "0") != "0" else ("SNR" if (detail.get("carry_snr_file") or detail.get("carry_snr_original_name")) else "0")
    data["items"] = _fetch_items(
        detail.get("po_form_unique_id"),
        detail.get("invoice_no"),
        detail.get("invoice_auto_id"),
        detail.get("po_auto_id"),
    )
    data.update({
        "invoice_auto_id": detail.get("invoice_auto_id") or "", "con_pincode": detail.get("con_pincode") or "", "engg_type": detail.get("engg_type") or "", "installation_com_date": detail.get("installation_com_date") or "", "eng_remarks": detail.get("eng_remarks") or "", "in_charge": detail.get("in_charge") or "", "gst_percent": detail.get("gst_percent") or "", "ttl_amnt": detail.get("ttl_amnt") or "",
        "bill_address": detail.get("bill_address") or "", "customer_phone": detail.get("customer_phone") or "", "customer_email": detail.get("customer_email") or "", "consignee_phone": detail.get("consignee_phone") or "", "customer_district": detail.get("customer_district") or "", "customer_state": detail.get("customer_state") or "",
        "document_type_label": detail.get("document_type_label") or ("DC Required" if str(detail.get("dc_required") or "0") == "1" else "IR Required"),
        "vendor_engineer_type": detail.get("vendor_engineer_type") or detail.get("engg_type") or "", "vendor_engineer_name": detail.get("vendor_engineer_name") or detail.get("engineer_display") or detail.get("engineer_name") or "", "vendor_engineer_id": detail.get("vendor_engineer_id") or "",
        "vendor_installation_date": detail.get("vendor_installation_date") or detail.get("installation_com_date") or "", "vendor_rate": detail.get("vendor_rate") or detail.get("in_charge") or "", "vendor_gst": detail.get("vendor_gst") or detail.get("gst_percent") or "", "vendor_total_amount": detail.get("vendor_total_amount") or detail.get("ttl_amnt") or "",
        "vendor_assign_no": detail.get("vendor_assign_no") or "", "vendor_assign_date": detail.get("vendor_assign_date") or "", "vendor_assign_datetime": detail.get("vendor_assign_datetime") or "", "vendor_timeline": detail.get("vendor_timeline") or "",
        "documents_type": documents_type, "documents_type1": detail.get("documents_type1") or "0", "documents_type2": documents_type2,
        "dc_received_sts": dc_status, "dc_cus_signed_date": _fmt_date(dc_signed_date), "ir_rec_status": detail.get("ir_rec_status") or "", "ir_cus_signed_date": detail.get("ir_cus_signed_date") or "", "snr_rec_status": snr_status, "snr_cus_signed_date": _fmt_date(snr_signed_date), "team_mem": detail.get("team_mem") or "",
        "dc_required": detail.get("dc_required") or "0", "dc_delivery_status": str(detail.get("dc_delivery_status") or "0"), "without_snr": detail.get("without_snr") or "",
        "dc_original_name": detail.get("dc_original_name") or detail.get("carry_dc_original_name") or "", "ir_original_name": detail.get("ir_original_name") or "", "snr_original_name": detail.get("snr_original_name") or detail.get("carry_snr_original_name") or "", "snr_file_url": f"/api/master/installation/files/{detail.get('snr_file') or detail.get('carry_snr_file')}/" if (detail.get("snr_file") or detail.get("carry_snr_file")) else "",
    })
    return data

def _initial_doc_files(detail, data):
    return {
        "dc_file": (detail.get("dc_file") or detail.get("carry_dc_file") or "") if data.get("documents_type") == "DC" else "",
        "dc_original_name": (detail.get("dc_original_name") or detail.get("carry_dc_original_name") or "") if data.get("documents_type") == "DC" else "",
        "ir_file": (detail.get("ir_file") or "") if data.get("documents_type1") == "IR" else "",
        "ir_original_name": (detail.get("ir_original_name") or "") if data.get("documents_type1") == "IR" else "",
        "snr_file": (detail.get("snr_file") or detail.get("carry_snr_file") or "") if data.get("documents_type2") == "SNR" else "",
        "snr_original_name": (detail.get("snr_original_name") or detail.get("carry_snr_original_name") or "") if data.get("documents_type2") == "SNR" else "",
    }


class InstallationTeamMemberOptionsView(APIView):
    def get(self, request):
        with connection.cursor() as cur:
            cur.execute(
                """
                SELECT staff_id, staff_name
                FROM user
                WHERE is_active = 1
                  AND is_delete = 0
                  AND COALESCE(staff_id, '') <> ''
                ORDER BY staff_name
                """
            )
            rows = cur.fetchall()
        return Response(
            {
                "status": True,
                "team_members": [
                    {"unique_id": row[0] or "", "label": row[1] or ""}
                    for row in rows
                    if row[0] and row[1]
                ],
            }
        )

def _fetch_items(po_form_unique_id, invoice_no, invoice_auto_id=None, po_auto_id=None):
    if not po_form_unique_id or not invoice_no:
        return []
    try:
        delivery_date = ""
        installation_date = ""
        po_date_value = None
        with connection.cursor() as cur:
            cur.execute(
                """
                SELECT
                    po_date,
                    DATE_FORMAT(ld_delivery_due_date,'%%d-%%m-%%Y') ld_delivery_due_date,
                    DATE_FORMAT(ld_installation_due_date,'%%d-%%m-%%Y') ld_installation_due_date
                FROM po_form
                WHERE unique_id=%s AND is_delete=0
                LIMIT 1
                """,
                [po_form_unique_id],
            )
            row = cur.fetchone()
            if row:
                po_date_value = _parse_date_value(row[0])
                delivery_date = row[1] or ""
                installation_date = row[2] or ""
        items = []
        po_ids = [po_form_unique_id]
        if po_auto_id and po_auto_id not in po_ids:
            po_ids.append(po_auto_id)
        po_placeholders = ", ".join(["%s"] * len(po_ids))
        cleaned_invoice_no = str(invoice_no or "").strip()

        try:
            if invoice_auto_id:
                with connection.cursor() as cur:
                    cur.execute(
                        f"SELECT * FROM invoice_creation WHERE invoice_auto_id=%s AND po_unique_id IN ({po_placeholders}) AND is_delete=0",
                        [invoice_auto_id, *po_ids],
                    )
                    items = _rows(cur)
        except Exception:
            items = []
        if not items:
            try:
                with connection.cursor() as cur:
                    cur.execute(
                        f"""
                        SELECT * FROM invoice_creation
                        WHERE REPLACE(REPLACE(TRIM(invoice_no), '\r', ''), '\n', '') = %s
                          AND TRIM(po_unique_id) IN ({po_placeholders})
                          AND is_delete=0
                        """,
                        [cleaned_invoice_no, *po_ids],
                    )
                    items = _rows(cur)
            except Exception:
                items = []

        if not items:
            try:
                with connection.cursor() as cur:
                    cur.execute(
                        f"""
                        SELECT * FROM invoice_creation
                        WHERE TRIM(po_unique_id) IN ({po_placeholders})
                          AND is_delete=0
                          AND (
                            REPLACE(REPLACE(TRIM(invoice_no), '\r', ''), '\n', '') = %s
                            OR REPLACE(REPLACE(TRIM(dc_num), '\r', ''), '\n', '') = %s
                          )
                        """,
                        [*po_ids, cleaned_invoice_no, cleaned_invoice_no],
                    )
                    items = _rows(cur)
            except Exception:
                items = []

        if not items and invoice_auto_id:
            try:
                with connection.cursor() as cur:
                    cur.execute(
                        "SELECT * FROM invoice_creation WHERE TRIM(invoice_auto_id)=%s AND is_delete=0",
                        [str(invoice_auto_id).strip()],
                    )
                    items = _rows(cur)
            except Exception:
                items = []

        if not items:
            try:
                with connection.cursor() as cur:
                    cur.execute(
                        """
                        SELECT
                            COALESCE(NULLIF(ics.item_code, ''), pds.item_code, '') AS item_code,
                            COALESCE(NULLIF(ics.item_description, ''), NULLIF(pds.product, ''), '') AS product,
                            COALESCE(pds.qty, 0) AS item_qty
                        FROM product_details_sub pds
                        LEFT JOIN item_creation_sub ics ON ics.unique_id = pds.item_code AND ics.is_delete = 0
                        WHERE pds.form_main_unique_id=%s AND pds.is_delete=0
                        """,
                        [po_form_unique_id],
                    )
                    items = _rows(cur)
            except Exception:
                items = []

        due_meta = {}
        due_meta_by_code = {}
        due_meta_by_product = {}
        try:
            with connection.cursor() as cur:
                cur.execute(
                    """
                    SELECT
                        COALESCE(NULLIF(ics.item_code, ''), pds.item_code, '') AS item_code,
                        COALESCE(NULLIF(ics.item_description, ''), NULLIF(pds.product, ''), '') AS product,
                        COALESCE(pds.delivery_due_dates, '') AS delivery_due_days,
                        COALESCE(pds.insta_due_days, '') AS installation_due_days
                    FROM product_details_sub pds
                    LEFT JOIN item_creation_sub ics
                      ON ics.unique_id = pds.item_code
                     AND ics.is_delete = 0
                    WHERE pds.form_main_unique_id=%s
                      AND pds.is_delete=0
                    """,
                    [po_form_unique_id],
                )
                for meta_row in _rows(cur):
                    key = (
                        str(meta_row.get("item_code") or "").strip(),
                        str(meta_row.get("product") or "").strip(),
                    )
                    normalized_code = _normalize_item_text(meta_row.get("item_code"))
                    normalized_product = _normalize_item_text(meta_row.get("product"))
                    due_value = {
                        "delivery_date": delivery_date or _add_days_display(po_date_value, _safe_days(meta_row.get("delivery_due_days"))),
                        "installation_date": installation_date or _add_days_display(po_date_value, _safe_days(meta_row.get("installation_due_days"))),
                    }
                    if key != ("", "") and key not in due_meta:
                        due_meta[key] = due_value
                    if normalized_code and normalized_code not in due_meta_by_code:
                        due_meta_by_code[normalized_code] = due_value
                    if normalized_product and normalized_product not in due_meta_by_product:
                        due_meta_by_product[normalized_product] = due_value
        except Exception:
            due_meta = {}
            due_meta_by_code = {}
            due_meta_by_product = {}

        # Aggregate by item code + name (fallbacks for column names)
        agg = {}
        for row in items:
            item_code = row.get("item_code") or row.get("product_code") or row.get("item_id") or row.get("product_unique_id") or ""
            product = row.get("product") or row.get("product_name") or row.get("item_desc") or row.get("item_details") or ""
            qty = row.get("item_qty")
            if qty is None:
                qty = row.get("invoice_qty")
            if qty is None:
                qty = row.get("qty")
            if qty is None:
                qty = row.get("quantity")
            try:
                qty_val = float(qty) if qty not in (None, "") else 0.0
            except Exception:
                qty_val = 0.0
            key = (item_code, product)
            if key not in agg:
                due_values = (
                    due_meta.get(key)
                    or due_meta_by_code.get(_normalize_item_text(item_code))
                    or due_meta_by_product.get(_normalize_item_text(product))
                    or {}
                )
                agg[key] = {
                    "item_code": item_code,
                    "product": product,
                    "item_qty": 0.0,
                    "stock_qty": 0.0,
                    "delivery_date": due_values.get("delivery_date", delivery_date),
                    "installation_date": due_values.get("installation_date", installation_date),
                }
            agg[key]["item_qty"] += qty_val
            agg[key]["stock_qty"] += qty_val

        results = []
        for val in agg.values():
            results.append({
                "item_code": val["item_code"],
                "product": val["product"],
                "item_qty": f"{val['item_qty']:.0f}" if val["item_qty"].is_integer() else f"{val['item_qty']}",
                "stock_qty": f"{val['stock_qty']:.0f}" if val["stock_qty"].is_integer() else f"{val['stock_qty']}",
                "delivery_date": val.get("delivery_date") or delivery_date,
                "installation_date": val.get("installation_date") or installation_date,
            })
        return results
    except Exception:
        return []


def _fetch_invoice_file_names(rows):
    pairs = []
    seen = set()
    for row in rows:
        key = (str(row.get("dc_number") or "").strip(), str(row.get("invoice_no") or "").strip())
        if not key[0] or not key[1] or key in seen:
            continue
        seen.add(key)
        pairs.append(key)

    if not pairs:
        return {}

    placeholders = ", ".join(["(%s,%s)"] * len(pairs))
    params = []
    for dc_number, invoice_no in pairs:
        params.extend([dc_number, invoice_no])

    sql = f"""
    SELECT dc_number, invoice_no, file_invoice
    FROM invoice_sublist
    WHERE is_delete=0
      AND (dc_number, invoice_no) IN ({placeholders})
    ORDER BY id DESC
    """

    file_map = {}
    with connection.cursor() as cur:
        cur.execute(sql, params)
        for dc_number, invoice_no, file_invoice in cur.fetchall():
            key = (str(dc_number or "").strip(), str(invoice_no or "").strip())
            if key not in file_map and file_invoice:
                file_map[key] = file_invoice
    return file_map


def _is_code_search(value):
    text = str(value or "").strip().upper()
    if len(text) < 4:
        return False
    return any(token in text for token in ("/", "-", "PO", "DC", "INV", "CHN", "GEM"))

def _source_detail(source_unique_id):
    dc_required_sql = _dc_required_sql("inst", "pf", "icm.form_main_unique_id")
    sql = """
    SELECT icm.unique_id source_unique_id, inst.unique_id, icm.form_main_unique_id po_form_unique_id,
           COALESCE(NULLIF(inst.po_auto_id,''), NULLIF(icm.po_unique_id,''), NULLIF(pf.po_unique_id,''), '') po_auto_id,
           COALESCE(NULLIF(inst.po_num,''), NULLIF(icm.po_num,''), NULLIF(pf.po_num,''), '') po_num, icm.po_date,
           icm.invoice_auto_id, icm.invoice_no, icm.invoice_date, icm.dc_number, icm.dc_date, icm.consignee_unique_id,
           COALESCE(dep.department, dep_sub.ledger_name, icm.ledger_name, '') ledger_name, COALESCE(csd.con_contact_name,'') consignee_name, COALESCE(csd.con_address,'') con_address,
           COALESCE(cons_district.district_name, csd.con_district,'') district_name, COALESCE(cons_state.state_name, csd.con_state_name,'') state_name, COALESCE(csd.con_pincode,'') con_pincode,
           COALESCE(pf.bill_address,'') bill_address, COALESCE(pf.contact_number,'') customer_phone, COALESCE(pf.email,'') customer_email, COALESCE(csd.con_contact_number,'') consignee_phone,
           COALESCE(cust_district.district_name,'') customer_district, COALESCE(cust_state.state_name,'') customer_state,
           COALESCE(team.staff_name,'') team_member, COALESCE(team.staff_id,'') team_mem,
           COALESCE(eng_uid.staff_name, eng_staff.staff_name, eng_service.engineer_name, NULLIF(eng_vendor.name,''), NULLIF(eng_vendor.company_name,''), '') engineer_display,
           COALESCE(inst.engineer_name, icm.engineer_name, '') engineer_name,
           COALESCE(inst.engg_type, icm.engg_type, '') engg_type, COALESCE(inst.installation_com_date, icm.installation_com_date, '') installation_com_date, COALESCE(inst.eng_remarks, icm.eng_remarks, '') eng_remarks,
           COALESCE(inst.in_charge, icm.in_charge, '') in_charge, COALESCE(inst.gst_percent,'') gst_percent, COALESCE(inst.ttl_amnt, icm.bulk_total_amount, '') ttl_amnt,
           COALESCE(inst.documents_type,'0') documents_type, COALESCE(inst.documents_type1,'0') documents_type1, COALESCE(inst.documents_type2,'0') documents_type2,
           COALESCE(inst.dc_received_sts,'') dc_received_sts, COALESCE(inst.dc_cus_signed_date,'') dc_cus_signed_date, COALESCE(inst.ir_rec_status,'') ir_rec_status, COALESCE(inst.ir_cus_signed_date,'') ir_cus_signed_date,
           COALESCE(inst.snr_rec_status,'') snr_rec_status, COALESCE(inst.snr_cus_signed_date,'') snr_cus_signed_date, COALESCE(inst.dc_file,'') dc_file, COALESCE(inst.dc_original_name,'') dc_original_name,
           COALESCE(inst.ir_file,'') ir_file, COALESCE(inst.ir_original_name,'') ir_original_name, COALESCE(inst.snr_file,'') snr_file, COALESCE(inst.snr_original_name,'') snr_original_name,
           COALESCE(carry_inst.dc_file,'') carry_dc_file, COALESCE(carry_inst.dc_original_name,'') carry_dc_original_name,
           COALESCE(carry_inst.dc_received_sts,'') carry_dc_received_sts, COALESCE(carry_inst.dc_cus_signed_date,'') carry_dc_cus_signed_date,
           COALESCE(carry_inst.snr_file,'') carry_snr_file, COALESCE(carry_inst.snr_original_name,'') carry_snr_original_name,
           COALESCE(carry_inst.snr_rec_status,'') carry_snr_rec_status, COALESCE(carry_inst.snr_cus_signed_date,'') carry_snr_cus_signed_date,
           {dc_required_sql} dc_required, COALESCE(inst.without_snr,'') without_snr,
           COALESCE(icm.installation_status,'0') installation_status, COALESCE(inst.dc_delivery_status,'0') dc_delivery_status, COALESCE(pf.file_name,'') po_file_name,
           COALESCE(icm.bulk_eng_type,'') vendor_engineer_type,
           COALESCE(NULLIF(vendor_eng.name,''), NULLIF(vendor_eng.company_name,''), NULLIF(bulk_eng.staff_name,''), '') vendor_engineer_name, COALESCE(icm.bulk_eng_name,'') vendor_engineer_id,
           COALESCE(icm.vendor_bulk_rate,'') vendor_rate, COALESCE(icm.vendor_bulk_gst,'') vendor_gst, COALESCE(icm.bulk_total_amount,'') vendor_total_amount,
           COALESCE(icm.ven_assign_no,'') vendor_assign_no, COALESCE(DATE_FORMAT(icm.ven_assign_date, '%%Y-%%m-%%d'),'') vendor_assign_date,
           COALESCE(DATE_FORMAT(icm.date, '%%Y-%%m-%%d %%H:%%i:%%s'),'') vendor_assign_datetime,
           COALESCE(DATE_FORMAT(icm.vendor_bulk_timeline, '%%Y-%%m-%%d'),'') vendor_timeline, COALESCE(DATE_FORMAT(icm.vendor_ins_date, '%%Y-%%m-%%d'),'') vendor_installation_date,
           CASE
               WHEN EXISTS (
                   SELECT 1
                   FROM product_details_sub pds
                   WHERE pds.form_main_unique_id = icm.form_main_unique_id
                     AND pds.document_required = 'ir_required'
                   LIMIT 1
               ) THEN 'IR Required'
               ELSE 'DC Required'
           END document_type_label
    FROM invoice_creation_main icm
    LEFT JOIN installation_details inst ON inst.po_form_unique_id=icm.form_main_unique_id AND inst.invoice_no=icm.invoice_no AND inst.dc_number=icm.dc_number AND inst.consignee_unique_id=icm.consignee_unique_id AND inst.is_delete=0 AND (COALESCE(icm.event_status,'') NOT IN ('revendor','revisit') OR (COALESCE(inst.engineer_name,'') = COALESCE(icm.engineer_name,'') AND COALESCE(inst.created, inst.updated, '1970-01-01') >= COALESCE(icm.created, '1970-01-01')))
    LEFT JOIN installation_details carry_inst ON carry_inst.id = (
        SELECT prev_inst.id
        FROM installation_details prev_inst
        WHERE prev_inst.po_form_unique_id=icm.form_main_unique_id
          AND prev_inst.invoice_no=icm.invoice_no
          AND prev_inst.dc_number=icm.dc_number
          AND prev_inst.consignee_unique_id=icm.consignee_unique_id
          AND prev_inst.is_delete=0
          AND COALESCE(icm.event_status,'') IN ('revendor','revisit')
          AND (COALESCE(prev_inst.dc_file,'') <> '' OR COALESCE(prev_inst.snr_file,'') <> '')
        ORDER BY prev_inst.id DESC
        LIMIT 1
    )
    LEFT JOIN po_form pf ON pf.unique_id=icm.form_main_unique_id
    LEFT JOIN district_creation cust_district ON cust_district.unique_id=pf.district AND cust_district.is_delete=0
    LEFT JOIN state_creation cust_state ON cust_state.unique_id=pf.state_name AND cust_state.is_delete=0
    LEFT JOIN consignee_details_sub csd ON csd.unique_id=icm.consignee_unique_id AND csd.is_delete=0
    LEFT JOIN district_creation cons_district ON cons_district.unique_id=csd.con_district AND cons_district.is_delete=0
    LEFT JOIN state_creation cons_state ON cons_state.unique_id=csd.con_state_name AND cons_state.is_delete=0
    LEFT JOIN user team ON team.staff_id=icm.team_mem AND team.is_delete=0
    LEFT JOIN user eng_uid ON eng_uid.unique_id=COALESCE(inst.engineer_name, icm.engineer_name) AND eng_uid.is_delete=0
    LEFT JOIN user eng_staff ON eng_staff.staff_id=COALESCE(inst.engineer_name, icm.engineer_name) AND eng_staff.is_delete=0
    LEFT JOIN engineer_name_creation eng_service ON eng_service.unique_id=COALESCE(inst.engineer_name, icm.engineer_name) AND eng_service.is_delete=0
    LEFT JOIN vendor_creation eng_vendor ON eng_vendor.unique_id=COALESCE(inst.engineer_name, icm.engineer_name) AND eng_vendor.is_delete=0
    LEFT JOIN user bulk_eng ON bulk_eng.unique_id=icm.bulk_eng_name AND bulk_eng.is_delete=0
    LEFT JOIN vendor_creation vendor_eng ON vendor_eng.unique_id=icm.bulk_eng_name AND vendor_eng.is_delete=0
    LEFT JOIN department_creation dep ON dep.unique_id=icm.ledger_name AND dep.is_delete=0
    LEFT JOIN department_creation_sublist dep_sub ON dep_sub.unique_id=icm.ledger_name AND dep_sub.is_delete=0
    WHERE icm.unique_id=%s AND icm.is_delete=0 LIMIT 1
    """.format(dc_required_sql=dc_required_sql)
    with connection.cursor() as cur:
        cur.execute(sql, [source_unique_id])
        data = _rows(cur)
    return data[0] if data else None

def _sublist_insert(cur, form_unique_id, detail, data, files, today):
    cur.execute("""
    INSERT INTO installation_details_sublist (unique_id,installation_id,form_unique_id,po_form_unique_id,po_auto_id,po_num,po_date,invoice_auto_id,invoice_no,invoice_date,consignee_unique_id,engineer_name,eng_remarks,installation_com_date,documents_type,documents_type1,documents_type2,dc_received_sts,dc_cus_signed_date,dc_file,dc_number,dc_original_name,ir_rec_status,ir_cus_signed_date,ir_file,ir_original_name,snr_rec_status,snr_cus_signed_date,snr_file,snr_original_name,installation_date,team_mem,is_active,is_delete)
    VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,1,0)
    """, [_uid(), _next_install_id(), form_unique_id, detail.get("po_form_unique_id",""), detail.get("po_auto_id",""), detail.get("po_num",""), detail.get("po_date",""), detail.get("invoice_auto_id",""), detail.get("invoice_no",""), detail.get("invoice_date",""), detail.get("consignee_unique_id",""), data.get("engineer_name",""), data.get("eng_remarks",""), data.get("installation_com_date",""), data.get("documents_type","0"), data.get("documents_type1","0"), data.get("documents_type2","0"), data.get("dc_received_sts",""), data.get("dc_cus_signed_date",""), files["dc_file"], detail.get("dc_number",""), files["dc_original_name"], data.get("ir_rec_status",""), data.get("ir_cus_signed_date",""), files["ir_file"], files["ir_original_name"], data.get("snr_rec_status",""), data.get("snr_cus_signed_date",""), files["snr_file"], files["snr_original_name"], today, data.get("team_mem", detail.get("team_mem",""))])

def _source_id_for_install(unique_id):
    return _one("""
    SELECT unique_id FROM invoice_creation_main WHERE is_delete=0 AND EXISTS (
      SELECT 1 FROM installation_details WHERE unique_id=%s AND po_form_unique_id=invoice_creation_main.form_main_unique_id AND invoice_no=invoice_creation_main.invoice_no AND dc_number=invoice_creation_main.dc_number AND consignee_unique_id=invoice_creation_main.consignee_unique_id AND is_delete=0
    ) ORDER BY id DESC LIMIT 1
    """, [unique_id], "")

def _delete_context(unique_id):
    value = str(unique_id or "").strip()
    if not value:
        return "", ""

    source_id = _source_id_for_install(value)
    if source_id:
        return source_id, value

    with connection.cursor() as cur:
        cur.execute("""
        SELECT icm.unique_id, COALESCE(inst.unique_id, '')
        FROM invoice_creation_main icm
        LEFT JOIN installation_details inst
          ON inst.po_form_unique_id = icm.form_main_unique_id
         AND inst.invoice_no = icm.invoice_no
         AND inst.dc_number = icm.dc_number
         AND inst.consignee_unique_id = icm.consignee_unique_id
         AND inst.is_delete = 0
        WHERE icm.unique_id = %s
          AND icm.is_delete = 0
        LIMIT 1
        """, [value])
        row = cur.fetchone()

    if not row:
        return "", ""
    return (row[0] or "", row[1] or "")

def _dispatch_status(data, dc_required):
    dc = bool(str(data.get("dc_dispatch_mode") or "").strip())
    ir = bool(str(data.get("ir_dispatch_mode") or "").strip())
    snr = bool(str(data.get("snr_dispatch_mode") or "").strip())
    required = str(dc_required or "").strip() == "1"

    if dc and ir:
        return "3"
    if dc and required:
        return "3"
    if dc and snr:
        return "1"
    if dc:
        return "5"
    return "0"


def _dispatch_detail(unique_id):
    dc_required_sql = _dc_required_sql("inst", "pf", "inst.po_form_unique_id")
    sql = """
    SELECT
        COALESCE(icm.unique_id,'') source_unique_id,
        inst.unique_id,
        inst.po_form_unique_id,
        COALESCE(inst.po_auto_id,'') po_auto_id,
        COALESCE(inst.po_num,'') po_num,
        inst.po_date,
        COALESCE(inst.invoice_auto_id,'') invoice_auto_id,
        COALESCE(inst.invoice_no,'') invoice_no,
        inst.invoice_date,
        inst.dc_number,
        COALESCE(icm.dc_date,'') dc_date,
        inst.consignee_unique_id,
        COALESCE(dep.department, dep_sub.ledger_name, icm.ledger_name, '') ledger_name,
        COALESCE(csd.con_contact_name,'') consignee_name,
        COALESCE(csd.con_address,'') con_address,
        COALESCE(cons_district.district_name, csd.con_district, '') district_name,
        COALESCE(cons_state.state_name, csd.con_state_name, '') state_name,
        COALESCE(csd.con_pincode,'') con_pincode,
        COALESCE(pf.bill_address,'') bill_address,
        COALESCE(pf.contact_number,'') customer_phone,
        COALESCE(pf.email,'') customer_email,
        COALESCE(csd.con_contact_number,'') consignee_phone,
        COALESCE(cust_district.district_name,'') customer_district,
        COALESCE(cust_state.state_name,'') customer_state,
        COALESCE(team.staff_name,'') team_member,
        COALESCE(team.staff_id,'') team_mem,
        COALESCE(eng_uid.staff_name, eng_staff.staff_name, eng_service.engineer_name, NULLIF(eng_vendor.name,''), NULLIF(eng_vendor.company_name,''), '') engineer_display,
        COALESCE(inst.engineer_name,'') engineer_name,
        COALESCE(inst.engg_type,'') engg_type,
        COALESCE(inst.installation_com_date,'') installation_com_date,
        COALESCE(inst.eng_remarks,'') eng_remarks,
        COALESCE(inst.in_charge,'') in_charge,
        COALESCE(inst.gst_percent,'') gst_percent,
        COALESCE(inst.ttl_amnt,'') ttl_amnt,
        COALESCE(inst.documents_type,'0') documents_type,
        COALESCE(inst.documents_type1,'0') documents_type1,
        COALESCE(inst.documents_type2,'0') documents_type2,
        COALESCE(inst.dc_received_sts,'') dc_received_sts,
        COALESCE(inst.dc_cus_signed_date,'') dc_cus_signed_date,
        COALESCE(inst.ir_rec_status,'') ir_rec_status,
        COALESCE(inst.ir_cus_signed_date,'') ir_cus_signed_date,
        COALESCE(inst.snr_rec_status,'') snr_rec_status,
        COALESCE(inst.snr_cus_signed_date,'') snr_cus_signed_date,
        COALESCE(inst.dc_file,'') dc_file,
        COALESCE(inst.dc_original_name,'') dc_original_name,
        COALESCE(inst.ir_file,'') ir_file,
        COALESCE(inst.ir_original_name,'') ir_original_name,
        COALESCE(inst.snr_file,'') snr_file,
        COALESCE(inst.snr_original_name,'') snr_original_name,
        {dc_required_sql} dc_required,
        COALESCE(inst.dc_delivery_status,'0') dc_delivery_status,
        COALESCE(inst.without_snr,'') without_snr,
        COALESCE(icm.invoice_value,'0') invoice_value,
        COALESCE(pf.file_name,'') po_file_name,
        COALESCE(dd.unique_id,'') dispatch_unique_id,
        COALESCE(dd.dc_dispatch_mode,'') dc_dispatch_mode,
        COALESCE(dd.name_of_courier,'') name_of_courier,
        COALESCE(dd.dc_pod_no,'') dc_pod_no,
        COALESCE(dd.dc_pod_date,'') dc_pod_date,
        COALESCE(dd.ir_dispatch_mode,'') ir_dispatch_mode,
        COALESCE(dd.ins_name_of_courier,'') ins_name_of_courier,
        COALESCE(dd.ir_pod_no,'') ir_pod_no,
        COALESCE(dd.ir_pod_date,'') ir_pod_date,
        COALESCE(dd.snr_dispatch_mode,'') snr_dispatch_mode,
        COALESCE(dd.snr_name_courier,'') snr_name_courier,
        COALESCE(dd.snr_pod_no,'') snr_pod_no,
        COALESCE(dd.snr_pod_date,'') snr_pod_date
    FROM installation_details inst
    LEFT JOIN invoice_creation_main icm
      ON icm.form_main_unique_id=inst.po_form_unique_id
     AND icm.invoice_no=inst.invoice_no
     AND icm.dc_number=inst.dc_number
     AND icm.consignee_unique_id=inst.consignee_unique_id
     AND icm.is_delete=0
    LEFT JOIN po_form pf ON pf.unique_id=inst.po_form_unique_id
    LEFT JOIN consignee_details_sub csd ON csd.unique_id=inst.consignee_unique_id AND csd.is_delete=0
    LEFT JOIN district_creation cust_district ON cust_district.unique_id=pf.district AND cust_district.is_delete=0
    LEFT JOIN state_creation cust_state ON cust_state.unique_id=pf.state_name AND cust_state.is_delete=0
    LEFT JOIN district_creation cons_district ON cons_district.unique_id=csd.con_district AND cons_district.is_delete=0
    LEFT JOIN state_creation cons_state ON cons_state.unique_id=csd.con_state_name AND cons_state.is_delete=0
    LEFT JOIN user team ON team.staff_id=inst.team_mem AND team.is_delete=0
    LEFT JOIN user eng_uid ON eng_uid.unique_id=inst.engineer_name AND eng_uid.is_delete=0
    LEFT JOIN user eng_staff ON eng_staff.staff_id=inst.engineer_name AND eng_staff.is_delete=0
    LEFT JOIN engineer_name_creation eng_service ON eng_service.unique_id=inst.engineer_name AND eng_service.is_delete=0
    LEFT JOIN vendor_creation eng_vendor ON eng_vendor.unique_id=inst.engineer_name AND eng_vendor.is_delete=0
    LEFT JOIN department_creation dep ON dep.unique_id=icm.ledger_name AND dep.is_delete=0
    LEFT JOIN department_creation_sublist dep_sub ON dep_sub.unique_id=icm.ledger_name AND dep_sub.is_delete=0
    LEFT JOIN dc_ir_doc_dispatch_details dd
      ON dd.po_form_unique_id=inst.po_form_unique_id
     AND dd.consignee_unique_id=inst.consignee_unique_id
     AND dd.invoice_no=inst.invoice_no
     AND dd.dc_number=inst.dc_number
     AND dd.is_delete=0
    WHERE inst.unique_id=%s AND inst.is_delete=0
    LIMIT 1
    """.format(dc_required_sql=dc_required_sql)
    with connection.cursor() as cur:
        cur.execute(sql, [unique_id])
        data = _rows(cur)
    return data[0] if data else None


def _dispatch_payload(detail):
    data = _detail_payload(detail)
    data.update({
        "dispatch_unique_id": detail.get("dispatch_unique_id") or "",
        "dc_dispatch_mode": detail.get("dc_dispatch_mode") or "",
        "name_of_courier": detail.get("name_of_courier") or "",
        "dc_pod_no": detail.get("dc_pod_no") or "",
        "dc_pod_date": _fmt_date(detail.get("dc_pod_date")),
        "ir_dispatch_mode": detail.get("ir_dispatch_mode") or "",
        "ins_name_of_courier": detail.get("ins_name_of_courier") or "",
        "ir_pod_no": detail.get("ir_pod_no") or "",
        "ir_pod_date": _fmt_date(detail.get("ir_pod_date")),
        "snr_dispatch_mode": detail.get("snr_dispatch_mode") or "",
        "snr_name_courier": detail.get("snr_name_courier") or "",
        "snr_pod_no": detail.get("snr_pod_no") or "",
        "snr_pod_date": _fmt_date(detail.get("snr_pod_date")),
        "without_snr": str(detail.get("without_snr") or "").lower() == "on",
    })
    return data


class InstallationListView(APIView):
    def get(self, request):
        ser = InstallationListQuerySerializer(data=request.query_params); ser.is_valid(raise_exception=True)
        f = ser.validated_data; params, where = [], ["icm.is_delete=0"]
        company_id = request_company_id(request)
        if company_id:
            where.append("""
                EXISTS (
                    SELECT 1
                    FROM po_form pf_tenant
                    WHERE pf_tenant.unique_id = icm.form_main_unique_id
                      AND pf_tenant.is_delete = 0
                      AND pf_tenant.sess_company_id = %s
                )
            """)
            params.append(company_id)
        page = int(f.get("page") or 1)
        length = int(f.get("length") or 25)
        if length > 200: length = 200
        if page < 1: page = 1
        offset = (page - 1) * length

        user_type = (f.get("user_type_unique_id") or "").strip()
        current_user_id = (
            str(getattr(request.user, "unique_id", "") or getattr(request.user, "pk", "") or "")
            or (f.get("user_unique_id") or "").strip()
        )
        engineer_id = (f.get("engineer_id") or "").strip() or current_user_id

        # Map engineer type from UI value
        engg_type = f.get("engg_type", "")
        if engg_type == "1":
            engg_type = "own-engineer"
        elif engg_type == "2":
            engg_type = "outsource-vendor"

        tab = f["tab"]
        where.append("""
            NOT EXISTS (
                SELECT 1
                FROM invoice_creation_main newer_icm
                WHERE newer_icm.is_delete = 0
                  AND newer_icm.id > icm.id
                  AND newer_icm.form_main_unique_id = icm.form_main_unique_id
                  AND newer_icm.invoice_no = icm.invoice_no
                  AND newer_icm.dc_number = icm.dc_number
                  AND newer_icm.consignee_unique_id = icm.consignee_unique_id
                  AND COALESCE(newer_icm.event_status, '') IN ('revendor', 'revisit')
            )
        """)
        if tab == "pending":
            where.append("icm.installation_status IN ('0','1','3','4','5')")
            where.append("EXISTS (SELECT 1 FROM dispatch_list dl WHERE dl.dc_number = icm.dc_number AND dl.status = 3)")
            where.append("icm.vendor_bulk_sts='1'")
            where.append("COALESCE(inst.dc_delivery_status,'0') NOT IN ('3','5')")
        elif tab == "uploaded":
            if f.get("installation_status"):
                where.append("icm.installation_status = %s"); params.append(f["installation_status"])
            else:
                where.append("icm.installation_status NOT IN ('0','4')")
        elif tab == "dcir_pending":
            where += [
                "inst.unique_id IS NOT NULL",
                "COALESCE(inst.documents_type,'0') <> '0'",
                "COALESCE(inst.dc_delivery_status,'0') NOT IN ('3','5')",
            ]
        elif tab == "dcir_completed":
            where += [
                "inst.unique_id IS NOT NULL",
                "COALESCE(inst.documents_type,'0') <> '0'",
                "COALESCE(inst.dc_delivery_status,'0') IN ('3','5')",
            ]

        if f.get("district"):
            where.append("(csd.con_district=%s OR COALESCE(cons_district.district_name,'')=%s)")
            params.extend([f["district"], f["district"]])
        if f.get("team_member") and f["team_member"] not in {"All", ""}:
            if user_type in TEAM_FILTER_ALLOW or user_type not in TEAM_FILTER_DENY:
                where.append("(icm.team_mem=%s OR COALESCE(team_staff.staff_name,team_uid.staff_name,'')=%s)")
                params.extend([f["team_member"], f["team_member"]])
        if engg_type:
            where.append("COALESCE(inst.engg_type,icm.engg_type,'')=%s"); params.append(engg_type)

        # Executive filter (same as PHP)
        if user_type == EXECUTIVE_TYPE_UID and current_user_id:
            where.append("""
                COALESCE((
                    SELECT pf.executive_name
                    FROM po_form pf
                    WHERE pf.unique_id = icm.form_main_unique_id
                      AND pf.is_delete = 0
                    LIMIT 1
                ), '') = %s
            """)
            params.append(current_user_id)

        # Role-based engineer scoping
        if tab in {"uploaded", "dcir_completed"}:
            eng_scope_deny = ENG_SCOPE_DENY_COMPLETED
        else:
            eng_scope_deny = ENG_SCOPE_DENY_PENDING

        if user_type and user_type not in eng_scope_deny:
            if engineer_id:
                where.append("COALESCE(inst.engineer_name, icm.engineer_name, '') = %s")
                params.append(engineer_id)
        elif user_type == "65efd9a94bcdb30916":
            if tab in {"dcir_pending", "dcir_completed"}:
                where.append("COALESCE(icm.bulk_eng_type, inst.engg_type, icm.engg_type, '') = 'own-engineer'")
            else:
                where.append("COALESCE(inst.engg_type, icm.engg_type, '') = 'own-engineer'")

        # Date filters (match PHP opt/opt1 behavior)
        opt = f.get("opt", "") or ""
        opt1 = f.get("opt1", "") or ""
        date_type = f.get("date_type", "")
        if not opt and date_type in {"po_date", "invoice_date"}:
            opt = "4" if date_type == "po_date" else "5"
        if not opt1 and date_type in {"po_date", "invoice_date"}:
            opt1 = "9" if date_type == "po_date" else "10"

        col = None
        if tab in {"pending", "uploaded"}:
            col = "icm.po_date" if opt == "4" else "icm.invoice_date" if opt == "5" else None
        else:
            col = "icm.po_date" if opt1 == "9" else "icm.invoice_date" if opt1 == "10" else None

        fd, td = _norm_date(f.get("from_date","")), _norm_date(f.get("to_date",""))
        if col and fd: where.append(f"DATE({col})>=%s"); params.append(fd)
        if col and td: where.append(f"DATE({col})<=%s"); params.append(td)

        # dc_delivery_status filter for DC/IR tabs when opt1 is used (PHP behavior)
        if tab == "dcir_pending" and opt1 in {"9", "10"} and f.get("dc_delivery_status"):
            where.append("COALESCE(inst.dc_delivery_status,'0')=%s"); params.append(f["dc_delivery_status"])

        # PHP behavior: in dcir_completed, dc_delivery_status filter replaces the base status/doc filters
        if tab == "dcir_completed" and f.get("dc_delivery_status"):
            where = [w for w in where if "documents_type" not in w and "dc_delivery_status" not in w]
            where.append("COALESCE(inst.dc_delivery_status,'0')=%s")
            params.append(f["dc_delivery_status"])
        search_text = str(f.get("search") or "").strip()
        search_is_code = _is_code_search(search_text)
        if search_text:
            like = f"%{search_text}%"
            if search_is_code:
                where.append("(" + " OR ".join(["icm.po_num LIKE %s", "icm.invoice_no LIKE %s", "icm.dc_number LIKE %s"]) + ")")
                params.extend([like] * 3)
            else:
                where.append("(" + " OR ".join(["icm.po_num LIKE %s", "icm.invoice_no LIKE %s", "icm.dc_number LIKE %s", "COALESCE((SELECT department FROM department_creation WHERE unique_id=icm.ledger_name AND is_delete=0 LIMIT 1),(SELECT ledger_name FROM department_creation_sublist WHERE unique_id=icm.ledger_name AND is_delete=0 LIMIT 1),icm.ledger_name,'') LIKE %s", "COALESCE(csd.con_contact_name,'') LIKE %s", "COALESCE(cons_district.district_name,csd.con_district,'') LIKE %s", "COALESCE(cons_state.state_name,csd.con_state_name,'') LIKE %s"]) + ")")
                params.extend([like] * 7)

        count_joins = [
            "LEFT JOIN installation_details inst ON inst.po_form_unique_id=icm.form_main_unique_id AND inst.invoice_no=icm.invoice_no AND inst.dc_number=icm.dc_number AND inst.consignee_unique_id=icm.consignee_unique_id AND inst.is_delete=0 AND (COALESCE(icm.event_status,'') NOT IN ('revendor','revisit') OR (COALESCE(inst.engineer_name,'') = COALESCE(icm.engineer_name,'') AND COALESCE(inst.created, inst.updated, '1970-01-01') >= COALESCE(icm.created, '1970-01-01')))"
        ]
        if f.get("district") or (search_text and not search_is_code):
            count_joins.append("LEFT JOIN consignee_details_sub csd ON csd.unique_id=icm.consignee_unique_id AND csd.is_delete=0")
            count_joins.append("LEFT JOIN district_creation cons_district ON cons_district.unique_id=csd.con_district AND cons_district.is_delete=0")
            count_joins.append("LEFT JOIN state_creation cons_state ON cons_state.unique_id=csd.con_state_name AND cons_state.is_delete=0")
        if f.get("team_member") and f["team_member"] not in {"All", ""}:
            count_joins.append("LEFT JOIN user team_staff ON team_staff.staff_id=icm.team_mem AND team_staff.is_delete=0")
            count_joins.append("LEFT JOIN user team_uid ON team_uid.unique_id=icm.team_mem AND team_uid.is_delete=0")
        count_from_sql = f"""
        FROM invoice_creation_main icm
        {' '.join(count_joins)}
        WHERE {' AND '.join(where)}
        """
        list_from_sql = f"""
        FROM invoice_creation_main icm
        LEFT JOIN installation_details inst ON inst.po_form_unique_id=icm.form_main_unique_id AND inst.invoice_no=icm.invoice_no AND inst.dc_number=icm.dc_number AND inst.consignee_unique_id=icm.consignee_unique_id AND inst.is_delete=0 AND (COALESCE(icm.event_status,'') NOT IN ('revendor','revisit') OR (COALESCE(inst.engineer_name,'') = COALESCE(icm.engineer_name,'') AND COALESCE(inst.created, inst.updated, '1970-01-01') >= COALESCE(icm.created, '1970-01-01')))
        LEFT JOIN installation_details carry_inst ON carry_inst.id = (
            SELECT prev_inst.id
            FROM installation_details prev_inst
            WHERE prev_inst.po_form_unique_id=icm.form_main_unique_id
              AND prev_inst.invoice_no=icm.invoice_no
              AND prev_inst.dc_number=icm.dc_number
              AND prev_inst.consignee_unique_id=icm.consignee_unique_id
              AND prev_inst.is_delete=0
              AND COALESCE(icm.event_status,'') IN ('revendor','revisit')
              AND (COALESCE(prev_inst.dc_file,'') <> '' OR COALESCE(prev_inst.snr_file,'') <> '')
            ORDER BY prev_inst.id DESC
            LIMIT 1
        )
        LEFT JOIN po_form pf ON pf.unique_id=icm.form_main_unique_id
        LEFT JOIN consignee_details_sub csd ON csd.unique_id=icm.consignee_unique_id AND csd.is_delete=0
        LEFT JOIN district_creation cons_district ON cons_district.unique_id=csd.con_district AND cons_district.is_delete=0
        LEFT JOIN state_creation cons_state ON cons_state.unique_id=csd.con_state_name AND cons_state.is_delete=0
        LEFT JOIN user team_staff ON team_staff.staff_id=icm.team_mem AND team_staff.is_delete=0
        LEFT JOIN user team_uid ON team_uid.unique_id=icm.team_mem AND team_uid.is_delete=0
        LEFT JOIN user eng_uid ON eng_uid.unique_id=COALESCE(inst.engineer_name,icm.engineer_name) AND eng_uid.is_delete=0
        LEFT JOIN user eng_staff ON eng_staff.staff_id=COALESCE(inst.engineer_name,icm.engineer_name) AND eng_staff.is_delete=0
        LEFT JOIN engineer_name_creation eng_service ON eng_service.unique_id=COALESCE(inst.engineer_name,icm.engineer_name) AND eng_service.is_delete=0
        LEFT JOIN vendor_creation eng_vendor ON eng_vendor.unique_id=COALESCE(inst.engineer_name,icm.engineer_name) AND eng_vendor.is_delete=0
        WHERE {' AND '.join(where)}
        """
        count_sql = f"SELECT COUNT(DISTINCT icm.id) {count_from_sql}"
        with connection.cursor() as cur:
            cur.execute(count_sql, params)
            total = cur.fetchone()[0] or 0

        sql = f"""
        SELECT icm.unique_id source_unique_id, inst.unique_id, icm.form_main_unique_id po_form_unique_id, COALESCE(icm.po_unique_id,'') po_auto_id, COALESCE(icm.po_num,'') po_num, icm.po_date, icm.invoice_no, icm.invoice_date, icm.dc_number, icm.dc_date,
               COALESCE(icm.invoice_value,'0') invoice_value, COALESCE(inst.installation_com_date, icm.vendor_ins_date, '') installation_alloc_date, icm.consignee_unique_id,
               COALESCE((SELECT department FROM department_creation WHERE unique_id=icm.ledger_name AND is_delete=0 LIMIT 1),(SELECT ledger_name FROM department_creation_sublist WHERE unique_id=icm.ledger_name AND is_delete=0 LIMIT 1),icm.ledger_name,'') ledger_name, COALESCE(csd.con_contact_name,'') consignee_name, COALESCE(csd.con_address,'') con_address,
               COALESCE(cons_district.district_name, csd.con_district, '') district_name, COALESCE(cons_state.state_name, csd.con_state_name, '') state_name, COALESCE(team_staff.staff_name, team_uid.staff_name, '') team_member, COALESCE(team_staff.staff_id, team_uid.unique_id, icm.team_mem, '') team_mem, COALESCE(eng_uid.staff_name, eng_staff.staff_name, eng_service.engineer_name, NULLIF(eng_vendor.name,''), NULLIF(eng_vendor.company_name,''), '') engineer_display,
               COALESCE(inst.engineer_name, icm.engineer_name, '') engineer_name, COALESCE(inst.dc_file,'') dc_signed_file, COALESCE(inst.ir_file,'') ir_signed_file, COALESCE(inst.snr_file,'') snr_signed_file,
               COALESCE(carry_inst.dc_file,'') carry_dc_file, COALESCE(carry_inst.snr_file,'') carry_snr_file,
               COALESCE(inst.documents_type,'0') documents_type, COALESCE(inst.documents_type1,'0') documents_type1, COALESCE(inst.documents_type2,'0') documents_type2,
               COALESCE(inst.dc_received_sts,'') dc_received_sts, COALESCE(inst.ir_rec_status,'') ir_rec_status, COALESCE(inst.snr_rec_status,'') snr_rec_status, {_dc_required_sql("inst", "pf", "icm.form_main_unique_id")} dc_required,
               COALESCE(pf.file_name,'') po_file_name, COALESCE(icm.installation_status,'0') installation_status, COALESCE(inst.dc_delivery_status,'0') dc_delivery_status,
               CASE
                   WHEN COALESCE(inst.unique_id, '') = '' THEN 0
                   WHEN EXISTS (
                       SELECT 1
                       FROM sign_doc_verification_detail sdv
                       WHERE sdv.invoice_no = icm.invoice_no
                         AND sdv.dc_number = icm.dc_number
                         AND sdv.is_delete = 0
                         AND COALESCE(NULLIF(sdv.bill_no, ''), '') <> ''
                       LIMIT 1
                   ) THEN 0
                   ELSE 1
               END can_delete
         {list_from_sql}
        GROUP BY icm.id
        ORDER BY COALESCE(inst.updated,inst.created,icm.created) DESC, icm.id DESC
        LIMIT %s OFFSET %s"""
        with connection.cursor() as cur:
            cur.execute(sql, [*params, length, offset])
            raw_rows = _rows(cur)
        invoice_file_map = _fetch_invoice_file_names(raw_rows)
        for row in raw_rows:
            row["invoice_file_name"] = invoice_file_map.get(
                (str(row.get("dc_number") or "").strip(), str(row.get("invoice_no") or "").strip()),
                "",
            )
        data = [_map_row(r) for r in raw_rows]
        for i, row in enumerate(data, start=1): row["s_no"] = i
        return Response({"status": True, "recordsTotal": total, "recordsFiltered": total, "data": data})

class InstallationSourceDetailView(APIView):
    def get(self, request, source_unique_id):
        detail = _source_detail(source_unique_id)
        if not detail: return Response({"status": False, "message": "Installation source not found."}, status=404)
        return Response({"status": True, "data": _detail_payload(detail)})

class InstallationCreateView(APIView):
    parser_classes = [MultiPartParser, FormParser]
    def post(self, request):
        ser = InstallationSaveSerializer(data=request.data); ser.is_valid(raise_exception=True)
        data = dict(ser.validated_data); detail = _source_detail(data.get("source_unique_id", ""))
        if not detail: return Response({"status": False, "message": "Installation source not found."}, status=404)
        install_engg_type = _installation_engg_type(data.get("engg_type", ""))
        main_engg_type = _main_engg_type(data.get("engg_type", ""))
        files = _initial_doc_files(detail, data)
        for key, prefix in (("dc_file","dc"), ("ir_file","ir"), ("snr_file","snr")):
            if request.FILES.get(key): files[key], files[f"{key.split('_')[0]}_original_name"] = _save_upload(request.FILES[key], prefix)
        unique_id, today, install_status = _uid(), datetime.now().strftime("%Y-%m-%d"), _status(data)
        with transaction.atomic(), connection.cursor() as cur:
            cur.execute("""
            INSERT INTO installation_details (unique_id,po_form_unique_id,po_auto_id,po_num,po_date,invoice_auto_id,invoice_no,invoice_date,consignee_unique_id,engineer_name,installation_com_date,eng_remarks,documents_type,documents_type1,documents_type2,dc_received_sts,dc_cus_signed_date,engg_type,in_charge,gst_percent,ttl_amnt,dc_file,dc_number,dc_original_name,ir_rec_status,ir_cus_signed_date,ir_file,ir_original_name,snr_rec_status,snr_cus_signed_date,snr_file,snr_original_name,installation_date,team_mem,dc_required,is_active,is_delete)
            VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,1,0)
            """, [unique_id, detail.get("po_form_unique_id",""), detail.get("po_auto_id",""), detail.get("po_num",""), detail.get("po_date",""), detail.get("invoice_auto_id",""), detail.get("invoice_no",""), detail.get("invoice_date",""), detail.get("consignee_unique_id",""), data.get("engineer_name",""), data.get("installation_com_date",""), data.get("eng_remarks",""), data.get("documents_type","0"), data.get("documents_type1","0"), data.get("documents_type2","0"), data.get("dc_received_sts",""), data.get("dc_cus_signed_date",""), install_engg_type, data.get("in_charge",""), data.get("gst_percent",""), data.get("ttl_amnt",""), files["dc_file"], detail.get("dc_number",""), files["dc_original_name"], data.get("ir_rec_status",""), data.get("ir_cus_signed_date",""), files["ir_file"], files["ir_original_name"], data.get("snr_rec_status",""), data.get("snr_cus_signed_date",""), files["snr_file"], files["snr_original_name"], today, data.get("team_mem", detail.get("team_mem","")), detail.get("dc_required","0")])
            _sublist_insert(cur, unique_id, detail, data, files, today)
            cur.execute("UPDATE invoice_creation_main SET engineer_name=%s, engg_type=%s, date=%s, in_charge=%s, eng_remarks=%s, installation_com_date=%s, installation_status=%s WHERE unique_id=%s", [data.get("engineer_name",""), main_engg_type, data.get("installation_com_date",""), data.get("in_charge",""), data.get("eng_remarks",""), data.get("installation_com_date",""), install_status, data.get("source_unique_id","")])
        return Response({"status": True, "msg": "create", "unique_id": unique_id, "message": "Installation saved successfully."}, status=status.HTTP_201_CREATED)

class InstallationDetailView(APIView):
    parser_classes = [MultiPartParser, FormParser]
    def get(self, request, unique_id):
        source_id = _source_id_for_install(unique_id); detail = _source_detail(source_id) if source_id else None
        if not detail or detail.get("unique_id") != unique_id: return Response({"status": False, "message": "Installation record not found."}, status=404)
        return Response({"status": True, "data": _detail_payload(detail)})
    def put(self, request, unique_id):
        source_id = _source_id_for_install(unique_id); detail = _source_detail(source_id) if source_id else None
        if not detail: return Response({"status": False, "message": "Installation record not found."}, status=404)
        ser = InstallationSaveSerializer(data=request.data); ser.is_valid(raise_exception=True); data = dict(ser.validated_data)
        install_engg_type = _installation_engg_type(data.get("engg_type", ""))
        main_engg_type = _main_engg_type(data.get("engg_type", ""))
        files = _initial_doc_files(detail, data)
        for key, prefix in (("dc_file","dc"), ("ir_file","ir"), ("snr_file","snr")):
            if request.FILES.get(key): files[key], files[f"{key.split('_')[0]}_original_name"] = _save_upload(request.FILES[key], prefix)
        today, install_status = datetime.now().strftime("%Y-%m-%d"), _status(data)
        with transaction.atomic(), connection.cursor() as cur:
            cur.execute("""
            UPDATE installation_details SET engineer_name=%s, installation_com_date=%s, eng_remarks=%s, documents_type=%s, documents_type1=%s, documents_type2=%s, dc_received_sts=%s, dc_cus_signed_date=%s, engg_type=%s, in_charge=%s, gst_percent=%s, ttl_amnt=%s, dc_file=%s, dc_original_name=%s, ir_rec_status=%s, ir_cus_signed_date=%s, ir_file=%s, ir_original_name=%s, snr_rec_status=%s, snr_cus_signed_date=%s, snr_file=%s, snr_original_name=%s, installation_date=%s, team_mem=%s, dc_required=%s WHERE unique_id=%s AND is_delete=0
            """, [data.get("engineer_name",""), data.get("installation_com_date",""), data.get("eng_remarks",""), data.get("documents_type","0"), data.get("documents_type1","0"), data.get("documents_type2","0"), data.get("dc_received_sts",""), data.get("dc_cus_signed_date",""), install_engg_type, data.get("in_charge",""), data.get("gst_percent",""), data.get("ttl_amnt",""), files["dc_file"], files["dc_original_name"], data.get("ir_rec_status",""), data.get("ir_cus_signed_date",""), files["ir_file"], files["ir_original_name"], data.get("snr_rec_status",""), data.get("snr_cus_signed_date",""), files["snr_file"], files["snr_original_name"], today, data.get("team_mem", detail.get("team_mem","")), detail.get("dc_required","0"), unique_id])
            _sublist_insert(cur, unique_id, detail, data, files, today)
            cur.execute("UPDATE invoice_creation_main SET engineer_name=%s, engg_type=%s, date=%s, in_charge=%s, eng_remarks=%s, installation_com_date=%s, installation_status=%s WHERE unique_id=%s", [data.get("engineer_name",""), main_engg_type, data.get("installation_com_date",""), data.get("in_charge",""), data.get("eng_remarks",""), data.get("installation_com_date",""), install_status, source_id])
        return Response({"status": True, "msg": "update", "message": "Installation updated successfully."})
    def delete(self, request, unique_id):
        source_id, installation_id = _delete_context(unique_id)
        if not source_id: return Response({"status": False, "message": "Installation record not found."}, status=404)
        rollback_to_vendor = str(request.query_params.get("tab") or "").strip() == "pending"
        
        # Check if bill has been created for this installation
        with connection.cursor() as cur:
            cur.execute("""
                SELECT icm.dc_number, icm.invoice_no
                FROM invoice_creation_main icm
                WHERE icm.unique_id = %s AND icm.is_delete = 0
            """, [source_id])
            invoice_data = cur.fetchone()
            
            if invoice_data:
                dc_number, invoice_no = invoice_data
                # Check if bill_no exists in sign_doc_verification_detail
                cur.execute("""
                    SELECT bill_no FROM sign_doc_verification_detail
                    WHERE invoice_no = %s AND dc_number = %s AND is_delete = 0
                    LIMIT 1
                """, [invoice_no, dc_number])
                bill_record = cur.fetchone()
                
                if bill_record and bill_record[0]:  # bill_no is not empty
                    return Response({
                        "status": False, 
                        "message": "Cannot delete installation record. Bill has already been created for this record."
                    }, status=400)
        
        # Proceed with deletion
        with transaction.atomic(), connection.cursor() as cur:
            if installation_id:
                cur.execute("UPDATE installation_details SET is_delete=1 WHERE unique_id=%s", [installation_id])
                cur.execute("UPDATE installation_details_sublist SET is_delete=1 WHERE form_unique_id=%s", [installation_id])
            if rollback_to_vendor:
                cur.execute(
                    "UPDATE invoice_creation_main SET installation_status='0', installation_com_date='', engineer_name='', vendor_bulk_sts='0' WHERE unique_id=%s",
                    [source_id],
                )
            else:
                cur.execute(
                    "UPDATE invoice_creation_main SET installation_status='0', installation_com_date='', engineer_name='' WHERE unique_id=%s",
                    [source_id],
                )
        return Response({"status": True, "msg": "success_delete", "message": "Installation deleted successfully."})

class InstallationDispatchDetailView(APIView):
    def get(self, request, unique_id):
        detail = _dispatch_detail(unique_id)
        if not detail:
            return Response({"status": False, "message": "Installation dispatch record not found."}, status=404)
        return Response({"status": True, "data": _dispatch_payload(detail)})

    def put(self, request, unique_id):
        detail = _dispatch_detail(unique_id)
        if not detail:
            return Response({"status": False, "message": "Installation dispatch record not found."}, status=404)

        ser = InstallationDispatchSaveSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        data = dict(ser.validated_data)
        dc_delivery_status = _dispatch_status(data, detail.get("dc_required"))
        without_snr = "on" if str(data.get("without_snr") or "").lower() == "on" else ""
        dispatch_unique_id = detail.get("dispatch_unique_id") or _uid()

        values = [
            detail.get("po_form_unique_id", ""),
            detail.get("po_num", ""),
            detail.get("po_auto_id", ""),
            detail.get("po_date", ""),
            detail.get("invoice_auto_id", ""),
            detail.get("invoice_no", ""),
            detail.get("invoice_date", ""),
            detail.get("consignee_unique_id", ""),
            detail.get("dc_number", ""),
            data.get("dc_dispatch_mode", ""),
            data.get("name_of_courier", ""),
            data.get("dc_pod_no", ""),
            _norm_date(data.get("dc_pod_date", "")),
            data.get("ir_dispatch_mode", ""),
            data.get("ins_name_of_courier", ""),
            data.get("ir_pod_no", ""),
            _norm_date(data.get("ir_pod_date", "")),
            data.get("snr_dispatch_mode", ""),
            data.get("snr_name_courier", ""),
            data.get("snr_pod_no", ""),
            _norm_date(data.get("snr_pod_date", "")),
        ]

        with transaction.atomic(), connection.cursor() as cur:
            if detail.get("dispatch_unique_id"):
                cur.execute(
                    """
                    UPDATE dc_ir_doc_dispatch_details
                    SET po_form_unique_id=%s, po_num=%s, po_auto_id=%s, po_date=%s,
                        invoice_auto_id=%s, invoice_no=%s, invoice_date=%s, consignee_unique_id=%s, dc_number=%s,
                        dc_dispatch_mode=%s, name_of_courier=%s, dc_pod_no=%s, dc_pod_date=%s,
                        ir_dispatch_mode=%s, ins_name_of_courier=%s, ir_pod_no=%s, ir_pod_date=%s,
                        snr_dispatch_mode=%s, snr_name_courier=%s, snr_pod_no=%s, snr_pod_date=%s, is_delete=0
                    WHERE unique_id=%s
                    """,
                    [*values, dispatch_unique_id],
                )
            else:
                cur.execute(
                    """
                    INSERT INTO dc_ir_doc_dispatch_details
                    (unique_id, po_form_unique_id, po_num, po_auto_id, po_date, invoice_auto_id, invoice_no,
                     invoice_date, consignee_unique_id, dc_number,
                     dc_dispatch_mode, name_of_courier, dc_pod_no, dc_pod_date,
                     ir_dispatch_mode, ins_name_of_courier, ir_pod_no, ir_pod_date,
                     snr_dispatch_mode, snr_name_courier, snr_pod_no, snr_pod_date, is_delete)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, 0)
                    """,
                    [dispatch_unique_id, *values],
                )

            cur.execute(
                """
                UPDATE installation_details
                SET dc_delivery_status=%s, without_snr=%s
                WHERE unique_id=%s AND is_delete=0
                """,
                [dc_delivery_status, without_snr, unique_id],
            )

            if without_snr:
                cur.execute(
                    """
                    UPDATE installation_details
                    SET documents_type2='0', snr_rec_status='', snr_cus_signed_date=NULL,
                        snr_file='', snr_original_name='', without_snr='on'
                    WHERE unique_id=%s AND is_delete=0
                    """,
                    [unique_id],
                )
                cur.execute(
                    """
                    UPDATE installation_details_sublist
                    SET is_delete=1
                    WHERE po_form_unique_id=%s AND consignee_unique_id=%s AND dc_number=%s AND invoice_no=%s
                      AND COALESCE(documents_type1,'0')<>'IR'
                    """,
                    [detail.get("po_form_unique_id", ""), detail.get("consignee_unique_id", ""), detail.get("dc_number", ""), detail.get("invoice_no", "")],
                )
                cur.execute(
                    """
                    UPDATE installation_details_sublist
                    SET snr_rec_status='', snr_cus_signed_date=NULL, snr_file='', snr_original_name='', documents_type2='0'
                    WHERE po_form_unique_id=%s AND consignee_unique_id=%s AND dc_number=%s AND invoice_no=%s
                      AND COALESCE(documents_type1,'0')='IR' AND is_delete=0
                    """,
                    [detail.get("po_form_unique_id", ""), detail.get("consignee_unique_id", ""), detail.get("dc_number", ""), detail.get("invoice_no", "")],
                )
            else:
                cur.execute(
                    "UPDATE installation_details SET without_snr='' WHERE unique_id=%s AND is_delete=0",
                    [unique_id],
                )

            try:
                cur.execute("CALL update_invoice_verify_installdcir_status()")
            except Exception:
                pass

        return Response({"status": True, "message": "Installation dispatch updated successfully.", "dispatch_unique_id": dispatch_unique_id})


@method_decorator(xframe_options_exempt, name="dispatch")
class InstallationFileView(APIView):
    authentication_classes = []
    permission_classes = []
    def get(self, request, filename):
        safe = os.path.basename(filename); path = os.path.join(_media_root(), safe)
        if not os.path.exists(path): raise Http404("File not found.")
        return FileResponse(open(path, "rb"), as_attachment=False, filename=safe)






