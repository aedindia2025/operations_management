import json
import uuid
from datetime import datetime

from django.db import connection, transaction
from master.apps.user_permission.userpermissionmodel import UserPermission
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView
from master.tenant import request_company_id


def _uid():
    return uuid.uuid4().hex[:18]


def _safe_int(value, default=0):
    try:
        if value in (None, ""):
            return default
        return int(float(str(value)))
    except (TypeError, ValueError):
        return default


def _safe_float(value, default=0.0):
    try:
        if value in (None, ""):
            return default
        return float(str(value).replace(",", ""))
    except (TypeError, ValueError):
        return default


def _normalize_date(value):
    raw = str(value or "").strip()
    if not raw:
        return ""
    if len(raw) == 10 and raw[4] == "-" and raw[7] == "-":
        return raw
    if len(raw) == 10 and raw[2] == "-" and raw[5] == "-":
        dd, mm, yyyy = raw.split("-")
        return f"{yyyy}-{mm}-{dd}"
    return raw


def _format_date_display(value):
    if value in (None, ""):
        return "-"
    if hasattr(value, "strftime"):
        return value.strftime("%d-%m-%Y")
    raw = str(value).strip()
    if len(raw) >= 10 and raw[4] == "-" and raw[7] == "-":
        yyyy, mm, dd = raw[:10].split("-")
        return f"{dd}-{mm}-{yyyy}"
    if len(raw) >= 10 and raw[2] == "-" and raw[5] == "-":
        return raw[:10]
    return raw or "-"


def _fetch_all_dict(sql, params=None):
    with connection.cursor() as cursor:
        cursor.execute(sql, params or [])
        cols = [col[0] for col in cursor.description]
        return [dict(zip(cols, row)) for row in cursor.fetchall()]


def _fetch_one_dict(sql, params=None):
    rows = _fetch_all_dict(sql, params)
    return rows[0] if rows else None


def _table_columns(table_name):
    try:
        with connection.cursor() as cursor:
            cursor.execute(f"SHOW COLUMNS FROM `{table_name}`")
            return {row[0] for row in cursor.fetchall()}
    except Exception:
        return set()


def _consignee_team_member(consignee_unique_id):
    unique_id = str(consignee_unique_id or "").strip()
    if not unique_id:
        return ""
    row = _fetch_one_dict(
        """
        SELECT COALESCE(NULLIF(assign_team_member, ''), NULLIF(team_mem, '')) AS team_mem
        FROM consignee_details_sub
        WHERE unique_id = %s AND is_delete = 0
        ORDER BY id DESC
        LIMIT 1
        """,
        [unique_id],
    )
    return str((row or {}).get("team_mem") or "").strip()


def _datatable_response(draw, total, data):
    return {"draw": int(draw), "recordsTotal": int(total), "recordsFiltered": int(total), "data": data}


def _next_invoice_auto_id():
    prefix = datetime.now().strftime("INV-%y%m-")
    with connection.cursor() as cur:
        cur.execute("SELECT COUNT(*) FROM invoice_creation_main WHERE invoice_auto_id LIKE %s", [f"{prefix}%"])
        count = int(cur.fetchone()[0] or 0) + 1
    return f"{prefix}{count:04d}"


def _next_assign_stock_id():
    prefix = datetime.now().strftime("ASK-%y%m-")
    with connection.cursor() as cur:
        cur.execute("SELECT COUNT(*) FROM invoice_creation_main WHERE assign_stock_id LIKE %s", [f"{prefix}%"])
        count = int(cur.fetchone()[0] or 0) + 1
    return f"{prefix}{count:04d}"


def _get_action_ids(screen_id, user_type):
    if not screen_id or not user_type:
        return set()
    return set(
        UserPermission.objects.filter(
            is_delete=0,
            screen_unique_id=screen_id,
            user_type=user_type,
        ).values_list("action_unique_id", flat=True)
    )


