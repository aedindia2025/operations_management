import os
import re
from datetime import date, datetime
from urllib.parse import quote

from django.conf import settings
from django.db import connection, transaction
from django.http import FileResponse, Http404
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView

from master.apps.department.departmentmodel import DepartmentCreation, DepartmentCreationSublist
from master.apps.district.districtmodel import DistrictCreation
from master.apps.dispatch.dispatch_model import Dispatch
from master.apps.state.statemodel import StateCreation
from master.serializers.dispatch.dispatch_serializer import DispatchSerializer
from master.tenant import request_company_id, tenant_queryset


EDIT_ACTION_ID = "5f88082b25ec031952"


def _current_acc_year():
    today = date.today()
    if today.month >= 4:
        return f"{today.year}-{str(today.year + 1)[2:]}"
    return f"{today.year - 1}-{str(today.year)[2:]}"


def _first_non_empty(*values):
    for value in values:
        if value is None:
            continue
        value = str(value).strip()
        if value:
            return value
    return ""


def _session_value(request, *keys):
    session_obj = getattr(request, "session", None)
    if session_obj is None:
        return ""
    for key in keys:
        try:
            value = session_obj.get(key)
        except Exception:
            value = None
        if value is not None and str(value).strip():
            return str(value).strip()
    return ""


def _audit_payload(request):
    session_key = ""
    session_obj = getattr(request, "session", None)
    if session_obj is not None:
        try:
            if not session_obj.session_key:
                session_obj.save()
            session_key = session_obj.session_key or ""
        except Exception:
            session_key = ""

    acting_user = getattr(getattr(request, "user", None), "username", "") or ""
    return {
        "acc_year": _first_non_empty(
            request.data.get("acc_year"),
            _session_value(request, "acc_year"),
            _current_acc_year(),
        )[:50],
        "session_id": _first_non_empty(
            request.data.get("session_id"),
            request.headers.get("X-Session-Id"),
            _session_value(request, "session_id"),
            session_key,
        )[:50],
        "sess_user_type": _first_non_empty(
            request.data.get("sess_user_type"),
            request.headers.get("X-User-Type"),
            _session_value(request, "sess_user_type", "user_type_unique_id"),
        )[:50],
        "sess_user_id": _first_non_empty(
            request.data.get("sess_user_id"),
            request.data.get("user_id"),
            _session_value(request, "sess_user_id", "user_id", "staff_id"),
            acting_user,
        )[:50],
        "sess_company_id": _first_non_empty(
            request_company_id(request),
            request.data.get("sess_company_id"),
            request.headers.get("X-Company-Id"),
            _session_value(request, "sess_company_id"),
        )[:50],
        "sess_branch_id": _first_non_empty(
            request.data.get("sess_branch_id"),
            request.headers.get("X-Branch-Id"),
            _session_value(request, "sess_branch_id"),
        )[:50],
    }


def _fmt_date(value):
    if not value:
        return ""
    if hasattr(value, "strftime"):
        return value.strftime("%d-%m-%Y")
    text = str(value).strip()
    for fmt in ("%Y-%m-%d", "%d-%m-%Y", "%Y/%m/%d"):
        try:
            return datetime.strptime(text, fmt).strftime("%d-%m-%Y")
        except ValueError:
            continue
    return text


def _parse_date(value):
    if not value:
        return None
    if hasattr(value, "year") and hasattr(value, "month") and hasattr(value, "day"):
        return value
    text = str(value).strip()
    for fmt in ("%Y-%m-%d", "%d-%m-%Y", "%d/%m/%Y", "%Y/%m/%d"):
        try:
            return datetime.strptime(text, fmt).date()
        except ValueError:
            continue
    return None


def _indian_money(value):
    try:
        number = float(value or 0)
    except Exception:
        return str(value or "0")

    negative = number < 0
    number = abs(number)
    whole, dot, fraction = f"{number:.2f}".partition(".")
    if len(whole) <= 3:
        result = whole
    else:
        result = whole[-3:]
        whole = whole[:-3]
        while whole:
            result = f"{whole[-2:]},{result}"
            whole = whole[:-2]
    if fraction and int(fraction) != 0:
        result = f"{result}.{fraction}"
    return f"-{result}" if negative else result


def _dispatch_file_url(filename):
    name = str(filename or "").strip()
    if not name:
        return ""
    return f"/api/master/dispatch/files/{quote(name)}/"


def _save_dispatch_upload(file_obj, filename):
    folder = os.path.join(settings.MEDIA_ROOT, "dispatch")
    os.makedirs(folder, exist_ok=True)
    path = os.path.join(folder, filename)
    with open(path, "wb") as out:
        for chunk in file_obj.chunks():
            out.write(chunk)
    return filename


def _normalized_dispatch_payload(request):
    data = request.data.copy()

    alias_map = {
        "dc_no": "dc_number",
        "con_contact_name": "consignee",
        "consignee_name": "consignee",
        "address": "con_address",
        "consignee_address": "con_address",
        "contact_number": "con_contact_number",
        "consignee_contact": "con_contact_number",
        "courier_name": "name_of_courier",
        "tracking_no": "pod_no",
        "dispatch_no": "po_num",
        "po_number": "po_num",
    }

    for source_key, target_key in alias_map.items():
        value = data.get(source_key)
        if value not in (None, "") and not data.get(target_key):
            data[target_key] = value

    if not data.get("status"):
        data["status"] = "1"
    if not data.get("mode_of_delivery"):
        data["mode_of_delivery"] = "0"

    upload = request.FILES.get("file")
    if upload:
        ext = os.path.splitext(upload.name)[1].lower() or ".pdf"
        base_name = str(data.get("my_no") or data.get("po_num") or data.get("invoice_no") or data.get("dc_number") or "dispatch").strip()
        safe_base = re.sub(r"[^A-Za-z0-9._-]+", "-", base_name).strip("-") or "dispatch"
        filename = f"{safe_base}-Dispatch{ext}"
        saved_name = _save_dispatch_upload(upload, filename)
        # Pending dispatch uploads are shown as "E-Invoice" in Transit/Delivery,
        # so save them into the dedicated einvoice columns the list APIs expose.
        data["einvoice_file"] = saved_name
        data["einvoice_file_org"] = upload.name
        # Keep legacy file fields populated as well to avoid breaking any older
        # consumers that may still read the generic file_name/file_org_name pair.
        data["file_name"] = saved_name
        data["file_org_name"] = upload.name

    return data


def _fetch_customer_detail(po_form_unique_id):
    if not po_form_unique_id:
        return {}
    try:
        with connection.cursor() as cur:
            cur.callproc("GetCustomerDetailByponum", [po_form_unique_id])
            rows = cur.fetchall() if cur.description else []
            if not rows:
                return {}
            cols = [col[0] for col in cur.description]
            return dict(zip(cols, rows[0]))
    except Exception:
        return {}


