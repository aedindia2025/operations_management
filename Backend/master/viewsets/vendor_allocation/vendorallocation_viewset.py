import uuid
import os
from functools import lru_cache
from datetime import date, datetime
from decimal import Decimal, InvalidOperation, ROUND_HALF_UP
from django.db import connection, transaction
from django.conf import settings
from rest_framework.views    import APIView
from rest_framework.response import Response
from rest_framework          import status
from rest_framework.parsers  import MultiPartParser, FormParser

from master.apps.vendor_allocation.vendorallocation_model import (
    DispatchList,
    OperationInvoiceCreation as InvoiceCreationMain,
)
from master.serializers.vendor_allocation.vendorallocation_serializer import (
    DispatchCreateSerializer,
    VendorBulkAssignSerializer,
)


# ────────────────────────────────────────────────────────────────────── #
#  Helpers                                                                #
# ────────────────────────────────────────────────────────────────────── #
def generate_unique_id(prefix=""):
    uid = uuid.uuid4().hex[:18]
    return f"{prefix}{uid}" if prefix else uid


def convert_date(date_str):
    if not date_str:
        return None
    for fmt in ("%d-%m-%Y", "%Y-%m-%d"):
        try:
            return datetime.strptime(date_str, fmt).date()
        except ValueError:
            continue
    return None


def _call_sp(name):
    """Call a stored procedure safely."""
    with connection.cursor() as cur:
        try:
            cur.execute(f"CALL {name}()")
        except Exception:
            pass


def _dictfetchall(cursor):
    cols = [c[0] for c in cursor.description]
    return [dict(zip(cols, row)) for row in cursor.fetchall()]


def _get_consignee(consignee_unique_id):
    """CALL GetConsigneeDetailsById — mirrors PHP stored proc call."""
    with connection.cursor() as cur:
        cur.execute("CALL GetConsigneeDetailsById(%s)", [consignee_unique_id])
        cols = [c[0] for c in cur.description]
        rows = cur.fetchall()
    return [dict(zip(cols, r)) for r in rows] if rows else []


def _vendor_name(eng_id):
    with connection.cursor() as cur:
        cur.execute(
            "SELECT name FROM vendor_creation WHERE unique_id = %s LIMIT 1",
            [eng_id]
        )
        row = cur.fetchone()
    return row[0] if row else "--"


def _engineer_name(eng_id):
    with connection.cursor() as cur:
        cur.execute(
            "SELECT engineer_name FROM engineer_name_creation WHERE unique_id = %s LIMIT 1",
            [eng_id]
        )
        row = cur.fetchone()
    return row[0] if row else "--"


def _user_name(user_id):
    if not user_id:
        return "--"
    with connection.cursor() as cur:
        cur.execute(
            """
            SELECT staff_name
            FROM user
            WHERE unique_id = %s OR staff_id = %s
            LIMIT 1
            """,
            [user_id, user_id],
        )
        row = cur.fetchone()
    return row[0] if row and row[0] else "--"


def _session_value(request, key, fallback=""):
    try:
        value = request.data.get(key, None)
        if value not in (None, ""):
            return value
    except Exception:
        pass
    try:
        value = request.session.get(key, fallback)
    except Exception:
        value = fallback
    return value if value not in (None, "") else fallback


def _financial_year_text(today=None):
    current = today or date.today()
    year = current.year
    if current.month >= 4:
        return f"{year}-{str(year + 1)[-2:]}"
    return f"{year - 1}-{str(year)[-2:]}"


def _audit_fields_from_request(request):
    session_id = ""
    try:
        session_id = request.session.session_key or ""
    except Exception:
        session_id = ""

    return {
        "acc_year": str(_session_value(request, "acc_year", _financial_year_text())),
        "session_id": str(_session_value(request, "session_id", session_id)),
        "sess_user_type": str(_session_value(request, "sess_user_type", _session_value(request, "user_type_unique_id", ""))),
        "sess_user_id": str(_session_value(request, "sess_user_id", _session_value(request, "unique_id", ""))),
        "sess_company_id": str(_session_value(request, "sess_company_id", "")),
        "sess_branch_id": str(_session_value(request, "sess_branch_id", "")),
    }


@lru_cache(maxsize=None)
def _department_display(value):
    text = str(value or "").strip()
    if not text:
        return "--"

    with connection.cursor() as cur:
        cur.execute(
            """
            SELECT department
            FROM department_creation
            WHERE unique_id = %s
              AND is_delete = 0
            LIMIT 1
            """,
            [text],
        )
        row = cur.fetchone()
        if row and row[0]:
            return row[0]

        cur.execute(
            """
            SELECT ledger_name
            FROM department_creation_sublist
            WHERE unique_id = %s
              AND is_delete = 0
            LIMIT 1
            """,
            [text],
        )
        row = cur.fetchone()
        if row and row[0]:
            return row[0]

    return text


def _resolve_engineer_name(eng_type, eng_id):
    if eng_type == "outsource-vendor":
        return f"{_vendor_name(eng_id)} ({eng_type})"
    if eng_type == "own-engineer":
        return f"{_engineer_name(eng_id)} ({eng_type})"
    if eng_type == "inhouse":
        return f"{_user_name(eng_id)} ({eng_type})"
    return "--"


def _format_display_date(value):
    if not value:
        return ""
    if hasattr(value, "strftime"):
        return value.strftime("%d-%m-%Y")
    text = str(value).strip()
    for fmt in ("%Y-%m-%d", "%d-%m-%Y", "%Y-%m-%d %H:%M:%S", "%d-%m-%Y %H:%M:%S"):
        try:
            return datetime.strptime(text, fmt).strftime("%d-%m-%Y")
        except ValueError:
            continue
    return text


def _format_input_date(value):
    if not value:
        return ""
    if hasattr(value, "strftime"):
        return value.strftime("%Y-%m-%d")
    text = str(value).strip()
    for fmt in ("%Y-%m-%d", "%d-%m-%Y", "%Y-%m-%d %H:%M:%S", "%d-%m-%Y %H:%M:%S"):
        try:
            return datetime.strptime(text, fmt).strftime("%Y-%m-%d")
        except ValueError:
            continue
    return text[:10]


@lru_cache(maxsize=None)
def _table_columns(table_name):
    try:
        with connection.cursor() as cur:
            cur.execute(f"SHOW COLUMNS FROM `{table_name}`")
            return tuple(row[0] for row in cur.fetchall())
    except Exception:
        return tuple()


def _update_table(table_name, updates, where_sql, where_params):
    allowed = set(_table_columns(table_name))
    filtered = {key: value for key, value in updates.items() if key in allowed}
    if not filtered:
        return 0

    set_sql = ", ".join([f"`{key}` = %s" for key in filtered.keys()])
    params = list(filtered.values()) + list(where_params)

    with connection.cursor() as cur:
        cur.execute(f"UPDATE `{table_name}` SET {set_sql} WHERE {where_sql}", params)
        return cur.rowcount


def _generate_vendor_assign_no():
    prefix = "ASN"
    default_value = f"{prefix}0001"
    columns = set(_table_columns("invoice_creation_main"))

    if "ven_assign_no" not in columns:
        return default_value

    order_column = "id" if "id" in columns else "unique_id"

    with connection.cursor() as cur:
        cur.execute(
            f"""
            SELECT ven_assign_no
            FROM invoice_creation_main
            WHERE COALESCE(ven_assign_no, '') LIKE %s
            ORDER BY {order_column} DESC
            LIMIT 1
            """,
            [f"{prefix}%"],
        )
        row = cur.fetchone()

    if not row or not row[0]:
        return default_value

    digits = "".join(ch for ch in str(row[0]) if ch.isdigit())
    next_value = int(digits or "0") + 1
    return f"{prefix}{next_value:04d}"


def _build_cons_details(consignee_unique_id):
    consignee_data = _get_consignee(consignee_unique_id)
    if not consignee_data:
        return ""

    row = consignee_data[0]
    district = _resolve_location_name(
        row.get("con_district_name") or row.get("con_district") or "",
        "district",
    )
    state = _resolve_location_name(
        row.get("con_state_name_name") or row.get("con_state_name") or "",
        "state",
    )
    return (
        f"{row.get('con_contact_name', '').upper()}\n"
        f"{row.get('con_address', '')}\n"
        f"{district}\n"
        f"{state}"
    ).strip()


def _resolve_location_name(value, kind):
    text = str(value or "").strip()
    if not text:
        return ""

    function_name = "get_district_name" if kind == "district" else "get_state_name"
    try:
        with connection.cursor() as cur:
            cur.execute(
                f"SELECT COALESCE(NULLIF({function_name}(%s), ''), %s)",
                [text, text],
            )
            row = cur.fetchone()
    except Exception:
        return text

    return str((row[0] if row else "") or text).strip()


def _to_decimal(value):
    if isinstance(value, Decimal):
        return value
    try:
        return Decimal(str(value or "0").strip() or "0")
    except (InvalidOperation, AttributeError, TypeError, ValueError):
        return Decimal("0")


def _money(value):
    return _to_decimal(value).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)


def _insert_table(table_name, values):
    allowed = set(_table_columns(table_name))
    filtered = {key: value for key, value in values.items() if key in allowed}
    if not filtered:
        return 0

    cols_sql = ", ".join([f"`{col}`" for col in filtered.keys()])
    placeholder_sql = ", ".join(["%s"] * len(filtered))
    params = list(filtered.values())

    with connection.cursor() as cur:
        cur.execute(
            f"INSERT INTO `{table_name}` ({cols_sql}) VALUES ({placeholder_sql})",
            params,
        )
        return cur.rowcount


