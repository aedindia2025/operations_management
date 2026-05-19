import os
import uuid
from pathlib import Path

from django.conf import settings
from django.db import connection
from rest_framework import status
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.response import Response
from rest_framework.views import APIView


LEGACY_UPLOAD_BASE = Path(
    os.environ.get("OTM_UPLOAD_BASE", r"Z:\xampp\htdocs\otm_beta\uploads")
)

PAYMENT_NOTIFICATION_RECIPIENTS = (
    "65efd97b4df4040205",
    "68cba503472bd48995",
)


def _rows(cursor):
    cols = [col[0] for col in cursor.description]
    return [dict(zip(cols, row)) for row in cursor.fetchall()]


def _one(query, params):
    with connection.cursor() as cursor:
        cursor.execute(query, params)
        rows = _rows(cursor)
    return rows[0] if rows else None


def _many(query, params):
    with connection.cursor() as cursor:
        cursor.execute(query, params)
        return _rows(cursor)


def _coerce_int(value, default=0):
    try:
        return int(value)
    except (TypeError, ValueError):
        return default


def _table_columns(table_name):
    with connection.cursor() as cursor:
        cursor.execute(f"SHOW COLUMNS FROM `{table_name}`")
        return [row[0] for row in cursor.fetchall()]


def _pick_col(columns, *candidates):
    lowered = {str(col).lower(): str(col) for col in (columns or [])}
    for candidate in candidates:
        column = lowered.get(str(candidate).lower())
        if column:
            return column
    return ""


def _ensure_payment_notification_table():
    with connection.cursor() as cursor:
        cursor.execute(
            """
            CREATE TABLE IF NOT EXISTS payment_transaction_notifications (
                id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
                unique_id VARCHAR(50) NOT NULL,
                recipient_user_id VARCHAR(50) NOT NULL,
                bill_no VARCHAR(100) NOT NULL,
                notification_type VARCHAR(50) NOT NULL,
                title VARCHAR(255) NOT NULL,
                message TEXT NOT NULL,
                source_module VARCHAR(100) NOT NULL DEFAULT 'payment_transaction',
                source_path VARCHAR(255) NOT NULL DEFAULT '',
                is_read TINYINT(1) NOT NULL DEFAULT 0,
                created_by VARCHAR(50) NOT NULL DEFAULT '',
                created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                read_at DATETIME NULL,
                KEY idx_payment_notification_recipient (recipient_user_id, is_read, created_at),
                KEY idx_payment_notification_bill (bill_no),
                UNIQUE KEY uq_payment_notification_unique_id (unique_id)
            )
            """
        )
        cursor.execute(
            """
            CREATE TABLE IF NOT EXISTS payment_transaction_notification_reads (
                id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
                notification_unique_id VARCHAR(50) NOT NULL,
                user_id VARCHAR(50) NOT NULL,
                read_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                UNIQUE KEY uq_payment_notification_read (notification_unique_id, user_id),
                KEY idx_payment_notification_read_user (user_id, read_at)
            )
            """
        )


def _create_payment_notifications(bill_no, created_by):
    _ensure_payment_notification_table()
    source_path = f"/vendor/payment-transaction/form/{bill_no}"
    rows = []
    for recipient_user_type in PAYMENT_NOTIFICATION_RECIPIENTS:
        rows.append(
            [
                uuid.uuid4().hex[:20],
                recipient_user_type,
                bill_no,
                "payment_completed",
                "Payment Completed",
                f"Payment completed for bill no {bill_no}.",
                source_path,
                created_by,
            ]
        )

    with connection.cursor() as cursor:
        cursor.executemany(
            """
            INSERT INTO payment_transaction_notifications
                (unique_id, recipient_user_id, bill_no, notification_type, title, message, source_path, created_by)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
            """,
            rows,
        )


