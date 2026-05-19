from django.db import connection
from rest_framework.response import Response
from rest_framework.views import APIView


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


def _rows(cursor):
    columns = [col[0] for col in cursor.description]
    return [dict(zip(columns, row)) for row in cursor.fetchall()]


def _fetchone(query, params=None):
    with connection.cursor() as cursor:
        cursor.execute(query, params or [])
        rows = _rows(cursor)
    return rows[0] if rows else None


def _fetchall(query, params=None):
    with connection.cursor() as cursor:
        cursor.execute(query, params or [])
        return _rows(cursor)


def _report_sql_parts(search=""):
    payment_cols = _table_columns("vendor_payment_details")
    vendor_id_col = _pick_col(payment_cols, "vendor_id")
    if not vendor_id_col:
        raise ValueError("vendor_id column not found in vendor_payment_details.")

    vendor_name_col = _pick_col(payment_cols, "vendor_name")
    order_col = _pick_col(payment_cols, "id", "created", "unique_id", vendor_id_col)
    invoice_amount_col = _pick_col(payment_cols, "total_amount", "amount")
    tds_percent_col = _pick_col(payment_cols, "tdsvaluepercentage", "tds_percentage", "tds")
    deduction_col = _pick_col(payment_cols, "acctdsvalue")
    payable_col = _pick_col(payment_cols, "acctotalpaybleamount")
    payment_ref_col = _pick_col(payment_cols, "payment_id", "transaction_id")
    management_status_col = _pick_col(payment_cols, "managment_team_approval_sts")
    accounts_status_col = _pick_col(payment_cols, "accounts_approval")
    finance_status_col = _pick_col(payment_cols, "finance_approval", "finance_approval_sts")
    created_by_col = _pick_col(payment_cols, "vendor_bill_created_by")

    vendor_name_expr = (
        f"COALESCE(MAX(NULLIF(vpd.{vendor_name_col}, '')), MAX(vc.company_name), MAX(vc.name), '')"
        if vendor_name_col
        else "COALESCE(MAX(vc.company_name), MAX(vc.name), '')"
    )
    invoice_amount_expr = (
        f"ROUND(SUM(COALESCE(vpd.{invoice_amount_col}, 0)), 2)"
        if invoice_amount_col
        else "0"
    )
    if tds_percent_col:
        tds_expr = f"COALESCE(MAX(vpd.{tds_percent_col}), 0)"
    elif deduction_col and invoice_amount_col:
        tds_expr = (
            f"ROUND(CASE "
            f"WHEN SUM(COALESCE(vpd.{invoice_amount_col}, 0)) = 0 THEN 0 "
            f"ELSE (SUM(COALESCE(vpd.{deduction_col}, 0)) / SUM(COALESCE(vpd.{invoice_amount_col}, 0))) * 100 "
            f"END, 2)"
        )
    else:
        tds_expr = "0"
    deduction_expr = f"ROUND(SUM(COALESCE(vpd.{deduction_col}, 0)), 2)" if deduction_col else "0"
    payable_expr = f"ROUND(SUM(COALESCE(vpd.{payable_col}, 0)), 2)" if payable_col else "0"
    created_by_expr = "COALESCE(MAX(u.staff_name), '')" if created_by_col else "''"
    user_join = (
        f"LEFT JOIN `user` u ON u.unique_id = vpd.{created_by_col} AND COALESCE(u.is_delete, 0) = 0"
        if created_by_col
        else ""
    )

    where_clauses = []
    params = []

    if payment_ref_col:
        where_clauses.append(f"COALESCE(NULLIF(vpd.{payment_ref_col}, ''), '') <> ''")
    if management_status_col:
        where_clauses.append(f"COALESCE(vpd.{management_status_col}, 0) = 1")
    if accounts_status_col:
        where_clauses.append(f"COALESCE(vpd.{accounts_status_col}, 0) = 1")
    if finance_status_col:
        where_clauses.append(f"COALESCE(vpd.{finance_status_col}, 0) = 1")
    if "is_delete" in {str(col).lower() for col in payment_cols}:
        where_clauses.append("COALESCE(vpd.is_delete, 0) = 0")

    if search:
        like_value = f"%{search}%"
        where_clauses.append(
            "("
            + (f"COALESCE(vpd.{vendor_name_col}, '') LIKE %s OR " if vendor_name_col else "")
            + "COALESCE(vc.company_name, '') LIKE %s OR "
            + "COALESCE(vc.name, '') LIKE %s OR "
            + "COALESCE(vc.account_no, '') LIKE %s OR "
            + "COALESCE(vc.bank_name, '') LIKE %s OR "
            + "COALESCE(vc.ifsc_code, '') LIKE %s OR "
            + "COALESCE(u.staff_name, '') LIKE %s"
            + ")"
        )
        params.extend([like_value] * (7 if vendor_name_col else 6))

    where_sql = f"WHERE {' AND '.join(where_clauses)}" if where_clauses else ""
    base_from_sql = f"""
        FROM vendor_payment_details vpd
        LEFT JOIN vendor_creation vc
          ON vc.unique_id = vpd.{vendor_id_col}
         AND COALESCE(vc.is_delete, 0) = 0
        {user_join}
        {where_sql}
    """

    select_sql = f"""
        SELECT
            COALESCE(MAX(vpd.{vendor_id_col}), '') AS unique_id,
            {vendor_name_expr} AS vendor_name,
            {invoice_amount_expr} AS invoice_amount,
            {tds_expr} AS tds,
            {deduction_expr} AS deduction,
            {payable_expr} AS payable_amount,
            COALESCE(MAX(vc.account_no), '') AS account_no,
            COALESCE(MAX(vc.name), '') AS name,
            COALESCE(MAX(vc.bank_name), '') AS bank_name,
            COALESCE(MAX(vc.ifsc_code), '') AS ifsc_code,
            {created_by_expr} AS vendor_bill_created_by
            {base_from_sql}
        GROUP BY vpd.{vendor_id_col}
        ORDER BY MAX(vpd.{order_col}) DESC
    """

    count_sql = f"""
        SELECT vpd.{vendor_id_col}
        {base_from_sql}
        GROUP BY vpd.{vendor_id_col}
    """

    return {
        "select_sql": select_sql,
        "count_sql": count_sql,
        "params": params,
    }


class PaymentProcessReportListView(APIView):
    def post(self, request):
        payload = request.data if hasattr(request, "data") else {}
        draw = _coerce_int(payload.get("draw"), 1)
        start = max(_coerce_int(payload.get("start"), 0), 0)
        length = _coerce_int(payload.get("length"), 10)
        if length == 0:
            length = 10
        if length < 0:
            length = 100000

        search_value = payload.get("search", "")
        if isinstance(search_value, dict):
            search_value = search_value.get("value", "")
        search = str(search_value or "").strip()

        try:
            report_sql = _report_sql_parts(search)
            total_row = _fetchone(
                f"SELECT COUNT(*) AS total FROM ({report_sql['count_sql']}) payment_process_report_count",
                report_sql["params"],
            ) or {"total": 0}
            rows = _fetchall(
                f"{report_sql['select_sql']} LIMIT %s OFFSET %s",
                [*report_sql["params"], length, start],
            )
            return Response({
                "status": True,
                "draw": draw,
                "recordsTotal": _coerce_int(total_row.get("total"), 0),
                "recordsFiltered": _coerce_int(total_row.get("total"), 0),
                "data": rows,
            })
        except Exception as exc:
            return Response({
                "status": False,
                "draw": draw,
                "recordsTotal": 0,
                "recordsFiltered": 0,
                "data": [],
                "message": str(exc),
            }, status=500)