def _fetch_consignee_detail(consignee_unique_id):
    if not consignee_unique_id:
        return {}
    try:
        with connection.cursor() as cur:
            cur.callproc("GetConsigneeDetailsById", [consignee_unique_id])
            rows = cur.fetchall() if cur.description else []
            if not rows:
                return {}
            cols = [col[0] for col in cur.description]
            return dict(zip(cols, rows[0]))
    except Exception:
        return {}


def _requires_einvoice_upload(po_form_unique_id):
    value = str(po_form_unique_id or "").strip()
    if not value:
        return False
    with connection.cursor() as cur:
        cur.execute(
            """
            SELECT COALESCE(gst_option, '')
            FROM po_form
            WHERE unique_id = %s
              AND is_delete = 0
            LIMIT 1
            """,
            [value],
        )
        row = cur.fetchone()
    return str((row or [""])[0] or "").strip().lower() == "yes"


def _invoice_file_url(filename):
    name = str(filename or "").strip()
    if not name:
        return ""
    return f"/api/master/invoice-dc/files/{quote(name)}/"


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


def _user_can_edit(screen_id_val, user_type_unique_id):
    if not screen_id_val or not user_type_unique_id:
        return False
    with connection.cursor() as cur:
        cur.execute(
            """
            SELECT 1
            FROM user_screen_permission
            WHERE screen_unique_id = %s
              AND user_type = %s
              AND action_unique_id = %s
            LIMIT 1
            """,
            [screen_id_val, user_type_unique_id, EDIT_ACTION_ID],
        )
        return bool(cur.fetchone())


def _paginate(sql, params, page, length):
    count_base_sql = re.sub(r"\s+ORDER\s+BY\s+[\s\S]*$", "", sql, count=1, flags=re.IGNORECASE)
    count_sql = f"SELECT COUNT(*) FROM ({count_base_sql}) AS counted_rows"
    with connection.cursor() as cur:
        cur.execute(count_sql, params)
        total = cur.fetchone()[0]

    offset = max(page - 1, 0) * length
    paged_sql = f"{sql} LIMIT {length} OFFSET {offset}"
    with connection.cursor() as cur:
        cur.execute(paged_sql, params)
        cols = [col[0] for col in cur.description]
        rows = [dict(zip(cols, row)) for row in cur.fetchall()]
    return total, offset, rows


def _page_slice(rows, page, length):
    if length == -1:
        return 0, rows
    offset = max(page - 1, 0) * length
    return offset, rows[offset: offset + length]


def _chunked(values, size=500):
    values = list(values)
    for index in range(0, len(values), size):
        yield values[index:index + size]


def _fetch_dispatch_invoice_meta(invoice_nos):
    result = {}
    clean_values = [str(value).strip() for value in invoice_nos if str(value).strip()]
    if not clean_values:
        return result

    for chunk in _chunked(clean_values):
        placeholders = ",".join(["%s"] * len(chunk))
        with connection.cursor() as cur:
            cur.execute(
                f"""
                SELECT
                    icm.invoice_no,
                    COALESCE(u.staff_name, '') AS team_member,
                    COALESCE(dcs.ledger_name, '') AS ledger_name
                FROM invoice_creation_main icm
                LEFT JOIN user u
                    ON u.staff_id = icm.team_mem
                   AND u.is_delete = 0
                LEFT JOIN department_creation_sublist dcs
                    ON dcs.unique_id = icm.ledger_name
                   AND dcs.is_delete = 0
                WHERE icm.is_delete = 0
                  AND icm.invoice_no IN ({placeholders})
                """,
                chunk,
            )
            for invoice_no, team_member, ledger_name in cur.fetchall():
                result[str(invoice_no or "")] = {
                    "team_member": team_member or "",
                    "ledger_name": ledger_name or "",
                }
    return result


def _fetch_dispatch_consignee_meta(consignee_ids):
    result = {}
    clean_values = [str(value).strip() for value in consignee_ids if str(value).strip()]
    if not clean_values:
        return result

    for chunk in _chunked(clean_values):
        placeholders = ",".join(["%s"] * len(chunk))
        with connection.cursor() as cur:
            cur.execute(
                f"""
                SELECT unique_id, COALESCE(con_address, '')
                FROM consignee_details_sub
                WHERE is_delete = 0
                  AND unique_id IN ({placeholders})
                """,
                chunk,
            )
            for unique_id, con_address in cur.fetchall():
                result[str(unique_id or "")] = {"con_address": con_address or ""}
    return result


def _fetch_dispatch_po_meta(form_main_ids):
    result = {}
    clean_values = [str(value).strip() for value in form_main_ids if str(value).strip()]
    if not clean_values:
        return result

    for chunk in _chunked(clean_values):
        placeholders = ",".join(["%s"] * len(chunk))
        with connection.cursor() as cur:
            cur.execute(
                f"""
                SELECT unique_id, COALESCE(po_num, '')
                FROM po_form
                WHERE is_delete = 0
                  AND unique_id IN ({placeholders})
                """,
                chunk,
            )
            for unique_id, po_num in cur.fetchall():
                result[str(unique_id or "")] = {"po_num": po_num or ""}
    return result


def _fetch_dispatch_file_meta(dc_numbers):
    result = {}
    clean_values = [str(value).strip() for value in dc_numbers if str(value).strip()]
    if not clean_values:
        return result

    for chunk in _chunked(clean_values):
        placeholders = ",".join(["%s"] * len(chunk))
        with connection.cursor() as cur:
            cur.execute(
                f"""
                SELECT
                    dc_number,
                    COALESCE(dc_file_name, '') AS dc_file,
                    COALESCE(ir_file_name, '') AS ir_file_org_name,
                    COALESCE(file_invoice, '') AS invoice_file_org_name
                FROM invoice_sublist
                WHERE is_delete = 0
                  AND dc_number IN ({placeholders})
                """,
                chunk,
            )
            for dc_number, dc_file, ir_file_org_name, invoice_file_org_name in cur.fetchall():
                result[str(dc_number or "")] = {
                    "dc_file": dc_file or "",
                    "ir_file_org_name": ir_file_org_name or "",
                    "invoice_file_org_name": invoice_file_org_name or "",
                }
    return result


def _delivery_filter_date(row, opt3):
    if opt3 == "50":
        return _parse_date(row.get("invoice_date"))
    if opt3 == "60":
        return _parse_date(row.get("delivery_date"))
    return (
        _parse_date(row.get("delivery_date"))
        or _parse_date(row.get("dispatch_date"))
        or _parse_date(row.get("po_date"))
    )


