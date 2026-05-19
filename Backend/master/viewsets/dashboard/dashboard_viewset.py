from django.db import connection
from django.db.utils import ProgrammingError
from rest_framework.response import Response
from rest_framework.views import APIView

from master.tenant import request_company_id


def _fetch_one(sql, params=None):
    try:
        with connection.cursor() as cursor:
            cursor.execute(sql, params or [])
            row = cursor.fetchone()
            cols = [col[0] for col in cursor.description] if cursor.description else []
    except ProgrammingError as exc:
        # Some deployments are missing optional summary tables/views.
        # The dashboard should degrade to zero values instead of 500ing.
        if exc.args and exc.args[0] == 1146:
            return {}
        raise
    if not row:
        return {}
    return dict(zip(cols, row))


def _fetch_all(sql, params=None):
    try:
        with connection.cursor() as cursor:
            cursor.execute(sql, params or [])
            rows = cursor.fetchall()
            cols = [col[0] for col in cursor.description] if cursor.description else []
    except ProgrammingError as exc:
        if exc.args and exc.args[0] == 1146:
            return []
        raise
    return [dict(zip(cols, row)) for row in rows]


def _num(value):
    try:
        return float(value or 0)
    except (TypeError, ValueError):
        return 0.0


def _count(value):
    try:
        return int(float(value or 0))
    except (TypeError, ValueError):
        return 0


def _format_indian(value, decimals=2):
    number = _num(value)
    sign = "-" if number < 0 else ""
    number = abs(number)
    text = f"{number:.{decimals}f}"
    whole, frac = text.split(".")
    if len(whole) > 3:
        last3 = whole[-3:]
        rest = whole[:-3]
        parts = []
        while len(rest) > 2:
            parts.insert(0, rest[-2:])
            rest = rest[:-2]
        if rest:
            parts.insert(0, rest)
        whole = ",".join(parts + [last3])
    return f"{sign}{whole}.{frac}" if decimals else f"{sign}{whole}"


def _acc_clause(acc_year, column="acc_year"):
    if not acc_year:
        return "", []
    return f" AND {column} = %s", [acc_year]


def _acc_filter(column, acc_year):
    if not acc_year:
        return "", []
    return f" AND {column} = %s", [acc_year]


def _company_filter(company_id, column="sess_company_id"):
    if not company_id:
        return "", []
    return f" AND {column} = %s", [company_id]


def _blocked_tenant_summary(company_id):
    # Summary views without sess_company_id cannot be isolated by tenant.
    # Hide them until the DB view/table is rebuilt with company id.
    if not company_id:
        return "", []
    return " AND 1=0", []


