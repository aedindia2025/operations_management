"""
Delivery confirmation API for the React frontend.

This keeps the existing route names but returns data shaped for the current
frontend screens without changing their UI structure.
"""

from __future__ import annotations

import datetime
from decimal import Decimal, InvalidOperation

from django.db import connection, transaction
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from master.apps.department.departmentmodel import DepartmentCreation
from master.apps.delivery_confirmation.delivery_confirmation_model import (
    DeliveryDcNumStatus as DcNumStatus,
    DeliveryDispatchList as DispatchList,
)
from master.tenant import request_company_id


EXECUTIVE_TYPE_UID = "69b0115ced3bd96390"
FOLLOWED_BY_USER_TYPE_UID = "65efd97b4df4040205"


def _dictfetchall(cursor):
    columns = [col[0] for col in cursor.description]
    return [dict(zip(columns, row)) for row in cursor.fetchall()]


def _fmt_display_date(value) -> str:
    if not value:
        return ""
    if isinstance(value, (datetime.date, datetime.datetime)):
        return value.strftime("%d-%m-%Y")
    text = str(value).strip()
    for fmt in ("%Y-%m-%d", "%d-%m-%Y", "%Y/%m/%d"):
        try:
            return datetime.datetime.strptime(text, fmt).strftime("%d-%m-%Y")
        except ValueError:
            continue
    return text


def _parse_date(value):
    if not value:
        return None
    if isinstance(value, (datetime.date, datetime.datetime)):
        return value.date() if isinstance(value, datetime.datetime) else value
    text = str(value).strip()
    for fmt in ("%Y-%m-%d", "%d-%m-%Y", "%d/%m/%Y", "%Y/%m/%d"):
        try:
            return datetime.datetime.strptime(text, fmt).date()
        except ValueError:
            continue
    return None


def _fmt_input_date(value) -> str:
    parsed = _parse_date(value)
    return parsed.strftime("%Y-%m-%d") if parsed else ""


def _chunked(values, size=500):
    values = list(values)
    for index in range(0, len(values), size):
        yield values[index:index + size]


def _dispatch_file_url(filename):
    name = str(filename or "").strip()
    if not name:
        return ""
    return f"/api/master/dispatch/files/{name}/"


def _department_name(value):
    text = str(value or "").strip()
    if not text:
        return ""
    try:
        item = DepartmentCreation.objects.filter(unique_id=text, is_delete=0).order_by("-id").first()
        if item:
            return item.department or text
        item = DepartmentCreation.objects.filter(empty=text, is_delete=0).order_by("-id").first()
        if item:
            return item.department or text
    except Exception:
        pass
    return text


def _staff_name(value):
    text = str(value or "").strip()
    if not text:
        return ""
    try:
        with connection.cursor() as cur:
            cur.execute(
                """
                SELECT COALESCE(staff_name, '')
                FROM user
                WHERE is_delete = 0
                  AND (staff_id = %s OR unique_id = %s)
                ORDER BY id DESC
                LIMIT 1
                """,
                [text, text],
            )
            row = cur.fetchone()
            if row and row[0]:
                return str(row[0]).strip()
    except Exception:
        pass
    return text


def _merge_meta(existing, incoming):
    existing = dict(existing or {})
    incoming = dict(incoming or {})
    return {
        "team_member_id": incoming.get("team_member_id") or existing.get("team_member_id") or "",
        "team_member_unique_id": incoming.get("team_member_unique_id") or existing.get("team_member_unique_id") or "",
        "team_member": incoming.get("team_member") or existing.get("team_member") or "",
        "ledger_name": incoming.get("ledger_name") or existing.get("ledger_name") or "",
    }