def _apply_delivery_filters(rows, params):
    from_date = _parse_date(params.get("from_date"))
    to_date = _parse_date(params.get("to_date"))
    opt3 = str(params.get("opt3") or "")
    search = str(params.get("search") or "").strip().lower()
    team_mem = str(params.get("team_mem3") or params.get("team_mem") or "").strip()

    filtered_rows = list(rows)

    if from_date and to_date:
        filtered_rows = [
            row for row in filtered_rows
            if (filter_date := _delivery_filter_date(row, opt3)) and from_date <= filter_date <= to_date
        ]

    if team_mem and team_mem != "All":
        invoice_meta = _fetch_dispatch_invoice_meta(row.get("invoice_no") for row in filtered_rows)
        filtered_rows = [
            row for row in filtered_rows
            if invoice_meta.get(str(row.get("invoice_no") or ""), {}).get("team_member") == team_mem
        ]

    if search:
        invoice_meta = _fetch_dispatch_invoice_meta(row.get("invoice_no") for row in filtered_rows)
        consignee_meta = _fetch_dispatch_consignee_meta(row.get("consignee_unique_id") for row in filtered_rows)

        def _matches(row):
            invoice_no = str(row.get("invoice_no") or "")
            consignee_id = str(row.get("consignee_unique_id") or "")
            team_member = invoice_meta.get(invoice_no, {}).get("team_member", "")
            ledger_name = invoice_meta.get(invoice_no, {}).get("ledger_name", "")
            con_address = consignee_meta.get(consignee_id, {}).get("con_address", "")
            haystacks = [
                str(row.get("po_num") or ""),
                con_address,
                ledger_name,
                team_member,
                invoice_no,
                str(row.get("dc_number") or ""),
                str(row.get("pod_no") or ""),
            ]
            return any(search in value.lower() for value in haystacks if value)

        filtered_rows = [row for row in filtered_rows if _matches(row)]

    return filtered_rows


def _transit_filter_date(row, opt):
    if opt == "5":
        return _parse_date(row.get("invoice_date"))
    return _parse_date(row.get("po_date"))


def _apply_transit_filters(rows, params):
    from_date = _parse_date(params.get("from_date"))
    to_date = _parse_date(params.get("to_date"))
    opt = str(params.get("opt") or "")
    search = str(params.get("search") or "").strip().lower()
    team_mem = str(params.get("team_mem2") or params.get("team_mem") or "").strip()

    filtered_rows = list(rows)

    if from_date and to_date:
        filtered_rows = [
            row for row in filtered_rows
            if (filter_date := _transit_filter_date(row, opt)) and from_date <= filter_date <= to_date
        ]

    if team_mem and team_mem != "All":
        invoice_meta = _fetch_dispatch_invoice_meta(row.get("invoice_no") for row in filtered_rows)
        filtered_rows = [
            row for row in filtered_rows
            if invoice_meta.get(str(row.get("invoice_no") or ""), {}).get("team_member") == team_mem
        ]

    if search:
        invoice_meta = _fetch_dispatch_invoice_meta(row.get("invoice_no") for row in filtered_rows)
        consignee_meta = _fetch_dispatch_consignee_meta(row.get("consignee_unique_id") for row in filtered_rows)

        def _matches(row):
            invoice_no = str(row.get("invoice_no") or "")
            consignee_id = str(row.get("consignee_unique_id") or "")
            team_member = invoice_meta.get(invoice_no, {}).get("team_member", "")
            ledger_name = invoice_meta.get(invoice_no, {}).get("ledger_name", "")
            con_address = consignee_meta.get(consignee_id, {}).get("con_address", "")
            haystacks = [
                str(row.get("po_num") or ""),
                con_address,
                ledger_name,
                team_member,
                invoice_no,
                str(row.get("dc_number") or ""),
                str(row.get("name_of_courier") or ""),
                str(row.get("pod_no") or ""),
            ]
            return any(search in value.lower() for value in haystacks if value)

        filtered_rows = [row for row in filtered_rows if _matches(row)]

    return filtered_rows


def _pending_filter_date(row, opt1):
    if opt1 == "100":
        return _parse_date(row.get("invoice_date"))
    return _parse_date(row.get("po_date"))


def _apply_pending_filters(rows, params):
    from_date = _parse_date(params.get("from_date"))
    to_date = _parse_date(params.get("to_date"))
    opt1 = str(params.get("opt1") or "")
    search = str(params.get("search") or "").strip().lower()
    team_mem = str(params.get("team_mem1") or params.get("team_mem") or "").strip()

    filtered_rows = list(rows)

    if from_date and to_date:
        filtered_rows = [
            row for row in filtered_rows
            if (filter_date := _pending_filter_date(row, opt1)) and from_date <= filter_date <= to_date
        ]

    if team_mem and team_mem != "All":
        filtered_rows = [
            row for row in filtered_rows
            if str(row.get("team_mem") or "") == team_mem
        ]

    if search:
        consignee_meta = _fetch_dispatch_consignee_meta(row.get("consignee_unique_id") for row in filtered_rows)
        po_meta = _fetch_dispatch_po_meta(row.get("form_main_unique_id") for row in filtered_rows)

        def _matches(row):
            form_main_id = str(row.get("form_main_unique_id") or "")
            consignee_id = str(row.get("consignee_unique_id") or "")
            con_address = consignee_meta.get(consignee_id, {}).get("con_address", "")
            po_num = po_meta.get(form_main_id, {}).get("po_num", "")
            haystacks = [
                po_num,
                con_address,
                str(row.get("ledger_name") or ""),
                str(row.get("team_member") or ""),
                str(row.get("invoice_no") or ""),
                str(row.get("dc_number") or ""),
            ]
            return any(search in value.lower() for value in haystacks if value)

        filtered_rows = [row for row in filtered_rows if _matches(row)]

    return filtered_rows


def _mysql_date_expr(column_sql):
    return (
        "COALESCE("
        f"STR_TO_DATE(NULLIF({column_sql}, ''), '%Y-%m-%d'), "
        f"STR_TO_DATE(NULLIF({column_sql}, ''), '%d-%m-%Y'), "
        f"STR_TO_DATE(NULLIF({column_sql}, ''), '%d/%m/%Y')"
        ")"
    )


def _pending_where(params):
    where = [
        "icm.dispatch_status = 0",
        "icm.material_qc = '1'",
        "icm.ac_team_verifiy_status = '1'",
        "icm.is_delete = '0'",
        "NOT EXISTS (SELECT 1 FROM dispatch_list d WHERE d.dc_number = icm.dc_number AND d.is_delete = '0')",
    ]
    args = []

    from_date = params.get("from_date", "")
    to_date = params.get("to_date", "")
    opt1 = params.get("opt1", "")
    if from_date and to_date:
        if opt1 == "100":
            where.append("icm.invoice_date BETWEEN %s AND %s")
        else:
            where.append("icm.po_date BETWEEN %s AND %s")
        args.extend([from_date, to_date])

    team_mem = params.get("team_mem1", "") or params.get("team_mem", "")
    if team_mem and team_mem != "All":
        where.append("icm.team_mem = %s")
        args.append(team_mem)

    search = (params.get("search", "") or "").strip()
    if search:
        like = f"%{search}%"
        where.append(
            "("
            "po.po_num LIKE %s OR "
            "cds.con_address LIKE %s OR "
            "dcs.ledger_name LIKE %s OR "
            "u.staff_name LIKE %s OR "
            "icm.invoice_no LIKE %s OR "
            "icm.dc_number LIKE %s"
            ")"
        )
        args.extend([like, like, like, like, like, like])

    return " AND ".join(where), args