class DashboardSummaryView(APIView):
    def get(self, request):
        acc_year = (request.query_params.get("acc_year") or "").strip()
        company_id = request_company_id(request)
        acc_clause, acc_params = _acc_clause(acc_year)
        po_company_clause, po_company_params = _company_filter(company_id)

        po_count_row = _fetch_one(
            f"""
            SELECT COUNT(DISTINCT unique_id) AS po_count
            FROM po_form
            WHERE is_delete = 0
              { _acc_filter('acc_year', acc_year)[0] }
              { po_company_clause }
            """,
            _acc_filter("acc_year", acc_year)[1] + po_company_params,
        )
        po_value_row = _fetch_one(
            f"""
            SELECT
                COALESCE(SUM(total_amount), 0) AS invoice_value,
                COALESCE(SUM(total_qty), 0) AS po_qty
            FROM po_form
            WHERE is_delete = 0
              { _acc_filter('acc_year', acc_year)[0] }
              { po_company_clause }
            """,
            _acc_filter("acc_year", acc_year)[1] + po_company_params,
        )
        amc_row = _fetch_one(
            f"""
            SELECT
                COUNT(DISTINCT unique_id) AS amc_count,
                COALESCE(SUM(amcvalue), 0) AS amc_total_value
            FROM po_form
            WHERE is_delete = 0
              AND COALESCE(amc_required, '') NOT IN ('', '0', 'No', 'NO', 'no')
              { _acc_filter('acc_year', acc_year)[0] }
              { po_company_clause }
            """,
            _acc_filter("acc_year", acc_year)[1] + po_company_params,
        )
        pending_row = _fetch_one(
            f"""
            SELECT
                COUNT(DISTINCT unique_id) AS po_count,
                COALESCE(SUM(total_amount), 0) AS invoice_value,
                COALESCE(SUM(total_qty), 0) AS po_qty
            FROM po_form
            WHERE COALESCE(file_name, '') = ''
              AND is_delete = 0
              { _acc_filter('acc_year', acc_year)[0] }
              { po_company_clause }
            """,
            _acc_filter("acc_year", acc_year)[1] + po_company_params,
        )
        railway_row = _fetch_one(
            f"""
            SELECT
                COUNT(unique_id) AS po_count,
                COALESCE(SUM(total_amount), 0) AS invoice_value,
                COALESCE(SUM(total_qty), 0) AS po_qty
            FROM po_form
            WHERE is_delete = 0
              AND type_of_po = 2
              { _acc_filter('acc_year', acc_year)[0] }
              { po_company_clause }
            """,
            _acc_filter("acc_year", acc_year)[1] + po_company_params,
        )

        if acc_year:
            addr_year_join = " AND pf.acc_year = %s"
            addr_year_main = " AND acc_year = %s"
        else:
            addr_year_join = ""
            addr_year_main = ""
        if company_id:
            addr_company_join = " AND pf.sess_company_id = %s"
            addr_company_main = " AND sess_company_id = %s"
        else:
            addr_company_join = ""
            addr_company_main = ""
        addr_params = []
        for _ in range(3):
            if acc_year:
                addr_params.append(acc_year)
            if company_id:
                addr_params.append(company_id)
        if acc_year:
            addr_params.append(acc_year)
        if company_id:
            addr_params.append(company_id)

        consignee_row = _fetch_one(
            f"""
            SELECT
                COUNT(unique_id) AS po_count,
                (
                    SELECT COUNT(b.unique_id)
                    FROM consignee_details_sub AS b
                    INNER JOIN po_form AS pf
                        ON b.form_main_unique_id = pf.unique_id
                    WHERE b.is_delete = 0
                      AND pf.is_delete = 0
                      AND pf.type_of_po = 1
                      {addr_year_join}
                      {addr_company_join}
                ) AS consignee_total_address,
                (
                    SELECT COUNT(b.unique_id)
                    FROM consignee_details_sub AS b
                    INNER JOIN po_form AS pf
                        ON b.form_main_unique_id = pf.unique_id
                    WHERE b.is_delete = 0
                      AND pf.is_delete = 0
                      AND pf.type_of_po = 1
                      AND b.cons_verify_sts = 1
                      {addr_year_join}
                      {addr_company_join}
                ) AS tot_verify_address,
                (
                    SELECT COUNT(b.unique_id)
                    FROM consignee_details_sub AS b
                    INNER JOIN po_form AS pf
                        ON b.form_main_unique_id = pf.unique_id
                    WHERE b.is_delete = 0
                      AND pf.is_delete = 0
                      AND pf.type_of_po = 1
                      AND (b.cons_verify_sts != 1 OR b.cons_verify_sts IS NULL)
                      {addr_year_join}
                      {addr_company_join}
                ) AS tot_not_verify_address
            FROM po_form
            WHERE is_delete = 0
              AND type_of_po = 1
              {addr_year_main}
              {addr_company_main}
            """,
            addr_params,
        )

        sector_params = []
        sector_year_sql = ""
        sector_company_sql = ""
        if acc_year:
            sector_year_sql = "AND pf.acc_year = %s"
            sector_params.append(acc_year)
        if company_id:
            sector_company_sql = "AND pf.sess_company_id = %s"
            sector_params.append(company_id)
        sector_rows = _fetch_all(
            f"""
            SELECT
                s.sector_name,
                COUNT(pf.acc_sector) AS po_count,
                COALESCE(SUM(pf.total_amount), 0) AS invoice_value,
                COALESCE(SUM(pf.total_qty), 0) AS po_qty
            FROM account_sector s
            LEFT JOIN po_form pf
              ON pf.acc_sector = s.unique_id
             AND pf.is_delete = 0
             {sector_year_sql}
             {sector_company_sql}
            WHERE s.is_delete = 0
              {f"AND s.sess_company_id IN ('', %s)" if company_id else ""}
            GROUP BY s.sector_name
            ORDER BY s.sector_name
            """,
            sector_params + ([company_id] if company_id else []),
        )

        consignee_params = [acc_year] if acc_year else []
        consignee_company_sql = ""
        if company_id:
            consignee_company_sql = """
              AND EXISTS (
                  SELECT 1
                  FROM po_form pf
                  WHERE pf.unique_id = po_consignee_assign.form_main_unique_id
                    AND pf.is_delete = 0
                    AND pf.sess_company_id = %s
              )
            """
            consignee_params.append(company_id)
        consignee_completed = _fetch_one(
            f"""
            SELECT
                COUNT(DISTINCT form_main_unique_id) AS po_count,
                COALESCE(SUM(stock_qty), 0) AS stock_assign,
                COALESCE(SUM(invoice_qty_value), 0) AS total_value
            FROM po_consignee_assign
            WHERE df = 0
              AND stock_qty != 0
              AND total_invoice_qty != 0
              {'AND acc_year = %s' if acc_year else ''}
              {consignee_company_sql}
            """,
            consignee_params,
        )
        consignee_partial = _fetch_one(
            f"""
            SELECT
                COUNT(DISTINCT form_main_unique_id) AS po_count,
                COALESCE(SUM(stock_qty), 0) AS stock_assign,
                COALESCE(SUM(invoice_qty_value), 0) AS total_value,
                COALESCE(SUM(df), 0) AS balance_qty,
                COALESCE(SUM(df_val), 0) AS balance_value
            FROM po_consignee_assign
            WHERE stock_qty != 0
              AND total_invoice_qty != 0
              AND df != 0
              {'AND acc_year = %s' if acc_year else ''}
              {consignee_company_sql}
            """,
            consignee_params,
        )
        consignee_no_assign = _fetch_one(
            f"""
            SELECT
                COUNT(DISTINCT form_main_unique_id) AS po_count,
                COALESCE(SUM(stock_qty_value), 0) AS total_value
            FROM po_consignee_assign
            WHERE stock_qty != 0
              AND total_invoice_qty = 0
              AND df != 0
              {'AND acc_year = %s' if acc_year else ''}
              {consignee_company_sql}
            """,
            consignee_params,
        )
        consignee_total = _fetch_one(
            f"""
            SELECT
                COUNT(form_main_unique_id) AS po_count,
                COALESCE(SUM(stock_qty), 0) AS stock_assign
            FROM po_consignee_assign
            WHERE 1=1
              {'AND acc_year = %s' if acc_year else ''}
              {consignee_company_sql}
            """,
            consignee_params,
        )

        summary_block_clause, summary_block_params = _blocked_tenant_summary(company_id)
        summary_params = acc_params + summary_block_params

        stores_pending = _fetch_one(
            f"""
            SELECT
                COALESCE(SUM(po_count), 0) AS po_count,
                COALESCE(SUM(invoice_count), 0) AS invoice_count,
                COALESCE(SUM(invoice_value), 0) AS invoice_value
            FROM invoice_summary
            WHERE 1=1 {acc_clause} {summary_block_clause}
            """,
            summary_params,
        )
        stores_completed = _fetch_one(
            f"""
            SELECT
                COALESCE(SUM(po_count), 0) AS po_count,
                COALESCE(SUM(invoice_count), 0) AS invoice_count,
                COALESCE(SUM(invoice_value), 0) AS invoice_value
            FROM invoice_summary_approved
            WHERE 1=1 {acc_clause} {summary_block_clause}
            """,
            summary_params,
        )
        dispatch_pending = _fetch_one(
            f"""
            SELECT
                COALESCE(SUM(po_count), 0) AS po_count,
                COALESCE(SUM(invoice_count), 0) AS invoice_count,
                COALESCE(SUM(invoice_value), 0) AS invoice_value
            FROM invoice_summary_pending_dispatch
            WHERE 1=1 {acc_clause} {summary_block_clause}
            """,
            summary_params,
        )
        transit_pending = _fetch_one(
            f"""
            SELECT
                COALESCE(SUM(po_count), 0) AS po_count,
                COALESCE(SUM(invoice_count), 0) AS invoice_count,
                COALESCE(SUM(invoice_value), 0) AS invoice_value
            FROM delivery_status_in_transit
            WHERE 1=1 {acc_clause} {summary_block_clause}
            """,
            summary_params,
        )

        elcot_row = _fetch_one(
            f"""
            SELECT
                COALESCE(SUM(po_count), 0) AS po_count,
                COALESCE(SUM(invoice_count), 0) AS invoice_count,
                COALESCE(SUM(dc_count), 0) AS dc_count,
                COALESCE(SUM(invoice_value), 0) AS invoice_value
            FROM opera_doc_table
            WHERE 1=1 {acc_clause} {summary_block_clause}
            """,
            summary_params,
        )
        sign_row = _fetch_one(
            f"""
            SELECT
                COALESCE(SUM(sign_po_count), 0) AS po_count,
                COALESCE(SUM(sign_invoice_count), 0) AS invoice_count,
                COALESCE(SUM(sign_dc_count), 0) AS dc_count,
                COALESCE(SUM(sign_invoice_value), 0) AS invoice_value
            FROM opera_sign_table
            WHERE 1=1 {acc_clause} {summary_block_clause}
            """,
            summary_params,
        )
        bg_row = _fetch_one(
            f"""
            SELECT
                COALESCE(SUM(po_count), 0) AS po_count,
                COALESCE(SUM(invoice_count), 0) AS invoice_count,
                COALESCE(SUM(dc_count), 0) AS dc_count,
                COALESCE(SUM(invoice_value), 0) AS invoice_value
            FROM sign_doc_summary
            WHERE 1=1 {acc_clause} {summary_block_clause}
            """,
            summary_params,
        )
        entry_row = _fetch_one(
            f"""
            SELECT
                COALESCE(SUM(po_count), 0) AS po_count,
                COALESCE(SUM(invoice_count), 0) AS invoice_count,
                COALESCE(SUM(dc_count), 0) AS dc_count,
                COALESCE(SUM(invoice_value), 0) AS invoice_value
            FROM bill_generation_summary
            WHERE 1=1 {acc_clause} {summary_block_clause}
            """,
            summary_params,
        )
        bill_submission_row = _fetch_one(
            f"""
            SELECT
                COALESCE(SUM(po_count), 0) AS po_count,
                COALESCE(SUM(invoice_count), 0) AS invoice_count,
                COALESCE(SUM(dc_count), 0) AS dc_count,
                COALESCE(SUM(invoice_value), 0) AS invoice_value
            FROM bill_submission_pending_summary
            WHERE 1=1 {acc_clause} {summary_block_clause}
            """,
            summary_params,
        )

        install_row = _fetch_one(
            f"""
            SELECT
                COALESCE(SUM(po_count), 0) AS po_count,
                COALESCE(SUM(invoice_count), 0) AS invoice_count,
                COALESCE(SUM(invoice_value), 0) AS invoice_value
            FROM installation_summary
            WHERE 1=1 {acc_clause} {summary_block_clause}
            """,
            summary_params,
        )
        document_row = _fetch_one(
            f"""
            SELECT
                COALESCE(SUM(doc_po_count), 0) AS po_count,
                COALESCE(SUM(doc_invoice_count), 0) AS invoice_count,
                COALESCE(SUM(doc_invoice_value), 0) AS invoice_value
            FROM installation_summary
            WHERE 1=1 {acc_clause} {summary_block_clause}
            """,
            summary_params,
        )
        engineer_row = _fetch_one(
            f"""
            SELECT
                COALESCE(SUM(engg_po_count), 0) AS po_count,
                COALESCE(SUM(engg_invoice_count), 0) AS invoice_count,
                COALESCE(SUM(engg_invoice_value), 0) AS invoice_value
            FROM installation_summary
            WHERE 1=1 {acc_clause} {summary_block_clause}
            """,
            summary_params,
        )
        snr_row = _fetch_one(
            f"""
            SELECT
                COALESCE(SUM(snr_po_count), 0) AS po_count,
                COALESCE(SUM(snr_install_count), 0) AS invoice_count,
                COALESCE(SUM(snr_invoice_value), 0) AS invoice_value
            FROM installation_summary
            WHERE 1=1 {acc_clause} {summary_block_clause}
            """,
            summary_params,
        )

        payment_pending_row = _fetch_one(
            f"""
            SELECT
                COUNT(bill_form_unique_id) AS po_count,
                COALESCE(SUM(invoice_count), 0) AS invoice_count,
                COALESCE(SUM(invoice_value), 0) AS invoice_value
            FROM bill_submitted_payment_pending
            WHERE 1=1 {acc_clause} {summary_block_clause}
            """,
            summary_params,
        )
        payment_received_row = _fetch_one(
            f"""
            SELECT
                COUNT(bill_form_unique_id) AS po_count,
                COALESCE(SUM(invoice_count), 0) AS invoice_count,
                COALESCE(SUM(invoice_value), 0) AS invoice_value
            FROM view_payment_received_count
            WHERE 1=1 {acc_clause} {summary_block_clause}
            """,
            summary_params,
        )
        sd_claim_row = _fetch_one(
            f"""
            SELECT
                COUNT(bill_form_unique_id) AS po_count,
                COALESCE(SUM(invoice_count), 0) AS invoice_count,
                COALESCE(SUM(invoice_value), 0) AS invoice_value
            FROM view_sd_claim_pending
            WHERE 1=1 {acc_clause} {summary_block_clause}
            """,
            summary_params,
        )
        ld_row = _fetch_one(
            f"""
            SELECT
                COUNT(bill_form_unique_id) AS po_count,
                COALESCE(SUM(invoice_count), 0) AS invoice_count,
                COALESCE(SUM(ld_value), 0) AS ld_value
            FROM view_ld_value_count
            WHERE 1=1 {acc_clause} {summary_block_clause}
            """,
            summary_params,
        )

        account_row = _fetch_one(
            f"""
            SELECT
                COALESCE(SUM(po_count), 0) AS po_count,
                COALESCE(SUM(invoice_count), 0) AS invoice_count,
                COALESCE(SUM(invoice_value), 0) AS invoice_value
            FROM document_Verification_Accounts
            WHERE 1=1 {acc_clause} {summary_block_clause}
            """,
            summary_params,
        )

        vendor_rows = _fetch_all(
            f"""
            SELECT
                COALESCE(get_outsource_engineer_name(vendor_id), '-') AS name,
                COALESCE(SUM(assign_dc_count), 0) AS assign_dc_count,
                COALESCE(SUM(assign_dc_value), 0) AS assign_dc_value,
                COALESCE(SUM(issue_dc_count), 0) AS issue_dc_count,
                COALESCE(SUM(issue_dc_value), 0) AS issue_dc_value
            FROM vendor_payment_count
            WHERE 1=1 {acc_clause} {summary_block_clause}
            GROUP BY vendor_id
            ORDER BY name
            """,
            summary_params,
        )

        po_upload = [
            {
                "team": "Total Purchase Order",
                "count": _count(po_count_row.get("po_count")),
                "value": _format_indian(po_value_row.get("invoice_value")),
                "qty": _count(po_value_row.get("po_qty")),
            },
            {
                "team": "AMC",
                "count": _count(amc_row.get("amc_count")),
                "value": _format_indian(amc_row.get("amc_total_value")),
                "qty": "-",
            },
        ]

        po_pending = [{
            "team": "Po Not complete",
            "count": _count(pending_row.get("po_count")),
            "value": _format_indian(pending_row.get("invoice_value")),
            "qty": _count(pending_row.get("po_qty")),
        }]

        railways = [{
            "team": "Po Count",
            "count": _count(railway_row.get("po_count")),
            "value": _format_indian(railway_row.get("invoice_value")),
            "qty": _count(railway_row.get("po_qty")),
        }]

        consignee_address = [
            {"team": "PO Count", "count": _count(consignee_row.get("po_count"))},
            {"team": "Total Consignee Address", "count": _count(consignee_row.get("consignee_total_address"))},
            {"team": "Verified Consignee Address", "count": _count(consignee_row.get("tot_verify_address"))},
            {"team": "Balance", "count": _count(consignee_row.get("tot_not_verify_address"))},
        ]

        sector_summary = []
        total_count = total_value = 0.0
        for row in sector_rows:
            po_count = _count(row.get("po_count"))
            invoice_value = _num(row.get("invoice_value"))
            total_count += po_count
            total_value += invoice_value
            sector_summary.append({
                "sector": row.get("sector_name") or "-",
                "count": po_count,
                "value": _format_indian(invoice_value),
            })
        sector_summary.append({
            "sector": "Total (All Sectors)",
            "count": int(total_count),
            "value": _format_indian(total_value),
            "bold": True,
        })

        po_consignee = [
            {
                "team": "Completed",
                "po_count": _count(consignee_completed.get("po_count")),
                "stock_assign": _count(consignee_completed.get("stock_assign")),
                "value": _format_indian(consignee_completed.get("total_value")),
            },
            {
                "team": "Partial",
                "po_count": _count(consignee_partial.get("po_count")),
                "stock_assign": _count(consignee_partial.get("stock_assign")),
                "value": _format_indian(consignee_partial.get("total_value")),
            },
            {
                "team": "Stock Assign Balance",
                "po_count": "",
                "stock_assign": _count(consignee_partial.get("balance_qty")),
                "value": _format_indian(consignee_partial.get("balance_value")),
            },
            {
                "team": "Consignee Not Assign",
                "po_count": _count(consignee_no_assign.get("po_count")),
                "stock_assign": "-",
                "value": _format_indian(consignee_no_assign.get("total_value")),
            },
            {
                "team": "Total",
                "po_count": _count(consignee_total.get("po_count")),
                "stock_assign": _count(consignee_total.get("stock_assign")),
                "value": "-",
            },
        ]

        stores = [
            {
                "label": "DC Pending",
                "dc_count": _count(stores_pending.get("po_count")),
                "qty": _count(stores_pending.get("invoice_count")),
                "value": _format_indian(stores_pending.get("invoice_value")),
            },
            {
                "label": "DC Completed",
                "dc_count": _count(stores_completed.get("po_count")),
                "qty": _count(stores_completed.get("invoice_count")),
                "value": _format_indian(stores_completed.get("invoice_value")),
            },
            {
                "label": "Delivery Status - Dispatch Pending",
                "dc_count": _count(dispatch_pending.get("po_count")),
                "qty": _count(dispatch_pending.get("invoice_count")),
                "value": _format_indian(dispatch_pending.get("invoice_value")),
            },
            {
                "label": "Delivery Status - Material In Transit",
                "dc_count": _count(transit_pending.get("po_count")),
                "qty": _count(transit_pending.get("invoice_count")),
                "value": _format_indian(transit_pending.get("invoice_value")),
            },
        ]

        operation = [
            {
                "team": "Document Verification Pending",
                "po": _count(elcot_row.get("po_count")),
                "inv": _count(elcot_row.get("invoice_count")),
                "dc": _count(elcot_row.get("dc_count")),
                "value": _format_indian(elcot_row.get("invoice_value")),
            },
            {
                "team": "Invoice Verify Pending",
                "po": _count(sign_row.get("po_count")),
                "inv": _count(sign_row.get("invoice_count")),
                "dc": _count(sign_row.get("dc_count")),
                "value": _format_indian(sign_row.get("invoice_value")),
            },
            {
                "team": "BG Pending",
                "po": _count(bg_row.get("po_count")),
                "inv": _count(bg_row.get("invoice_count")),
                "dc": _count(bg_row.get("dc_count")),
                "value": _format_indian(bg_row.get("invoice_value")),
            },
            {
                "team": "Bill Generation Pending",
                "po": _count(entry_row.get("po_count")),
                "inv": _count(entry_row.get("invoice_count")),
                "dc": _count(entry_row.get("dc_count")),
                "value": _format_indian(entry_row.get("invoice_value")),
            },
            {
                "team": "Bill Submission Pending",
                "po": _count(bill_submission_row.get("po_count")),
                "inv": _count(bill_submission_row.get("invoice_count")),
                "dc": _count(bill_submission_row.get("dc_count")),
                "value": _format_indian(bill_submission_row.get("invoice_value")),
            },
        ]

        service = [
            {
                "team": "Installation Pending",
                "po": _count(install_row.get("po_count")),
                "inv": _count(install_row.get("invoice_count")),
                "dc": "-",
                "value": _format_indian(install_row.get("invoice_value")),
            },
            {
                "team": "Document Collection Pending",
                "po": _count(document_row.get("po_count")),
                "inv": _count(document_row.get("invoice_count")),
                "dc": "-",
                "value": _format_indian(document_row.get("invoice_value")),
            },
            {
                "team": "Document With Engineer",
                "po": _count(engineer_row.get("po_count")),
                "inv": _count(engineer_row.get("invoice_count")),
                "dc": "-",
                "value": _format_indian(engineer_row.get("invoice_value")),
            },
            {
                "team": "SNR",
                "po": _count(snr_row.get("po_count")),
                "inv": _count(snr_row.get("invoice_count")),
                "dc": "-",
                "value": _format_indian(snr_row.get("invoice_value")),
            },
        ]

        payment = [
            {
                "team": "Bill Submitted Payment Pending",
                "po": _count(payment_pending_row.get("po_count")),
                "inv": _count(payment_pending_row.get("invoice_count")),
                "value": _format_indian(payment_pending_row.get("invoice_value")),
            },
            {
                "team": "Payment Received",
                "po": _count(payment_received_row.get("po_count")),
                "inv": _count(payment_received_row.get("invoice_count")),
                "value": _format_indian(payment_received_row.get("invoice_value")),
            },
            {
                "team": "SD Claim Pending",
                "po": _count(sd_claim_row.get("po_count")),
                "inv": _count(sd_claim_row.get("invoice_count")),
                "value": _format_indian(sd_claim_row.get("invoice_value")),
            },
            {
                "team": "LD Value",
                "po": _count(ld_row.get("po_count")),
                "inv": _count(ld_row.get("invoice_count")),
                "value": _format_indian(ld_row.get("ld_value")),
            },
        ]

        vendor = []
        for row in vendor_rows:
            assign_count = _count(row.get("assign_dc_count"))
            issue_count = _count(row.get("issue_dc_count"))
            assign_value = _num(row.get("assign_dc_value"))
            issue_value = _num(row.get("issue_dc_value"))
            balance_count = assign_count - issue_count
            balance_value = assign_value - issue_value
            vendor.append({
                "name": row.get("name") or "-",
                "a_dc": assign_count,
                "a_val": _format_indian(assign_value, 0),
                "i_dc": issue_count if issue_count else "-",
                "i_val": _format_indian(issue_value, 0) if issue_value else "-",
                "b_dc": balance_count if balance_count else "-",
                "b_val": _format_indian(balance_value, 0) if balance_value else "-",
            })

        accounts = [{
            "team": "Document Verification Pending - Accounts",
            "po": _count(account_row.get("po_count")),
            "inv": _count(account_row.get("invoice_count")),
            "value": _format_indian(account_row.get("invoice_value")),
        }]

        return Response({
            "status": True,
            "acc_year": acc_year,
            "po_upload": po_upload,
            "po_pending": po_pending,
            "po_consignee": po_consignee,
            "railways": railways,
            "consignee_address": consignee_address,
            "sector_summary": sector_summary,
            "stores": stores,
            "operation": operation,
            "service": service,
            "payment": payment,
            "vendor": vendor,
            "accounts": accounts,
        })
