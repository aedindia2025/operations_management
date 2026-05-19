from __future__ import annotations

import datetime
from datetime import date
from decimal import Decimal, InvalidOperation

from django.db import connection, transaction
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from master.apps.operation_approval.operationapprovalmodel import (
    InvoiceCreation,
    InvoiceCreationMain,
    InvoiceSublist,
    InvoiceVerificationTable,
)
from master.tenant import request_company_id


def _dictfetchall(cursor):
    columns = [col[0] for col in cursor.description]
    return [dict(zip(columns, row)) for row in cursor.fetchall()]


def _file_url(path: str) -> str:
    return f"/api/master{path}"


def _fmt_date(value) -> str:
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


def _money_in(value) -> str:
    try:
        number = float(value or 0)
    except (TypeError, ValueError):
        number = 0.0
    return f"{number:,.2f}"


def _to_decimal(value) -> Decimal:
    try:
        return Decimal(str(value or "0"))
    except (InvalidOperation, TypeError, ValueError):
        return Decimal("0")


def _status_label(code) -> str:
    mapping = {"0": "Pending", "1": "Approved", "2": "Not Approved"}
    return mapping.get(str(code), "Pending")


def _status_code_from_label(label: str) -> int:
    mapping = {"Pending": 0, "Approved": 1, "Not Approved": 2}
    return mapping[label]


def _user_display(staff_id_or_name: str) -> str:
    value = str(staff_id_or_name or "").strip()
    if not value:
        return "--"
    with connection.cursor() as cur:
        cur.execute(
            """
            SELECT staff_name
            FROM user
            WHERE is_delete = 0
              AND (
                staff_id = %s
                OR unique_id = %s
                OR staff_name = %s
                OR user_name = %s
              )
            ORDER BY s_no DESC
            LIMIT 1
            """,
            [value, value, value, value],
        )
        row = cur.fetchone()
    return row[0] if row and row[0] else value


def _executive_display(executive_id_or_name: str) -> str:
    value = str(executive_id_or_name or "").strip()
    if not value:
        return ""
    with connection.cursor() as cur:
        cur.execute(
            """
            SELECT executive_name
            FROM executive_name
            WHERE unique_id = %s AND is_delete = 0
            LIMIT 1
            """,
            [value],
        )
        row = cur.fetchone()
    if row and row[0]:
        return row[0]

    with connection.cursor() as cur:
        cur.execute(
            """
            SELECT staff_name
            FROM user
            WHERE unique_id = %s AND is_delete = 0
            LIMIT 1
            """,
            [value],
        )
        row = cur.fetchone()
    if row and row[0]:
        return row[0]

    return _user_display(value)


def _customer_display(customer_or_unique_id: str) -> str:
    value = str(customer_or_unique_id or "").strip()
    if not value:
        return ""

    with connection.cursor() as cur:
        cur.execute(
            """
            SELECT ledger_name
            FROM department_creation_sublist
            WHERE unique_id = %s
              AND is_delete = 0
            LIMIT 1
            """,
            [value],
        )
        row = cur.fetchone()
    if row and row[0]:
        return row[0]

    with connection.cursor() as cur:
        cur.execute(
            """
            SELECT department
            FROM department_creation
            WHERE unique_id = %s
              AND is_delete = 0
            LIMIT 1
            """,
            [value],
        )
        row = cur.fetchone()
    if row and row[0]:
        return row[0]

    return value


def _datatable_response(draw, total, data):
    return {"draw": int(draw), "recordsTotal": int(total), "recordsFiltered": int(total), "data": data}


def _parse_list_params(request):
    data = request.data if request.method.upper() == "POST" else request.query_params
    if not data or not hasattr(data, 'get'):
        data = {}
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
        "opt": str(data.get("opt", "") or "").strip(),
        "team_mem": str(data.get("team_mem", "") or data.get("team_member", "") or "").strip(),
        "state": str(data.get("state", "") or "").strip(),
        "zone": str(data.get("zone", "") or "").strip(),
    }