def _transit_where(params):
    where = [
        "dl.is_delete = 0",
        "dl.status = 1",
    ]
    args = []

    from_date = params.get("from_date", "")
    to_date = params.get("to_date", "")
    opt = params.get("opt", "")
    if from_date and to_date:
        if opt == "5":
            where.append("icm.invoice_date BETWEEN %s AND %s")
        else:
            where.append("dl.po_date BETWEEN %s AND %s")
        args.extend([from_date, to_date])

    team_mem = params.get("team_mem2", "") or params.get("team_mem", "")
    if team_mem and team_mem != "All":
        where.append("icm.team_mem = %s")
        args.append(team_mem)

    search = (params.get("search", "") or "").strip()
    if search:
        like = f"%{search}%"
        where.append(
            "("
            "dl.po_num LIKE %s OR "
            "cds.con_address LIKE %s OR "
            "dcs.ledger_name LIKE %s OR "
            "u.staff_name LIKE %s OR "
            "dl.invoice_no LIKE %s OR "
            "dl.dc_number LIKE %s OR "
            "dl.name_of_courier LIKE %s OR "
            "dl.pod_no LIKE %s"
            ")"
        )
        args.extend([like, like, like, like, like, like, like, like])

    return " AND ".join(where), args


def _delivery_where(params):
    where = [
        "dl.is_delete = 0",
        "(dl.status = '2' OR dl.status = '3')",
    ]
    args = []

    from_date = params.get("from_date", "")
    to_date = params.get("to_date", "")
    opt3 = params.get("opt3", "")
    if from_date and to_date:
        if opt3 == "50":
            where.append(f"{_mysql_date_expr('dl.invoice_date')} BETWEEN %s AND %s")
        elif opt3 == "60":
            where.append(f"{_mysql_date_expr('dl.delivery_date')} BETWEEN %s AND %s")
        else:
            # Keep PO-date filtering as the primary behavior, but fall back to
            # delivery/dispatch dates so records moved from Transit are still
            # visible in Delivery when the UI keeps its default date filter.
            where.append(
                "COALESCE("
                f"{_mysql_date_expr('dl.delivery_date')}, "
                f"{_mysql_date_expr('dl.dispatch_date')}, "
                f"{_mysql_date_expr('dl.po_date')}"
                ") BETWEEN %s AND %s"
            )
        args.extend([from_date, to_date])

    team_mem = params.get("team_mem3", "") or params.get("team_mem", "")
    if team_mem and team_mem != "All":
        where.append("icm.team_mem = %s")
        args.append(team_mem)

    search = (params.get("search", "") or "").strip()
    if search:
        like = f"%{search}%"
        where.append(
            "("
            "dl.po_num LIKE %s OR "
            "cds.con_address LIKE %s OR "
            "dcs.ledger_name LIKE %s OR "
            "u.staff_name LIKE %s OR "
            "dl.invoice_no LIKE %s OR "
            "dl.dc_number LIKE %s OR "
            "dl.pod_no LIKE %s"
            ")"
        )
        args.extend([like, like, like, like, like, like, like])

    return " AND ".join(where), args


class DispatchPendingListView(APIView):
    def get(self, request):
        page = int(request.query_params.get("page", 1) or 1)
        length = int(request.query_params.get("length", 10) or 10)
        company_id = request_company_id(request)
        can_edit = _user_can_edit(
            request.query_params.get("screen_id_val", ""),
            request.query_params.get("user_type_unique_id", ""),
        )

        company_sql = ""
        company_params = []
        if company_id:
            company_sql = """
                  AND EXISTS (
                      SELECT 1
                      FROM po_form pf_tenant
                      WHERE pf_tenant.unique_id = icm.form_main_unique_id
                        AND pf_tenant.is_delete = 0
                        AND pf_tenant.sess_company_id = %s
                  )
            """
            company_params.append(company_id)

        with connection.cursor() as cur:
            cur.execute(
                f"""
                SELECT
                    icm.id,
                    icm.unique_id,
                    icm.form_main_unique_id,
                    icm.consignee_unique_id,
                    icm.dc_number,
                    icm.po_date,
                    icm.invoice_auto_id,
                    icm.dc_date,
                    icm.invoice_qty,
                    icm.invoice_value,
                    icm.doc_approval_sts,
                    icm.ac_team_verifiy_status,
                    icm.material_qc,
                    icm.invoice_no,
                    icm.ac_team_approved_by,
                    icm.approved_by,
                    icm.team_mem,
                    icm.material_qc_approved,
                    icm.invoice_date
                FROM (
                    SELECT m.*
                    FROM invoice_creation_main m
                    INNER JOIN (
                        SELECT MAX(id) AS max_id
                        FROM invoice_creation_main
                        WHERE is_delete = 0
                          AND COALESCE(TRIM(dc_number), '') <> ''
                        GROUP BY UPPER(TRIM(dc_number))
                    ) latest ON latest.max_id = m.id
                ) icm
                WHERE icm.dispatch_status = 0
                  AND icm.material_qc = '1'
                  AND icm.ac_team_verifiy_status = '1'
                  AND icm.is_delete = '0'
                  {company_sql}
                  AND NOT EXISTS (
                      SELECT 1
                      FROM dispatch_list d
                      WHERE d.dc_number = icm.dc_number
                        AND d.is_delete = '0'
                  )
                ORDER BY icm.id DESC
                """,
                company_params,
            )
            cols = [col[0] for col in cur.description]
            all_rows = [dict(zip(cols, row)) for row in cur.fetchall()]

        filtered_rows = _apply_pending_filters(all_rows, request.query_params)
        total = len(filtered_rows)
        offset, rows = _page_slice(filtered_rows, page, length)

        invoice_meta = _fetch_dispatch_invoice_meta(row.get("invoice_no") for row in rows)
        consignee_meta = _fetch_dispatch_consignee_meta(row.get("consignee_unique_id") for row in rows)
        po_meta = _fetch_dispatch_po_meta(row.get("form_main_unique_id") for row in rows)

        doc_map = {0: "Pending", 1: "Approved", 2: "Rejected"}
        qc_map = {0: "Pending", 1: "Approved", 2: "Not Approved"}
        for index, row in enumerate(rows, start=offset + 1):
            form_main_id = str(row.get("form_main_unique_id") or "")
            consignee_id = str(row.get("consignee_unique_id") or "")
            invoice_no = str(row.get("invoice_no") or "")
            row["po_num"] = po_meta.get(form_main_id, {}).get("po_num", "")
            row["con_address"] = consignee_meta.get(consignee_id, {}).get("con_address", "")
            row["team_member"] = invoice_meta.get(invoice_no, {}).get("team_member", "")
            row["ledger_name"] = invoice_meta.get(invoice_no, {}).get("ledger_name", "")
            row["s_no"] = index
            row["po_date"] = _fmt_date(row.get("po_date"))
            row["dc_date"] = _fmt_date(row.get("dc_date"))
            row["invoice_date"] = _fmt_date(row.get("invoice_date"))
            row["invoice_value"] = _indian_money(row.get("invoice_value"))
            row["doc_approval_status"] = f"{doc_map.get(row.get('doc_approval_sts'), 'Pending')} / {row.get('approved_by') or ''}".strip(" /")
            row["ac_team_status"] = f"{doc_map.get(row.get('ac_team_verifiy_status'), 'Pending')} / {row.get('ac_team_approved_by') or ''}".strip(" /")
            row["material_qc_status"] = f"{qc_map.get(row.get('material_qc'), 'Pending')} / {row.get('material_qc_approved') or ''}".strip(" /")
            row["action_mode"] = "edit" if can_edit else ""

        return Response({
            "status": True,
            "recordsTotal": total,
            "recordsFiltered": total,
            "data": rows,
        })