def _get_request_user_id(request):
    user = getattr(request, "user", None)
    for attr in ("staff_id", "unique_id", "pk", "username"):
        value = str(getattr(user, attr, "") or "").strip()
        if value:
            return value

    auth_header = str(request.headers.get("Authorization", "") or "").strip()
    if auth_header.startswith("Bearer "):
        token = auth_header.split(" ", 1)[1].strip()
        if token:
            return token

    request_data = getattr(request, "data", {})
    for key in ("user_id", "sess_user_id"):
        value = str(request_data.get(key, "") or "").strip()
        if value:
            return value
    return ""


def _save_cash_receipt(file_obj, bill_no):
    if not file_obj:
        return "", ""

    extension = Path(getattr(file_obj, "name", "")).suffix.lower()
    allowed_exts = {".pdf", ".jpg", ".jpeg", ".png"}
    allowed_types = {
        "application/pdf",
        "image/jpeg",
        "image/jpg",
        "image/png",
    }
    if extension not in allowed_exts:
        raise ValueError("Cash receipt must be PDF, JPG, JPEG, or PNG.")
    if getattr(file_obj, "content_type", "") not in allowed_types:
        raise ValueError("Invalid cash receipt file type.")

    safe_bill_no = "".join(ch for ch in str(bill_no or "") if ch.isalnum()) or uuid.uuid4().hex[:8]
    file_name = f"RECEIPT-{safe_bill_no}-{uuid.uuid4().hex[:8]}{extension}"
    original_name = str(getattr(file_obj, "name", "") or "")

    target_roots = [
        LEGACY_UPLOAD_BASE / "accounts_approval",
        Path(settings.MEDIA_ROOT) / "accounts_approval",
        Path(settings.BASE_DIR) / "uploads" / "accounts_approval",
    ]
    for upload_root in target_roots:
        try:
            upload_root.mkdir(parents=True, exist_ok=True)
            destination = upload_root / file_name
            with destination.open("wb+") as handle:
                for chunk in file_obj.chunks():
                    handle.write(chunk)
            return file_name, original_name
        except Exception:
            continue
    raise RuntimeError("Unable to save cash receipt.")


def _base_where(tab):
    # Keep these filters aligned with the legacy PHP cases:
    # datatable -> vendor_payment_details
    # datatable_processed -> vendor_payment_details_main
    if tab == "approved":
        return ["COALESCE(finance_approval, 0) = 1", "COALESCE(accounts_approval, 0) = 1", "COALESCE(is_delete, 0) = 0"]
    return ["COALESCE(finance_approval, 0) = 1", "COALESCE(managment_team_approval_sts, 0) = 1", "COALESCE(accounts_approval, 0) = 0", "COALESCE(is_delete, 0) = 0"]


def _pending_list_query():
    pending_cols = _table_columns("vendor_payment_details")
    additional_col = _pick_col(pending_cols, "additionalcharges", "additional_charges")
    total_amount_expr = "ROUND(COALESCE(SUM(amount), 0), 2)"
    if additional_col:
        total_amount_expr = f"ROUND(COALESCE(SUM(amount), 0) + COALESCE(MAX({additional_col}), 0), 2)"

    return f"""
        SELECT
            MAX(unique_id) AS unique_id,
            bill_no,
            vendor_id,
            COALESCE(MAX(DATE_FORMAT(bill_date, '%%d-%%m-%%Y')), '') AS bill_date,
            COALESCE(MAX(DATE_FORMAT(vendor_inv_attach_approval_date, '%%d-%%m-%%Y')), '') AS vendor_invoice_date,
            COALESCE(MAX(veninvverifyid), '') AS vendor_invoice_no,
            COALESCE(MAX(vendor_name), '') AS vendor_name,
            COALESCE(MAX(get_vendor_company_name(vendor_id)), '') AS vendor_company_name,
            COALESCE(MAX(get_vendor_address(vendor_id)), '') AS vendor_address,
            COALESCE(MAX(get_vendor_contact(vendor_id)), '') AS vendor_contact,
            {total_amount_expr} AS total_amount,
            COALESCE(MAX(acctdsvalue), 0) AS acctdsvalue,
            COALESCE(MAX(accotherdeduction), 0) AS accotherdeduction,
            COALESCE(MAX(advancepayment), 0) AS advancepayment,
            COALESCE(MAX(acctotalpaybleamount), 0) AS acctotalpaybleamount,
            COALESCE(MAX(get_staff_name(vendor_bill_approval)), '') AS vendor_bill_approval,
            COALESCE(MAX(DATE_FORMAT(vendor_bill_approval_date, '%%d-%%m-%%Y')), '') AS vendor_bill_approval_date,
            COALESCE(MAX(get_staff_name(vendor_account_approved_by)), '') AS account_entry_by,
            COALESCE(MAX(DATE_FORMAT(vendor_account_approval_date, '%%d-%%m-%%Y')), '') AS account_entry_date,
            COALESCE(MAX(get_staff_name(finance_approved_by)), '') AS finance_approved_by,
            COALESCE(MAX(DATE_FORMAT(finance_approved_date, '%%d-%%m-%%Y')), '') AS finance_approved_date,
            COALESCE(MAX(get_staff_name(managment_team_approvedby)), '') AS management_approved_by,
            COALESCE(MAX(DATE_FORMAT(managment_team_approvaldate, '%%d-%%m-%%Y')), '') AS management_approval_date,
            COALESCE(MAX(account_remark), '') AS account_remark,
            '' AS transaction_type,
            '' AS transaction_id,
            '' AS transaction_date,
            '' AS cash_receipt_file_name,
            '' AS accounts_approved_by,
            '' AS accounts_approved_date
        FROM vendor_payment_details
    """