def _build_where(statuses: list[int], params: dict, company_id: str = ""):
    # For pending (0) and approved (1), require dc_number
    # For rejected (2), dc_number is intentionally cleared, so don't require it
    where = ["icm.is_delete = 0", f"icm.doc_approval_sts IN ({','.join(['%s'] * len(statuses))})"]
    sql_params: list[object] = list(statuses)
    
    # Only require non-empty dc_number if we're NOT fetching rejected records
    if 2 not in statuses:
        where.append("COALESCE(TRIM(icm.dc_number), '') != ''")

    if company_id:
        where.append("pf.sess_company_id = %s")
        sql_params.append(company_id)

    if params["from_date"] and params["to_date"]:
        opt = params["opt"]
        if opt in {"4", "po_date", "PO Date"}:
            where.append("DATE(icm.po_date) BETWEEN %s AND %s")
            sql_params.extend([params["from_date"], params["to_date"]])
        elif opt in {"5", "invoice_date", "Invoice Date"}:
            where.append("DATE(icm.invoice_date) BETWEEN %s AND %s")
            sql_params.extend([params["from_date"], params["to_date"]])
        elif opt in {"6", "dc_date", "DC Date"}:
            where.append("DATE(icm.dc_date) BETWEEN %s AND %s")
            sql_params.extend([params["from_date"], params["to_date"]])

    if params["team_mem"] and params["team_mem"].lower() != "all":
        where.append(
            """(
                COALESCE(icm.team_mem, '') = %s
                OR COALESCE(u.staff_name, '') = %s
            )"""
        )
        sql_params.extend([params["team_mem"], params["team_mem"]])

    if params["state"]:
        where.append(
            """(
                COALESCE(st.state_name, pf.state_name, '') = %s
                OR COALESCE(pf.state_name, '') = %s
            )"""
        )
        sql_params.extend([params["state"], params["state"]])

    if params["zone"]:
        where.append("COALESCE(c.zone, '') = %s")
        sql_params.append(params["zone"])

    if params["search"]:
        like = f"%{params['search']}%"
        where.append(
            """(
                COALESCE(pf.po_num, '') LIKE %s
                OR COALESCE(c.con_address, '') LIKE %s
                OR COALESCE(c.con_branch, '') LIKE %s
                OR COALESCE(u.staff_name, '') LIKE %s
                OR COALESCE(icm.invoice_no, '') LIKE %s
                OR COALESCE(icm.dc_number, '') LIKE %s
                OR COALESCE(icm.invoice_value, '') LIKE %s
                OR COALESCE(dcs.ledger_name, '') LIKE %s
            )"""
        )
        sql_params.extend([like, like, like, like, like, like, like, like])

    return " AND ".join(where), sql_params