def _fetch_invoice_meta(invoice_dc_pairs):
    result = {}
    pairs = [(str(invoice_no or "").strip(), str(dc_number or "").strip()) for invoice_no, dc_number in invoice_dc_pairs]
    pairs = [(invoice_no, dc_number) for invoice_no, dc_number in pairs if invoice_no and dc_number]
    if not pairs:
        return result

    for chunk in _chunked(pairs):
        conditions = " OR ".join(["(icm.invoice_no = %s AND icm.dc_number = %s)"] * len(chunk))
        params = []
        for invoice_no, dc_number in chunk:
            params.extend([invoice_no, dc_number])
        with connection.cursor() as cur:
            cur.execute(
                f"""
                SELECT
                    icm.invoice_no,
                    icm.dc_number,
                    COALESCE(icm.team_mem, '') AS team_member_id,
                    COALESCE(u.unique_id, '') AS team_member_unique_id,
                    COALESCE(u.staff_name, '') AS team_member,
                    COALESCE(dcs.ledger_name, '') AS ledger_name
                FROM invoice_creation_main icm
                LEFT JOIN user u
                  ON (u.staff_id = icm.team_mem OR u.unique_id = icm.team_mem)
                 AND u.is_delete = 0
                LEFT JOIN department_creation_sublist dcs
                  ON dcs.unique_id = icm.ledger_name
                 AND dcs.is_delete = 0
                WHERE icm.is_delete = 0
                  AND ({conditions})
                """,
                params,
            )
            for invoice_no, dc_number, team_member_id, team_member_unique_id, team_member, ledger_name in cur.fetchall():
                key = (str(invoice_no or ""), str(dc_number or ""))
                result[key] = _merge_meta(result.get(key), {
                    "team_member_id": team_member_id or "",
                    "team_member_unique_id": team_member_unique_id or "",
                    "team_member": team_member or "",
                    "ledger_name": ledger_name or "",
                })

    missing_invoice_nos = sorted({
        invoice_no for invoice_no, dc_number in pairs
        if (invoice_no, dc_number) not in result
    })
    if not missing_invoice_nos:
        return result

    for chunk in _chunked(missing_invoice_nos):
        placeholders = ",".join(["%s"] * len(chunk))
        with connection.cursor() as cur:
            cur.execute(
                f"""
                SELECT
                    icm.invoice_no,
                    COALESCE(icm.team_mem, '') AS team_member_id,
                    COALESCE(u.unique_id, '') AS team_member_unique_id,
                    COALESCE(u.staff_name, '') AS team_member,
                    COALESCE(dcs.ledger_name, '') AS ledger_name
                FROM invoice_creation_main icm
                LEFT JOIN user u
                  ON (u.staff_id = icm.team_mem OR u.unique_id = icm.team_mem)
                 AND u.is_delete = 0
                LEFT JOIN department_creation_sublist dcs
                  ON dcs.unique_id = icm.ledger_name
                 AND dcs.is_delete = 0
                INNER JOIN (
                    SELECT MAX(id) AS max_id
                    FROM invoice_creation_main
                    WHERE is_delete = 0
                      AND invoice_no IN ({placeholders})
                    GROUP BY invoice_no
                ) latest ON latest.max_id = icm.id
                """,
                chunk,
            )
            fallback_meta = {
                str(invoice_no or ""): {
                    "team_member_id": team_member_id or "",
                    "team_member_unique_id": team_member_unique_id or "",
                    "team_member": team_member or "",
                    "ledger_name": ledger_name or "",
                }
                for invoice_no, team_member_id, team_member_unique_id, team_member, ledger_name in cur.fetchall()
            }

        for invoice_no, dc_number in pairs:
            if (invoice_no, dc_number) in result:
                continue
            if invoice_no in fallback_meta:
                result[(invoice_no, dc_number)] = _merge_meta(result.get((invoice_no, dc_number)), fallback_meta[invoice_no])
    return result


def _fetch_consignee_meta(consignee_ids):
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


def _fetch_po_customer_meta(po_form_ids):
    result = {}
    clean_values = [str(value).strip() for value in po_form_ids if str(value).strip()]
    if not clean_values:
        return result
    for chunk in _chunked(clean_values):
        placeholders = ",".join(["%s"] * len(chunk))
        with connection.cursor() as cur:
            cur.execute(
                f"""
                SELECT unique_id, COALESCE(department, '')
                FROM po_form
                WHERE is_delete = 0
                  AND unique_id IN ({placeholders})
                """,
                chunk,
            )
            for unique_id, department in cur.fetchall():
                result[str(unique_id or "")] = department or ""
    return result


def _fetch_po_display_meta(po_form_ids):
    result = {}
    clean_values = [str(value).strip() for value in po_form_ids if str(value).strip()]
    if not clean_values:
        return result
    for chunk in _chunked(clean_values):
        placeholders = ",".join(["%s"] * len(chunk))
        with connection.cursor() as cur:
            cur.execute(
                f"""
                SELECT
                    pf.unique_id,
                    COALESCE(dc.department, pf.department, '') AS department_name,
                    COALESCE(en.executive_name, u.staff_name, pf.executive_name, '') AS executive_name
                FROM po_form pf
                LEFT JOIN department_creation dc
                  ON dc.unique_id = pf.department
                 AND dc.is_delete = 0
                LEFT JOIN executive_name en
                  ON en.unique_id = pf.executive_name
                 AND en.is_delete = 0
                LEFT JOIN user u
                  ON u.unique_id = pf.executive_name
                 AND u.is_delete = 0
                WHERE pf.is_delete = 0
                  AND pf.unique_id IN ({placeholders})
                """,
                chunk,
            )
            for unique_id, department_name, executive_name in cur.fetchall():
                result[str(unique_id or "")] = {
                    "department_name": _department_name(department_name),
                    "executive_name": executive_name or "",
                }
    return result


def _fetch_executive_meta(po_form_ids):
    result = {}
    clean_values = [str(value).strip() for value in po_form_ids if str(value).strip()]
    if not clean_values:
        return result
    for chunk in _chunked(clean_values):
        placeholders = ",".join(["%s"] * len(chunk))
        with connection.cursor() as cur:
            cur.execute(
                f"""
                SELECT unique_id, COALESCE(executive_name, '')
                FROM po_form
                WHERE is_delete = 0
                  AND unique_id IN ({placeholders})
                """,
                chunk,
            )
            for unique_id, executive_name in cur.fetchall():
                result[str(unique_id or "")] = executive_name or ""
    return result