def _approved_list_query():
    approved_cols = _table_columns("vendor_payment_details_main")
    additional_col = _pick_col(approved_cols, "additionalcharges", "additional_charges")
    total_amount_expr = "ROUND(COALESCE(SUM(amount), 0), 2)"
    if additional_col:
        total_amount_expr = f"ROUND(COALESCE(SUM(amount), 0) + COALESCE(MAX({additional_col}), 0), 2)"

    return f"""
        SELECT
            MAX(unique_id) AS unique_id,
            bill_no,
            vendor_id,
            COALESCE(MAX(DATE_FORMAT(bill_date, '%%d-%%m-%%Y')), '') AS bill_date,
            COALESCE(MAX(DATE_FORMAT(vendor_inv_attach_approval_date, '%%d-%%m-%%Y')), '') AS vendor_invoice_date,
            COALESCE(MAX(veninvverifyid), '') AS vendor_invoice_no,
            COALESCE(MAX(vendor_name), '') AS vendor_name,
            COALESCE(MAX(get_vendor_company_name(vendor_id)), '') AS vendor_company_name,
            COALESCE(MAX(get_vendor_address(vendor_id)), '') AS vendor_address,
            COALESCE(MAX(get_vendor_contact(vendor_id)), '') AS vendor_contact,
            {total_amount_expr} AS total_amount,
            COALESCE(MAX(acctdsvalue), 0) AS acctdsvalue,
            COALESCE(MAX(accotherdeduction), 0) AS accotherdeduction,
            COALESCE(MAX(advancepayment), 0) AS advancepayment,
            COALESCE(MAX(acctotalpaybleamount), 0) AS acctotalpaybleamount,
            '' AS vendor_bill_approval,
            '' AS vendor_bill_approval_date,
            '' AS account_entry_by,
            '' AS account_entry_date,
            '' AS finance_approved_by,
            '' AS finance_approved_date,
            '' AS management_approved_by,
            '' AS management_approval_date,
            '' AS account_remark,
            COALESCE(MAX(transaction_type), '') AS transaction_type,
            COALESCE(MAX(transaction_id), '') AS transaction_id,
            COALESCE(MAX(DATE_FORMAT(transaction_date, '%%d-%%m-%%Y')), '') AS transaction_date,
            COALESCE(MAX(cash_receipt_file_name), '') AS cash_receipt_file_name,
            COALESCE(MAX(get_staff_name(accounts_approved_by)), '') AS accounts_approved_by,
            COALESCE(MAX(DATE_FORMAT(accounts_approved_date, '%%d-%%m-%%Y')), '') AS accounts_approved_date
        FROM vendor_payment_details_main
    """