def _fetch_operation_rows(statuses: list[int], params: dict, company_id: str = ""):
    where_sql, sql_params = _build_where(statuses, params, company_id)

    # Keep only the latest invoice row per DC number to avoid duplicate list entries.
    dedup_main_sql = """
        (
            SELECT m.*
            FROM invoice_creation_main m
            INNER JOIN (
                SELECT MAX(id) AS max_id
                FROM invoice_creation_main
                WHERE is_delete = 0
                  AND COALESCE(TRIM(dc_number), '') != ''
                GROUP BY UPPER(TRIM(dc_number))
            ) latest ON latest.max_id = m.id
        ) icm
    """

    # Collapse attachment rows to one row per invoice.
    dedup_sub_sql = """
        (
            SELECT
                invoice_id,
                MAX(dc_file_name) AS dc_file_name,
                MAX(ir_file_name) AS ir_file_name,
                MAX(file_invoice) AS file_invoice
            FROM invoice_sublist
            WHERE is_delete = 0
            GROUP BY invoice_id
        ) sub
    """

    base_sql = f"""
        FROM {dedup_main_sql}
        LEFT JOIN po_form pf
          ON pf.unique_id = icm.form_main_unique_id
         AND pf.is_delete = 0
        LEFT JOIN state_creation st
          ON st.unique_id = pf.state_name
         AND st.is_delete = 0
        LEFT JOIN consignee_details_sub c
          ON c.unique_id = icm.consignee_unique_id
         AND c.is_delete = 0
        LEFT JOIN user u
          ON (
            u.staff_id = icm.team_mem
            OR u.unique_id = icm.team_mem
          )
         AND u.is_delete = 0
        LEFT JOIN department_creation_sublist dcs
          ON dcs.unique_id = icm.ledger_name
         AND dcs.is_delete = 0
        LEFT JOIN {dedup_sub_sql}
          ON sub.invoice_id = icm.unique_id
        WHERE {where_sql}
    """

    count_sql = f"SELECT COUNT(DISTINCT icm.unique_id) {base_sql}"
    data_sql = f"""
        SELECT DISTINCT
            icm.unique_id AS id,
            COALESCE(pf.po_num, icm.po_num, '') AS po_no,
            icm.po_date AS po_date,
            COALESCE(dcs.ledger_name, pf.department, '') AS customer,
            COALESCE(c.con_address, '') AS location,
            COALESCE(c.con_branch, '') AS branch_name,
            COALESCE(u.staff_name, NULLIF(icm.team_mem, ''), '') AS followed_by,
            COALESCE(icm.invoice_no, '') AS invoice_no,
            icm.invoice_date AS invoice_date,
            COALESCE(icm.dc_number, '') AS dc_no,
            icm.dc_date AS dc_date,
            COALESCE(icm.invoice_value, '0') AS dc_value,
            COALESCE(pf.file_name, '') AS po_file,
            COALESCE(sub.dc_file_name, '') AS dc_file,
            COALESCE(sub.ir_file_name, '') AS ir_file,
            COALESCE(sub.file_invoice, '') AS inv_file,
            COALESCE(icm.doc_approval_sts, 0) AS doc_approval_sts,
            COALESCE(icm.approved_by, '') AS approved_by,
            COALESCE(st.state_name, pf.state_name, '') AS state_name,
            COALESCE(c.zone, '') AS zone_name
        {base_sql}
        ORDER BY icm.doc_approval_sts DESC, icm.id DESC
    """

    with connection.cursor() as cur:
        cur.execute(count_sql, sql_params)
        total = cur.fetchone()[0]

        query_sql = data_sql
        query_params = list(sql_params)
        if params["length"] != -1:
            query_sql += " LIMIT %s OFFSET %s"
            query_params.extend([params["length"], params["start"]])
        elif params["start"]:
            query_sql += " LIMIT 18446744073709551615 OFFSET %s"
            query_params.append(params["start"])

        cur.execute(query_sql, query_params)
        rows = _dictfetchall(cur)

    mapped = []
    for idx, row in enumerate(rows, start=params["start"] + 1):
        status_text = _status_label(row.get("doc_approval_sts"))
        mapped.append(
            {
                "id": row.get("id", ""),
                "s_no": idx,
                "poNo": row.get("po_no", ""),
                "poDate": _fmt_date(row.get("po_date")),
                "customer": _customer_display(row.get("customer", "")),
                "location": row.get("location", ""),
                "branchName": row.get("branch_name", ""),
                "followedBy": _user_display(row.get("followed_by", "")) if row.get("followed_by") else "",
                "invoiceNo": row.get("invoice_no", ""),
                "invoiceDate": _fmt_date(row.get("invoice_date")),
                "dcNo": row.get("dc_no", ""),
                "dcDate": _fmt_date(row.get("dc_date")),
                "dcValue": _money_in(row.get("dc_value")),
                "hasPO": bool(row.get("po_file")),
                "hasDC": bool(row.get("dc_file")),
                "hasIR": bool(row.get("ir_file")),
                "hasInv": bool(row.get("inv_file")),
                "poFileUrl": _file_url(f"/purchase-order/files/po_copy/{row.get('po_file')}/") if row.get("po_file") else "",
                "dcFileUrl": _file_url(f"/invoice-dc/files/{row.get('dc_file')}/") if row.get("dc_file") else "",
                "irFileUrl": _file_url(f"/invoice-dc/files/{row.get('ir_file')}/") if row.get("ir_file") else "",
                "invFileUrl": _file_url(f"/invoice-dc/files/{row.get('inv_file')}/") if row.get("inv_file") else "",
                "hasCompare": bool(row.get("po_file") or row.get("dc_file") or row.get("ir_file") or row.get("inv_file")),
                "status": status_text,
                "approved": _user_display(row.get("approved_by", "")),
                "state": row.get("state_name", ""),
                "zone": row.get("zone_name", ""),
            }
        )
    return total, mapped