def _filter_list_rows(rows, statuses, params, user):
    allowed_statuses = {str(status) for status in statuses}
    filtered_rows = [
        row for row in rows
        if str(row.get("status") or "").strip() in allowed_statuses and str(row.get("is_delete") or "0").strip() == "0"
    ]

    from_date = _parse_date(params["from_date"])
    to_date = _parse_date(params["to_date"])
    opt = params["opt"]
    if from_date and to_date:
        def _row_date(row):
            if opt == "40":
                return _parse_date(row.get("po_date"))
            if opt == "50":
                return _parse_date(row.get("invoice_date"))
            if opt == "60":
                return _parse_date(row.get("delivery_date"))
            return None
        filtered_rows = [row for row in filtered_rows if (d := _row_date(row)) and from_date <= d <= to_date]

    pair_meta = _fetch_invoice_meta((row.get("invoice_no"), row.get("dc_number")) for row in filtered_rows)

    team_member = params["team_member"]
    if team_member and team_member.lower() != "all":
        filtered_rows = [
            row for row in filtered_rows
            if (
                (meta := pair_meta.get((str(row.get("invoice_no") or ""), str(row.get("dc_number") or "")), {})).get("team_member_id") == team_member
                or meta.get("team_member") == team_member
            )
        ]

    if params["user_type_unique_id"] == EXECUTIVE_TYPE_UID:
        executive_meta = _fetch_executive_meta(row.get("po_form_unique_id") for row in filtered_rows)
        user_unique_id = str(getattr(user, "unique_id", "") or "")
        filtered_rows = [
            row for row in filtered_rows
            if executive_meta.get(str(row.get("po_form_unique_id") or ""), "") == user_unique_id
        ]

    if params["user_type_unique_id"] == FOLLOWED_BY_USER_TYPE_UID:
        user_unique_id = str(getattr(user, "unique_id", "") or "")
        if user_unique_id:
            filtered_rows = [
                row for row in filtered_rows
                if (
                    (meta := pair_meta.get((str(row.get("invoice_no") or ""), str(row.get("dc_number") or "")), {})).get("team_member_unique_id") == user_unique_id
                    or meta.get("team_member_id") == user_unique_id
                )
            ]
        else:
            filtered_rows = []

    search = params["search"].lower()
    if search:
        consignee_meta = _fetch_consignee_meta(row.get("consignee_unique_id") for row in filtered_rows)
        filtered_rows = [
            row for row in filtered_rows
            if any(
                search in value.lower()
                for value in [
                    str(row.get("po_num") or ""),
                    str(row.get("invoice_no") or ""),
                    str(row.get("dc_number") or ""),
                    str(row.get("name_of_courier") or ""),
                    pair_meta.get((str(row.get("invoice_no") or ""), str(row.get("dc_number") or "")), {}).get("team_member", ""),
                    pair_meta.get((str(row.get("invoice_no") or ""), str(row.get("dc_number") or "")), {}).get("ledger_name", ""),
                    consignee_meta.get(str(row.get("consignee_unique_id") or ""), {}).get("con_address", ""),
                ]
                if value
            )
        ]

    deduped_rows = []
    seen = set()
    for row in filtered_rows:
        key = (
            str(row.get("po_form_unique_id") or "").strip(),
            str(row.get("consignee_unique_id") or "").strip(),
            str(row.get("invoice_no") or "").strip(),
            str(row.get("dc_number") or "").strip(),
        )
        if key in seen:
            continue
        seen.add(key)
        deduped_rows.append(row)

    return deduped_rows, pair_meta


def _parse_list_params(request):
    data = request.data if request.method.upper() == "POST" else request.query_params
    search = (
        data.get("search[value]")
        or (data.get("search", {}) or {}).get("value", "")
        if isinstance(data.get("search"), dict)
        else data.get("search", "")
    )
    return {
        "draw": int(data.get("draw", 1) or 1),
        "start": int(data.get("start", 0) or 0),
        "length": int(data.get("length", 10) or 10),
        "search": str(search or "").strip(),
        "from_date": str(data.get("from_date", "") or "").strip(),
        "to_date": str(data.get("to_date", "") or "").strip(),
        "opt": str(data.get("opt3") or data.get("opt") or "").strip(),
        "team_member": str(data.get("team_mem3") or data.get("team_member") or "").strip(),
        "user_type_unique_id": str(data.get("user_type_unique_id", "") or "").strip(),
    }