def _find_context(unique_id):
    row = _one(
        """
        SELECT unique_id, bill_no, vendor_id, 'approved' AS tab
        FROM vendor_payment_details_main
        WHERE unique_id = %s AND is_delete = 0
        LIMIT 1
        """,
        [unique_id],
    )
    if row:
        return row
    return _one(
        """
        SELECT unique_id, bill_no, vendor_id, 'pending' AS tab
        FROM vendor_payment_details
        WHERE unique_id = %s AND is_delete = 0
        LIMIT 1
        """,
        [unique_id],
    )


class PaymentTransactionView(APIView):
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def get(self, request, unique_id=None):
        if unique_id:
            return self._detail(request, unique_id)
        return self._list(request)

    def post(self, request, unique_id=None):
        if not unique_id:
            return Response({"status": False, "message": "unique_id is required."}, status=status.HTTP_400_BAD_REQUEST)
        return self._update(request, unique_id)

    def _list(self, request):
        tab = request.query_params.get("tab", "pending").strip().lower()
        if tab not in {"pending", "approved"}:
            tab = "pending"

        page = max(_coerce_int(request.query_params.get("page"), 1), 1)
        requested_length = _coerce_int(request.query_params.get("length"), 10)
        length = -1 if requested_length == -1 else max(requested_length, 1)
        search = request.query_params.get("search", "").strip()
        from_date = request.query_params.get("from_date", "").strip()
        to_date = request.query_params.get("to_date", "").strip()

        where_clauses = _base_where(tab)
        params: list[object] = []

        if from_date and to_date:
            where_clauses.append("DATE(bill_date) BETWEEN %s AND %s")
            params.extend([from_date, to_date])

        if search:
            like = f"%{search}%"
            where_clauses.append(
                "("
                "bill_no LIKE %s OR "
                "COALESCE(veninvverifyid, '') LIKE %s OR "
                "COALESCE(vendor_name, '') LIKE %s OR "
                "COALESCE(account_remark, '') LIKE %s OR "
                "COALESCE(transaction_id, '') LIKE %s"
                ")"
            )
            params.extend([like, like, like, like, like])

        base_sql = _approved_list_query() if tab == "approved" else _pending_list_query()
        where_sql = " WHERE " + " AND ".join(where_clauses)
        group_sql = " GROUP BY bill_no, vendor_id"
        order_sql = " ORDER BY MAX(bill_date) DESC, MAX(unique_id) DESC"

        count_sql = f"SELECT COUNT(*) AS total FROM ({base_sql}{where_sql}{group_sql}) sub"
        total_row = _one(count_sql, params) or {"total": 0}
        total = _coerce_int(total_row.get("total"), 0)

        if length == -1:
            rows = _many(f"{base_sql}{where_sql}{group_sql}{order_sql}", params)
        else:
            offset = (page - 1) * length
            rows = _many(
                f"{base_sql}{where_sql}{group_sql}{order_sql} LIMIT %s OFFSET %s",
                [*params, length, offset],
            )

        return Response({
            "status": True,
            "recordsTotal": total,
            "recordsFiltered": total,
            "data": rows,
        })

    def _detail(self, request, unique_id):
        bill_no = request.query_params.get("bill_no", "").strip()
        vendor_id = request.query_params.get("vendor_id", "").strip()
        tab = request.query_params.get("tab", "").strip().lower()

        if not bill_no or not vendor_id:
            context = _find_context(unique_id)
            if not context:
                return Response({"status": False, "message": "Payment transaction not found."}, status=404)
            bill_no = bill_no or str(context.get("bill_no", ""))
            vendor_id = vendor_id or str(context.get("vendor_id", ""))
            tab = tab or str(context.get("tab", "pending"))

        if tab not in {"pending", "approved"}:
            tab = "approved"

        header_source = "vendor_payment_details_main" if tab == "approved" else "vendor_payment_details"
        header_cols = _table_columns(header_source)
        additional_col = _pick_col(header_cols, "additionalcharges", "additional_charges")
        total_amount_expr = "COALESCE(ROUND(SUM(amount), 2), 0)"
        grand_total_expr = total_amount_expr
        if additional_col:
            grand_total_expr = f"COALESCE(ROUND(SUM(amount) + MAX({additional_col}), 2), 0)"
        header = _one(
            f"""
            SELECT
                MAX(unique_id) AS unique_id,
                bill_no,
                vendor_id,
                COALESCE(MAX(DATE_FORMAT(bill_date, '%%d-%%m-%%Y')), '') AS bill_date,
                COALESCE(MAX(DATE_FORMAT(vendor_inv_attach_approval_date, '%%d-%%m-%%Y')), '') AS vendor_invoice_date,
                COALESCE(MAX(veninvverifyid), '') AS vendor_invoice_no,
                COALESCE(MAX(vendor_name), '') AS vendor_name,
                COALESCE(MAX(get_vendor_company_name(vendor_id)), '') AS vendor_company_name,
                COALESCE(MAX(get_vendor_address(vendor_id)), '') AS vendor_address,
                COALESCE(MAX(get_vendor_contact(vendor_id)), '') AS vendor_contact,
                {total_amount_expr} AS total_amount,
                {f"COALESCE(MAX({additional_col}), 0)" if additional_col else "0"} AS additional_charges,
                {grand_total_expr} AS grand_total_amount,
                COALESCE(MAX(acctdsvalue), 0) AS acctdsvalue,
                COALESCE(MAX(accotherdeduction), 0) AS accotherdeduction,
                COALESCE(MAX(advancepayment), 0) AS advancepayment,
                COALESCE(MAX(acctotalpaybleamount), 0) AS acctotalpaybleamount,
                COALESCE(MAX(get_staff_name(vendor_bill_created_by)), (SELECT staff_name FROM `user` WHERE unique_id = MAX(vendor_bill_created_by) AND is_delete = 0 LIMIT 1), '') AS bill_created_by,
                COALESCE(MAX(get_staff_name(vendor_bill_approval)), '') AS vendor_bill_approval,
                COALESCE(MAX(DATE_FORMAT(vendor_bill_approval_date, '%%d-%%m-%%Y')), '') AS vendor_bill_approval_date,
                COALESCE(MAX(get_staff_name(vendor_account_approved_by)), '') AS account_entry_by,
                COALESCE(MAX(DATE_FORMAT(vendor_account_approval_date, '%%d-%%m-%%Y')), '') AS account_entry_date,
                COALESCE(MAX(get_staff_name(finance_approved_by)), '') AS finance_approved_by,
                COALESCE(MAX(DATE_FORMAT(finance_approved_date, '%%d-%%m-%%Y')), '') AS finance_approved_date,
                COALESCE(MAX(get_staff_name(managment_team_approvedby)), (SELECT staff_name FROM `user` WHERE unique_id = MAX(managment_team_approvedby) AND is_delete = 0 LIMIT 1), '') AS management_approved_by,
                COALESCE(MAX(DATE_FORMAT(managment_team_approvaldate, '%%d-%%m-%%Y')), '') AS management_approval_date,
                COALESCE(MAX(account_remark), '') AS account_remark,
                COALESCE(MAX(transaction_type), '') AS transaction_type,
                COALESCE(MAX(transaction_id), '') AS transaction_id,
                COALESCE(MAX(DATE_FORMAT(transaction_date, '%%d-%%m-%%Y')), '') AS transaction_date,
                COALESCE(MAX(cash_receipt_file_name), '') AS cash_receipt_file_name,
                COALESCE(MAX(cash_receipt_file_org), '') AS cash_receipt_file_org,
                COALESCE(MAX(get_staff_name(accounts_approved_by)), '') AS accounts_approved_by,
                COALESCE(MAX(DATE_FORMAT(accounts_approved_date, '%%d-%%m-%%Y')), '') AS accounts_approved_date,
                COALESCE(MAX(inv_verfiy_attach), '') AS inv_verfiy_attach,
                COALESCE(MAX(bank_name), '') AS bank_name,
                COALESCE(MAX(banknamenew), '') AS banknamenew,
                COALESCE(MAX(ifsc_code), '') AS ifsc_code,
                COALESCE(MAX(account_no), '') AS account_no,
                COALESCE(MAX(branch_name), '') AS branch_name,
                COALESCE(MAX(upi_method), '') AS upi_method,
                COALESCE(MAX(upi_id), '') AS upi_id,
                COALESCE(MAX(upi_mobile_no), '') AS upi_mobile_no,
                COALESCE(MAX(payment_id), '') AS payment_id
            FROM {header_source}
            WHERE bill_no = %s AND vendor_id = %s AND is_delete = 0
            GROUP BY bill_no, vendor_id
            LIMIT 1
            """,
            [bill_no, vendor_id],
        )
        if not header:
            return Response({"status": False, "message": "Payment transaction detail not found."}, status=404)

        vendor_summary = _one(
            """
            SELECT
                COALESCE(name, '') AS name,
                COALESCE(company_name, '') AS company_name,
                COALESCE(contact_no, '') AS contact_no,
                COALESCE(mail_id, '') AS mail_id,
                COALESCE(pan_no, '') AS pan_no,
                COALESCE(gst_no, '') AS gst_no,
                COALESCE(address, '') AS address,
                COALESCE(account_no, '') AS account_no,
                COALESCE(ifsc_code, '') AS ifsc_code,
                COALESCE(bank_name, '') AS bank_name,
                COALESCE(branch_name, '') AS branch_name,
                COALESCE(pincode, '') AS pincode,
                COALESCE(acc_holder_name, '') AS acc_holder_name,
                COALESCE(bank_proof, '') AS bank_proof,
                COALESCE(pan_attach_file_name, '') AS pan_attach_file_name
            FROM vendor_creation
            WHERE unique_id = %s
            LIMIT 1
            """,
            [vendor_id],
        ) or {}

        items = _many(
            """
            SELECT
                unique_id,
                po_num,
                dc_num,
                DATE_FORMAT(dc_date, '%%d-%%m-%%Y') AS dc_date,
                COALESCE(invoice_qty, 0) AS invoice_qty,
                COALESCE(rate, 0) AS rate,
                COALESCE(gst, 0) AS gst,
                COALESCE(amount, 0) AS amount,
                COALESCE(
                    (SELECT DATE_FORMAT(invoice_date, '%%d-%%m-%%Y')
                     FROM view_outsource_vendor_verified_invoice
                     WHERE vendor_payment_details.po_form_unique_id = view_outsource_vendor_verified_invoice.form_main_unique_id
                     LIMIT 1),
                    ''
                ) AS invoice_date,
                COALESCE(
                    (SELECT DATE_FORMAT(po_date, '%%d-%%m-%%Y')
                     FROM view_outsource_vendor_verified_invoice
                     WHERE vendor_payment_details.po_form_unique_id = view_outsource_vendor_verified_invoice.form_main_unique_id
                     LIMIT 1),
                    ''
                ) AS po_date
            FROM vendor_payment_details
            WHERE vendor_id = %s AND bill_no = %s AND COALESCE(finance_approval, 0) = 1 AND COALESCE(is_delete, 0) = 0
            ORDER BY dc_date ASC, unique_id ASC
            """,
            [vendor_id, bill_no],
        )

        item_rows = []
        for index, item in enumerate(items, start=1):
            qty = float(item.get("invoice_qty") or 0)
            rate = float(item.get("rate") or 0)
            gst = float(item.get("gst") or 0)
            basic_amount = round(qty * rate, 2)
            gst_amount = round(basic_amount * (gst / 100), 2)
            item_rows.append({
                "s_no": index,
                "unique_id": item.get("unique_id", ""),
                "po_num": item.get("po_num", ""),
                "po_date": item.get("po_date", ""),
                "invoice_no": header.get("vendor_invoice_no", ""),
                "invoice_date": item.get("invoice_date", ""),
                "dc_num": item.get("dc_num", ""),
                "dc_date": item.get("dc_date", ""),
                "invoice_qty": qty,
                "rate": rate,
                "basic_amount": basic_amount,
                "gst": gst,
                "gst_amount": gst_amount,
                "amount": float(item.get("amount") or 0),
            })

        return Response({
            "status": True,
            "data": {
                "summary": header,
                "vendor_summary": vendor_summary,
                "items": item_rows,
            },
        })

    def _update(self, request, unique_id):
        action = str(request.data.get("action", "") or "").strip().lower()
        if action == "update_remark":
            return self._update_remark(request, unique_id)
        if action in {"submit_payment", "payment_store_detail"}:
            return self._submit_payment(request, unique_id)
        return Response({"status": False, "message": "Invalid action."}, status=status.HTTP_400_BAD_REQUEST)

    def _update_remark(self, request, unique_id):
        context = _find_context(unique_id)
        if not context:
            return Response({"status": False, "message": "Payment transaction not found."}, status=404)

        bill_no = str(request.data.get("bill_no", "") or context.get("bill_no", "")).strip()
        remark = str(request.data.get("remark", "") or request.data.get("remarks", "") or "").strip()
        if not bill_no:
            return Response({"status": False, "message": "bill_no is required."}, status=status.HTTP_400_BAD_REQUEST)

        with connection.cursor() as cursor:
            cursor.execute(
                "UPDATE vendor_payment_details SET account_remark = %s WHERE bill_no = %s AND is_delete = 0",
                [remark, bill_no],
            )
            cursor.execute(
                "UPDATE vendor_payment_details_main SET account_remark = %s WHERE bill_no = %s AND is_delete = 0",
                [remark, bill_no],
            )

        return Response({"status": True, "msg": "update", "message": "Remark updated successfully."})

    def _submit_payment(self, request, unique_id):
        context = _find_context(unique_id)
        if not context:
            return Response({"status": False, "message": "Payment transaction not found."}, status=404)

        bill_no = str(request.data.get("bill_no", "") or context.get("bill_no", "")).strip()
        vendor_name = str(request.data.get("vendor_name", "") or "").strip()
        transaction_type = str(request.data.get("transaction_type", "") or "").strip()
        transaction_date = str(request.data.get("transaction_date", "") or "").strip()
        bank_name = str(request.data.get("bank_name", "") or "").strip()
        bank_name_new = str(request.data.get("banknamenew", "") or request.data.get("bank_name_new", "") or "").strip()
        ifsc_code = str(request.data.get("ifsc_code", "") or "").strip()
        account_no = str(request.data.get("account_no", "") or "").strip()
        branch_name = str(request.data.get("branch_name", "") or request.data.get("branch", "") or "").strip()
        online_type = str(request.data.get("online_type", "") or "").strip()
        upi_id = str(request.data.get("upi_id", "") or "").strip()
        upi_mobile = str(request.data.get("upi_mobile", "") or "").strip()
        transaction_id_1 = str(request.data.get("transaction_id_1", "") or "").strip()
        transaction_id_2 = str(request.data.get("transaction_id_2", "") or "").strip()
        payment_id = str(request.data.get("payment_id", "") or "").strip()
        user_id = _get_request_user_id(request)

        if not bill_no:
            return Response({"status": False, "message": "bill_no is required."}, status=status.HTTP_400_BAD_REQUEST)
        if transaction_type not in {"1", "2", "3"}:
            return Response({"status": False, "message": "Please select a valid transaction type."}, status=status.HTTP_400_BAD_REQUEST)
        if not transaction_date:
            return Response({"status": False, "message": "Please select transaction date."}, status=status.HTTP_400_BAD_REQUEST)

        cash_receipt_file_name = ""
        cash_receipt_file_org = ""
        transaction_id = ""
        upi_method = ""

        try:
            if transaction_type == "1":
                cash_receipt = request.FILES.get("cash_receipt")
                if not cash_receipt:
                    return Response({"status": False, "message": "Please upload the Cash Receipt."}, status=status.HTTP_400_BAD_REQUEST)
                cash_receipt_file_name, cash_receipt_file_org = _save_cash_receipt(cash_receipt, bill_no)
            elif transaction_type == "2":
                if not all([bank_name, ifsc_code, account_no, branch_name, bank_name_new]):
                    return Response({"status": False, "message": "Please fill out all Bank details."}, status=status.HTTP_400_BAD_REQUEST)
                if len(transaction_id_1) < 6:
                    return Response({"status": False, "message": "Transaction ID must be at least 6 characters."}, status=status.HTTP_400_BAD_REQUEST)
                transaction_id = transaction_id_1
            else:
                if not all([online_type, upi_id, upi_mobile, transaction_id_2]):
                    return Response({"status": False, "message": "Please fill out all UPI payment details."}, status=status.HTTP_400_BAD_REQUEST)
                if len(upi_mobile) != 10 or not upi_mobile.isdigit():
                    return Response({"status": False, "message": "Mobile number must be 10 digits."}, status=status.HTTP_400_BAD_REQUEST)
                if len(transaction_id_2) < 6:
                    return Response({"status": False, "message": "Transaction ID must be at least 6 characters."}, status=status.HTTP_400_BAD_REQUEST)
                transaction_id = transaction_id_2
                upi_method = online_type
        except (ValueError, RuntimeError) as error:
            return Response({"status": False, "message": str(error)}, status=status.HTTP_400_BAD_REQUEST)

        update_values = [
            transaction_type,
            transaction_date,
            bank_name if transaction_type == "2" else "",
            bank_name_new if transaction_type == "2" else "",
            ifsc_code if transaction_type == "2" else "",
            account_no if transaction_type == "2" else "",
            branch_name if transaction_type == "2" else "",
            upi_method if transaction_type == "3" else "",
            upi_id if transaction_type == "3" else "",
            upi_mobile if transaction_type == "3" else "",
            cash_receipt_file_name if transaction_type == "1" else "",
            cash_receipt_file_org if transaction_type == "1" else "",
            user_id,
            transaction_id,
            payment_id,
            bill_no,
        ]

        sql = """
            UPDATE {table}
            SET
                accounts_approval = 1,
                transaction_type = %s,
                transaction_date = %s,
                bank_name = NULLIF(%s, ''),
                banknamenew = NULLIF(%s, ''),
                ifsc_code = NULLIF(%s, ''),
                account_no = NULLIF(%s, ''),
                branch_name = NULLIF(%s, ''),
                upi_method = NULLIF(%s, ''),
                upi_id = NULLIF(%s, ''),
                upi_mobile_no = NULLIF(%s, ''),
                cash_receipt_file_name = NULLIF(%s, ''),
                cash_receipt_file_org = NULLIF(%s, ''),
                accounts_approved_by = NULLIF(%s, ''),
                accounts_approved_date = NOW(),
                transaction_id = NULLIF(%s, ''),
                payment_id = NULLIF(%s, '')
            WHERE bill_no = %s AND is_delete = 0
        """

        with connection.cursor() as cursor:
            cursor.execute(sql.format(table="vendor_payment_details"), update_values)
            cursor.execute(sql.format(table="vendor_payment_details_main"), update_values)

        _create_payment_notifications(bill_no, user_id)

        return Response({
            "status": True,
            "msg": "create",
            "message": f"Payment details saved successfully for bill no {bill_no}.",
            "data": {
                "bill_no": bill_no,
                "vendor_name": vendor_name,
                "transaction_type": transaction_type,
            },
        })

    def delete(self, request, unique_id=None):
        if not unique_id:
            return Response({"status": False, "message": "unique_id is required."}, status=status.HTTP_400_BAD_REQUEST)

        with connection.cursor() as cursor:
            cursor.execute("UPDATE vendor_payment_details SET is_delete = 1 WHERE unique_id = %s", [unique_id])
            cursor.execute("UPDATE vendor_payment_details_main SET is_delete = 1 WHERE unique_id = %s", [unique_id])
        return Response({"status": True, "msg": "Deleted Successfully"})