class DispatchTransitListView(APIView):
    def get(self, request):
        page = int(request.query_params.get("page", 1) or 1)
        length = int(request.query_params.get("length", 10) or 10)
        company_id = request_company_id(request)
        can_edit = _user_can_edit(
            request.query_params.get("screen_id_val", ""),
            request.query_params.get("user_type_unique_id", ""),
        )

        company_sql = ""
        company_params = []
        if company_id:
            company_sql = """
                  AND EXISTS (
                      SELECT 1
                      FROM po_form pf_tenant
                      WHERE pf_tenant.unique_id = dispatch_list.po_form_unique_id
                        AND pf_tenant.is_delete = 0
                        AND pf_tenant.sess_company_id = %s
                  )
            """
            company_params.append(company_id)

        with connection.cursor() as cur:
            cur.execute(
                f"""
                SELECT
                    id,
                    unique_id,
                    po_form_unique_id,
                    consignee_unique_id,
                    po_num,
                    po_date,
                    invoice_date,
                    dc_date,
                    dispatch_date,
                    mode_of_delivery,
                    name_of_courier,
                    pod_no,
                    status,
                    COALESCE(einvoice_file, file_name, '') AS einvoice,
                    invoice_auto_id,
                    invoice_no,
                    dc_number
                FROM dispatch_list
                WHERE is_delete = 0
                  AND status = 1
                  {company_sql}
                ORDER BY id DESC
                """,
                company_params,
            )
            cols = [col[0] for col in cur.description]
            all_rows = [dict(zip(cols, row)) for row in cur.fetchall()]

        filtered_rows = _apply_transit_filters(all_rows, request.query_params)
        total = len(filtered_rows)
        offset, rows = _page_slice(filtered_rows, page, length)

        invoice_meta = _fetch_dispatch_invoice_meta(row.get("invoice_no") for row in rows)
        consignee_meta = _fetch_dispatch_consignee_meta(row.get("consignee_unique_id") for row in rows)

        for index, row in enumerate(rows, start=offset + 1):
            invoice_no = str(row.get("invoice_no") or "")
            consignee_id = str(row.get("consignee_unique_id") or "")
            row["con_address"] = consignee_meta.get(consignee_id, {}).get("con_address", "")
            row["team_member"] = invoice_meta.get(invoice_no, {}).get("team_member", "")
            row["ledger_name"] = invoice_meta.get(invoice_no, {}).get("ledger_name", "")
            row["s_no"] = index
            row["po_date"] = _fmt_date(row.get("po_date"))
            row["invoice_date"] = _fmt_date(row.get("invoice_date"))
            row["dc_date"] = _fmt_date(row.get("dc_date"))
            row["dispatch_date"] = _fmt_date(row.get("dispatch_date"))
            row["delivery_status_text"] = "Pending" if str(row.get("status")) == "1" else str(row.get("status") or "")
            row["mode_of_delivery_text"] = "Hand" if str(row.get("mode_of_delivery")) == "1" else "Courier"
            row["einvoice_url"] = _dispatch_file_url(row.get("einvoice"))
            row["action_mode"] = "edit" if can_edit else ""

        return Response({
            "status": True,
            "recordsTotal": total,
            "recordsFiltered": total,
            "data": rows,
        })


class DispatchTransitDetailView(APIView):
    def get(self, request):
        po_form_unique_id = request.query_params.get("unique_id", "") or ""
        consignee_unique_id = request.query_params.get("consignee_unique_id", "") or ""
        dc_no = request.query_params.get("dc_no", "") or ""

        if not (po_form_unique_id and consignee_unique_id and dc_no):
            return Response({"status": False, "error": "Missing required parameters."}, status=status.HTTP_400_BAD_REQUEST)

        with connection.cursor() as cur:
            cur.execute(
                """
                SELECT
                    po_num,
                    po_date,
                    invoice_no,
                    invoice_date,
                    dc_number,
                    dc_date,
                    dispatch_date,
                    mode_of_delivery,
                    name_of_courier,
                    pod_no,
                    delivery_status,
                    delivery_date,
                    delivery_proof,
                    pod_proof,
                    po_form_unique_id,
                    consignee_unique_id,
                    unique_id
                FROM dispatch_list
                WHERE po_form_unique_id = %s
                  AND consignee_unique_id = %s
                  AND dc_number = %s
                  AND is_delete = 0
                LIMIT 1
                """,
                [po_form_unique_id, consignee_unique_id, dc_no],
            )
            row = cur.fetchone()
            cols = [c[0] for c in cur.description] if cur.description else []
            record = dict(zip(cols, row)) if row else None

        if not record:
            return Response({"status": False, "error": "Record not found."}, status=status.HTTP_404_NOT_FOUND)

        customer = _fetch_customer_detail(po_form_unique_id)
        consignee = _fetch_consignee_detail(consignee_unique_id)

        data = {
            "po_num": record.get("po_num", ""),
            "po_date": _fmt_date(record.get("po_date")),
            "invoice_no": record.get("invoice_no", ""),
            "invoice_date": _fmt_date(record.get("invoice_date")),
            "dc_no": record.get("dc_number", ""),
            "dc_date": _fmt_date(record.get("dc_date")),
            "customer_name": _department_name(customer.get("department") or customer.get("ledger_name")) or customer.get("contact_name") or "",
            "customer_address": customer.get("bill_address", ""),
            "customer_district": _district_name(customer.get("district", "")),
            "customer_state": _state_name(customer.get("state_name", "")),
            "customer_pincode": customer.get("pin", ""),
            "customer_contact": customer.get("contact_number", ""),
            "customer_email": customer.get("email", ""),
            "consignee_name": consignee.get("con_contact_name", ""),
            "consignee_address": consignee.get("con_address", ""),
            "consignee_district": _district_name(consignee.get("con_district", "")),
            "consignee_state": _state_name(consignee.get("con_state_name", "")),
            "consignee_pincode": consignee.get("con_pincode", ""),
            "consignee_contact": consignee.get("con_contact_number", ""),
            "consignee_landline": consignee.get("con_lan_num", ""),
            "dispatch_date": _fmt_date(record.get("dispatch_date")),
            "mode_of_delivery": str(record.get("mode_of_delivery") or ""),
            "name_of_courier": record.get("name_of_courier", ""),
            "pod_no": record.get("pod_no", ""),
            "delivery_status": str(record.get("delivery_status") or ""),
            "delivery_date": _fmt_date(record.get("delivery_date")),
            "delivery_proof": record.get("delivery_proof", "") or "",
            "pod_proof": record.get("pod_proof", "") or "",
            "po_form_unique_id": record.get("po_form_unique_id", ""),
            "consignee_unique_id": record.get("consignee_unique_id", ""),
            "unique_id": record.get("unique_id", ""),
        }

        return Response({"status": True, "data": data})