def _build_list_where(statuses, params, user):
    where = ["dl.is_delete = 0", f"dl.status IN ({','.join(['%s'] * len(statuses))})"]
    sql_params = list(statuses)

    team_member = params["team_member"]
    if team_member and team_member.lower() != "all":
        where.append(
            """(
                COALESCE((
                    SELECT icm.team_mem
                    FROM invoice_creation_main icm
                    WHERE icm.invoice_no = dl.invoice_no
                      AND icm.dc_number = dl.dc_number
                      AND icm.is_delete = 0
                    LIMIT 1
                ), '') = %s
                OR
                COALESCE((
                    SELECT u.staff_name
                    FROM user u
                    WHERE u.staff_id = (
                        SELECT icm.team_mem
                        FROM invoice_creation_main icm
                        WHERE icm.invoice_no = dl.invoice_no
                          AND icm.dc_number = dl.dc_number
                          AND icm.is_delete = 0
                        LIMIT 1
                    )
                      AND u.is_delete = 0
                    LIMIT 1
                ), '') = %s
            )"""
        )
        sql_params.extend([team_member, team_member])

    if params["user_type_unique_id"] == EXECUTIVE_TYPE_UID:
        where.append(
            """COALESCE((
                SELECT pf.executive_name
                FROM po_form pf
                WHERE pf.unique_id = dl.po_form_unique_id
                  AND pf.is_delete = 0
                LIMIT 1
            ), '') = %s"""
        )
        sql_params.append(str(getattr(user, "unique_id", "")))

    from_date = params["from_date"]
    to_date = params["to_date"]
    opt = params["opt"]
    if from_date and to_date:
        if opt == "40":
            where.append("DATE(dl.po_date) BETWEEN %s AND %s")
            sql_params.extend([from_date, to_date])
        elif opt == "50":
            where.append("DATE(dl.invoice_date) BETWEEN %s AND %s")
            sql_params.extend([from_date, to_date])
        elif opt == "60":
            where.append("DATE(dl.delivery_date) BETWEEN %s AND %s")
            sql_params.extend([from_date, to_date])

    search = params["search"]
    if search:
        like = f"%{search}%"
        where.append(
            """(
                dl.po_num LIKE %s
                OR dl.invoice_no LIKE %s
                OR dl.dc_number LIKE %s
                OR dl.name_of_courier LIKE %s
                OR COALESCE((
                    SELECT u.staff_name
                    FROM user u
                    WHERE u.staff_id = (
                        SELECT icm.team_mem
                        FROM invoice_creation_main icm
                        WHERE icm.invoice_no = dl.invoice_no
                          AND icm.dc_number = dl.dc_number
                          AND icm.is_delete = 0
                        LIMIT 1
                    )
                      AND u.is_delete = 0
                    LIMIT 1
                ), '') LIKE %s
                OR COALESCE((
                    SELECT icm.ledger_name
                    FROM invoice_creation_main icm
                    WHERE icm.invoice_no = dl.invoice_no
                      AND icm.dc_number = dl.dc_number
                      AND icm.is_delete = 0
                    LIMIT 1
                ), '') LIKE %s
            )"""
        )
        sql_params.extend([like, like, like, like, like, like])

    return " AND ".join(where), sql_params