def _fetch_vendor_product_rows(po_unique_id, dc_numbers, invoice_no="", gst_type="", reassign=False, allocation_tag="revendor"):
    clean_dc_numbers = [str(dc).strip() for dc in dc_numbers if str(dc).strip()]
    if not po_unique_id or not clean_dc_numbers:
        return []

    placeholders = ",".join(["%s"] * len(clean_dc_numbers))
    params = [po_unique_id, *clean_dc_numbers]
    invoice_sql = ""
    if invoice_no and invoice_no != "All":
        invoice_sql = " AND invoice_no = %s"
        params.append(invoice_no)

    with connection.cursor() as cur:
        cur.execute(
            f"""
            SELECT
                po_unique_id,
                invoice_no,
                product_unique_id,
                item_code,
                product,
                dc_num,
                invoice_qty
            FROM invoice_creation
            WHERE po_unique_id = %s
              AND dc_num IN ({placeholders})
              AND is_delete = 0
              {invoice_sql}
            ORDER BY id ASC
            """,
            params,
        )
        invoice_rows = _dictfetchall(cur)

    saved_by_product = {}
    sublist_columns = set(_table_columns("vendor_allocation_sublist"))
    if sublist_columns and not (reassign and allocation_tag == "revisit"):
        sublist_where = "po_unique_id = %s AND dc_num IN (" + placeholders + ")"
        sublist_params = [po_unique_id, *clean_dc_numbers]
        if "is_delete" in sublist_columns:
            sublist_where += " AND is_delete = 0"
        if reassign and "engg_type" in sublist_columns:
            sublist_where += " AND COALESCE(engg_type, '') = %s"
            sublist_params.append(allocation_tag)

        with connection.cursor() as cur:
            cur.execute(
                f"""
                SELECT
                    product_unique_id,
                    dc_num,
                    invoice_qty,
                    partial_qty,
                    rate,
                    gst,
                    tax_amount,
                    total_amount
                FROM vendor_allocation_sublist
                WHERE {sublist_where}
                """,
                sublist_params,
            )
            saved_rows = _dictfetchall(cur)

        for row in saved_rows:
            key = str(row.get("product_unique_id") or "")
            assigned_piece = _to_decimal(row.get("partial_qty") if row.get("partial_qty") not in (None, "") else row.get("invoice_qty"))
            item = saved_by_product.setdefault(
                key,
                {
                    "rate": "",
                    "gst": "",
                    "tax_amount": Decimal("0"),
                    "total_amount": Decimal("0"),
                    "assigned_qty": Decimal("0"),
                },
            )
            if item["rate"] == "" and str(row.get("rate") or "").strip():
                item["rate"] = str(row.get("rate") or "")
            if item["gst"] == "" and str(row.get("gst") or "").strip():
                item["gst"] = str(row.get("gst") or "")
            item["tax_amount"] += _to_decimal(row.get("tax_amount"))
            item["total_amount"] += _to_decimal(row.get("total_amount"))
            item["assigned_qty"] += assigned_piece

    gst_percent = None
    if str(gst_type) == "1":
        gst_percent = Decimal("18")
    elif str(gst_type) == "2":
        gst_percent = Decimal("0")

    product_map = {}
    order = []
    for row in invoice_rows:
        key = str(row.get("product_unique_id") or "")
        if key not in product_map:
            order.append(key)
            product_map[key] = {
                "id": key or str(len(order)),
                "s_no": len(order),
                "po_unique_id": str(row.get("po_unique_id") or ""),
                "invoice_no": str(row.get("invoice_no") or ""),
                "product_unique_id": key,
                "item_code": str(row.get("item_code") or ""),
                "product": str(row.get("product") or ""),
                "qty": Decimal("0"),
                "dc_numbers": [],
                "dc_qty_map": {},
            }

        item = product_map[key]
        dc_num = str(row.get("dc_num") or "")
        qty = _to_decimal(row.get("invoice_qty"))
        item["qty"] += qty
        if dc_num and dc_num not in item["dc_numbers"]:
            item["dc_numbers"].append(dc_num)
        item["dc_qty_map"][dc_num] = float(_to_decimal(item["dc_qty_map"].get(dc_num, 0)) + qty)

    output = []
    for key in order:
        item = product_map[key]
        saved = saved_by_product.get(key, {})
        assigned_qty = _money(saved.get("assigned_qty"))
        remaining_qty = _money(max(item["qty"] - assigned_qty, Decimal("0")))
        rate_text = str(saved.get("rate") or "").strip()
        saved_gst_text = str(saved.get("gst") or "").strip()
        current_gst = gst_percent
        if current_gst is None and saved_gst_text != "":
            current_gst = _to_decimal(saved_gst_text)

        rate_decimal = _to_decimal(rate_text)
        if saved.get("total_amount") or saved.get("tax_amount"):
            tax_amount = _money(saved.get("tax_amount"))
            total_amount = _money(saved.get("total_amount"))
        elif rate_text:
            base_amount = item["qty"] * rate_decimal
            tax_amount = _money(base_amount * ((current_gst or Decimal("0")) / Decimal("100")))
            total_amount = _money(base_amount + tax_amount)
        else:
            tax_amount = Decimal("0.00")
            total_amount = Decimal("0.00")

        output.append(
            {
                "id": item["id"],
                "s_no": item["s_no"],
                "po_unique_id": item["po_unique_id"],
                "invoice_no": item["invoice_no"],
                "product_unique_id": item["product_unique_id"],
                "item_code": item["item_code"],
                "product": item["product"],
                "qty": float(item["qty"]),
                "already_assign_qty": f"{assigned_qty:.2f}",
                "remaining_qty": f"{remaining_qty:.2f}",
                "partial_qty": "",
                "rate": rate_text,
                "gst_percent": float(current_gst) if current_gst is not None else None,
                "tax_amount": f"{tax_amount:.2f}",
                "total_amount": f"{total_amount:.2f}",
                "dc_numbers": item["dc_numbers"],
                "dc_qty_map": item["dc_qty_map"],
            }
        )

    return output


def _save_vendor_product_rows(product_rows, audit_fields=None, force_insert=False, allocation_tag=""):
    sublist_columns = set(_table_columns("vendor_allocation_sublist"))
    if not sublist_columns:
        return {}
    audit_fields = audit_fields or {}

    dc_totals = {}
    for row in product_rows:
        po_unique_id = str(row.get("po_unique_id") or "")
        product_unique_id = str(row.get("product_unique_id") or "")
        item_code = str(row.get("item_code") or "")
        product = str(row.get("product") or "")
        rate = _money(row.get("rate"))
        gst = _money(row.get("gst"))
        tax_amount = _money(row.get("tax_amount"))
        total_amount = _money(row.get("total_amount"))
        dc_qty_map = row.get("dc_qty_map") or {}
        dc_items = [
            (str(dc_num).strip(), _to_decimal(qty))
            for dc_num, qty in dc_qty_map.items()
            if str(dc_num).strip()
        ]

        if not po_unique_id or not product_unique_id or not dc_items:
            continue

        total_qty = sum((qty for _, qty in dc_items), Decimal("0"))
        partial_sts = str(row.get("partial_sts") or "0")
        row_partial_qty = _to_decimal(row.get("partial_qty"))
        used_tax = Decimal("0.00")
        used_total = Decimal("0.00")

        for index, (dc_num, dc_qty) in enumerate(dc_items):
            if index == len(dc_items) - 1:
                dc_tax_amount = _money(tax_amount - used_tax)
                dc_total_amount = _money(total_amount - used_total)
            else:
                if total_qty > 0:
                    ratio = dc_qty / total_qty
                else:
                    ratio = Decimal("1") / Decimal(len(dc_items))
                dc_tax_amount = _money(tax_amount * ratio)
                dc_total_amount = _money(total_amount * ratio)
                used_tax += dc_tax_amount
                used_total += dc_total_amount

            values = {
                "po_unique_id": po_unique_id,
                "dc_num": dc_num,
                "invoice_qty": dc_qty,
                "product_unique_id": product_unique_id,
                "item_code": item_code,
                "product": product,
                "rate": rate,
                "gst": gst,
                "tax_amount": dc_tax_amount,
                "total_amount": dc_total_amount,
            }
            if "partial_qty" in sublist_columns:
                values["partial_qty"] = row_partial_qty if partial_sts == "1" else dc_qty
            if allocation_tag and "engg_type" in sublist_columns:
                values["engg_type"] = allocation_tag
            if row.get("engg_name") and "engg_name" in sublist_columns:
                values["engg_name"] = str(row.get("engg_name") or "")
            if row.get("assign_date") and "assign_date" in sublist_columns:
                values["assign_date"] = row.get("assign_date")
            if row.get("time_line") and "time_line" in sublist_columns:
                values["time_line"] = row.get("time_line")
            if row.get("insta_date") and "insta_date" in sublist_columns:
                values["insta_date"] = row.get("insta_date")

            existing = None
            if not force_insert:
                with connection.cursor() as cur:
                    cur.execute(
                        """
                        SELECT unique_id
                        FROM vendor_allocation_sublist
                        WHERE dc_num = %s
                          AND product_unique_id = %s
                        LIMIT 1
                        """,
                        [dc_num, product_unique_id],
                    )
                    existing = cur.fetchone()

            if existing and existing[0]:
                _update_table(
                    "vendor_allocation_sublist",
                    values,
                    "unique_id = %s",
                    [existing[0]],
                )
            else:
                values["unique_id"] = generate_unique_id()
                values.update(audit_fields)
                _insert_table("vendor_allocation_sublist", values)

            bucket = dc_totals.setdefault(
                dc_num,
                {"rate": Decimal("0.00"), "gst": gst, "total_amount": Decimal("0.00")},
            )
            bucket["rate"] += rate
            bucket["gst"] = gst
            bucket["total_amount"] += dc_total_amount

    return {
        dc_num: {
            "rate": f"{_money(values['rate']):.2f}",
            "gst": f"{_money(values['gst']):.2f}",
            "total_amount": f"{_money(values['total_amount']):.2f}",
        }
        for dc_num, values in dc_totals.items()
    }