class DispatchTransitUpdateView(APIView):
    def post(self, request):
        delivery_status = str(request.data.get("delivery_status", "")).strip()
        delivery_date = str(request.data.get("delivery_date", "")).strip()
        invoice_no = str(request.data.get("invoice_no", "")).strip()
        dc_no = str(request.data.get("dc_no", "")).strip()
        dc_date = str(request.data.get("dc_date", "")).strip()
        po_form_unique_id = str(request.data.get("po_form_unique_id", "")).strip()
        consignee_unique_id = str(request.data.get("consignee_unique_id", "")).strip()
        mode_of_delivery = str(request.data.get("mode_of_delivery", "")).strip()
        name_of_courier = str(request.data.get("name_of_courier", "")).strip()
        pod_no = str(request.data.get("pod_no", "")).strip()
        dispatch_date = str(request.data.get("dispatch_date", "")).strip()

        if not (delivery_status and delivery_date and po_form_unique_id and consignee_unique_id and dc_no):
            return Response({"status": False, "error": "Missing required fields."}, status=status.HTTP_400_BAD_REQUEST)

        file_obj = request.FILES.get("file")
        pod_obj = request.FILES.get("podfile")

        allowed_exts = {"pdf", "jpg", "jpeg", "png", "xls", "xlsx"}
        file_name = ""
        file_org_name = ""
        pod_file_name = ""
        pod_file_org_name = ""

        parts = dc_no.split("/")
        base_name = parts[-1] if parts else dc_no

        if file_obj:
            ext = os.path.splitext(file_obj.name)[1].lstrip(".").lower()
            if ext not in allowed_exts:
                return Response({"status": False, "error": "Invalid delivery proof file type."}, status=status.HTTP_400_BAD_REQUEST)
            file_name = _save_dispatch_upload(file_obj, f"{base_name}-Transit.{ext}")
            file_org_name = file_obj.name

        if pod_obj:
            ext = os.path.splitext(pod_obj.name)[1].lstrip(".").lower()
            if ext not in allowed_exts:
                return Response({"status": False, "error": "Invalid POD file type."}, status=status.HTTP_400_BAD_REQUEST)
            pod_file_name = _save_dispatch_upload(pod_obj, f"{base_name}-POD.{ext}")
            pod_file_org_name = pod_obj.name

        set_clauses = [
            "delivery_status = %s",
            "delivery_date = %s",
            "status = 2",
            "mode_of_delivery = %s",
            "name_of_courier = %s",
            "pod_no = %s",
            "dispatch_date = %s",
        ]
        params = [delivery_status, delivery_date, mode_of_delivery, name_of_courier, pod_no, dispatch_date]

        if file_name:
            set_clauses += ["delivery_proof = %s", "file_name = %s", "file_org_name = %s"]
            params += [file_name, file_name, file_org_name]
        if pod_file_name:
            set_clauses += ["pod_proof = %s", "podfile_org_name = %s"]
            params += [pod_file_name, pod_file_org_name]

        params += [po_form_unique_id, consignee_unique_id, dc_no]
        update_sql = f"""
            UPDATE dispatch_list
            SET {", ".join(set_clauses)}
            WHERE po_form_unique_id = %s
              AND consignee_unique_id = %s
              AND dc_number = %s
              AND is_delete = 0
        """

        with connection.cursor() as cur:
            cur.execute(update_sql, params)
            cur.execute(
                """
                UPDATE invoice_creation_main
                SET delivery_status = 1
                WHERE form_main_unique_id = %s
                  AND consignee_unique_id = %s
                  AND dc_number = %s
                """,
                [po_form_unique_id, consignee_unique_id, dc_no],
            )

            payment_sets = [
                "dispatch_delivery_status = %s",
                "delivery_date = %s",
                "mode_of_delivery = %s",
                "name_of_courier = %s",
                "pod_no = %s",
                "status = 2",
            ]
            payment_params = [delivery_status, delivery_date, mode_of_delivery, name_of_courier, pod_no]
            if file_name:
                payment_sets.append("delivery_proof = %s")
                payment_params.append(file_name)
            if pod_file_name:
                payment_sets.append("pod_proof = %s")
                payment_params.append(pod_file_name)
            payment_params += [po_form_unique_id, consignee_unique_id, dc_no]

            cur.execute(
                f"""
                UPDATE invoice_creation_main_payment_data
                SET {", ".join(payment_sets)}
                WHERE form_main_unique_id = %s
                  AND consignee_unique_id = %s
                  AND dc_number = %s
                """,
                payment_params,
            )

            # The direct row updates above already persist the transit save.
            # Avoid running broad post-update procedures here because they can
            # block this request for a long time and leave the UI stuck on Saving.

        return Response({"status": True, "msg": "update"})