def _fetch_list_rows(statuses, params, user, company_id=""):
    company_join = ""
    sql_params = []
    if company_id:
        company_join = """
            INNER JOIN po_form pf_tenant
              ON pf_tenant.unique_id = dl.po_form_unique_id
             AND pf_tenant.is_delete = 0
             AND pf_tenant.sess_company_id = %s
        """
        sql_params.append(company_id)

    with connection.cursor() as cur:
        cur.execute(
            f"""
            SELECT
                dl.unique_id,
                dl.po_form_unique_id,
                dl.consignee_unique_id,
                dl.dc_number,
                dl.po_num,
                dl.po_date,
                dl.invoice_no,
                dl.invoice_date,
                dl.dc_date,
                dl.name_of_courier,
                dl.mode_of_delivery,
                dl.delivery_date,
                dl.file_name,
                dl.delivery_proof,
                dl.status,
                dl.con_address,
                dl.is_delete
            FROM dispatch_list dl
            {company_join}
            ORDER BY dl.status DESC, dl.created DESC
            """,
            sql_params,
        )
        rows = _dictfetchall(cur)

    unique_rows = []
    seen_ids = set()
    for row in rows:
        unique_id = str(row.get("unique_id") or "").strip()
        if unique_id and unique_id in seen_ids:
            continue
        if unique_id:
            seen_ids.add(unique_id)
        unique_rows.append(row)

    filtered_rows, pair_meta = _filter_list_rows(unique_rows, statuses, params, user)
    total = len(filtered_rows)
    start = params["start"]
    length = params["length"]
    page_rows = filtered_rows[start:] if length == -1 else filtered_rows[start:start + length]
    consignee_meta = _fetch_consignee_meta(row.get("consignee_unique_id") for row in page_rows)
    po_customer_meta = _fetch_po_customer_meta(row.get("po_form_unique_id") for row in page_rows)
    po_display_meta = _fetch_po_display_meta(row.get("po_form_unique_id") for row in page_rows)

    mapped = []
    for idx, row in enumerate(page_rows, start=start + 1):
        pair_key = (str(row.get("invoice_no") or ""), str(row.get("dc_number") or ""))
        meta = pair_meta.get(pair_key, {})
        mode_code = str(row.get("mode_of_delivery") or "").strip()
        mode_label = "Hand" if mode_code == "1" else "Courier" if mode_code == "2" else mode_code
        status_code = str(row.get("status") or "").strip()
        status_label = "Completed" if status_code == "3" else "Not Delivered" if status_code == "5" else "Pending"
        con_address = consignee_meta.get(str(row.get("consignee_unique_id") or ""), {}).get("con_address") or str(row.get("con_address") or "")
        customer_name = (
            str(meta.get("ledger_name") or "").strip()
            or str(po_display_meta.get(str(row.get("po_form_unique_id") or ""), {}).get("department_name", "") or "").strip()
            or str(po_customer_meta.get(str(row.get("po_form_unique_id") or ""), "") or "").strip()
        )
        location_parts = [customer_name, str(con_address).strip()]
        location = "\n".join([part for part in location_parts if part])
        delivery_mode_parts = [str(row.get("name_of_courier") or "").strip(), mode_label]
        delivery_mode = "\n".join([part for part in delivery_mode_parts if part])
        followed_by = (
            str(meta.get("team_member") or "").strip()
            or str(po_display_meta.get(str(row.get("po_form_unique_id") or ""), {}).get("executive_name", "") or "").strip()
        )

        mapped.append(
            {
                "id": row.get("unique_id", ""),
                "s_no": idx,
                "po_form_unique_id": row.get("po_form_unique_id", ""),
                "consignee_unique_id": row.get("consignee_unique_id", ""),
                "dc_number": row.get("dc_number", ""),
                "poNo": row.get("po_num", ""),
                "poDate": _fmt_display_date(row.get("po_date")),
                "location": location,
                "followedBy": followed_by,
                "followedById": meta.get("team_member_id", ""),
                "invoice": row.get("invoice_no", ""),
                "invoiceDate": _fmt_display_date(row.get("invoice_date")),
                "dc": row.get("dc_number", ""),
                "dcDate": _fmt_display_date(row.get("dc_date")),
                "deliveryMode": delivery_mode,
                "deliveryDate": _fmt_display_date(row.get("delivery_date")),
                "hasAttachment": bool(row.get("file_name") or row.get("delivery_proof")),
                "attachmentName": row.get("file_name") or row.get("delivery_proof") or "",
                "attachmentUrl": _dispatch_file_url(row.get("file_name") or row.get("delivery_proof")),
                "status": status_label,
            }
        )

    deduped_mapped = []
    seen_mapped = set()
    for row in mapped:
        key = str(row.get("id") or "").strip() or "|".join(
            [
                str(row.get("po_form_unique_id") or "").strip(),
                str(row.get("consignee_unique_id") or "").strip(),
                str(row.get("invoice") or "").strip(),
                str(row.get("dc_number") or row.get("dc") or "").strip(),
            ]
        )
        if key in seen_mapped:
            continue
        seen_mapped.add(key)
        deduped_mapped.append(row)

    for idx, row in enumerate(deduped_mapped, start=start + 1):
        row["s_no"] = idx

    return len(deduped_mapped) if length == -1 else total, deduped_mapped


def _get_customer_detail(po_form_unique_id: str) -> dict:
    if not po_form_unique_id:
        return {}
    try:
        with connection.cursor() as cur:
            cur.callproc("GetCustomerDetailByponum", [po_form_unique_id])
            if not cur.description:
                return {}
            rows = _dictfetchall(cur)
            return rows[0] if rows else {}
    except Exception:
        return {}


def _to_decimal(value) -> Decimal:
    try:
        return Decimal(str(value or "0"))
    except (InvalidOperation, ValueError, TypeError):
        return Decimal("0")


def _map_form_status(code: str) -> str:
    code = str(code or "").strip()
    if code == "3":
        return "Confirmation"
    if code == "5":
        return "Not_deliverd"
    return "Pending"