def _get_main_detail(unique_id: str):
    with connection.cursor() as cur:
        cur.execute(
            """
            SELECT
                icm.unique_id,
                icm.form_main_unique_id,
                icm.consignee_unique_id,
                COALESCE(pf.po_num, icm.po_num, '') AS po_num,
                icm.po_date,
                COALESCE(NULLIF(dcs.ledger_name, ''), NULLIF(pf.department, ''), NULLIF(icm.ledger_name, ''), '') AS customer_name,
                COALESCE(pf.bill_address, '') AS bill_address,
                COALESCE(pf.contact_number, '') AS contact_number,
                COALESCE(pf.email, '') AS email,
                COALESCE(ps.state_name, pf.state_name, '') AS state_name,
                COALESCE(pd.district_name, pf.district, '') AS district,
                COALESCE(c.con_contact_name, '') AS consignee_name,
                COALESCE(c.con_address, '') AS con_address,
                COALESCE(c.con_contact_number, '') AS con_contact_number,
                COALESCE(cd.district_name, c.con_district, '') AS con_district,
                COALESCE(cs.state_name, c.con_state_name, '') AS con_state_name,
                COALESCE(c.con_pincode, '') AS con_pincode,
                COALESCE(c.con_branch, '') AS con_branch,
                COALESCE(pf.executive_name, icm.executive_name, '') AS executive_name,
                COALESCE(icm.invoice_no, '') AS invoice_no,
                icm.invoice_date,
                COALESCE(icm.dc_number, '') AS dc_number,
                icm.dc_date,
                COALESCE(icm.doc_approval_sts, 0) AS doc_approval_sts,
                COALESCE(icm.reject_reason_elcot, '') AS reject_reason_elcot,
                COALESCE(icm.approved_by, '') AS approved_by,
                icm.approved_date
            FROM invoice_creation_main icm
            LEFT JOIN po_form pf
              ON pf.unique_id = icm.form_main_unique_id
             AND pf.is_delete = 0
            LEFT JOIN state_creation ps
              ON ps.unique_id = pf.state_name
             AND ps.is_delete = 0
            LEFT JOIN district_creation pd
              ON pd.unique_id = pf.district
             AND pd.is_delete = 0
            LEFT JOIN consignee_details_sub c
              ON c.unique_id = icm.consignee_unique_id
             AND c.is_delete = 0
            LEFT JOIN state_creation cs
              ON cs.unique_id = c.con_state_name
             AND cs.is_delete = 0
            LEFT JOIN district_creation cd
              ON cd.unique_id = c.con_district
             AND cd.is_delete = 0
            LEFT JOIN department_creation_sublist dcs
              ON dcs.unique_id = icm.ledger_name
             AND dcs.is_delete = 0
            WHERE icm.unique_id = %s
              AND icm.is_delete = 0
            LIMIT 1
            """,
            [unique_id],
        )
        rows = _dictfetchall(cur)
    return rows[0] if rows else None


def _get_item_rows(form_main_unique_id: str, consignee_unique_id: str, dc_number: str):
    with connection.cursor() as cur:
        cur.execute(
            """
            SELECT item_code, product, invoice_qty, invoice_qty_value, ser_no
            FROM invoice_creation
            WHERE dc_num = %s
              AND po_unique_id = %s
              AND consignee_id = %s
              AND is_delete = 0
            ORDER BY id ASC
            """,
            [dc_number, form_main_unique_id, consignee_unique_id],
        )
        rows = _dictfetchall(cur)

    data = []
    for idx, row in enumerate(rows, start=1):
        invoice_value = (_to_decimal(row.get("invoice_qty_value")) * Decimal("1.18")).quantize(Decimal("0.01"))
        data.append(
            {
                "id": idx,
                "itemName": row.get("item_code", ""),
                "itemDesc": row.get("product", ""),
                "dcQty": int(row.get("invoice_qty") or 0),
                "invoiceValue": float(invoice_value),
                "serialNo": str(row.get("ser_no") or "").replace(",", ", "),
            }
        )
    return data


class OperationApprovalListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        params = _parse_list_params(request)
        total, rows = _fetch_operation_rows([1, 2], params, request_company_id(request))
        return Response(_datatable_response(params["draw"], total, rows))

    def post(self, request):
        params = _parse_list_params(request)
        requested_status = request.data.get("doc_approval_sts", "")
        statuses = [1, 2] if requested_status == "" else [int(requested_status)]
        total, rows = _fetch_operation_rows(statuses, params, request_company_id(request))
        return Response(_datatable_response(params["draw"], total, rows))


class PendingApprovalListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        params = _parse_list_params(request)
        total, rows = _fetch_operation_rows([0], params, request_company_id(request))
        return Response(_datatable_response(params["draw"], total, rows))

    def post(self, request):
        params = _parse_list_params(request)
        total, rows = _fetch_operation_rows([0], params, request_company_id(request))
        return Response(_datatable_response(params["draw"], total, rows))


class OperationApprovalFilterOptionsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        with connection.cursor() as cur:
            cur.execute(
                """
                SELECT DISTINCT state_name
                FROM state_creation
                WHERE is_delete = 0
                  AND COALESCE(NULLIF(TRIM(state_name), ''), '') != ''
                ORDER BY state_name
                """
            )
            states = [{"value": row[0], "label": row[0]} for row in cur.fetchall()]

            cur.execute(
                """
                SELECT DISTINCT zone
                FROM consignee_details_sub
                WHERE is_delete = 0
                  AND COALESCE(NULLIF(TRIM(zone), ''), '') != ''
                ORDER BY zone
                """
            )
            zones = [{"value": row[0], "label": row[0]} for row in cur.fetchall()]

        return Response({"status": True, "states": states, "zones": zones})


class OperationApprovalDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, unique_id):
        detail = _get_main_detail(unique_id)
        if detail is None:
            return Response({"status": False, "message": "Record not found."}, status=status.HTTP_404_NOT_FOUND)

        data = {
            "customerName": _customer_display(detail.get("customer_name", "")),
            "customerAddress": ", ".join([part for part in [detail.get("bill_address", ""), detail.get("district", ""), detail.get("state_name", "")] if part]),
            "customerPhone": detail.get("contact_number") or "--",
            "customerEmail": detail.get("email") or "--",
            "consigneeName": detail.get("consignee_name", ""),
            "consigneeAddress": detail.get("con_address", ""),
            "conbranch": detail.get("con_branch", ""),
            "consigneePhone": detail.get("con_contact_number") or "--",
            "consigneeCity": "\n".join(
                [
                    part
                    for part in [
                        detail.get("con_district", ""),
                        ", ".join([part for part in [ detail.get("con_state_name", "")] if part]) + (f"-{detail.get('con_pincode')}" if detail.get("con_pincode") else ""),
                    ]
                    if part
                ]
            ),
            "poNumber": detail.get("po_num", ""),
            "poDate": _fmt_date(detail.get("po_date")),
            "executiveName": _executive_display(detail.get("executive_name", "")),
            "invoiceNo": detail.get("invoice_no", ""),
            "invoiceDate": _fmt_date(detail.get("invoice_date")),
            "dcNo": detail.get("dc_number", ""),
            "dcDate": _fmt_date(detail.get("dc_date")),
            "items": _get_item_rows(detail.get("form_main_unique_id", ""), detail.get("consignee_unique_id", ""), detail.get("dc_number", "")),
            "approvalStatus": _status_label(detail.get("doc_approval_sts")),
            "rejectedReason": detail.get("reject_reason_elcot", ""),
            "approvedBy": _user_display(detail.get("approved_by", "")),
            "approvedDate": _fmt_date(detail.get("approved_date")),
        }
        return Response({"status": True, "data": data})

    def delete(self, request, unique_id):
        obj = InvoiceCreationMain.objects.filter(unique_id=unique_id, is_delete=0).first()
        if obj is None:
            return Response({"status": False, "message": "Record not found."}, status=status.HTTP_404_NOT_FOUND)
        
        # Check if bill has been created for this record
        from django.db import connection
        with connection.cursor() as cursor:
            cursor.execute("""
                SELECT bill_no FROM sign_doc_verification_detail
                WHERE invoice_no = %s AND dc_number = %s AND is_delete = 0
                LIMIT 1
            """, [obj.invoice_no, obj.dc_number])
            bill_record = cursor.fetchone()
            
            if bill_record and bill_record[0]:  # bill_no is not empty
                return Response({
                    "status": False, 
                    "message": "Cannot delete record. Bill has already been created."
                }, status=status.HTTP_400_BAD_REQUEST)
        
        dc_number = str(obj.dc_number or "").strip()
        invoice_auto_id = str(obj.invoice_auto_id or "").strip()

        affected_stock_pairs: list[tuple[str, str]] = []
        if invoice_auto_id:
            with connection.cursor() as cursor:
                cursor.execute(
                    """
                    SELECT DISTINCT COALESCE(stock_id, ''), COALESCE(po_unique_id, '')
                    FROM invoice_creation
                    WHERE invoice_auto_id = %s
                      AND is_delete = 0
                    """,
                    [invoice_auto_id],
                )
                affected_stock_pairs = [
                    (str(stock_id or "").strip(), str(po_unique_id or "").strip())
                    for stock_id, po_unique_id in cursor.fetchall()
                    if str(stock_id or "").strip() and str(po_unique_id or "").strip()
                ]

        # Roll the record back to invoice pending instead of hiding it.
        with transaction.atomic():
            InvoiceCreationMain.objects.filter(unique_id=unique_id, is_delete=0).update(
                dc_number="",
                dc_date=None,
                invoice_no="",
                invoice_date=None,
                ledger_name="",
                ledger_no="",
                doc_approval_sts=0,
                invoice_doc_status=0,
                approved_by="",
                approved_date=None,
                reject_reason_elcot="",
            )
            if invoice_auto_id:
                with connection.cursor() as cursor:
                    cursor.execute(
                        """
                        UPDATE invoice_creation
                        SET ser_no = '',
                            mon_ser_no = '',
                            seril_no_selc = '',
                            spec_srl_no = NULL,
                            dc_num = '',
                            dc_date = NULL,
                            invoice_no = '',
                            invoice_date = NULL,
                            ledger_name = '',
                            ledger_no = '',
                            invoice_qty = 0
                        WHERE invoice_auto_id = %s
                          AND is_delete = 0
                        """,
                        [invoice_auto_id],
                    )
            elif dc_number:
                with connection.cursor() as cursor:
                    cursor.execute(
                        """
                        UPDATE invoice_creation
                        SET dc_num = '',
                            dc_date = NULL,
                            invoice_no = '',
                            invoice_date = NULL,
                            ledger_name = '',
                            ledger_no = '',
                            invoice_qty = 0
                        WHERE dc_num = %s
                          AND is_delete = 0
                        """,
                        [dc_number],
                    )

            InvoiceSublist.objects.filter(invoice_id=unique_id, is_delete=0).update(
                doc_approval_sts=0,
                reject_reason="",
                is_delete=1,
            )
            if dc_number:
                InvoiceVerificationTable.objects.filter(dc_number=dc_number).update(
                    doc_approval_sts=0,
                    invoice_doc_status=0,
                    approved_by="",
                    approved_date=None,
                )

            if invoice_auto_id:
                try:
                    with connection.cursor() as cursor:
                        cursor.execute(
                            """
                            UPDATE invoice_creation_main_payment_data
                            SET is_delete = 1
                            WHERE unique_id = %s
                            """,
                            [unique_id],
                        )
                except Exception:
                    pass

            if affected_stock_pairs:
                with connection.cursor() as cursor:
                    for stock_id, po_unique_id in affected_stock_pairs:
                        cursor.execute(
                            """
                            SELECT COALESCE(SUM(invoice_qty), 0)
                            FROM invoice_creation
                            WHERE stock_id = %s
                              AND po_unique_id = %s
                              AND is_delete = 0
                            """,
                            [stock_id, po_unique_id],
                        )
                        active_qty = int((cursor.fetchone() or [0])[0] or 0)
                        stock_status = 0 if active_qty <= 0 else 1
                        cursor.execute(
                            """
                            UPDATE stock_position_main
                            SET billed_qty = %s,
                                status = %s
                            WHERE form_main_unique_id = %s
                              AND stock_id = %s
                              AND is_delete = 0
                            """,
                            [active_qty, stock_status, po_unique_id, stock_id],
                        )

        return Response({"status": True, "msg": "success_delete", "message": "Record moved back to invoice pending successfully."})