class DispatchDeliveryDetailView(APIView):
    def get(self, request):
        po_form_unique_id = request.query_params.get("unique_id", "") or ""
        consignee_unique_id = request.query_params.get("consignee_unique_id", "") or ""
        dc_no = request.query_params.get("dc_no", "") or ""

        if not (po_form_unique_id and consignee_unique_id and dc_no):
            return Response({"status": False, "error": "Missing required parameters."}, status=status.HTTP_400_BAD_REQUEST)

        with connection.cursor() as cur:
            cur.execute(
                """
                SELECT
                    po_num,
                    po_date,
                    invoice_no,
                    invoice_date,
                    dc_number,
                    dc_date,
                    dispatch_date,
                    mode_of_delivery,
                    name_of_courier,
                    pod_no,
                    delivery_status,
                    delivery_date,
                    delivery_proof,
                    pod_proof,
                    po_form_unique_id,
                    consignee_unique_id,
                    unique_id
                FROM dispatch_list
                WHERE po_form_unique_id = %s
                  AND consignee_unique_id = %s
                  AND dc_number = %s
                  AND is_delete = 0
                LIMIT 1
                """,
                [po_form_unique_id, consignee_unique_id, dc_no],
            )
            row = cur.fetchone()
            cols = [c[0] for c in cur.description] if cur.description else []
            record = dict(zip(cols, row)) if row else None

        if not record:
            return Response({"status": False, "error": "Record not found."}, status=status.HTTP_404_NOT_FOUND)

        customer = _fetch_customer_detail(po_form_unique_id)
        consignee = _fetch_consignee_detail(consignee_unique_id)

        data = {
            "po_num": record.get("po_num", ""),
            "po_date": _fmt_date(record.get("po_date")),
            "invoice_no": record.get("invoice_no", ""),
            "invoice_date": _fmt_date(record.get("invoice_date")),
            "dc_no": record.get("dc_number", ""),
            "dc_date": _fmt_date(record.get("dc_date")),
            "customer_name": _department_name(customer.get("department") or customer.get("ledger_name")) or customer.get("contact_name") or "",
            "customer_address": customer.get("bill_address", ""),
            "customer_district": _district_name(customer.get("district", "")),
            "customer_state": _state_name(customer.get("state_name", "")),
            "customer_pincode": customer.get("pin", ""),
            "customer_contact": customer.get("contact_number", ""),
            "customer_email": customer.get("email", ""),
            "consignee_name": consignee.get("con_contact_name", ""),
            "consignee_address": consignee.get("con_address", ""),
            "consignee_district": _district_name(consignee.get("con_district", "")),
            "consignee_state": _state_name(consignee.get("con_state_name", "")),
            "consignee_pincode": consignee.get("con_pincode", ""),
            "consignee_contact": consignee.get("con_contact_number", ""),
            "consignee_landline": consignee.get("con_lan_num", ""),
            "dispatch_date": _fmt_date(record.get("dispatch_date")),
            "mode_of_delivery": str(record.get("mode_of_delivery") or ""),
            "name_of_courier": record.get("name_of_courier", ""),
            "pod_no": record.get("pod_no", ""),
            "delivery_status": str(record.get("delivery_status") or ""),
            "delivery_date": _fmt_date(record.get("delivery_date")),
            "delivery_proof": record.get("delivery_proof", "") or "",
            "pod_proof": record.get("pod_proof", "") or "",
            "delivery_proof_url": _dispatch_file_url(record.get("delivery_proof")),
            "pod_proof_url": _dispatch_file_url(record.get("pod_proof")),
            "po_form_unique_id": record.get("po_form_unique_id", ""),
            "consignee_unique_id": record.get("consignee_unique_id", ""),
            "unique_id": record.get("unique_id", ""),
        }

        return Response({"status": True, "data": data})


class DispatchDeliveryUpdateView(APIView):
    def post(self, request):
        delivery_date = str(request.data.get("delivery_date", "")).strip()
        dc_no = str(request.data.get("dc_no", "")).strip()
        po_form_unique_id = str(request.data.get("po_form_unique_id", "")).strip()
        consignee_unique_id = str(request.data.get("consignee_unique_id", "")).strip()

        if not (delivery_date and po_form_unique_id and consignee_unique_id and dc_no):
            return Response({"status": False, "error": "Missing required fields."}, status=status.HTTP_400_BAD_REQUEST)

        pod_obj = request.FILES.get("podfile")
        allowed_exts = {"pdf", "jpg", "jpeg", "png", "xls", "xlsx"}
        pod_file_name = ""
        pod_file_org_name = ""

        parts = dc_no.split("/")
        base_name = parts[-1] if parts else dc_no

        if pod_obj:
            ext = os.path.splitext(pod_obj.name)[1].lstrip(".").lower()
            if ext not in allowed_exts:
                return Response({"status": False, "error": "Invalid POD file type."}, status=status.HTTP_400_BAD_REQUEST)
            pod_file_name = _save_dispatch_upload(pod_obj, f"{base_name}-POD.{ext}")
            pod_file_org_name = pod_obj.name

        set_clauses = ["delivery_date = %s"]
        params = [delivery_date]
        if pod_file_name:
            set_clauses += ["pod_proof = %s", "podfile_org_name = %s"]
            params += [pod_file_name, pod_file_org_name]

        params += [po_form_unique_id, consignee_unique_id, dc_no]
        update_sql = f"""
            UPDATE dispatch_list
            SET {", ".join(set_clauses)}
            WHERE po_form_unique_id = %s
              AND consignee_unique_id = %s
              AND dc_number = %s
              AND is_delete = 0
        """

        with connection.cursor() as cur:
            cur.execute(update_sql, params)

        return Response({"status": True, "msg": "update"})


class DispatchDeliveryListView(APIView):
    def get(self, request):
        page = int(request.query_params.get("page", 1) or 1)
        length = int(request.query_params.get("length", 10) or 10)
        company_id = request_company_id(request)
        company_sql = ""
        company_params = []
        if company_id:
            company_sql = """
                  AND EXISTS (
                      SELECT 1
                      FROM po_form pf_tenant
                      WHERE pf_tenant.unique_id = dispatch_list.po_form_unique_id
                        AND pf_tenant.is_delete = 0
                        AND pf_tenant.sess_company_id = %s
                  )
            """
            company_params.append(company_id)
        with connection.cursor() as cur:
            cur.execute(
                f"""
                SELECT
                    id,
                    unique_id,
                    po_form_unique_id,
                    consignee_unique_id,
                    po_num,
                    po_date,
                    invoice_no,
                    dc_date,
                    pod_no,
                    COALESCE(einvoice_file, file_name, '') AS einvoice,
                    delivery_status,
                    delivery_date,
                    delivery_proof,
                    pod_proof,
                    invoice_auto_id,
                    invoice_date,
                    dc_number,
                    dispatch_date
                FROM dispatch_list
                WHERE is_delete = 0
                  AND status IN ('2', '3')
                  {company_sql}
                ORDER BY id DESC
                """,
                company_params,
            )
            cols = [col[0] for col in cur.description]
            all_rows = [dict(zip(cols, row)) for row in cur.fetchall()]

        filtered_rows = _apply_delivery_filters(all_rows, request.query_params)
        total = len(filtered_rows)
        offset, page_rows = _page_slice(filtered_rows, page, length)

        invoice_meta = _fetch_dispatch_invoice_meta(row.get("invoice_no") for row in page_rows)
        consignee_meta = _fetch_dispatch_consignee_meta(row.get("consignee_unique_id") for row in page_rows)
        file_meta = _fetch_dispatch_file_meta(row.get("dc_number") for row in page_rows)

        delivery_map = {"1": "yes", "2": "NO"}
        for index, row in enumerate(page_rows, start=offset + 1):
            invoice_no = str(row.get("invoice_no") or "")
            consignee_id = str(row.get("consignee_unique_id") or "")
            dc_number = str(row.get("dc_number") or "")
            row["con_address"] = consignee_meta.get(consignee_id, {}).get("con_address", "")
            row["team_member"] = invoice_meta.get(invoice_no, {}).get("team_member", "")
            row["ledger_name"] = invoice_meta.get(invoice_no, {}).get("ledger_name", "")
            row["dc_file"] = file_meta.get(dc_number, {}).get("dc_file", "")
            row["ir_file_org_name"] = file_meta.get(dc_number, {}).get("ir_file_org_name", "")
            row["invoice_file_org_name"] = file_meta.get(dc_number, {}).get("invoice_file_org_name", "")
            row["s_no"] = index
            row["po_date"] = _fmt_date(row.get("po_date"))
            row["invoice_date"] = _fmt_date(row.get("invoice_date"))
            row["dc_date"] = _fmt_date(row.get("dc_date"))
            row["delivery_date"] = _fmt_date(row.get("delivery_date"))
            row["delivery_status_text"] = delivery_map.get(str(row.get("delivery_status")), "")
            row["dc_file_url"] = _invoice_file_url(row.get("dc_file"))
            row["ir_file_url"] = _invoice_file_url(row.get("ir_file_org_name"))
            row["invoice_file_url"] = _invoice_file_url(row.get("invoice_file_org_name"))
            row["einvoice_url"] = _dispatch_file_url(row.get("einvoice"))
            row["delivery_proof_url"] = _dispatch_file_url(row.get("delivery_proof"))
            row["pod_proof_url"] = _dispatch_file_url(row.get("pod_proof"))
            row["action_mode"] = "edit"

        return Response({
            "status": True,
            "recordsTotal": total,
            "recordsFiltered": total,
            "data": page_rows,
        })