# ────────────────────────────────────────────────────────────────────── #
#  Dispatch Create / Update  (createupdate case)                          #
# ────────────────────────────────────────────────────────────────────── #
class DispatchCreateUpdateView(APIView):
    """
    POST /vendor-allocation/dispatch/create/
    Handles PDF upload + insert into dispatch_list
    + updates invoice_creation_main.dispatch_status
    Mirrors PHP case 'createupdate'
    """
    parser_classes = [MultiPartParser, FormParser]

    def post(self, request):
        data       = request.data
        unique_id  = data.get("unique_id", "")
        invoice_no = data.get("invoice_no", "")
        po_form_uid = data.get("po_form_unique_id", "")
        consignee_uid = data.get("consignee_unique_id", "")

        # ── PO date conversion (dd-mm-yyyy → yyyy-mm-dd) ──────── #
        po_date_raw = data.get("po_date", "")
        po_date = convert_date(po_date_raw)

        # ── PDF file upload ────────────────────────────────────── #
        file_names = ""
        file_org_names = ""
        uploaded_file = request.FILES.get("file")

        if uploaded_file and uploaded_file.content_type == "application/pdf":
            my_no      = data.get("my_no", "")
            po_num_val = my_no.split("/")[-1].strip() if "/" in my_no else my_no
            tem_name   = f"{po_num_val}-Dispatch.pdf"
            upload_dir = os.path.join(settings.MEDIA_ROOT, "dispatch")
            os.makedirs(upload_dir, exist_ok=True)

            with open(os.path.join(upload_dir, tem_name), "wb") as f:
                for chunk in uploaded_file.chunks():
                    f.write(chunk)

            file_names     = tem_name
            file_org_names = uploaded_file.name

        # ── Duplicate invoice_no check in dispatch_list ────────── #
        exists = DispatchList.objects.filter(
            invoice_no=invoice_no,
            is_delete=0,
        ).exists()

        if exists:
            return Response({"status": False, "msg": "already"})

        columns = dict(
            po_num             = data.get("po_num", ""),
            po_date            = po_date,
            consignee          = data.get("con_contact_name", ""),
            con_address        = data.get("con_address", ""),
            con_contact_number = data.get("con_contact_number", ""),
            invoice_date       = convert_date(data.get("invoice_date", "")),
            invoice_no         = invoice_no,
            invoice_auto_id    = data.get("invoice_auto_id", ""),
            stock_id           = data.get("stock_id", ""),
            dispatch_date      = convert_date(data.get("dispatch_date", "")),
            mode_of_delivery   = int(data.get("mode_of_delivery", 0) or 0),
            name_of_courier    = data.get("name_of_courier", ""),
            pod_no             = data.get("pod_no", ""),
            status             = 1,
            po_unique_id       = data.get("po_unique_id", ""),
            po_form_unique_id  = po_form_uid,
            consignee_unique_id = consignee_uid,
        )

        if file_names:
            columns["file_name"]     = file_names
            columns["file_org_name"] = file_org_names

        with transaction.atomic():
            # Update invoice_creation_main.dispatch_status
            InvoiceCreationMain.objects.filter(
                form_main_unique_id=po_form_uid,
                consignee_unique_id=consignee_uid,
                invoice_no=invoice_no,
                is_delete=0,
            ).update(dispatch_status=1)

            if unique_id:
                DispatchList.objects.filter(unique_id=unique_id).update(**columns)
                msg = "update"
            else:
                columns["unique_id"] = generate_unique_id()
                DispatchList.objects.create(**columns)
                msg = "create"

        return Response({"status": True, "msg": msg})


# ────────────────────────────────────────────────────────────────────── #
#  Pending Datatable  (datatable case)                                    #
# ────────────────────────────────────────────────────────────────────── #
class VendorAllocationPendingListView(APIView):
    """
    GET /vendor-allocation/pending/
    Mirrors PHP case 'datatable' — invoice_creation_main
    where invoice_doc_status=4, vendor_bulk_sts=0
    """

    def get(self, request):
        from_date   = request.query_params.get("from_date", date.today().isoformat())
        to_date     = request.query_params.get("to_date",   date.today().isoformat())
        opt1        = request.query_params.get("opt1", "")
        team_mem    = request.query_params.get("team_mem", "")
        search      = request.query_params.get("search", "").strip()
        page        = int(request.query_params.get("page", 1))
        length      = int(request.query_params.get("length", 10))
        skip_count  = str(request.query_params.get("skip_count", "")).strip() in {"1", "true", "True"}

        sql = """
            SELECT
                icm.unique_id,
                icm.form_main_unique_id,
                icm.invoice_no            AS inv_no,
                icm.dc_number,
                CAST(COALESCE(icm.invoice_qty, 0) AS DECIMAL(18,2)) AS total_invoice_qty,
                COALESCE(vas.assigned_qty, 0) AS assigned_qty,
                (
                    CAST(COALESCE(icm.invoice_qty, 0) AS DECIMAL(18,2))
                    - COALESCE(vas.assigned_qty, 0)
                ) AS invoice_qty,
                icm.vendor_bulk_sts,
                COALESCE(icm.partial_sts, '0') AS partial_sts,
                icm.consignee_unique_id,
                icm.bulk_eng_type         AS eng_type,
                icm.bulk_eng_name         AS eng_name_id,
                icm.team_mem,
                DATE_FORMAT(icm.dc_date,'%%d-%%m-%%Y')          AS dc_date,
                DATE_FORMAT(icm.po_date,'%%d-%%m-%%Y')          AS po_date,
                DATE_FORMAT(icm.invoice_date,'%%d-%%m-%%Y')     AS invoice_date,
                DATE_FORMAT(icm.vendor_bulk_timeline,'%%d-%%m-%%Y') AS vendor_timeline,
                get_user_name(icm.team_mem)                      AS team_member,
                COALESCE(pf.po_num, '')                            AS po_num,
                COALESCE(spm.department_name, '')                  AS department_name,
                COALESCE(get_district_name(pf.district), '')       AS district,
                COALESCE(get_state_name(pf.state_name), '')        AS state
            FROM invoice_creation_main icm
            LEFT JOIN po_form pf
              ON pf.unique_id = icm.form_main_unique_id
             AND pf.is_delete = 0
            LEFT JOIN (
                SELECT
                    dc_num,
                    SUM(
                        CAST(
                            COALESCE(NULLIF(partial_qty, ''), invoice_qty, 0) AS DECIMAL(18,2)
                        )
                    ) AS assigned_qty
                FROM vendor_allocation_sublist
                GROUP BY dc_num
            ) vas
              ON vas.dc_num = icm.dc_number
            LEFT JOIN (
                SELECT
                    form_main_unique_id,
                    MAX(department) AS department_name
                FROM stock_position_main
                WHERE is_delete = 0
                GROUP BY form_main_unique_id
            ) spm
              ON spm.form_main_unique_id = icm.form_main_unique_id
            WHERE icm.is_delete = '0'
              AND icm.invoice_doc_status = '4'
              AND icm.invoice_no != ''
              AND (
                    CAST(COALESCE(icm.invoice_qty, 0) AS DECIMAL(18,2))
                    - COALESCE(vas.assigned_qty, 0)
                  ) > 0
        """
        params = []

        if team_mem:
            sql += " AND icm.team_mem = %s"
            params.append(team_mem)

        if opt1 == "101":
            sql += " AND STR_TO_DATE(icm.po_date,'%%d-%%m-%%Y') BETWEEN %s AND %s"
            params += [from_date, to_date]
        elif opt1 == "100":
            sql += " AND icm.invoice_date BETWEEN %s AND %s"
            params += [from_date, to_date]

        if search:
            sql += " AND (icm.invoice_no LIKE %s OR icm.dc_number LIKE %s)"
            like = f"%{search}%"
            params += [like, like]

        sql += " ORDER BY icm.id DESC"

        offset = (page - 1) * length
        sql += f" LIMIT {length} OFFSET {offset}"

        with connection.cursor() as cur:
            cur.execute(sql, params)
            cols    = [c[0] for c in cur.description]
            results = [dict(zip(cols, r)) for r in cur.fetchall()]

        if skip_count:
            total = offset + len(results)
        else:
            count_sql = f"SELECT COUNT(*) FROM ({sql.rsplit(' LIMIT ', 1)[0]}) AS sub"
            with connection.cursor() as cur:
                cur.execute(count_sql, params)
                total = cur.fetchone()[0]

        for i, row in enumerate(results, start=offset + 1):
            row["s_no"] = i
            row["invoice_qty"] = float(_to_decimal(row.get("invoice_qty")))
            row["department_name"] = _department_display(row.get("department_name"))
            row["cons_details"] = _build_cons_details(row.get("consignee_unique_id", ""))
            row["eng_name_id"] = _resolve_engineer_name(
                row.get("eng_type", ""),
                row.get("eng_name_id", ""),
            )

        return Response({
            "status"          : True,
            "recordsTotal"    : total,
            "recordsFiltered" : total,
            "data"            : results,
        })


