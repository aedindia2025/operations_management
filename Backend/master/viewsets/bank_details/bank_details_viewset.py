from django.db import connection
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView


ROLE_ACCOUNTS = "68cba503472bd48995"
ROLE_MANAGEMENT = "65fac54da3aac66007"
ROLE_FINANCE = "6986d6e18a16169083"
ROLE_ALL = "65deef78ba17d65741"

APPROVAL_COLUMNS = {
    "accounts_approval": "INT(11) NOT NULL DEFAULT 0",
    "accounts_approved_by": "VARCHAR(100) NULL",
    "accounts_approved_date": "DATETIME NULL",
    "management_approval": "INT(11) NOT NULL DEFAULT 0",
    "management_approved_by": "VARCHAR(100) NULL",
    "management_approved_date": "DATETIME NULL",
    "finance_approval": "INT(11) NOT NULL DEFAULT 0",
    "finance_approved_by": "VARCHAR(100) NULL",
    "finance_approved_date": "DATETIME NULL",
}


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


def _table_columns(table_name):
    with connection.cursor() as cursor:
        cursor.execute(f"SHOW COLUMNS FROM `{table_name}`")
        return [row[0] for row in cursor.fetchall()]


def _ensure_vendor_approval_columns():
    columns = set(_table_columns("vendor_creation"))
    with connection.cursor() as cursor:
        for column_name, ddl in APPROVAL_COLUMNS.items():
            if column_name in columns:
                continue
            cursor.execute(f"ALTER TABLE `vendor_creation` ADD COLUMN `{column_name}` {ddl}")


def _request_user_id(request):
    user = getattr(request, "user", None)
    for attr in ("unique_id", "staff_id", "username", "pk"):
        value = str(getattr(user, attr, "") or "").strip()
        if value:
            return value
    for key in ("user_id", "sess_user_id"):
        value = str(request.data.get(key, "") or request.query_params.get(key, "") or "").strip()
        if value:
            return value
    auth_header = str(request.headers.get("Authorization", "") or "").strip()
    if auth_header.startswith("Bearer "):
        return auth_header.split(" ", 1)[1].strip()
    return ""


def _request_user_type(request):
    user = getattr(request, "user", None)
    for attr in ("user_type_unique_id", "vendor_user_type_unique_id"):
        value = str(getattr(user, attr, "") or "").strip()
        if value:
            return value
    for key in ("user_type", "user_type_unique_id", "sess_user_type"):
        value = str(request.data.get(key, "") or request.query_params.get(key, "") or "").strip()
        if value:
            return value
    return ""


def _status_text(value):
    return "Approved" if int(value or 0) == 1 else "Pending"


def _final_status(accounts_approval, management_approval, finance_approval):
    if int(finance_approval or 0) == 1:
        return "Completed"
    if int(management_approval or 0) == 1:
        return "Management Approved"
    if int(accounts_approval or 0) == 1:
        return "Accounts Approved"
    return "Pending"


def _action_for_role(user_type, accounts_approval, management_approval, finance_approval):
    accounts_done = int(accounts_approval or 0) == 1
    management_done = int(management_approval or 0) == 1
    finance_done = int(finance_approval or 0) == 1

    if user_type == ROLE_ACCOUNTS and not accounts_done:
        return "accounts"
    if user_type == ROLE_MANAGEMENT and accounts_done and not management_done:
        return "management"
    if user_type == ROLE_FINANCE and accounts_done and management_done and not finance_done:
        return "finance"
    if user_type == ROLE_ALL:
        if not accounts_done:
            return "accounts"
        if not management_done:
            return "management"
        if not finance_done:
            return "finance"
    return ""