class DispatchFileView(APIView):
    def get(self, request, filename):
        path = os.path.join(settings.MEDIA_ROOT, "dispatch", filename)
        if not os.path.exists(path):
            raise Http404("File not found.")
        safe = os.path.basename(filename)
        return FileResponse(open(path, "rb"), as_attachment=False, filename=safe)


class DispatchListView(APIView):
    def get(self, request):
        qs = tenant_queryset(request, Dispatch.objects.filter(is_delete=0), include_global=False).order_by("-id")
        return Response({"status": True, "data": DispatchSerializer(qs, many=True).data})


class DispatchCreateView(APIView):
    def post(self, request):
        normalized_payload = _normalized_dispatch_payload(request)
        if _requires_einvoice_upload(normalized_payload.get("po_form_unique_id")) and not request.FILES.get("file"):
            return Response({"status": False, "message": "E Invoice file is required when GST Option is Yes."}, status=status.HTTP_400_BAD_REQUEST)
        serializer = DispatchSerializer(data=normalized_payload)
        if serializer.is_valid():
            serializer.save(**_audit_payload(request))
            return Response({"status": True, "msg": "created", "data": serializer.data}, status=status.HTTP_201_CREATED)
        return Response({"status": False, "error": serializer.errors}, status=status.HTTP_400_BAD_REQUEST)


class DispatchDetailView(APIView):
    def _get_object(self, request, unique_id):
        return tenant_queryset(request, Dispatch.objects.filter(unique_id=unique_id, is_delete=0), include_global=False).first()

    def get(self, request, unique_id):
        obj = self._get_object(request, unique_id)
        if not obj:
            return Response({"status": False, "message": "Dispatch not found."}, status=404)
        return Response({"status": True, "data": DispatchSerializer(obj).data})

    def put(self, request, unique_id):
        obj = self._get_object(request, unique_id)
        if not obj:
            return Response({"status": False, "message": "Dispatch not found."}, status=404)
        serializer = DispatchSerializer(obj, data=_normalized_dispatch_payload(request), partial=True)
        if serializer.is_valid():
            serializer.save(**_audit_payload(request))
            return Response({"status": True, "msg": "updated", "data": serializer.data})
        return Response({"status": False, "error": serializer.errors}, status=status.HTTP_400_BAD_REQUEST)

    def delete(self, request, unique_id):
        obj = self._get_object(request, unique_id)
        pending_invoice = None
        if not obj:
            with connection.cursor() as cur:
                cur.execute(
                    """
                    SELECT unique_id, form_main_unique_id, consignee_unique_id, invoice_no, dc_number
                    FROM invoice_creation_main
                    WHERE unique_id = %s
                      AND is_delete = 0
                    LIMIT 1
                    """,
                    [unique_id],
                )
                row = cur.fetchone()
            if row:
                pending_invoice = {
                    "unique_id": row[0],
                    "form_main_unique_id": row[1],
                    "consignee_unique_id": row[2],
                    "invoice_no": row[3],
                    "dc_number": row[4],
                }
            else:
                return Response({"status": False, "message": "Dispatch not found."}, status=404)
        
        # Check if bill has been created for this dispatch
        with connection.cursor() as cur:
            cur.execute("""
                SELECT bill_no FROM sign_doc_verification_detail
                WHERE invoice_no = %s AND dc_number = %s AND is_delete = 0
                LIMIT 1
            """, [(obj.invoice_no if obj else pending_invoice["invoice_no"]), (obj.dc_number if obj else pending_invoice["dc_number"])])
            bill_record = cur.fetchone()
            
            if bill_record and bill_record[0]:  # bill_no is not empty
                return Response({
                    "status": False, 
                    "message": "Cannot delete dispatch record. Bill has already been created for this record."
                }, status=400)
        
        if pending_invoice is not None:
            with transaction.atomic(), connection.cursor() as cur:
                cur.execute(
                    """
                    UPDATE invoice_creation_main
                    SET material_qc = 0,
                        material_qc_approved = '',
                        material_qc_reject_reason = ''
                    WHERE unique_id = %s
                      AND is_delete = 0
                    """,
                    [pending_invoice["unique_id"]],
                )
            return Response({"status": True, "msg": "deleted"})

        status_code = str(obj.status or "").strip()

        with transaction.atomic(), connection.cursor() as cur:
            if status_code == "1":
                cur.execute(
                    """
                    UPDATE dispatch_list
                    SET is_delete = 1
                    WHERE unique_id = %s
                      AND is_delete = 0
                    """,
                    [unique_id],
                )
            else:
                cur.execute(
                    """
                    UPDATE dispatch_list
                    SET status = '1',
                        delivery_status = '',
                        delivery_date = '',
                        delivery_proof = '',
                        file_name = '',
                        file_org_name = '',
                        pod_proof = '',
                        podfile_org_name = '',
                        rec_person_name = '',
                        rec_contact_no = '',
                        pro_rec_date = '',
                        deliv_remarks = '',
                        delv_conf_person = '',
                        delv_conf_date = ''
                    WHERE unique_id = %s
                      AND is_delete = 0
                    """,
                    [unique_id],
                )
                cur.execute(
                    """
                    UPDATE invoice_creation_main
                    SET delivery_status = 0
                    WHERE form_main_unique_id = %s
                      AND consignee_unique_id = %s
                      AND dc_number = %s
                      AND is_delete = 0
                    """,
                    [obj.po_form_unique_id, obj.consignee_unique_id, obj.dc_number],
                )
                try:
                    cur.execute(
                        """
                        UPDATE invoice_creation_main_payment_data
                        SET dispatch_delivery_status = '0',
                            delivery_date = NULL,
                            delivery_proof = '',
                            pod_proof = '',
                            status = 1
                        WHERE form_main_unique_id = %s
                          AND consignee_unique_id = %s
                          AND dc_number = %s
                        """,
                        [obj.po_form_unique_id, obj.consignee_unique_id, obj.dc_number],
                    )
                except Exception:
                    pass
        return Response({"status": True, "msg": "deleted"})