# ────────────────────────────────────────────────────────────────────── #
#  Completed Datatable  (completed_datatable case)                        #
# ────────────────────────────────────────────────────────────────────── #
class VendorAllocationCompletedListView(APIView):
    """
    GET /vendor-allocation/completed/
    invoice_creation_main WHERE vendor_bulk_sts=1
    """

    def get(self, request):
        from_date = request.query_params.get("from_date", date.today().isoformat())
        to_date   = request.query_params.get("to_date",   date.today().isoformat())
        team_mem  = request.query_params.get("team_mem", "")
        search    = request.query_params.get("search", "").strip()
        page      = int(request.query_params.get("page", 1))
        length    = int(request.query_params.get("length", 10))
        show_all  = length == -1
        if page < 1:
            page = 1
        if length <= 0 and not show_all:
            length = 1000

        sql = """
            SELECT
                icm.unique_id,
                icm.invoice_no        AS inv_no,
                icm.dc_number,
                CAST(COALESCE(icm.invoice_qty, 0) AS DECIMAL(18,2)) AS total_invoice_qty,
                COALESCE((
                    SELECT SUM(
                        CAST(
                            COALESCE(NULLIF(vas.partial_qty, ''), vas.invoice_qty, 0) AS DECIMAL(18,2)
                        )
                    )
                    FROM vendor_allocation_sublist vas
                    WHERE vas.dc_num = icm.dc_number
                ), 0) AS assigned_qty,
                (
                    CAST(COALESCE(icm.invoice_qty, 0) AS DECIMAL(18,2))
                    - COALESCE((
                        SELECT SUM(
                            CAST(
                                COALESCE(NULLIF(vas.partial_qty, ''), vas.invoice_qty, 0) AS DECIMAL(18,2)
                            )
                        )
                        FROM vendor_allocation_sublist vas
                        WHERE vas.dc_num = icm.dc_number
                    ), 0)
                ) AS remaining_qty,
                icm.vendor_bulk_sts,
                icm.consignee_unique_id,
                icm.bulk_eng_type     AS eng_type,
                icm.bulk_eng_name     AS eng_name_id,
                icm.team_mem,
                DATE_FORMAT(icm.dc_date,'%%d-%%m-%%Y')            AS dc_date,
                DATE_FORMAT(icm.po_date,'%%d-%%m-%%Y')            AS po_date,
                DATE_FORMAT(icm.invoice_date,'%%d-%%m-%%Y')       AS invoice_date,
                DATE_FORMAT(icm.vendor_bulk_timeline,'%%d-%%m-%%Y') AS vendor_timeline,
                DATE_FORMAT(icm.ven_assign_date,'%%d-%%m-%%Y')    AS assign_date,
                DATE_FORMAT(icm.vendor_ins_date,'%%d-%%m-%%Y')    AS vendor_ins_date,
                DATE_FORMAT(icm.date,'%%d-%%m-%%Y')               AS date,
                get_user_name(icm.team_mem)                        AS team_member,
                get_po_number(icm.form_main_unique_id)             AS po_num,
                icm.form_main_unique_id,
                (SELECT department FROM stock_position_main
                 WHERE stock_position_main.form_main_unique_id = icm.form_main_unique_id
                   LIMIT 1)                                         AS department_name,
                (SELECT get_district_name(po.district) FROM po_form AS po
                 WHERE po.unique_id = icm.form_main_unique_id)      AS district,
                (SELECT get_state_name(po.state_name) FROM po_form AS po
                 WHERE po.unique_id = icm.form_main_unique_id)      AS state,
                (SELECT DATE_FORMAT(installation_com_date,'%%d-%%m-%%Y')
                 FROM installation_details AS inst
                 WHERE inst.dc_number = icm.dc_number LIMIT 1)     AS installation_com_date
            FROM invoice_creation_main icm
            WHERE icm.is_delete = '0'
              AND COALESCE((
                    SELECT SUM(
                        CAST(
                            COALESCE(NULLIF(vas.partial_qty, ''), vas.invoice_qty, 0) AS DECIMAL(18,2)
                        )
                    )
                    FROM vendor_allocation_sublist vas
                    WHERE vas.dc_num = icm.dc_number
                  ), 0) >= CAST(COALESCE(icm.invoice_qty, 0) AS DECIMAL(18,2))
              AND icm.po_date BETWEEN %s AND %s
        """
        params = [from_date, to_date]

        if team_mem:
            sql += " AND icm.team_mem = %s"
            params.append(team_mem)

        if search:
            sql += " AND icm.invoice_no LIKE %s"
            params.append(f"%{search}%")

        sql += " ORDER BY icm.id DESC"

        count_sql = f"SELECT COUNT(*) FROM ({sql}) AS sub"
        with connection.cursor() as cur:
            cur.execute(count_sql, params)
            total = cur.fetchone()[0]

        offset = 0 if show_all else (page - 1) * length
        query = sql if show_all else f"{sql} LIMIT {length} OFFSET {offset}"

        with connection.cursor() as cur:
            cur.execute(query, params)
            cols    = [c[0] for c in cur.description]
            results = [dict(zip(cols, r)) for r in cur.fetchall()]

        for i, row in enumerate(results, start=offset + 1):
            row["s_no"] = i
            row["invoice_qty"] = float(_to_decimal(row.get("total_invoice_qty")))
            row["remaining_qty"] = float(_to_decimal(row.get("remaining_qty")))
            row["department_name"] = _department_display(row.get("department_name"))

            row["cons_details"] = _build_cons_details(row.get("consignee_unique_id", ""))
            row["eng_name_id"] = _resolve_engineer_name(
                row.get("eng_type", ""),
                row.get("eng_name_id", ""),
            )

            # Ageing calculation
            vendor_ins = row.get("vendor_ins_date")
            timeline   = row.get("vendor_timeline")
            if vendor_ins and timeline:
                try:
                    d1 = datetime.strptime(vendor_ins, "%d-%m-%Y")
                    d2 = datetime.strptime(timeline, "%d-%m-%Y")
                    row["ageing"] = f"{abs((d1 - d2).days)} Days"
                except Exception:
                    row["ageing"] = "--"
            else:
                row["ageing"] = "--"

        return Response({
            "status"          : True,
            "recordsTotal"    : total,
            "recordsFiltered" : total,
            "data"            : results,
        })


# ────────────────────────────────────────────────────────────────────── #
#  Transit Datatable  (fixed_datatable case)                              #
# ────────────────────────────────────────────────────────────────────── #
class VendorAllocationMetaView(APIView):
    """
    GET /vendor-allocation/meta/
    Returns assign defaults for create mode.
    """

    def get(self, request):
        assign_date = date.today()
        return Response({
            "status": True,
            "data": {
                "assign_no": _generate_vendor_assign_no(),
                "assign_date": assign_date.isoformat(),
                "assign_date_display": _format_display_date(assign_date),
            },
        })