class ConsigneeStockAPIView(APIView):
    def _pending_query(self, search, from_date, to_date, start, length, screen_id, user_type, company_id=""):
        invoice_qty_expr = (
            "COALESCE((SELECT SUM(icm.invoice_qty) "
            "FROM invoice_creation_main icm "
            "WHERE icm.form_main_unique_id = spm.form_main_unique_id "
            "AND icm.stock_id = spm.stock_id "
            "AND icm.is_delete = 0), 0)"
        )
        where_clauses = [
            "spm.is_delete = 0",
            "COALESCE(spm.status, 0) != 2",
            f"COALESCE(spm.stock_qty, 0) > {invoice_qty_expr}",
        ]
        params = []
        if company_id:
            where_clauses.append("po.sess_company_id = %s")
            params.append(company_id)
        if from_date and to_date:
            where_clauses.append("DATE(spm.po_date) BETWEEN %s AND %s")
            params.extend([from_date, to_date])
        if search:
            where_clauses.append(
                "("
                "po.po_num LIKE %s OR "
                "po.department LIKE %s OR "
                "dc.department LIKE %s OR "
                "po.executive_name LIKE %s OR "
                "en.executive_name LIKE %s OR "
                "spm.stock_id LIKE %s)"
            )
            term = f"%{search}%"
            params.extend([term, term, term, term, term, term])
        where_sql = " AND ".join(where_clauses)
        base_sql = f"""
            SELECT spm.id, spm.form_main_unique_id, spm.stock_id, spm.stock_date, po.po_num,
                   get_po_date(spm.form_main_unique_id) AS po_date,
                   COALESCE(NULLIF(dc.department, ''), NULLIF(po.department, '')) AS department,
                   COALESCE(NULLIF(en.executive_name, ''), NULLIF(po.executive_name, '')) AS executive_name,
                   spm.no_of_item,
                   COALESCE((SELECT SUM(sps.item_qty) FROM stock_position_sublist sps
                             WHERE sps.stock_id = spm.stock_id AND sps.is_delete = 0), 0) AS item_qty,
                   COALESCE(get_remaining_stock_qty(spm.stock_id), 0) AS remaining_qty,
                   spm.stock_qty,
                   COALESCE((SELECT SUM(icm.invoice_qty) FROM invoice_creation_main icm
                             WHERE icm.form_main_unique_id = spm.form_main_unique_id
                               AND icm.is_delete = 0 AND icm.stock_id = spm.stock_id), 0) AS invoice_qty,
                   spm.stock_value,
                   COALESCE((SELECT SUM(spm2.billed_qty) FROM stock_position_main spm2
                             WHERE spm2.form_main_unique_id = spm.form_main_unique_id
                               AND spm2.is_delete = 0), 0) AS billed_qty,
                   COALESCE(NULLIF(dist.district_name, ''), NULLIF(po.district, '')) AS district_name,
                   COALESCE(NULLIF(sc.state_name, ''), NULLIF(po.state_name, '')) AS state_name,
                   spm.status
            FROM stock_position_main spm
            LEFT JOIN po_form po ON po.unique_id = spm.form_main_unique_id AND po.is_delete = 0
            LEFT JOIN department_creation dc ON dc.unique_id = po.department AND dc.is_delete = 0
            LEFT JOIN executive_name en ON en.unique_id = po.executive_name AND en.is_delete = 0
            LEFT JOIN state_creation sc ON sc.unique_id = po.state_name AND sc.is_delete = 0
            LEFT JOIN district_creation dist ON dist.unique_id = po.district AND dist.is_delete = 0
            WHERE {where_sql}
            ORDER BY spm.id DESC
        """
        total = _fetch_all_dict(f"SELECT COUNT(*) AS total FROM ({base_sql}) base_rows", params)[0]["total"]
        query_params = list(params)
        if length != -1:
            base_sql += " LIMIT %s OFFSET %s"
            query_params.extend([length, start])
        rows = _fetch_all_dict(base_sql, query_params)
        action_ids = _get_action_ids(screen_id, user_type)
        allow_edit = "5f88082b25ec031952" in action_ids
        special_user = str(user_type or "") == "65deef78ba17d65741"
        data = []
        for index, row in enumerate(rows, start=start + 1):
            invoice_qty = _safe_int(row.get("invoice_qty"))
            stock_qty = _safe_int(row.get("stock_qty"))
            item_qty = _safe_int(row.get("item_qty"))
            remain_qty = max(stock_qty - invoice_qty, 0)
            action_mode = ""
            if special_user:
                action_mode = "edit" if allow_edit else ""
            elif invoice_qty == stock_qty:
                action_mode = "view"
            elif allow_edit:
                action_mode = "edit"
            data.append({
                "s_no": index,
                "id": row.get("form_main_unique_id") or "",
                "form_main_unique_id": row.get("form_main_unique_id") or "",
                "stock_id": row.get("stock_id") or "",
                "stock_date": row.get("stock_date"),
                "po_num": row.get("po_num") or "",
                "po_date": row.get("po_date"),
                "department": row.get("department") or "",
                "executive_name": row.get("executive_name") or "",
                "customer_name": row.get("department") or "",
                "customer_location": ", ".join([x for x in [row.get("district_name"), row.get("state_name")] if x]),
                "no_of_item": _safe_int(row.get("no_of_item")),
                "item_qty": item_qty,
                "order_qty": item_qty,
                "remaining_qty": _safe_int(row.get("remaining_qty")),
                "stock_qty": stock_qty,
                "invoice_qty": invoice_qty,
                "remain_qty": remain_qty,
                "balance_qty": remain_qty,
                "billed_qty": _safe_int(row.get("billed_qty")),
                "stock_value": _safe_float(row.get("stock_value")),
                "status": "Completed" if stock_qty == invoice_qty else "Pending",
                "action_mode": action_mode,
            })
        return total, data

    def _completed_query(self, search, from_date, to_date, start, length, company_id=""):
        invoice_qty_expr = (
            "COALESCE((SELECT SUM(icm.invoice_qty) "
            "FROM invoice_creation_main icm "
            "WHERE icm.form_main_unique_id = spm.form_main_unique_id "
            "AND icm.stock_id = spm.stock_id "
            "AND icm.is_delete = 0), 0)"
        )
        where_clauses = [
            "spm.is_delete = 0",
            "COALESCE(spm.stock_qty, 0) > 0",
            f"COALESCE(spm.stock_qty, 0) <= {invoice_qty_expr}",
        ]
        params = []
        if company_id:
            where_clauses.append("po.sess_company_id = %s")
            params.append(company_id)
        if from_date and to_date:
            where_clauses.append("DATE(spm.po_date) BETWEEN %s AND %s")
            params.extend([from_date, to_date])
        if search:
            where_clauses.append(
                "("
                "po.po_num LIKE %s OR "
                "po.department LIKE %s OR "
                "dc.department LIKE %s OR "
                "po.executive_name LIKE %s OR "
                "en.executive_name LIKE %s OR "
                "spm.stock_id LIKE %s)"
            )
            term = f"%{search}%"
            params.extend([term, term, term, term, term, term])
        where_sql = " AND ".join(where_clauses)
        base_sql = f"""
            SELECT spm.id, spm.form_main_unique_id, spm.stock_id, spm.stock_date, po.po_num,
                   get_po_date(spm.form_main_unique_id) AS po_date,
                   COALESCE(NULLIF(dc.department, ''), NULLIF(po.department, '')) AS department,
                   COALESCE(NULLIF(en.executive_name, ''), NULLIF(po.executive_name, '')) AS executive_name,
                   spm.no_of_item,
                   COALESCE((SELECT SUM(sps.item_qty) FROM stock_position_sublist sps
                             WHERE sps.stock_id = spm.stock_id AND sps.is_delete = 0), 0) AS item_qty,
                   COALESCE(get_remaining_stock_qty(spm.stock_id), 0) AS remaining_qty,
                   spm.stock_qty,
                   COALESCE((SELECT SUM(icm.invoice_qty) FROM invoice_creation_main icm
                             WHERE icm.form_main_unique_id = spm.form_main_unique_id
                               AND icm.is_delete = 0 AND icm.stock_id = spm.stock_id), 0) AS invoice_qty,
                   spm.stock_value,
                   COALESCE((SELECT SUM(spm2.billed_qty) FROM stock_position_main spm2
                             WHERE spm2.form_main_unique_id = spm.form_main_unique_id
                               AND spm2.is_delete = 0), 0) AS billed_qty,
                   COALESCE(NULLIF(dist.district_name, ''), NULLIF(po.district, '')) AS district_name,
                   COALESCE(NULLIF(sc.state_name, ''), NULLIF(po.state_name, '')) AS state_name
            FROM stock_position_main spm
            LEFT JOIN po_form po ON po.unique_id = spm.form_main_unique_id AND po.is_delete = 0
            LEFT JOIN department_creation dc ON dc.unique_id = po.department AND dc.is_delete = 0
            LEFT JOIN executive_name en ON en.unique_id = po.executive_name AND en.is_delete = 0
            LEFT JOIN state_creation sc ON sc.unique_id = po.state_name AND sc.is_delete = 0
            LEFT JOIN district_creation dist ON dist.unique_id = po.district AND dist.is_delete = 0
            WHERE {where_sql}
            ORDER BY spm.id DESC
        """
        total = _fetch_all_dict(f"SELECT COUNT(*) AS total FROM ({base_sql}) base_rows", params)[0]["total"]
        query_params = list(params)
        if length != -1:
            base_sql += " LIMIT %s OFFSET %s"
            query_params.extend([length, start])
        rows = _fetch_all_dict(base_sql, query_params)
        data = []
        for index, row in enumerate(rows, start=start + 1):
            invoice_qty = _safe_int(row.get("invoice_qty"))
            stock_qty = _safe_int(row.get("stock_qty"))
            item_qty = _safe_int(row.get("item_qty"))
            data.append({
                "s_no": index,
                "id": row.get("form_main_unique_id") or "",
                "form_main_unique_id": row.get("form_main_unique_id") or "",
                "stock_id": row.get("stock_id") or "",
                "stock_date": row.get("stock_date"),
                "po_num": row.get("po_num") or "",
                "po_date": row.get("po_date"),
                "department": row.get("department") or "",
                "executive_name": row.get("executive_name") or "",
                "customer_name": row.get("department") or "",
                "customer_location": ", ".join([x for x in [row.get("district_name"), row.get("state_name")] if x]),
                "no_of_item": _safe_int(row.get("no_of_item")),
                "item_qty": item_qty,
                "order_qty": item_qty,
                "remaining_qty": max(item_qty - invoice_qty, 0),
                "stock_qty": stock_qty,
                "invoice_qty": invoice_qty,
                "remain_qty": max(stock_qty - invoice_qty, 0),
                "balance_qty": max(stock_qty - invoice_qty, 0),
                "billed_qty": _safe_int(row.get("billed_qty")),
                "stock_value": _safe_float(row.get("stock_value")),
                "status": "Completed",
            })
        return total, data

    def _detail_payload(self, unique_id, stock_id):
        header = _fetch_one_dict(
            """
            SELECT spm.unique_id, spm.form_main_unique_id, spm.po_unique_id, spm.stock_id, spm.stock_date, spm.po_date,
                   spm.executive_name, spm.no_of_item, spm.stock_qty, spm.stock_value, spm.billed_qty, po.po_num,
                   po.department,
                   COALESCE(NULLIF(dc.department, ''), NULLIF(po.department, '')) AS department_name,
                   po.contact_name, po.bill_address, po.contact_number, po.email,
                   COALESCE(NULLIF(en.executive_name, ''), NULLIF(po.executive_name, '')) AS executive_name_label,
                   COALESCE(NULLIF(dist.district_name, ''), NULLIF(po.district, '')) AS district_name,
                   COALESCE(NULLIF(sc.state_name, ''), NULLIF(po.state_name, '')) AS state_name,
                   (SELECT COUNT(*) FROM consignee_details_sub cds
                    WHERE cds.form_main_unique_id = spm.form_main_unique_id AND cds.is_delete = 0) AS no_of_consignee,
                   (SELECT COALESCE(SUM(ic.invoice_qty), 0) FROM invoice_creation ic
                    WHERE ic.po_unique_id = spm.form_main_unique_id AND ic.stock_id = spm.stock_id AND ic.is_delete = 0) AS assign_qty
            FROM stock_position_main spm
            LEFT JOIN po_form po ON po.unique_id = spm.form_main_unique_id AND po.is_delete = 0
            LEFT JOIN department_creation dc ON dc.unique_id = po.department AND dc.is_delete = 0
            LEFT JOIN executive_name en ON en.unique_id = po.executive_name AND en.is_delete = 0
            LEFT JOIN state_creation sc ON sc.unique_id = po.state_name AND sc.is_delete = 0
            LEFT JOIN district_creation dist ON dist.unique_id = po.district AND dist.is_delete = 0
            WHERE spm.form_main_unique_id = %s AND spm.stock_id = %s AND spm.is_delete = 0
            ORDER BY spm.id DESC LIMIT 1
            """,
            [unique_id, stock_id],
        )
        if not header:
            return None
        items = _fetch_all_dict(
            """
            SELECT unique_id, item_code, product, stock_qty, part_no, net_price, product_unique_id
            FROM stock_position
            WHERE form_main_unique_id = %s AND stock_id = %s AND is_delete = 0
            ORDER BY id ASC
            """,
            [unique_id, stock_id],
        )
        invoices = _fetch_all_dict(
            """
            SELECT icm.unique_id, icm.assign_stock_id, icm.assign_date, icm.dc_number,
                   DATE_FORMAT(icm.dc_date, '%%d-%%m-%%Y') AS dc_date,
                   icm.invoice_no, DATE_FORMAT(icm.invoice_date, '%%Y-%%m-%%d') AS invoice_date,
                   icm.invoice_qty, icm.invoice_value,
                   (SELECT staff_name FROM user WHERE user.staff_id = icm.team_mem AND user.is_delete = 0 LIMIT 1) AS team_member,
                   (SELECT con_contact_name FROM consignee_details_sub WHERE consignee_details_sub.unique_id = icm.consignee_unique_id LIMIT 1) AS consignee_name,
                   (SELECT con_address FROM consignee_details_sub WHERE consignee_details_sub.unique_id = icm.consignee_unique_id LIMIT 1) AS con_address
            FROM invoice_creation_main icm
            WHERE icm.form_main_unique_id = %s AND icm.stock_id = %s AND icm.is_delete = 0
            ORDER BY icm.id ASC
            """,
            [unique_id, stock_id],
        )
        return {
            "customerName": header.get("department_name") or header.get("department") or header.get("contact_name") or "-",
            "customerAddress": "\n".join([x for x in [header.get("bill_address"), header.get("district_name"), header.get("state_name")] if x]),
            "customerPhone": header.get("contact_number") or "--",
            "customerEmail": header.get("email") or "--",
            "stockId": header.get("stock_id") or "",
            "stockDate": _format_date_display(header.get("stock_date")),
            "poNumber": header.get("po_num") or "",
            "poDate": _format_date_display(header.get("po_date")),
            "executiveName": header.get("executive_name_label") or "",
            "noOfConsignee": _safe_int(header.get("no_of_consignee")),
            "noOfItems": _safe_int(header.get("no_of_item")),
            "stockQty": _safe_int(header.get("stock_qty")),
            "netValue": _safe_float(header.get("stock_value")),
            "assignQty": _safe_int(header.get("assign_qty") or header.get("billed_qty")),
            "items": [
                {
                    "sno": idx,
                    "itemCode": row.get("item_code") or "",
                    "itemDetails": row.get("product") or "",
                    "partNo": row.get("part_no") or "-",
                    "availableQty": _safe_int(row.get("stock_qty")),
                    "netPrice": _safe_float(row.get("net_price")),
                    "totalValue": round(_safe_int(row.get("stock_qty")) * _safe_float(row.get("net_price")), 2),
                    "productUniqueId": row.get("product_unique_id") or "",
                }
                for idx, row in enumerate(items, start=1)
            ],
            "invoices": [
                {
                    "sno": idx,
                    "uniqueId": row.get("unique_id") or "",
                    "assignId": row.get("assign_stock_id") or "",
                    "assignDate": _format_date_display(row.get("assign_date")),
                    "dcNo": row.get("dc_number") or "",
                    "dcDate": row.get("dc_date") or "-",
                    "invoiceNo": row.get("invoice_no") or "",
                    "invoiceDate": row.get("invoice_date") or "-",
                    "followedBy": row.get("team_member") or "-",
                    "consigneeDetails": "\n".join([x for x in [row.get("consignee_name"), row.get("con_address")] if x]),
                    "invoiceQty": _safe_int(row.get("invoice_qty")),
                    "invoiceValue": _safe_float(row.get("invoice_value")),
                }
                for idx, row in enumerate(invoices, start=1)
            ],
        }

    def _consignee_options(self, unique_id, stock_id):
        rows = _fetch_all_dict(
            """
            SELECT cds.unique_id AS value, cds.con_contact_name, cds.con_branch, cds.con_address
            FROM consignee_details_sub cds
            INNER JOIN (
                SELECT MAX(id) AS max_id
                FROM consignee_details_sub
                WHERE is_active = 1
                  AND is_delete = 0
                  AND form_main_unique_id = %s
                  AND inv_cons_status = 0
                GROUP BY unique_id
            ) latest ON latest.max_id = cds.id
            ORDER BY cds.con_contact_name ASC, cds.con_branch ASC, cds.unique_id ASC
            """,
            [unique_id],
        )
        return [
            {
                "value": row.get("value") or "",
                "label": f"{idx}. {str(row.get('con_address') or '').strip() or row.get('value') or ''}",
            }
            for idx, row in enumerate(rows, start=1)
        ]

    def _popup_payload(self, unique_id, stock_id, consignee_id):
        rows = _fetch_all_dict(
            """
            SELECT vpacd.form_main_unique_id, vpacd.con_address, vpacd.billing_address, vpacd.con_contact_name,
                   vpacd.con_contact_number, vpacd.stock_id, vpacd.con_unique_id, vpacd.item_code, vpacd.product,
                   vpacd.no_of_consignee, vpacd.no_of_item, vpacd.product_unique_id, vpacd.stock_qty, vpacd.unit_price,
                   vpacd.net_price, vpacd.stock_date, vpacd.assign_qty, vpacd.po_unique_id, vpacd.batch_id,
                   vpacd.assign_team_member AS team_mem_id,
                   (SELECT tax FROM product_details_sub WHERE product_details_sub.unique_id = vpacd.product_unique_id AND product_details_sub.is_delete = 0 LIMIT 1) AS tax,
                   (SELECT SUM(invoice_qty) FROM invoice_creation WHERE invoice_creation.product_unique_id = vpacd.product_unique_id AND invoice_creation.is_delete = 0) AS invoice_qty,
                   (SELECT SUM(invoice_qty) FROM invoice_creation WHERE invoice_creation.consignee_id = vpacd.con_unique_id AND invoice_creation.is_delete = 0) AS total_invoice_qty,
                   (SELECT SUM(invoice_qty) FROM invoice_creation WHERE invoice_creation.product_unique_id = vpacd.product_unique_id AND invoice_creation.consignee_id = vpacd.con_unique_id AND invoice_creation.is_delete = 0) AS assign_invoice_qty,
                   (SELECT delivery_due_dates FROM product_details_sub WHERE product_details_sub.unique_id = vpacd.product_unique_id AND product_details_sub.is_delete = 0 LIMIT 1) AS delivery_due_days,
                   (SELECT staff_name FROM user WHERE user.staff_id = vpacd.assign_team_member AND user.is_delete = 0 LIMIT 1) AS team_member,
                   (SELECT SUM(invoice_qty) FROM invoice_creation WHERE invoice_creation.stock_id = vpacd.stock_id AND invoice_creation.product_unique_id = vpacd.product_unique_id AND invoice_creation.is_delete = 0) AS suminvoice_qty
            FROM view_product_assign_con_details vpacd
            WHERE vpacd.form_main_unique_id = %s AND vpacd.stock_id = %s AND vpacd.con_unique_id = %s
            ORDER BY vpacd.item_code ASC, vpacd.product_unique_id ASC
            """,
            [unique_id, stock_id, consignee_id],
        )
        if not rows:
            return {"consigneeName": "", "contactNo": "", "address": "", "billingAddress": "", "batchId": "", "followedBy": "", "items": []}
        first = rows[0]
        deduped = {}
        for row in rows:
            key = str(row.get("product_unique_id") or row.get("item_code") or "").strip()
            if not key:
                key = f"row-{len(deduped) + 1}"
            if key not in deduped:
                deduped[key] = row
        items = []
        for idx, row in enumerate(deduped.values(), start=1):
            assign_qty = _safe_int(row.get("assign_qty"))
            assign_invoice_qty = _safe_int(row.get("assign_invoice_qty"))
            stock_qty = _safe_int(row.get("stock_qty"))
            suminvoice_qty = _safe_int(row.get("suminvoice_qty"))
            available_stock = max(stock_qty - suminvoice_qty, 0)
            items.append({
                "sno": idx,
                "itemCode": row.get("item_code") or "",
                "itemDetails": row.get("product") or "",
                "assignQty": assign_qty,
                "assignRemainingQty": max(assign_qty - assign_invoice_qty, 0),
                "availableStock": available_stock,
                "billQty": 0,
                "meta": {
                    "poUniqueId": row.get("po_unique_id") or "",
                    "teamMem": row.get("team_mem_id") or "",
                    "noOfConsignee": _safe_int(row.get("no_of_consignee")),
                    "mainUniqueId": row.get("form_main_unique_id") or "",
                    "stockId": row.get("stock_id") or "",
                    "stockDate": row.get("stock_date"),
                    "itemCode": row.get("item_code") or "",
                    "stockQty": available_stock,
                    "unitPrice": _safe_float(row.get("unit_price")),
                    "netPrice": _safe_float(row.get("net_price")),
                    "productUniqueId": row.get("product_unique_id") or "",
                    "noOfItem": _safe_int(row.get("no_of_item")),
                    "tax": row.get("tax") or "",
                    "conAssignQty": assign_qty,
                    "conAddress": row.get("con_address") or "",
                    "remainingQty": available_stock,
                    "remBilledQty": max(assign_qty - assign_invoice_qty, 0),
                    "itemName": row.get("product") or "",
                    "updateBilledQty": _safe_int(row.get("invoice_qty")),
                    "totalAssignQty": assign_qty,
                    "totalInvoiceQty": _safe_int(row.get("total_invoice_qty")),
                    "deliveryDueDays": row.get("delivery_due_days") or "",
                },
            })
        return {
            "consigneeName": first.get("con_contact_name") or "",
            "contactNo": first.get("con_contact_number") or "",
            "address": first.get("con_address") or "",
            "billingAddress": first.get("billing_address") or "",
            "batchId": first.get("batch_id") or "",
            "followedBy": first.get("team_member") or "",
            "items": items,
        }

    def _assign_stock(self, payload):
        unique_id = str(payload.get("unique_id") or "")
        stock_id = str(payload.get("stock_id") or "")
        consignee_id = str(payload.get("consignee_id") or "")
        rows = payload.get("rows") or []
        if isinstance(rows, str):
            rows = json.loads(rows or "[]")
        if not unique_id or not stock_id or not consignee_id:
            return {"status": False, "message": "Missing assign stock inputs."}, status.HTTP_400_BAD_REQUEST
        header = _fetch_one_dict(
            """
            SELECT spm.form_main_unique_id, spm.po_unique_id, spm.stock_id, spm.stock_date, spm.po_date,
                   spm.executive_name, spm.no_of_item, spm.stock_qty, po.po_num
            FROM stock_position_main spm
            LEFT JOIN po_form po ON po.unique_id = spm.form_main_unique_id AND po.is_delete = 0
            WHERE spm.form_main_unique_id = %s AND spm.stock_id = %s AND spm.is_delete = 0
            ORDER BY spm.id DESC LIMIT 1
            """,
            [unique_id, stock_id],
        )
        if not header:
            return {"status": False, "message": "Stock record not found."}, status.HTTP_404_NOT_FOUND
        valid_rows, total_qty, total_value = [], 0, 0.0
        for row in rows:
            bill_qty = _safe_int(row.get("billQty"))
            if bill_qty <= 0:
                continue
            if bill_qty > _safe_int(row.get("assignRemainingQty")) or bill_qty > _safe_int(row.get("availableStock")):
                return {"status": False, "message": "Invoice quantity exceeds allowed limit."}, status.HTTP_400_BAD_REQUEST
            meta = row.get("meta") or {}
            total_qty += bill_qty
            total_value += bill_qty * _safe_float(meta.get("netPrice") or meta.get("unitPrice"))
            valid_rows.append({"billQty": bill_qty, "meta": meta})
        if not valid_rows:
            return {"status": False, "message": "No valid product to save."}, status.HTTP_400_BAD_REQUEST
        assign_stock_id = _next_assign_stock_id()
        assign_date = datetime.now().date()
        invoice_auto_id = _next_invoice_auto_id()
        po_date = _normalize_date(header.get("po_date"))
        stock_date = _normalize_date(header.get("stock_date"))
        first_meta = valid_rows[0]["meta"]
        sess_user_type = str(payload.get("sess_user_type") or payload.get("user_type_unique_id") or "")
        sess_user_id = str(payload.get("sess_user_id") or "")
        sess_company_id = str(payload.get("sess_company_id") or "")
        sess_branch_id = str(payload.get("sess_branch_id") or "")
        session_id = str(payload.get("session_id") or "")
        acc_year = str(payload.get("acc_year") or "")
        team_member = _consignee_team_member(consignee_id) or str(first_meta.get("teamMem") or "").strip()
        cols = [
            "form_main_unique_id", "po_date", "po_num", "stock_id", "stock_date", "stock_qty", "po_unique_id",
            "executive_name", "no_of_items", "consignee_unique_id", "invoice_qty", "invoice_value", "con_assign_qty",
            "team_mem", "assign_remaining_qty", "assign_stock_id", "assign_date", "invoice_auto_id", "net_price",
            "unique_id", "acc_year", "session_id", "sess_user_type", "sess_user_id", "sess_company_id", "sess_branch_id"
        ]
        vals = [
            unique_id, po_date, header.get("po_num") or "", stock_id, stock_date, header.get("stock_qty") or "",
            header.get("po_unique_id") or "", header.get("executive_name") or "", header.get("no_of_item") or "",
            consignee_id, total_qty, total_value, first_meta.get("conAssignQty") or "", team_member,
            sum(_safe_int(item["meta"].get("remBilledQty")) for item in valid_rows), assign_stock_id, assign_date, invoice_auto_id,
            first_meta.get("netPrice") or "", _uid(), acc_year, session_id, sess_user_type, sess_user_id, sess_company_id, sess_branch_id
        ]
        with transaction.atomic(), connection.cursor() as cur:
            placeholder_sql = ", ".join(["%s"] * len(cols))
            cur.execute(f"INSERT INTO invoice_creation_main ({', '.join(cols)}) VALUES ({placeholder_sql})", vals)
            try:
                cur.execute(f"INSERT INTO invoice_creation_main_payment_data ({', '.join(cols)}) VALUES ({placeholder_sql})", vals)
            except Exception:
                pass
            for item in valid_rows:
                meta = item["meta"]
                bill_qty = item["billQty"]
                net_price = _safe_float(meta.get("netPrice") or meta.get("unitPrice"))
                cur.execute(
                    """
                    INSERT INTO invoice_creation (
                        po_unique_id, team_mem, po_num, po_date, po_auto_id, executive_name, consignee_id, stock_id,
                        stock_date, invoice_date, invoice_qty, unit_price, invoice_qty_value, product_unique_id, item_code,
                        product, item_qty, delivery_due_days, invoice_auto_id, assign_stock_id, assign_date, unique_id,
                        acc_year, session_id, sess_user_type, sess_user_id, sess_company_id, sess_branch_id
                    ) VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)
                    """,
                    [
                        unique_id, team_member, header.get("po_num") or "", po_date, header.get("po_unique_id") or "",
                        header.get("executive_name") or "", consignee_id, stock_id, stock_date, assign_date, bill_qty,
                        net_price, bill_qty * net_price, meta.get("productUniqueId") or "", meta.get("itemCode") or "",
                        meta.get("itemName") or "", meta.get("stockQty") or "", meta.get("deliveryDueDays") or "",
                        invoice_auto_id, assign_stock_id, assign_date, _uid(), acc_year, session_id, sess_user_type,
                        sess_user_id, sess_company_id, sess_branch_id
                    ],
                )
            cur.execute(
                "UPDATE stock_position_main SET billed_qty = COALESCE(billed_qty, 0) + %s WHERE form_main_unique_id = %s AND stock_id = %s",
                [total_qty, unique_id, stock_id],
            )
            cur.execute(
                "SELECT COALESCE(SUM(invoice_qty), 0) FROM invoice_creation WHERE stock_id = %s AND po_unique_id = %s AND is_delete = 0",
                [stock_id, unique_id],
            )
            invoice_sum = _safe_int((cur.fetchone() or [0])[0])
            if invoice_sum == _safe_int(header.get("stock_qty")):
                cur.execute(
                    "UPDATE stock_position_main SET status = 2 WHERE stock_id = %s AND form_main_unique_id = %s AND is_delete = 0",
                    [stock_id, unique_id],
                )
            cur.execute(
                """
                SELECT COUNT(*)
                FROM view_product_assign_con_details vpacd
                WHERE vpacd.form_main_unique_id = %s
                  AND vpacd.stock_id = %s
                  AND vpacd.con_unique_id = %s
                  AND COALESCE(vpacd.assign_qty, 0) > COALESCE((
                    SELECT SUM(ic.invoice_qty)
                    FROM invoice_creation ic
                    WHERE ic.product_unique_id = vpacd.product_unique_id
                      AND ic.consignee_id = vpacd.con_unique_id
                      AND ic.is_delete = 0
                  ), 0)
                """,
                [unique_id, stock_id, consignee_id],
            )
            pending_consignee_items = _safe_int((cur.fetchone() or [0])[0])
            if pending_consignee_items == 0:
                cur.execute(
                    """
                    UPDATE consignee_details_sub
                    SET inv_cons_status = 1
                    WHERE unique_id = %s
                      AND form_main_unique_id = %s
                      AND is_delete = 0
                    """,
                    [consignee_id, unique_id],
                )
        return {"status": True, "message": "Assign stock saved successfully.", "assign_stock_id": assign_stock_id, "assign_date": str(assign_date)}, status.HTTP_201_CREATED

    def get(self, request, unique_id=None, *args, **kwargs):
        if unique_id:
            stock_id = str(request.query_params.get("stock_id", "")).strip()
            if not stock_id:
                return Response({"status": False, "message": "stock_id is required."}, status=400)
            payload = self._detail_payload(unique_id, stock_id)
            if not payload:
                return Response({"status": False, "message": "Record not found."}, status=404)
            payload["consigneeOptions"] = self._consignee_options(unique_id, stock_id)
            return Response({"status": True, "data": payload})
        return Response({"status": False, "message": "Unsupported request."}, status=400)

    def post(self, request, *args, **kwargs):
        draw = _safe_int(request.data.get("draw", 1), 1)
        start = _safe_int(request.data.get("start", 0), 0)
        length = _safe_int(request.data.get("length", 10), 10)
        search = request.data.get("search", {})
        from_date = _normalize_date(request.data.get("from_date", ""))
        to_date = _normalize_date(request.data.get("to_date", ""))
        screen_id = str(request.data.get("screen_id_val", "")).strip()
        user_type = str(request.data.get("user_type_unique_id", "")).strip()
        action = str(request.data.get("action", "")).strip().lower()
        if isinstance(search, dict):
            search = search.get("value", "")
        search = str(search or "").strip()
        path = request.path.lower()
        if path.endswith("/pending/"):
            total, data = self._pending_query(search, from_date, to_date, start, length, screen_id, user_type, request_company_id(request))
            return Response(_datatable_response(draw, total, data))
        if path.endswith("/list/"):
            total, data = self._completed_query(search, from_date, to_date, start, length, request_company_id(request))
            return Response(_datatable_response(draw, total, data))
        if path.endswith("/create/") and action == "get_consignee":
            form_main_unique_id = str(request.data.get("form_main_unique_id") or request.data.get("main_unique_id") or "").strip()
            stock_id = str(request.data.get("stock_id", "")).strip()
            consignee_id = str(request.data.get("consignee_id") or request.data.get("unique_id") or "").strip()
            return Response({"status": True, "data": self._popup_payload(form_main_unique_id, stock_id, consignee_id)})
        if path.endswith("/create/") and action == "assign_stock":
            payload, code = self._assign_stock(request.data)
            return Response(payload, status=code)
        if path.endswith("/delete/") and action == "delete":
            payload, code = self._delete_record(request.data)
            return Response(payload, status=code)
        return Response({"status": False, "message": "Unsupported action."}, status=400)

    def _delete_record(self, data):
        """Delete a consignee stock assign record if no bill has been created."""
        form_main_unique_id = str(data.get("form_main_unique_id", "")).strip()
        stock_id = str(data.get("stock_id", "")).strip()
        
        if not form_main_unique_id or not stock_id:
            return {"status": False, "message": "Missing required fields."}, 400
        
        # Get invoice numbers associated with this stock
        with connection.cursor() as cur:
            cur.execute("""
                SELECT DISTINCT invoice_no, dc_number
                FROM invoice_creation_main icm
                WHERE icm.form_main_unique_id = %s AND icm.stock_id = %s AND icm.is_delete = 0
                LIMIT 1
            """, [form_main_unique_id, stock_id])
            invoice_data = cur.fetchone()
            
            if invoice_data:
                invoice_no, dc_number = invoice_data
                # Check if bill has been created
                cur.execute("""
                    SELECT bill_no FROM sign_doc_verification_detail
                    WHERE invoice_no = %s AND dc_number = %s AND is_delete = 0
                    LIMIT 1
                """, [invoice_no, dc_number])
                bill_record = cur.fetchone()
                
                if bill_record and bill_record[0]:
                    return {
                        "status": False,
                        "message": "Cannot delete record. Bill has already been created."
                    }, 400
        
        # Delete the stock position record and roll the PO back into stock position flow.
        with transaction.atomic(), connection.cursor() as cur:
            cur.execute("""
                UPDATE stock_position_main
                SET is_delete = 1
                WHERE form_main_unique_id = %s AND stock_id = %s AND is_delete = 0
            """, [form_main_unique_id, stock_id])
            cur.execute("""
                UPDATE stock_position
                SET is_delete = 1
                WHERE form_main_unique_id = %s AND stock_id = %s AND is_delete = 0
            """, [form_main_unique_id, stock_id])
            cur.execute("""
                UPDATE stock_position_sublist
                SET is_delete = 1
                WHERE form_main_unique_id = %s AND stock_id = %s AND is_delete = 0
            """, [form_main_unique_id, stock_id])
            cur.execute("""
                UPDATE invoice_creation
                SET is_delete = 1
                WHERE po_unique_id = %s AND stock_id = %s AND is_delete = 0
            """, [form_main_unique_id, stock_id])
            
            # Revert consignee stock assign status to pending (if it was assigned)
            cur.execute("""
                UPDATE invoice_creation_main
                SET is_delete = 1
                WHERE form_main_unique_id = %s AND stock_id = %s AND is_delete = 0
            """, [form_main_unique_id, stock_id])
            payment_cols = _table_columns("invoice_creation_main_payment_data")
            if {"form_main_unique_id", "stock_id", "is_delete"}.issubset(payment_cols):
                cur.execute("""
                    UPDATE invoice_creation_main_payment_data
                    SET is_delete = 1
                    WHERE form_main_unique_id = %s AND stock_id = %s AND is_delete = 0
                """, [form_main_unique_id, stock_id])
            cur.execute("""
                SELECT COUNT(*)
                FROM stock_position_main
                WHERE form_main_unique_id = %s AND is_delete = 0
            """, [form_main_unique_id])
            active_stock_count = _safe_int((cur.fetchone() or [0])[0])
            if active_stock_count == 0:
                cur.execute("""
                    UPDATE po_form
                    SET status = 0
                    WHERE unique_id = %s AND is_delete = 0
                """, [form_main_unique_id])
        
        return {"status": True, "message": "Consignee stock record deleted successfully."}, 200