def _get_dispatch_detail(dispatch_unique_id: str):
    with connection.cursor() as cur:
        cur.execute(
            """
            SELECT
                dl.unique_id,
                dl.po_form_unique_id,
                dl.po_num,
                dl.po_date,
                dl.invoice_no,
                dl.invoice_date,
                dl.invoice_auto_id,
                dl.dc_number,
                dl.dc_date,
                dl.consignee,
                dl.consignee_unique_id,
                dl.dispatch_date,
                dl.delivery_date,
                dl.mode_of_delivery,
                dl.name_of_courier,
                dl.file_name,
                dl.delivery_proof,
                dl.status,
                dl.rec_person_name,
                dl.rec_contact_no,
                dl.pro_rec_date,
                dl.deliv_remarks,
                dl.delv_conf_date,
                dl.delv_conf_person,
                pf.department AS po_department,
                COALESCE(pd.district_name, pf.district, '') AS po_district,
                COALESCE(ps.state_name, pf.state_name, '') AS po_state_name,
                COALESCE(pf.bill_address, '') AS po_bill_address,
                pf.contact_name AS po_contact_name,
                pf.contact_number AS po_contact_number,
                pf.email AS po_email,
                cds.con_contact_name,
                cds.con_contact_number,
                cds.con_address,
                cds.con_branch,
                cds.billing_address,
                cds.con_district,
                cds.con_state_name,
                cds.con_pincode
            FROM dispatch_list dl
            LEFT JOIN po_form pf
              ON pf.unique_id = dl.po_form_unique_id
             AND pf.is_delete = 0
            LEFT JOIN district_creation pd
              ON pd.unique_id = pf.district
             AND pd.is_delete = 0
            LEFT JOIN state_creation ps
              ON ps.unique_id = pf.state_name
             AND ps.is_delete = 0
            LEFT JOIN consignee_details_sub cds
              ON cds.unique_id = dl.consignee_unique_id
             AND cds.is_delete = 0
            WHERE dl.unique_id = %s
              AND dl.is_delete = 0
            LIMIT 1
            """,
            [dispatch_unique_id],
        )
        rows = _dictfetchall(cur)
        return rows[0] if rows else None


def _get_dispatch_items(po_form_unique_id: str, consignee_unique_id: str, dc_number: str):
    with connection.cursor() as cur:
        cur.execute(
            """
            SELECT unique_id, item_code, product, invoice_qty, invoice_qty_value
            FROM invoice_creation
            WHERE po_unique_id = %s
              AND consignee_id = %s
              AND dc_num = %s
              AND is_delete = 0
            ORDER BY id ASC
            """,
            [po_form_unique_id, consignee_unique_id, dc_number],
        )
        rows = _dictfetchall(cur)

    items = []
    for idx, row in enumerate(rows, start=1):
        invoice_value = _to_decimal(row.get("invoice_qty_value")).quantize(Decimal("0.01"))
        items.append(
            {
                "id": idx,
                "itemName": row.get("item_code") or "",
                "itemDesc": row.get("product") or "",
                "dcQty": int(row.get("invoice_qty") or 0),
                "invoiceValue": float(invoice_value),
            }
        )
    return items


class PendingDeliveryListView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        params = _parse_list_params(request)
        total, rows = _fetch_list_rows(["2"], params, request.user, request_company_id(request))
        return Response(
            {
                "draw": params["draw"],
                "recordsTotal": total,
                "recordsFiltered": total,
                "data": rows,
            },
            status=status.HTTP_200_OK,
        )


class CompletedDeliveryListView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        params = _parse_list_params(request)
        total, rows = _fetch_list_rows(["3", "5"], params, request.user, request_company_id(request))
        return Response(
            {
                "draw": params["draw"],
                "recordsTotal": total,
                "recordsFiltered": total,
                "data": rows,
            },
            status=status.HTTP_200_OK,
        )


class DispatchDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, unique_id):
        # Prefer direct dispatch record lookup for the React form.
        detail = _get_dispatch_detail(unique_id)

        # Backward-compatible fallback: treat the URL segment as po_form_unique_id
        # if the old query-string style is still used.
        if detail is None:
            consignee_unique_id = request.query_params.get("consignee_unique_id", "")
            dc_number = request.query_params.get("dc_number", "")
            if consignee_unique_id and dc_number:
                try:
                    obj = DispatchList.objects.get(
                        po_form_unique_id=unique_id,
                        consignee_unique_id=consignee_unique_id,
                        dc_number=dc_number,
                        is_delete=0,
                    )
                    detail = _get_dispatch_detail(obj.unique_id)
                except DispatchList.DoesNotExist:
                    detail = None

        if detail is None:
            return Response(
                {"status": False, "error": "Record not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        mode_code = str(detail.get("mode_of_delivery") or "").strip()
        mode_label = "Hand" if mode_code == "1" else "Courier" if mode_code == "2" else mode_code
        courier = str(detail.get("name_of_courier") or "").strip()
        customer_name = _department_name(detail.get("po_department")) or str(detail.get("po_contact_name") or "").strip()
        customer_address = ", ".join(
            [
                part
                for part in [
                    str(detail.get("po_bill_address") or "").strip(),
                    str(detail.get("po_district") or "").strip(),
                    str(detail.get("po_state_name") or "").strip(),
                ]
                if part
            ]
        )
        consignee_address = "\n".join(
            [part for part in [str(detail.get("con_branch") or "").strip(), str(detail.get("con_address") or "").strip()] if part]
        )
        consignee_meta = str(detail.get("billing_address") or "").strip()
        if consignee_meta:
            consignee_meta = f"Billing Address: {consignee_meta}"
        else:
            consignee_meta = ", ".join(
                [part for part in [str(detail.get("con_district") or "").strip(), str(detail.get("con_state_name") or "").strip()] if part]
            ) + (f". Pin-{detail.get('con_pincode', '')}" if detail.get("con_pincode") else "")

        data = {
            "uniqueId": detail.get("unique_id", ""),
            "poFormUniqueId": detail.get("po_form_unique_id", ""),
            "consigneeUniqueId": detail.get("consignee_unique_id", ""),
            "dcNumber": detail.get("dc_number", ""),
            "customerName": customer_name,
            "customerAddress": customer_address,
            "customerPhone": detail.get("con_contact_number", "") or detail.get("po_contact_number", ""),
            "customerEmail": detail.get("po_email", ""),
            "consigneeName": detail.get("consignee") or detail.get("con_contact_name") or "",
            "consigneeAddress": consignee_address,
            "consigneePhone": detail.get("con_contact_number", ""),
            "consigneeCity": consignee_meta,
            "poNumber": detail.get("po_num", ""),
            "poDate": _fmt_display_date(detail.get("po_date")),
            "invoiceNo": detail.get("invoice_no", ""),
            "invoiceDate": _fmt_display_date(detail.get("invoice_date")),
            "dcNo": detail.get("dc_number", ""),
            "dcDate": _fmt_display_date(detail.get("dc_date")),
            "deliveryMode": " - ".join([part for part in [courier, mode_label] if part]),
            "deliveryDate": _fmt_display_date(detail.get("delivery_date")),
            "deliveryProof": detail.get("file_name") or detail.get("delivery_proof") or None,
            "deliveryProofUrl": _dispatch_file_url(detail.get("file_name") or detail.get("delivery_proof")),
            "items": _get_dispatch_items(
                detail.get("po_form_unique_id", ""),
                detail.get("consignee_unique_id", ""),
                detail.get("dc_number", ""),
            ),
            "deliveryConfirmationStatus": _map_form_status(detail.get("status", "")),
            "remarks": detail.get("deliv_remarks", "") or "",
            "deliveryConfirmedBy": _staff_name(detail.get("delv_conf_person", "")),
            "deliveryConfirmationDate": _fmt_display_date(detail.get("delv_conf_date")),
            "personName": detail.get("rec_person_name", "") or "",
            "contactNo": detail.get("rec_contact_no", "") or "",
            "productReceivedDate": _fmt_input_date(detail.get("pro_rec_date")),
        }

        return Response({"status": True, "data": data}, status=status.HTTP_200_OK)

    def post(self, request, unique_id):
        obj = DispatchList.objects.filter(unique_id=unique_id, is_delete=0).first()
        if obj is None:
            return Response(
                {"status": False, "msg": "error", "error": "Record not found."},
                status=status.HTTP_404_NOT_FOUND,
            )
        if str(obj.status or "").strip() == "3":
            return Response(
                {"status": False, "msg": "error", "error": "Completed delivery confirmations are view only."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        status_value = str(
            request.data.get("deliveryConfirmationStatus")
            or request.data.get("delivery_confirmation_status")
            or ""
        ).strip()
        remarks_value = str(
            request.data.get("remarks")
            or request.data.get("rejected_reason")
            or request.data.get("rejectedReason")
            or ""
        ).strip()
        person_name = str(
            request.data.get("personName")
            or request.data.get("person_name")
            or ""
        ).strip()
        contact_no = str(
            request.data.get("contactNo")
            or request.data.get("contact_no")
            or ""
        ).strip()
        product_received_date = _parse_date(
            request.data.get("productReceivedDate")
            or request.data.get("product_received_date")
            or request.data.get("pro_rec_date")
            or ""
        )

        if status_value not in {"Pending", "Confirmation", "Not_deliverd"}:
            return Response(
                {
                    "status": False,
                    "msg": "error",
                    "error": {"deliveryConfirmationStatus": "Select a valid delivery confirmation status."},
                },
                status=status.HTTP_400_BAD_REQUEST,
            )
        if status_value in {"Confirmation", "Not_deliverd"}:
            errors = {}
            if not contact_no:
                errors["contactNo"] = "Contact number is required."
            if not product_received_date:
                errors["productReceivedDate"] = "Product received date is required."
            if errors:
                return Response(
                    {"status": False, "msg": "error", "error": errors},
                    status=status.HTTP_400_BAD_REQUEST,
                )

        status_code = {"Pending": "2", "Confirmation": "3", "Not_deliverd": "5"}[status_value]
        today = datetime.date.today()
        staff_id = str(getattr(request.user, "staff_id", "") or getattr(request.user, "pk", ""))
        remarks = remarks_value if status_value in {"Confirmation", "Not_deliverd"} else ""
        person_name = person_name if status_value in {"Confirmation", "Not_deliverd"} else ""
        contact_no = contact_no if status_value in {"Confirmation", "Not_deliverd"} else ""
        product_received_date = product_received_date if status_value in {"Confirmation", "Not_deliverd"} else None

        DispatchList.objects.filter(unique_id=unique_id, is_delete=0).update(
            status=status_code,
            rec_person_name=person_name,
            rec_contact_no=contact_no,
            pro_rec_date=product_received_date,
            deliv_remarks=remarks,
            delv_conf_date=today if status_value in {"Confirmation", "Not_deliverd"} else None,
            delv_conf_person=staff_id if status_value in {"Confirmation", "Not_deliverd"} else "",
        )
        DcNumStatus.objects.filter(dc_number=obj.dc_number).update(
            delv_conf_status=status_code,
            delv_conf_date=today if status_value in {"Confirmation", "Not_deliverd"} else None,
        )

        return Response(
            {
                "status": True,
                "msg": "update",
                "data": {"deliveryConfirmationStatus": status_value},
            },
            status=status.HTTP_200_OK,
        )

    def delete(self, request, unique_id):
        obj = DispatchList.objects.filter(unique_id=unique_id, is_delete=0).first()
        if obj is None:
            return Response(
                {"status": False, "msg": "error", "error": "Record not found."},
                status=status.HTTP_404_NOT_FOUND,
            )
        if str(obj.status or "").strip() == "3":
            return Response(
                {"status": False, "msg": "error", "error": "Completed delivery confirmations cannot be deleted."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        
        # Check if bill has been created for this delivery
        with connection.cursor() as cur:
            cur.execute("""
                SELECT bill_no FROM sign_doc_verification_detail
                WHERE invoice_no = %s AND dc_number = %s AND is_delete = 0
                LIMIT 1
            """, [obj.invoice_no, obj.dc_number])
            bill_record = cur.fetchone()
            
            if bill_record and bill_record[0]:  # bill_no is not empty
                return Response({
                    "status": False, 
                    "msg": "error",
                    "error": "Cannot delete delivery confirmation record. Bill has already been created for this record."
                }, status=status.HTTP_400_BAD_REQUEST)
        
        with transaction.atomic():
            DispatchList.objects.filter(unique_id=unique_id, is_delete=0).update(
                status="2",
                rec_person_name="",
                rec_contact_no="",
                pro_rec_date="",
                deliv_remarks="",
                delv_conf_person="",
                delv_conf_date=None,
            )
            DcNumStatus.objects.filter(dc_number=obj.dc_number).update(
                delv_conf_status="2",
                delv_conf_date=None,
            )
        
        return Response(
            {"status": True, "msg": "success_delete", "data": []},
            status=status.HTTP_200_OK,
        )


class DeliveryConfirmView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        unique_id = str(request.data.get("unique_id", "")).strip()
        if not unique_id:
            return Response(
                {"status": False, "msg": "error", "error": {"unique_id": "Required."}},
                status=status.HTTP_400_BAD_REQUEST,
            )
        return DispatchDetailView().post(request, unique_id)


class DeliveryBulkConfirmView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        records = request.data.get("records", [])
        if not isinstance(records, list) or not records:
            return Response(
                {"status": False, "msg": "error", "error": {"records": "At least one record must be selected."}},
                status=status.HTTP_400_BAD_REQUEST,
            )

        person_name = str(
            request.data.get("personName")
            or request.data.get("person_name")
            or ""
        ).strip()
        contact_no = str(
            request.data.get("contactNo")
            or request.data.get("contact_no")
            or ""
        ).strip()
        remarks = str(
            request.data.get("remarks")
            or request.data.get("rejectedReason")
            or ""
        ).strip()
        product_received_date = _parse_date(
            request.data.get("productReceivedDate")
            or request.data.get("product_received_date")
            or request.data.get("pro_rec_date")
            or ""
        )
        errors = {}
        if not contact_no:
            errors["contactNo"] = "Contact number is required."
        if not product_received_date:
            errors["productReceivedDate"] = "Product received date is required."
        if errors:
            return Response(
                {"status": False, "msg": "error", "error": errors},
                status=status.HTTP_400_BAD_REQUEST,
            )

        today = datetime.date.today()
        staff_id = str(getattr(request.user, "staff_id", "") or getattr(request.user, "pk", ""))
        success_count = 0

        for record in records:
            unique_id = str(record.get("unique_id") or record.get("id") or "").strip()
            if not unique_id:
                continue
            dispatch = DispatchList.objects.filter(unique_id=unique_id, is_delete=0).first()
            if dispatch is None:
                continue
            updated = DispatchList.objects.filter(unique_id=unique_id, is_delete=0).update(
                status="3",
                rec_person_name=person_name,
                rec_contact_no=contact_no,
                pro_rec_date=product_received_date,
                deliv_remarks=remarks,
                delv_conf_date=today,
                delv_conf_person=staff_id,
            )
            if updated:
                DcNumStatus.objects.filter(dc_number=dispatch.dc_number).update(
                    delv_conf_status="3",
                    delv_conf_date=today,
                )
                success_count += 1

        if success_count == 0:
            return Response(
                {"status": False, "msg": "error", "error": "No records updated."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        return Response(
            {"status": True, "msg": "Approved successfully", "success_count": success_count},
            status=status.HTTP_200_OK,
        )