class VendorAllocationDetailView(APIView):
    """
    GET /vendor-allocation/<unique_id>/
    Returns completed allocation details for edit mode.
    """

    def get(self, request, unique_id):
        with connection.cursor() as cur:
            cur.execute(
                """
                SELECT
                    icm.unique_id,
                    icm.form_main_unique_id,
                    icm.invoice_no,
                    icm.dc_number,
                    icm.vendor_bulk_sts,
                    icm.bulk_eng_type,
                    icm.bulk_eng_name,
                    icm.team_mem,
                    icm.ven_assign_no,
                    icm.ven_assign_date,
                    icm.vendor_ins_date,
                    icm.vendor_bulk_timeline,
                    icm.vendor_bulk_rate,
                    icm.vendor_bulk_gst,
                    icm.bulk_total_amount
                FROM invoice_creation_main icm
                WHERE icm.unique_id = %s
                  AND icm.is_delete = 0
                LIMIT 1
                """,
                [unique_id],
            )
            source_rows = _dictfetchall(cur)

        if not source_rows:
            return Response(
                {"status": False, "message": "Vendor allocation record not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        source = source_rows[0]
        po_id = source.get("form_main_unique_id") or ""
        invoice_no = source.get("invoice_no") or ""
        bulk_status = int(source.get("vendor_bulk_sts") or 0)

        with connection.cursor() as cur:
            cur.execute(
                """
                SELECT
                    icm.unique_id,
                    COALESCE(NULLIF(get_po_number(icm.form_main_unique_id), ''), pf.po_num, icm.po_num, '') AS po_num,
                    DATE_FORMAT(icm.po_date,'%%d-%%m-%%Y') AS po_date,
                    icm.invoice_no AS inv_no,
                    DATE_FORMAT(icm.invoice_date,'%%d-%%m-%%Y') AS invoice_date,
                    icm.dc_number,
                    DATE_FORMAT(icm.dc_date,'%%d-%%m-%%Y') AS dc_date,
                    icm.invoice_qty,
                    icm.form_main_unique_id,
                    icm.consignee_unique_id,
                    (SELECT department
                     FROM stock_position_main
                    WHERE stock_position_main.form_main_unique_id = icm.form_main_unique_id
                       AND stock_position_main.is_delete = 0
                     LIMIT 1) AS department_name
                FROM invoice_creation_main icm
                LEFT JOIN po_form pf
                  ON pf.unique_id = icm.form_main_unique_id
                 AND pf.is_delete = 0
                WHERE icm.is_delete = 0
                  AND icm.unique_id = %s
                ORDER BY icm.id DESC
                """,
                [unique_id],
            )
            rows = _dictfetchall(cur)

        for index, row in enumerate(rows, start=1):
            row["s_no"] = index
            row["department_name"] = _department_display(row.get("department_name"))
            row["cons_details"] = _build_cons_details(row.get("consignee_unique_id", ""))

        return Response({
            "status": True,
            "data": {
                "unique_id": source.get("unique_id"),
                "form_main_unique_id": po_id,
                "invoice_no": invoice_no,
                "dc_number": source.get("dc_number") or "",
                "vendor_bulk_sts": bulk_status,
                "bulk_eng_type": source.get("bulk_eng_type") or "",
                "bulk_eng_name": source.get("bulk_eng_name") or "",
                "team_mem": source.get("team_mem") or "",
                "ven_assign_no": source.get("ven_assign_no") or _generate_vendor_assign_no(),
                "ven_assign_date": _format_input_date(source.get("ven_assign_date")) or date.today().isoformat(),
                "ven_assign_date_display": _format_display_date(source.get("ven_assign_date") or date.today()),
                "vendor_ins_date": _format_input_date(source.get("vendor_ins_date")),
                "vendor_bulk_timeline": _format_input_date(source.get("vendor_bulk_timeline")),
                "vendor_bulk_rate": str(source.get("vendor_bulk_rate") or ""),
                "vendor_bulk_gst": str(source.get("vendor_bulk_gst") or ""),
                "bulk_total_amount": str(source.get("bulk_total_amount") or ""),
                "rows": rows,
            },
        })


class VendorAllocationProductDetailsView(APIView):
    """
    POST /vendor-allocation/product-details/
    Returns grouped invoice product rows for the selected DCs.
    """

    def post(self, request):
        po_id = str(request.data.get("po_id") or "").strip()
        invoice_no = str(request.data.get("invoice_no") or "").strip()
        gst_type = str(request.data.get("gst_type") or "").strip()
        dc_numbers = request.data.get("dc_numbers") or []

        if not isinstance(dc_numbers, list):
            dc_numbers = [dc_numbers]

        rows = _fetch_vendor_product_rows(po_id, dc_numbers, invoice_no, gst_type)
        grand_total = sum((_to_decimal(row.get("total_amount")) for row in rows), Decimal("0.00"))

        return Response({
            "status": True,
            "data": rows,
            "grand_total": f"{_money(grand_total):.2f}",
        })


class DispatchTransitListView(APIView):
    """
    GET /vendor-allocation/transit/
    From view_dispatch_transit_list
    """

    def get(self, request):
        from_date = request.query_params.get("from_date", "")
        to_date   = request.query_params.get("to_date", "")
        opt       = request.query_params.get("opt", "")
        search    = request.query_params.get("search", "").strip()
        page      = int(request.query_params.get("page", 1))
        length    = int(request.query_params.get("length", 10))

        sql = """
            SELECT
                vt.unique_id,
                vt.po_num,
                vt.po_date,
                vt.po_form_unique_id,
                vt.consignee_unique_id,
                vt.invoice_no,
                vt.invoice_date,
                vt.invoice_value,
                vt.mode_of_delivery,
                vt.name_of_courier,
                vt.pod_no,
                vt.dispatch_date,
                vt.status,
                (SELECT ledger_name FROM department_creation_sublist
                 WHERE department_creation_sublist.unique_id = vt.ledger_name
                   AND department_creation_sublist.is_delete = '0') AS ledger_name,
                (SELECT con_address FROM consignee_details_sub
                 WHERE unique_id = vt.consignee_unique_id
                   AND consignee_details_sub.is_delete = 0) AS con_address
            FROM view_dispatch_transit_list vt
        """
        params = []
        where_clauses = []

        if opt == "10" and from_date and to_date:
            where_clauses.append("STR_TO_DATE(vt.po_date, '%%d-%%m-%%Y') BETWEEN %s AND %s")
            params += [from_date, to_date]
        elif opt == "20" and from_date and to_date:
            where_clauses.append("vt.invoice_date BETWEEN %s AND %s")
            params += [from_date, to_date]
        elif opt == "30" and from_date and to_date:
            where_clauses.append("vt.dispatch_date BETWEEN %s AND %s")
            params += [from_date, to_date]

        if search:
            where_clauses.append("(vt.po_num LIKE %s OR vt.invoice_no LIKE %s)")
            like = f"%{search}%"
            params += [like, like]

        if where_clauses:
            sql += " WHERE " + " AND ".join(where_clauses)

        # sql += " ORDER BY vt.id DESC"

        count_sql = f"SELECT COUNT(*) FROM ({sql}) AS sub"
        with connection.cursor() as cur:
            cur.execute(count_sql, params)
            total = cur.fetchone()[0]

        offset = (page - 1) * length
        sql += f" LIMIT {length} OFFSET {offset}"

        with connection.cursor() as cur:
            cur.execute(sql, params)
            cols    = [c[0] for c in cur.description]
            results = [dict(zip(cols, r)) for r in cur.fetchall()]

        DELIVERY_MODE = {1: "Hand", 2: "Courier"}
        for i, row in enumerate(results, start=offset + 1):
            row["s_no"] = i
            row["mode_of_delivery"] = DELIVERY_MODE.get(row.get("mode_of_delivery"), "Courier")
            if row.get("po_date"):
                row["po_date"] = row["po_date"].strftime("%d-%m-%Y") if hasattr(row["po_date"], "strftime") else row["po_date"]

        return Response({
            "status"          : True,
            "recordsTotal"    : total,
            "recordsFiltered" : total,
            "data"            : results,
        })


# ────────────────────────────────────────────────────────────────────── #
#  Delivery Datatable  (deleivery_datatable case)                         #
# ────────────────────────────────────────────────────────────────────── #
class DispatchDeliveryListView(APIView):
    """
    GET /vendor-allocation/delivery/
    From view_dispatch_delivery_list
    """

    def get(self, request):
        from_date = request.query_params.get("from_date", "")
        to_date   = request.query_params.get("to_date", "")
        opt3      = request.query_params.get("opt3", "")
        page      = int(request.query_params.get("page", 1))
        length    = int(request.query_params.get("length", 10))

        sql = """
            SELECT
                vd.unique_id,
                vd.po_num,
                vd.po_date,
                vd.invoice_no,
                vd.invoice_date,
                vd.pod_no,
                vd.delivery_status,
                vd.delivery_date,
                vd.delivery_proof,
                vd.invoice_auto_id,
                (SELECT ledger_name FROM department_creation_sublist
                 WHERE unique_id = vd.ledger_name) AS ledger_name,
                (SELECT con_address FROM consignee_details_sub
                 WHERE unique_id = vd.consignee_unique_id
                   AND consignee_details_sub.is_delete = 0) AS con_address
            FROM view_dispatch_delivery_list vd
        """
        params = []
        where_clauses = []

        if opt3 == "40" and from_date and to_date:
            where_clauses.append("vd.po_date BETWEEN %s AND %s")
            params += [from_date, to_date]
        elif opt3 == "50" and from_date and to_date:
            where_clauses.append("vd.invoice_date BETWEEN %s AND %s")
            params += [from_date, to_date]

        if where_clauses:
            sql += " WHERE " + " AND ".join(where_clauses)

        # sql += " ORDER BY vd.id DESC"

        count_sql = f"SELECT COUNT(*) FROM ({sql}) AS sub"
        with connection.cursor() as cur:
            cur.execute(count_sql, params)
            total = cur.fetchone()[0]

        offset = (page - 1) * length
        sql += f" LIMIT {length} OFFSET {offset}"

        with connection.cursor() as cur:
            cur.execute(sql, params)
            cols    = [c[0] for c in cur.description]
            results = [dict(zip(cols, r)) for r in cur.fetchall()]

        DELIVERY_STATUS = {1: "yes", 2: "NO"}
        for i, row in enumerate(results, start=offset + 1):
            row["s_no"] = i
            row["delivery_status"] = DELIVERY_STATUS.get(row.get("delivery_status"), "--")
            if row.get("po_date"):
                row["po_date"] = row["po_date"].strftime("%d-%m-%Y") if hasattr(row["po_date"], "strftime") else row["po_date"]

        return Response({
            "status"          : True,
            "recordsTotal"    : total,
            "recordsFiltered" : total,
            "data"            : results,
        })


# ────────────────────────────────────────────────────────────────────── #
#  Vendor Bulk Assignment  (vendor_allocation_update case)                #
# ────────────────────────────────────────────────────────────────────── #
class VendorBulkAssignView(APIView):
    """
    POST /vendor-allocation/bulk-assign/
    Assigns engineer/vendor to multiple invoice rows.
    Mirrors PHP vendor_allocation_update case.
    """

    def post(self, request):
        serializer = VendorBulkAssignSerializer(data=request.data)
        if not serializer.is_valid():
            return Response({
                "status": False,
                "msg"   : "error",
                "error" : serializer.errors,
            }, status=status.HTTP_400_BAD_REQUEST)

        data = serializer.validated_data

        timeline = convert_date(data["vendor_bulk_timeline"])
        assign_date = convert_date(data["ven_assign_date"]) or date.today()
        install_date = convert_date(data.get("vendor_ins_date"))
        assign_no = data.get("assign_no") or _generate_vendor_assign_no()
        rate = str(data.get("rate") or "")
        gst = str(data.get("gst") or "")
        total_amount = str(data.get("total_amount") or "")
        product_rows = data.get("product_rows") or []
        partial_sts = str(request.data.get("partial_sts") or ("0" if data["bulk_eng_type"] == "outsource-vendor" else "2"))
        acting_user = str(
            getattr(request.user, "staff_id", "")
            or getattr(request.user, "unique_id", "")
            or getattr(request.user, "pk", "")
            or getattr(request.user, "username", "")
            or ""
        )
        current_time = datetime.now()

        selected_rows = list(
            InvoiceCreationMain.objects.filter(
                unique_id__in=data["invoice_ids"],
                is_delete=0,
            ).values("unique_id", "form_main_unique_id", "invoice_no", "dc_number")
        )

        if not selected_rows:
            return Response({
                "status": False,
                "msg": "error",
                "error": "No invoice rows found for vendor allocation.",
            }, status=status.HTTP_400_BAD_REQUEST)

        placeholders = ",".join(["%s"] * len(data["invoice_ids"]))
        dc_specific_totals = {}
        audit_fields = _audit_fields_from_request(request)
        if data["bulk_eng_type"] == "outsource-vendor" and product_rows:
            for row in product_rows:
                row["partial_sts"] = partial_sts
            dc_specific_totals = _save_vendor_product_rows(product_rows, audit_fields=audit_fields)

        main_updates = {
            "ven_assign_no": assign_no,
            "ven_assign_date": assign_date,
            "vendor_allocated_by": acting_user,
            "vendor_allocated_date": current_time,
            "vendor_bulk_sts": 1,
            "engineer_name": data["bulk_eng_name"],
            "engg_type": data["bulk_eng_type"],
            "bulk_eng_type": data["bulk_eng_type"],
            "bulk_eng_name": data["bulk_eng_name"],
            "vendor_bulk_rate": rate,
            "vendor_bulk_gst": gst,
            "bulk_total_amount": total_amount,
            "date": assign_date,
            "vendor_ins_date": install_date,
            "installation_status": "4",
            "vendor_timeline": timeline,
            "vendor_bulk_timeline": timeline,
            "partial_sts": partial_sts,
        }
        dispatch_updates = {
            "vendor_bulk_sts": 1,
            "engineer_name": data["bulk_eng_name"],
            "engg_type": data["bulk_eng_type"],
            "rate": rate,
            "gst": gst,
            "total_amount": total_amount,
            "date": assign_date,
            "vendor_timeline": timeline,
            "partial_sts": partial_sts,
        }

        invoice_verify_updates = {
            "ven_assign_no": assign_no,
            "ven_assign_date": assign_date,
            "vendor_allocated_by": acting_user,
            "vendor_bulk_sts": 1,
            "engineer_name": data["bulk_eng_name"],
            "engg_type": data["bulk_eng_type"],
            "bulk_eng_type": data["bulk_eng_type"],
            "bulk_eng_name": data["bulk_eng_name"],
            "vendor_bulk_rate": rate,
            "vendor_bulk_gst": gst,
            "bulk_total_amount": total_amount,
            "vendor_inst_allocation_date": install_date,
            "installation_status": "4",
            "vendor_timeline": timeline,
            "vendor_bulk_timeline": timeline,
            "partial_sts": partial_sts,
        }

        with transaction.atomic():
            _update_table(
                "invoice_creation_main",
                main_updates,
                f"unique_id IN ({placeholders}) AND is_delete = 0",
                data["invoice_ids"],
            )

            for row in selected_rows:
                dc_number = str(row.get("dc_number") or "")
                row_rate = rate
                row_gst = gst
                row_total_amount = total_amount
                if dc_number and dc_number in dc_specific_totals:
                    row_rate = dc_specific_totals[dc_number]["rate"]
                    row_gst = dc_specific_totals[dc_number]["gst"]
                    row_total_amount = dc_specific_totals[dc_number]["total_amount"]

                    row_main_updates = dict(main_updates)
                    row_main_updates["vendor_bulk_rate"] = row_rate
                    row_main_updates["vendor_bulk_gst"] = row_gst
                    row_main_updates["bulk_total_amount"] = row_total_amount
                    _update_table(
                        "invoice_creation_main",
                        row_main_updates,
                        "unique_id = %s AND is_delete = 0",
                        [row.get("unique_id") or ""],
                    )

                row_dispatch_updates = dict(dispatch_updates)
                row_dispatch_updates["rate"] = row_rate
                row_dispatch_updates["gst"] = row_gst
                row_dispatch_updates["total_amount"] = row_total_amount

                dispatch_where = ["po_form_unique_id = %s", "invoice_no = %s", "is_delete = 0"]
                dispatch_params = [row.get("form_main_unique_id") or "", row.get("invoice_no") or ""]
                if dc_number and "dc_number" in _table_columns("dispatch_list"):
                    dispatch_where.append("dc_number = %s")
                    dispatch_params.append(dc_number)
                _update_table(
                    "dispatch_list",
                    row_dispatch_updates,
                    " AND ".join(dispatch_where),
                    dispatch_params,
                )

                row_invoice_verify_updates = dict(invoice_verify_updates)
                row_invoice_verify_updates["vendor_bulk_rate"] = row_rate
                row_invoice_verify_updates["vendor_bulk_gst"] = row_gst
                row_invoice_verify_updates["bulk_total_amount"] = row_total_amount
                updated = _update_table(
                    "invoice_verfication_table",
                    row_invoice_verify_updates,
                    "unique_id = %s",
                    [row.get("unique_id") or ""],
                )
                if not updated and row.get("form_main_unique_id") and row.get("invoice_no"):
                    _update_table(
                        "invoice_verfication_table",
                        row_invoice_verify_updates,
                        "form_main_unique_id = %s AND invoice_no = %s",
                        [row["form_main_unique_id"], row["invoice_no"]],
                    )

        return Response({
            "status": True,
            "msg": "update",
            "data": {
                "assign_no": assign_no,
                "assign_date": assign_date.isoformat(),
            },
        })


# ────────────────────────────────────────────────────────────────────── #
#  Team Allocation Update  (team_allocation_update case)                  #
# ────────────────────────────────────────────────────────────────────── #
class RevendorAllocationPendingListView(APIView):
    def get(self, request):
        search = request.query_params.get("search", "").strip()
        page = int(request.query_params.get("page", 1))
        length = int(request.query_params.get("length", 10))
        show_all = length == -1
        skip_count = str(request.query_params.get("skip_count", "")).strip() in {"1", "true", "True"}
        if page < 1:
            page = 1
        if length <= 0 and not show_all:
            length = 1000

        sql = """
            SELECT
                icm.unique_id,
                icm.form_main_unique_id,
                icm.invoice_no AS inv_no,
                icm.dc_number,
                CAST(COALESCE(icm.invoice_qty, 0) AS DECIMAL(18,2)) AS total_invoice_qty,
                COALESCE(rev.reassigned_qty, 0) AS reassigned_qty,
                (
                    CAST(COALESCE(icm.invoice_qty, 0) AS DECIMAL(18,2))
                    - COALESCE(rev.reassigned_qty, 0)
                ) AS invoice_qty,
                icm.vendor_bulk_sts,
                COALESCE(icm.partial_sts, '0') AS partial_sts,
                icm.consignee_unique_id,
                icm.bulk_eng_type AS eng_type,
                icm.bulk_eng_name AS eng_name_id,
                icm.team_mem,
                DATE_FORMAT(icm.dc_date,'%%d-%%m-%%Y') AS dc_date,
                DATE_FORMAT(icm.po_date,'%%d-%%m-%%Y') AS po_date,
                DATE_FORMAT(icm.invoice_date,'%%d-%%m-%%Y') AS invoice_date,
                DATE_FORMAT(icm.vendor_bulk_timeline,'%%d-%%m-%%Y') AS vendor_timeline,
                get_user_name(icm.team_mem) AS team_member,
                COALESCE(pf.po_num, icm.po_num, '') AS po_num,
                COALESCE(spm.department_name, '') AS department_name,
                COALESCE(get_district_name(pf.district), '') AS district,
                COALESCE(get_state_name(pf.state_name), '') AS state
            FROM invoice_creation_main icm
            INNER JOIN installation_details inst
              ON inst.po_form_unique_id = icm.form_main_unique_id
             AND inst.invoice_no = icm.invoice_no
             AND inst.dc_number = icm.dc_number
             AND inst.consignee_unique_id = icm.consignee_unique_id
             AND inst.is_delete = 0
             AND (
                  COALESCE(inst.snr_file, '') <> ''
                  OR COALESCE(inst.snr_original_name, '') <> ''
             )
             AND COALESCE(inst.ir_file, '') = ''
             AND COALESCE(inst.ir_original_name, '') = ''
            LEFT JOIN po_form pf
              ON pf.unique_id = icm.form_main_unique_id
             AND pf.is_delete = 0
            LEFT JOIN (
                SELECT form_main_unique_id, invoice_no, dc_number,
                       SUM(CAST(COALESCE(invoice_qty, 0) AS DECIMAL(18,2))) AS reassigned_qty
                FROM invoice_creation_main
                WHERE is_delete = 0
                  AND COALESCE(event_status, '') = 'revendor'
                GROUP BY form_main_unique_id, invoice_no, dc_number
            ) rev
              ON rev.form_main_unique_id = icm.form_main_unique_id
             AND rev.invoice_no = icm.invoice_no
             AND rev.dc_number = icm.dc_number
            LEFT JOIN (
                SELECT form_main_unique_id, MAX(department) AS department_name
                FROM stock_position_main
                WHERE is_delete = 0
                GROUP BY form_main_unique_id
            ) spm
              ON spm.form_main_unique_id = icm.form_main_unique_id
            WHERE icm.is_delete = 0
              AND icm.vendor_bulk_sts = 1
              AND COALESCE(icm.event_status, '') <> 'revendor'
              AND (
                    CAST(COALESCE(icm.invoice_qty, 0) AS DECIMAL(18,2))
                    - COALESCE(rev.reassigned_qty, 0)
                  ) > 0
        """
        params = []
        if search:
            sql += " AND (icm.invoice_no LIKE %s OR icm.dc_number LIKE %s OR COALESCE(pf.po_num, icm.po_num, '') LIKE %s)"
            like = f"%{search}%"
            params += [like, like, like]

        sql += " ORDER BY icm.id DESC"
        offset = 0 if show_all else (page - 1) * length
        query = sql if show_all else f"{sql} LIMIT {length} OFFSET {offset}"
        with connection.cursor() as cur:
            cur.execute(query, params)
            results = _dictfetchall(cur)

        if skip_count:
            total = len(results) if show_all else offset + len(results)
        else:
            with connection.cursor() as cur:
                cur.execute(f"SELECT COUNT(*) FROM ({sql}) AS sub", params)
                total = cur.fetchone()[0]

        for i, row in enumerate(results, start=offset + 1):
            row["s_no"] = i
            row["invoice_qty"] = float(_to_decimal(row.get("invoice_qty")))
            row["department_name"] = _department_display(row.get("department_name"))
            row["cons_details"] = _build_cons_details(row.get("consignee_unique_id", ""))
            row["eng_name_id"] = _resolve_engineer_name(row.get("eng_type", ""), row.get("eng_name_id", ""))

        return Response({"status": True, "recordsTotal": total, "recordsFiltered": total, "data": results})


class VendorAllocationZonePendingListView(APIView):
    def get(self, request):
        search = request.query_params.get("search", "").strip()
        team_mem = request.query_params.get("team_mem", "")
        opt1 = request.query_params.get("opt1", "")
        from_date = request.query_params.get("from_date", "")
        to_date = request.query_params.get("to_date", "")
        page = int(request.query_params.get("page", 1))
        length = int(request.query_params.get("length", 10))
        show_all = length == -1
        skip_count = str(request.query_params.get("skip_count", "")).strip() in {"1", "true", "True"}
        if page < 1:
            page = 1
        if length <= 0 and not show_all:
            length = 1000

        sql = """
            SELECT
                icm.unique_id,
                icm.form_main_unique_id,
                icm.invoice_no AS inv_no,
                icm.dc_number,
                CAST(COALESCE(icm.invoice_qty, 0) AS DECIMAL(18,2)) AS total_invoice_qty,
                COALESCE(rev.reassigned_qty, 0) AS reassigned_qty,
                (
                    CAST(COALESCE(icm.invoice_qty, 0) AS DECIMAL(18,2))
                    - COALESCE(rev.reassigned_qty, 0)
                ) AS invoice_qty,
                icm.vendor_bulk_sts,
                COALESCE(icm.partial_sts, '0') AS partial_sts,
                icm.consignee_unique_id,
                icm.bulk_eng_type AS eng_type,
                icm.bulk_eng_name AS eng_name_id,
                icm.team_mem,
                DATE_FORMAT(icm.dc_date,'%%d-%%m-%%Y') AS dc_date,
                DATE_FORMAT(icm.po_date,'%%d-%%m-%%Y') AS po_date,
                DATE_FORMAT(icm.invoice_date,'%%d-%%m-%%Y') AS invoice_date,
                DATE_FORMAT(icm.vendor_bulk_timeline,'%%d-%%m-%%Y') AS vendor_timeline,
                get_user_name(icm.team_mem) AS team_member,
                COALESCE(pf.po_num, icm.po_num, '') AS po_num,
                COALESCE(spm.department_name, '') AS department_name,
                COALESCE(get_district_name(pf.district), '') AS district,
                COALESCE(get_state_name(pf.state_name), '') AS state
            FROM invoice_creation_main icm
            LEFT JOIN po_form pf
              ON pf.unique_id = icm.form_main_unique_id
             AND pf.is_delete = 0
            LEFT JOIN (
                SELECT form_main_unique_id, invoice_no, dc_number,
                       SUM(CAST(COALESCE(invoice_qty, 0) AS DECIMAL(18,2))) AS reassigned_qty
                FROM invoice_creation_main
                WHERE is_delete = 0
                  AND COALESCE(event_status, '') = 'revendor'
                GROUP BY form_main_unique_id, invoice_no, dc_number
            ) rev
              ON rev.form_main_unique_id = icm.form_main_unique_id
             AND rev.invoice_no = icm.invoice_no
             AND rev.dc_number = icm.dc_number
            LEFT JOIN (
                SELECT form_main_unique_id, MAX(department) AS department_name
                FROM stock_position_main
                WHERE is_delete = 0
                GROUP BY form_main_unique_id
            ) spm
              ON spm.form_main_unique_id = icm.form_main_unique_id
            WHERE icm.is_delete = 0
              AND icm.vendor_bulk_sts = 1
              AND COALESCE(icm.event_status, '') NOT IN ('revendor', 'revisit')
              AND (
                    CAST(COALESCE(icm.invoice_qty, 0) AS DECIMAL(18,2))
                    - COALESCE(rev.reassigned_qty, 0)
                  ) > 0
        """
        params = []
        if team_mem:
            sql += " AND icm.team_mem = %s"
            params.append(team_mem)
        if opt1 == "101" and from_date and to_date:
            sql += " AND DATE(icm.po_date) BETWEEN %s AND %s"
            params += [from_date, to_date]
        elif opt1 == "100" and from_date and to_date:
            sql += " AND DATE(icm.invoice_date) BETWEEN %s AND %s"
            params += [from_date, to_date]
        if search:
            sql += " AND (icm.invoice_no LIKE %s OR icm.dc_number LIKE %s OR COALESCE(pf.po_num, icm.po_num, '') LIKE %s)"
            like = f"%{search}%"
            params += [like, like, like]

        sql += " ORDER BY icm.id DESC"
        offset = 0 if show_all else (page - 1) * length
        query = sql if show_all else f"{sql} LIMIT {length} OFFSET {offset}"
        with connection.cursor() as cur:
            cur.execute(query, params)
            results = _dictfetchall(cur)

        if skip_count:
            total = len(results) if show_all else offset + len(results)
        else:
            with connection.cursor() as cur:
                cur.execute(f"SELECT COUNT(*) FROM ({sql}) AS sub", params)
                total = cur.fetchone()[0]

        for i, row in enumerate(results, start=offset + 1):
            row["s_no"] = i
            row["invoice_qty"] = float(_to_decimal(row.get("invoice_qty")))
            row["department_name"] = _department_display(row.get("department_name"))
            row["cons_details"] = _build_cons_details(row.get("consignee_unique_id", ""))
            row["eng_name_id"] = _resolve_engineer_name(row.get("eng_type", ""), row.get("eng_name_id", ""))

        return Response({"status": True, "recordsTotal": total, "recordsFiltered": total, "data": results})


class RevisitPaymentPendingListView(APIView):
    def get(self, request):
        search = request.query_params.get("search", "").strip()
        page = int(request.query_params.get("page", 1))
        length = int(request.query_params.get("length", 10))
        skip_count = str(request.query_params.get("skip_count", "")).strip() in {"1", "true", "True"}
        if page < 1:
            page = 1
        if length <= 0:
            length = 1000

        sql = """
            SELECT
                icm.unique_id,
                icm.form_main_unique_id,
                icm.invoice_no AS inv_no,
                icm.dc_number,
                CAST(COALESCE(icm.invoice_qty, 0) AS DECIMAL(18,2)) AS total_invoice_qty,
                0 AS reassigned_qty,
                CAST(COALESCE(icm.invoice_qty, 0) AS DECIMAL(18,2)) AS invoice_qty,
                icm.vendor_bulk_sts,
                COALESCE(icm.partial_sts, '0') AS partial_sts,
                icm.consignee_unique_id,
                icm.bulk_eng_type AS eng_type,
                icm.bulk_eng_name AS eng_name_id,
                icm.team_mem,
                DATE_FORMAT(icm.dc_date,'%%d-%%m-%%Y') AS dc_date,
                DATE_FORMAT(icm.po_date,'%%d-%%m-%%Y') AS po_date,
                DATE_FORMAT(icm.invoice_date,'%%d-%%m-%%Y') AS invoice_date,
                DATE_FORMAT(icm.vendor_bulk_timeline,'%%d-%%m-%%Y') AS vendor_timeline,
                get_user_name(icm.team_mem) AS team_member,
                COALESCE(pf.po_num, icm.po_num, '') AS po_num,
                COALESCE(spm.department_name, '') AS department_name,
                COALESCE(get_district_name(pf.district), '') AS district,
                COALESCE(get_state_name(pf.state_name), '') AS state
            FROM invoice_creation_main icm
            INNER JOIN installation_details inst
              ON inst.po_form_unique_id = icm.form_main_unique_id
             AND inst.invoice_no = icm.invoice_no
             AND inst.dc_number = icm.dc_number
             AND inst.consignee_unique_id = icm.consignee_unique_id
             AND COALESCE(inst.engineer_name, '') = COALESCE(icm.engineer_name, '')
             AND COALESCE(inst.created, inst.updated, '1970-01-01') >= COALESCE(icm.created, '1970-01-01')
             AND inst.is_delete = 0
             AND (
                  COALESCE(inst.ir_file, '') <> ''
                  OR COALESCE(inst.ir_original_name, '') <> ''
             )
            LEFT JOIN po_form pf
              ON pf.unique_id = icm.form_main_unique_id
             AND pf.is_delete = 0
            LEFT JOIN (
                SELECT form_main_unique_id, MAX(department) AS department_name
                FROM stock_position_main
                WHERE is_delete = 0
                GROUP BY form_main_unique_id
            ) spm
              ON spm.form_main_unique_id = icm.form_main_unique_id
            WHERE icm.is_delete = 0
              AND icm.vendor_bulk_sts = 1
              AND COALESCE(icm.event_status, '') IN ('revendor', 'revisit')
              AND CAST(COALESCE(icm.invoice_qty, 0) AS DECIMAL(18,2)) > 0
        """
        params = []
        if search:
            sql += " AND (icm.invoice_no LIKE %s OR icm.dc_number LIKE %s OR COALESCE(pf.po_num, icm.po_num, '') LIKE %s)"
            like = f"%{search}%"
            params += [like, like, like]

        sql += " ORDER BY icm.id DESC"
        offset = (page - 1) * length
        with connection.cursor() as cur:
            cur.execute(sql + f" LIMIT {length} OFFSET {offset}", params)
            results = _dictfetchall(cur)

        if skip_count:
            total = offset + len(results)
        else:
            with connection.cursor() as cur:
                cur.execute(f"SELECT COUNT(*) FROM ({sql}) AS sub", params)
                total = cur.fetchone()[0]

        for i, row in enumerate(results, start=offset + 1):
            row["s_no"] = i
            row["invoice_qty"] = float(_to_decimal(row.get("invoice_qty")))
            row["department_name"] = _department_display(row.get("department_name"))
            row["cons_details"] = _build_cons_details(row.get("consignee_unique_id", ""))
            row["eng_name_id"] = _resolve_engineer_name(row.get("eng_type", ""), row.get("eng_name_id", ""))

        return Response({"status": True, "recordsTotal": total, "recordsFiltered": total, "data": results})


class RevendorAllocationProductDetailsView(APIView):
    allocation_tag = "revendor"

    def post(self, request):
        dc_numbers = request.data.get("dc_numbers") or []
        if not isinstance(dc_numbers, list):
            dc_numbers = [dc_numbers]
        rows = _fetch_vendor_product_rows(
            str(request.data.get("po_id") or "").strip(),
            dc_numbers,
            str(request.data.get("invoice_no") or "").strip(),
            str(request.data.get("gst_type") or "").strip(),
            reassign=True,
            allocation_tag=self.allocation_tag,
        )
        grand_total = sum((_to_decimal(row.get("total_amount")) for row in rows), Decimal("0.00"))
        return Response({"status": True, "data": rows, "grand_total": f"{_money(grand_total):.2f}"})


class RevisitPaymentProductDetailsView(RevendorAllocationProductDetailsView):
    allocation_tag = "revisit"


class RevendorBulkAssignView(APIView):
    allocation_tag = "revendor"
    allocation_label = "revendor allocation"

    def post(self, request):
        allocation_tag = self.allocation_tag
        serializer = VendorBulkAssignSerializer(data=request.data)
        if not serializer.is_valid():
            return Response({"status": False, "msg": "error", "error": serializer.errors}, status=status.HTTP_400_BAD_REQUEST)

        data = serializer.validated_data
        product_rows = data.get("product_rows") or []
        if data["bulk_eng_type"] == "outsource-vendor" and not product_rows:
            return Response({"status": False, "msg": "error", "error": f"Product rows are required for {self.allocation_label}."}, status=status.HTTP_400_BAD_REQUEST)

        timeline = convert_date(data["vendor_bulk_timeline"])
        assign_date = convert_date(data["ven_assign_date"]) or date.today()
        install_date = convert_date(data.get("vendor_ins_date"))
        assign_no = data.get("assign_no") or _generate_vendor_assign_no()
        acting_user = str(getattr(request.user, "staff_id", "") or getattr(request.user, "unique_id", "") or getattr(request.user, "pk", "") or getattr(request.user, "username", "") or "")
        current_time = datetime.now()
        audit_fields = _audit_fields_from_request(request)
        source_rows = list(InvoiceCreationMain.objects.filter(unique_id__in=data["invoice_ids"], is_delete=0).values())
        if not source_rows:
            return Response({"status": False, "msg": "error", "error": "No source rows found for revendor allocation."}, status=status.HTTP_400_BAD_REQUEST)

        product_rows_by_dc = {}
        for row in product_rows:
            row["partial_sts"] = "1"
            row["engg_name"] = data["bulk_eng_name"]
            row["assign_date"] = assign_date
            row["time_line"] = timeline
            row["insta_date"] = install_date
            for dc_num in (row.get("dc_qty_map") or {}).keys():
                product_rows_by_dc.setdefault(str(dc_num), []).append(row)

        for source in source_rows:
            dc_number = str(source.get("dc_number") or "")
            assigned_qty = sum(_to_decimal(pr.get("partial_qty") or pr.get("assigned_qty")) for pr in product_rows_by_dc.get(dc_number, []))
            with connection.cursor() as cur:
                cur.execute(
                    """
                    SELECT COALESCE(SUM(CAST(COALESCE(invoice_qty, 0) AS DECIMAL(18,2))), 0)
                    FROM invoice_creation_main
                    WHERE form_main_unique_id = %s AND invoice_no = %s AND dc_number = %s
                      AND COALESCE(event_status, '') = %s AND is_delete = 0
                      AND id > %s
                    """,
                    [source.get("form_main_unique_id"), source.get("invoice_no"), dc_number, allocation_tag, source.get("id") or 0],
                )
                already = _to_decimal(cur.fetchone()[0])
            remaining_qty = _to_decimal(source.get("invoice_qty")) if allocation_tag == "revisit" else _money(max(_to_decimal(source.get("invoice_qty")) - already, Decimal("0")))
            if data["bulk_eng_type"] != "outsource-vendor":
                assigned_qty = remaining_qty
            if assigned_qty <= 0:
                continue
            if assigned_qty > remaining_qty:
                return Response({"status": False, "msg": "error", "error": f"Assign qty exceeds remaining qty for DC {dc_number}."}, status=status.HTTP_400_BAD_REQUEST)

        inserted_ids = []
        with transaction.atomic():
            totals = {}
            if data["bulk_eng_type"] == "outsource-vendor":
                totals = _save_vendor_product_rows(product_rows, audit_fields=audit_fields, force_insert=True, allocation_tag=allocation_tag)
            for source in source_rows:
                dc_number = str(source.get("dc_number") or "")
                assigned_qty = sum(_to_decimal(pr.get("partial_qty") or pr.get("assigned_qty")) for pr in product_rows_by_dc.get(dc_number, []))
                if data["bulk_eng_type"] != "outsource-vendor":
                    with connection.cursor() as cur:
                        cur.execute(
                            """
                            SELECT COALESCE(SUM(CAST(COALESCE(invoice_qty, 0) AS DECIMAL(18,2))), 0)
                            FROM invoice_creation_main
                            WHERE form_main_unique_id = %s AND invoice_no = %s AND dc_number = %s
                              AND COALESCE(event_status, '') = %s AND is_delete = 0
                              AND id > %s
                            """,
                            [source.get("form_main_unique_id"), source.get("invoice_no"), dc_number, allocation_tag, source.get("id") or 0],
                        )
                        already = _to_decimal(cur.fetchone()[0])
                    assigned_qty = _to_decimal(source.get("invoice_qty")) if allocation_tag == "revisit" else _money(max(_to_decimal(source.get("invoice_qty")) - already, Decimal("0")))
                if assigned_qty <= 0:
                    continue

                new_unique_id = generate_unique_id()
                row_total = totals.get(dc_number, {})
                clone = dict(source)
                clone.pop("id", None)
                clone.update({
                    "unique_id": new_unique_id,
                    "invoice_qty": assigned_qty,
                    "vendor_bulk_sts": 1,
                    "bulk_eng_type": data["bulk_eng_type"],
                    "bulk_eng_name": data["bulk_eng_name"],
                    "engineer_name": data["bulk_eng_name"],
                    "engg_type": data["bulk_eng_type"],
                    "vendor_bulk_rate": row_total.get("rate", data.get("rate") or ""),
                    "vendor_bulk_gst": row_total.get("gst", data.get("gst") or ""),
                    "bulk_total_amount": row_total.get("total_amount", data.get("total_amount") or ""),
                    "vendor_bulk_timeline": timeline,
                    "vendor_timeline": timeline,
                    "vendor_ins_date": install_date,
                    "ven_assign_no": assign_no,
                    "ven_assign_date": assign_date,
                    "vendor_allocated_by": acting_user,
                    "vendor_allocated_date": current_time,
                    "installation_status": "4",
                    "installation_com_date": None,
                    "date": assign_date,
                    "partial_sts": "1" if data["bulk_eng_type"] == "outsource-vendor" else "2",
                    "event_status": allocation_tag,
                    "vendor_payment_status": 0,
                    "bill_status": 0,
                    "is_active": 1,
                    "is_delete": 0,
                    "created": current_time,
                    "updated": current_time,
                })
                clone.update(audit_fields)
                _insert_table("invoice_creation_main", clone)
                inserted_ids.append(new_unique_id)

                with connection.cursor() as cur:
                    cur.execute("SELECT * FROM invoice_verfication_table WHERE unique_id = %s LIMIT 1", [source.get("unique_id")])
                    verify_rows = _dictfetchall(cur)
                if verify_rows:
                    verify = verify_rows[0]
                    verify.pop("id", None)
                    verify.update({
                        "unique_id": new_unique_id,
                        "invoice_qty": assigned_qty,
                        "vendor_bulk_sts": 1,
                        "bulk_eng_type": data["bulk_eng_type"],
                        "bulk_eng_name": data["bulk_eng_name"],
                        "engineer_name": data["bulk_eng_name"],
                        "engg_type": data["bulk_eng_type"],
                        "vendor_bulk_rate": row_total.get("rate", data.get("rate") or ""),
                        "vendor_bulk_gst": row_total.get("gst", data.get("gst") or ""),
                        "bulk_total_amount": row_total.get("total_amount", data.get("total_amount") or ""),
                        "vendor_inst_allocation_date": install_date,
                        "vendor_bulk_timeline": timeline,
                        "vendor_timeline": timeline,
                        "ven_assign_no": assign_no,
                        "ven_assign_date": assign_date,
                        "vendor_allocated_by": acting_user,
                        "installation_status": "4",
                        "installation_com_date": None,
                        "signed_complete_status": 0,
                        "vendor_payment_allocated": 0,
                        "vendor_bill_no": "",
                        "vendor_bill_app_status": 0,
                        "vendor_bill_approval_allocated": 0,
                    })
                    verify.update(audit_fields)
                    _insert_table("invoice_verfication_table", verify)

        return Response({"status": True, "msg": "create", "data": {"assign_no": assign_no, "assign_date": assign_date.isoformat(), "invoice_ids": inserted_ids}})


class RevisitPaymentBulkAssignView(RevendorBulkAssignView):
    allocation_tag = "revisit"
    allocation_label = "revisit payment"


class TeamAllocationUpdateView(APIView):
    """
    POST /vendor-allocation/team-assign/
    Assigns team member to invoice rows (team_allocation.php submit)
    """

    def post(self, request):
        invoice_ids = request.data.get("invoice_ids", [])
        team_mem    = request.data.get("team_mem", "")

        if not invoice_ids or not team_mem:
            return Response({
                "status": False,
                "msg"   : "error",
                "error" : "invoice_ids and team_mem are required.",
            }, status=status.HTTP_400_BAD_REQUEST)

        InvoiceCreationMain.objects.filter(
            unique_id__in=invoice_ids,
            is_delete=0,
        ).update(team_mem=team_mem)

        return Response({"status": True, "msg": "update"})


# ────────────────────────────────────────────────────────────────────── #
#  Excel Export Data  (excel / excel_pending / excel_complete / transit)  #
# ────────────────────────────────────────────────────────────────────── #
class VendorAllocationExcelExportView(APIView):
    """
    GET /vendor-allocation/export/?type=all|pending|complete|transit
    Returns JSON rows for Excel generation.
    """

    def get(self, request):
        export_type = request.query_params.get("type", "all")

        VIEW_MAP = {
            "all"     : "invoice_creation_main WHERE is_delete=0 AND ac_team_verifiy_status='1'",
            "pending" : "view_dispatch_pending_list WHERE is_delete=0",
            "complete": "view_dispatch_delivery_list",
            "transit" : "view_dispatch_transit_list",
        }

        source = VIEW_MAP.get(export_type, VIEW_MAP["all"])
        sql = f"SELECT * FROM {source}"

        with connection.cursor() as cur:
            cur.execute(sql)
            cols = [c[0] for c in cur.description]
            rows = [dict(zip(cols, r)) for r in cur.fetchall()]

        AC_STATUS_MAP = {0: "Pending", 1: "Approved", 2: "Rejected"}
        MODE_MAP      = {1: "Hand", 2: "Courier"}

        for row in rows:
            # consignee details
            consignee_uid = row.get("consignee_unique_id", "")
            if consignee_uid:
                with connection.cursor() as cur:
                    cur.execute(
                        "SELECT con_contact_name, con_address FROM consignee_details_sub "
                        "WHERE unique_id = %s LIMIT 1",
                        [consignee_uid]
                    )
                    r = cur.fetchone()
                    row["con_contact_name"] = r[0] if r else ""
                    row["con_address"]      = r[1] if r else ""

            # ac_team status
            sts = row.get("ac_team_verifiy_status", 0)
            approved_by = row.get("ac_team_approved_by", "")
            if sts == 1:
                row["ac_team_verifiy_status_display"] = f"Approved / {approved_by}"
            else:
                row["ac_team_verifiy_status_display"] = AC_STATUS_MAP.get(sts, "Pending")

            # mode of delivery
            if "mode_of_delivery" in row:
                row["mode_of_delivery_display"] = MODE_MAP.get(row["mode_of_delivery"], "Courier")

            # date formatting
            for date_field in ["po_date", "invoice_date", "dispatch_date", "delivery_date"]:
                if row.get(date_field) and hasattr(row[date_field], "strftime"):
                    row[date_field] = row[date_field].strftime("%d-%m-%Y")

        return Response({"status": True, "data": rows})


# ────────────────────────────────────────────────────────────────────── #
#  District options (for team_allocation.php get_district AJAX)           #
# ────────────────────────────────────────────────────────────────────── #
class DistrictByStateOptionView(APIView):
    """
    GET /vendor-allocation/options/districts/?state_name=<uid>
    Mirrors PHP get_district AJAX
    """

    def get(self, request):
        state_uid = request.query_params.get("state_name", "")

        with connection.cursor() as cur:
            cur.execute(
                "SELECT unique_id, district_name FROM district_creation "
                "WHERE state_unique_id = %s AND is_delete = 0 AND is_active = 1 "
                "ORDER BY district_name",
                [state_uid]
            )
            rows = cur.fetchall()

        districts = [{"unique_id": r[0], "district_name": r[1]} for r in rows]

        return Response({
            "status"    : "success",
            "districts" : districts,
        })


# ────────────────────────────────────────────────────────────────────── #
#  Engineer role option (team_allocation.php engineer_role_option AJAX)  #
# ────────────────────────────────────────────────────────────────────── #
class EngineerRoleOptionView(APIView):
    """
    POST /vendor-allocation/options/engineer-role/
    Returns user roles for selected engineers.
    """

    def post(self, request):
        import json
        eng_names_raw = request.data.get("eng_name", "[]")
        try:
            eng_ids = json.loads(eng_names_raw) if isinstance(eng_names_raw, str) else eng_names_raw
        except Exception:
            eng_ids = []

        if not eng_ids:
            return Response({"success": False, "message": "No engineers selected."})

        placeholders = ",".join(["%s"] * len(eng_ids))
        with connection.cursor() as cur:
            cur.execute(
                f"SELECT user_type_unique_id, unique_id FROM user WHERE unique_id IN ({placeholders})",
                eng_ids
            )
            rows = cur.fetchall()

        if not rows:
            return Response({"success": False, "message": "No roles found."})

        role_ids  = [r[0] for r in rows]
        uid_ids   = [r[1] for r in rows]

        with connection.cursor() as cur:
            placeholders2 = ",".join(["%s"] * len(role_ids))
            cur.execute(
                f"SELECT user_type_name FROM user_type WHERE unique_id IN ({placeholders2})",
                role_ids
            )
            type_rows = cur.fetchall()

        roles = [r[0] for r in type_rows]

        return Response({
            "success"       : True,
            "user_roles"    : ", ".join(roles),
            "user_role_ids" : uid_ids,
        })