class OperationApprovalUpdateView(APIView):
    permission_classes = [IsAuthenticated]

    def put(self, request, unique_id):
        status_label = str(
            request.data.get("approvalStatus", "")
            or request.data.get("status", "")
            or request.data.get("status_label", "")
            or request.data.get("approval_status", "")
        ).strip()
        reason_reject = str(
            request.data.get("rejectedReason", "")
            or request.data.get("reason", "")
            or request.data.get("rejected_reason", "")
        ).strip()

        normalized_status = status_label.lower()
        if normalized_status == "approved":
            status_label = "Approved"
        elif normalized_status in {"not approved", "rejected", "not_approved", "rejected"}:
            status_label = "Not Approved"
        elif normalized_status == "pending":
            status_label = "Pending"

        if status_label not in {"Pending", "Approved", "Not Approved"}:
            return Response(
                {"status": False, "msg": "error", "message": "Invalid approval status."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if status_label == "Not Approved" and not reason_reject:
            return Response(
                {"status": False, "msg": "error", "message": "Rejected reason is required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        inv = InvoiceCreationMain.objects.filter(unique_id=unique_id, is_delete=0).first()
        if inv is None:
            return Response({"status": False, "msg": "error", "message": "Invoice not found."}, status=status.HTTP_404_NOT_FOUND)
        if int(inv.doc_approval_sts or 0) != 0:
            return Response(
                {"status": False, "msg": "error", "message": "Only pending records can be updated."},
                status=status.HTTP_409_CONFLICT,
            )

        doc_approval_sts = _status_code_from_label(status_label)
        approved_by = str(getattr(request.user, "staff_name", "") or getattr(request.user, "user_name", "") or getattr(request.user, "staff_id", ""))
        cur_date = date.today()
        original_dc_number = str(inv.dc_number or "").strip()
        main_update = {
            "doc_approval_sts": doc_approval_sts,
            "invoice_doc_status": doc_approval_sts,
            "reject_reason_elcot": reason_reject,
            "approved_by": approved_by,
            "approved_date": cur_date,
        }

        try:
            with transaction.atomic():
                if doc_approval_sts == 2:
                    InvoiceCreationMain.objects.filter(dc_number=original_dc_number, is_delete=0).update(
                        dc_number="",
                        dc_date=None,
                        invoice_no="",
                        ledger_name="",
                        ledger_no="",
                        invoice_date=None,
                    )
                    InvoiceCreation.objects.filter(dc_num=original_dc_number, is_delete=0).update(
                        dc_num="",
                        dc_date=None,
                        invoice_no="",
                        ledger_name="",
                        ledger_no="",
                        invoice_date=None,
                    )
                    InvoiceSublist.objects.filter(invoice_id=unique_id).update(
                        doc_approval_sts=doc_approval_sts,
                        reject_reason=reason_reject,
                        is_delete=1,
                    )
                else:
                    InvoiceSublist.objects.filter(invoice_id=unique_id).update(
                        doc_approval_sts=doc_approval_sts,
                        reject_reason=reason_reject,
                        is_delete=0,
                    )

                InvoiceCreationMain.objects.filter(unique_id=unique_id, is_delete=0).update(**main_update)

                if original_dc_number:
                    InvoiceVerificationTable.objects.filter(dc_number=original_dc_number).update(
                        doc_approval_sts=doc_approval_sts,
                        invoice_doc_status=doc_approval_sts,
                        approved_by=approved_by,
                        approved_date=cur_date,
                    )
        except Exception as exc:
            return Response(
                {"status": False, "msg": "error", "error": str(exc), "message": "Approval update failed."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        return Response({"status": True, "msg": "update", "message": "Approval status updated successfully."})


class BulkApprovalView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        invoice_ids = request.data.get("invoice_ids", [])
        if not invoice_ids:
            return Response({"status": False, "message": "invoice_ids list empty."}, status=status.HTTP_400_BAD_REQUEST)

        approved_by = str(getattr(request.user, "staff_name", "") or getattr(request.user, "user_name", "") or getattr(request.user, "staff_id", ""))
        cur_date = date.today()
        try:
            with transaction.atomic():
                InvoiceCreationMain.objects.filter(unique_id__in=invoice_ids, is_delete=0).update(
                    doc_approval_sts=1,
                    invoice_doc_status=1,
                    approved_by=approved_by,
                    approved_date=cur_date,
                )
                InvoiceSublist.objects.filter(invoice_id__in=invoice_ids).update(doc_approval_sts=1, is_delete=0)
        except Exception as exc:
            return Response(
                {"status": False, "msg": "error", "error": str(exc), "message": "Bulk approval failed."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        return Response({"status": True, "msg": "update", "message": f"{len(invoice_ids)} records approved successfully."})


class OperationApprovalExportView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        params = _parse_list_params(request)
        requested_status = request.query_params.get("doc_approval_sts", "")
        statuses = [1] if requested_status == "" else [int(requested_status)]
        _, rows = _fetch_operation_rows(statuses, {**params, "start": 0, "length": -1})
        return Response({"status": True, "data": rows})