class BankDetailsListView(APIView):
    def get(self, request):
        _ensure_vendor_approval_columns()
        user_type = _request_user_type(request)
        search = str(request.query_params.get("search", "") or "").strip()

        where_parts = [
            "vpd.vendor_id = vc.unique_id",
            "COALESCE(vpd.is_delete, 0) = 0",
            "COALESCE(vc.is_delete, 0) = 0",
        ]
        params: list[object] = []

        if user_type == ROLE_ACCOUNTS:
            where_parts.append("COALESCE(vc.accounts_approval, 0) = 0")
        elif user_type == ROLE_MANAGEMENT:
            where_parts.append("COALESCE(vc.accounts_approval, 0) = 1")
            where_parts.append("COALESCE(vc.management_approval, 0) = 0")
        elif user_type == ROLE_FINANCE:
            where_parts.append("COALESCE(vc.accounts_approval, 0) = 1")
            where_parts.append("COALESCE(vc.management_approval, 0) = 1")
            where_parts.append("COALESCE(vc.finance_approval, 0) = 0")

        if search:
            like = f"%{search}%"
            where_parts.append(
                "("
                "COALESCE(vpd.vendor_name, '') LIKE %s OR "
                "COALESCE(vc.acc_holder_name, '') LIKE %s OR "
                "COALESCE(vc.bank_name, '') LIKE %s OR "
                "COALESCE(vc.branch_name, '') LIKE %s OR "
                "COALESCE(vc.account_no, '') LIKE %s OR "
                "COALESCE(vc.ifsc_code, '') LIKE %s OR "
                "COALESCE(u.staff_name, '') LIKE %s"
                ")"
            )
            params.extend([like, like, like, like, like, like, like])

        where_sql = " AND ".join(where_parts)
        rows = _many(
            f"""
            SELECT
                vc.id,
                vc.unique_id,
                COALESCE(MAX(vpd.vendor_name), COALESCE(vc.company_name, ''), COALESCE(vc.name, '')) AS vendor_name,
                COALESCE(vc.acc_holder_name, '') AS acc_holder_name,
                COALESCE(vc.bank_name, '') AS bank_name,
                COALESCE(vc.branch_name, '') AS branch_name,
                COALESCE(vc.account_no, '') AS account_no,
                COALESCE(vc.ifsc_code, '') AS ifsc_code,
                COALESCE(MAX(u.staff_name), '') AS entered_by,
                COALESCE(vc.accounts_approval, 0) AS accounts_approval,
                COALESCE(vc.management_approval, 0) AS management_approval,
                COALESCE(vc.finance_approval, 0) AS finance_approval
            FROM vendor_payment_details vpd
            INNER JOIN vendor_creation vc ON vc.unique_id = vpd.vendor_id
            LEFT JOIN user u ON u.unique_id = vpd.vendor_bill_created_by AND COALESCE(u.is_delete, 0) = 0
            WHERE {where_sql}
            GROUP BY
                vc.id, vc.unique_id, vc.acc_holder_name, vc.bank_name, vc.branch_name,
                vc.account_no, vc.ifsc_code, vc.accounts_approval, vc.management_approval, vc.finance_approval
            ORDER BY vc.id DESC
            """,
            params,
        )

        data = []
        for index, row in enumerate(rows, start=1):
            action_type = _action_for_role(
                user_type,
                row.get("accounts_approval"),
                row.get("management_approval"),
                row.get("finance_approval"),
            )
            data.append(
                {
                    "s_no": index,
                    "id": row.get("id"),
                    "unique_id": row.get("unique_id", ""),
                    "vendor_name": row.get("vendor_name", ""),
                    "acc_holder_name": row.get("acc_holder_name", ""),
                    "bank_name": row.get("bank_name", ""),
                    "branch_name": row.get("branch_name", ""),
                    "account_no": row.get("account_no", ""),
                    "ifsc_code": row.get("ifsc_code", ""),
                    "entered_by": row.get("entered_by", ""),
                    "accounts_approval": int(row.get("accounts_approval") or 0),
                    "management_approval": int(row.get("management_approval") or 0),
                    "finance_approval": int(row.get("finance_approval") or 0),
                    "accounts_status": _status_text(row.get("accounts_approval")),
                    "management_status": _status_text(row.get("management_approval")),
                    "finance_status": _status_text(row.get("finance_approval")),
                    "final_status": _final_status(
                        row.get("accounts_approval"),
                        row.get("management_approval"),
                        row.get("finance_approval"),
                    ),
                    "action_type": action_type,
                    "can_approve": bool(action_type),
                }
            )

        return Response(
            {
                "status": True,
                "data": data,
                "message": "Bank details fetched successfully.",
            }
        )


class BankDetailsApproveView(APIView):
    def post(self, request):
        _ensure_vendor_approval_columns()
        record_id = str(request.data.get("id", "") or "").strip()
        approval_type = str(request.data.get("type", "") or "").strip().lower()
        user_id = _request_user_id(request)
        user_type = _request_user_type(request)

        if not record_id:
            return Response({"status": False, "message": "id is required."}, status=status.HTTP_400_BAD_REQUEST)
        if approval_type not in {"accounts", "management", "finance"}:
            return Response({"status": False, "message": "Invalid approval type."}, status=status.HTTP_400_BAD_REQUEST)

        row = _one(
            """
            SELECT id, COALESCE(accounts_approval, 0) AS accounts_approval,
                   COALESCE(management_approval, 0) AS management_approval,
                   COALESCE(finance_approval, 0) AS finance_approval
            FROM vendor_creation
            WHERE id = %s AND COALESCE(is_delete, 0) = 0
            LIMIT 1
            """,
            [record_id],
        )
        if not row:
            return Response({"status": False, "message": "Record not found."}, status=status.HTTP_404_NOT_FOUND)

        allowed_action = _action_for_role(
            user_type,
            row.get("accounts_approval"),
            row.get("management_approval"),
            row.get("finance_approval"),
        )
        if allowed_action != approval_type:
            return Response({"status": False, "message": "You cannot approve this stage."}, status=status.HTTP_400_BAD_REQUEST)

        sql_map = {
            "accounts": """
                UPDATE vendor_creation
                SET accounts_approval = 1,
                    accounts_approved_by = %s,
                    accounts_approved_date = NOW()
                WHERE id = %s
            """,
            "management": """
                UPDATE vendor_creation
                SET management_approval = 1,
                    management_approved_by = %s,
                    management_approved_date = NOW()
                WHERE id = %s
            """,
            "finance": """
                UPDATE vendor_creation
                SET finance_approval = 1,
                    finance_approved_by = %s,
                    finance_approved_date = NOW()
                WHERE id = %s
            """,
        }

        with connection.cursor() as cursor:
            cursor.execute(sql_map[approval_type], [user_id, record_id])

        return Response({"status": True, "message": "Approved successfully."})
