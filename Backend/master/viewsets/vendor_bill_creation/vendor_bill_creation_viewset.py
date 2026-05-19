import os
import re
import uuid
from datetime import date, datetime
from decimal import Decimal, InvalidOperation
from pathlib import Path

from django.conf import settings
from django.db import connection, transaction
from django.http import FileResponse, Http404
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView

from master.apps.department.departmentmodel import DepartmentCreation
from master.apps.purchase_order.purchaseordermodel import PurchaseOrder
from master.apps.user.usermodel import UserCreation
from master.apps.vendor_bill_creation.vendorbillcreationmodel import (
    VendorBillCreation,
    VendorPaymentDetail,
    VendorPaymentMain,
)
from master.serializers.vendor_bill_creation import (
    VendorBillCreationInputSerializer,
    VendorBillCreationSerializer,
)

LEGACY_UPLOAD_BASE = Path(
    os.environ.get("OTM_UPLOAD_BASE", r"Z:\xampp\htdocs\otm_beta\uploads")
)
FOLLOWED_BY_USER_TYPE_UID = "65efd97b4df4040205"
SUPER_ADMIN_USER_TYPE_UID = "65deef78ba17d65741"


def db_fetch(sql, params=None):
    with connection.cursor() as cursor:
        cursor.execute(sql, params or [])
        columns = [col[0] for col in cursor.description]
        return [dict(zip(columns, row)) for row in cursor.fetchall()]


def db_fetchone(sql, params=None):
    rows = db_fetch(sql, params)
    return rows[0] if rows else None


def safe_str(value):
    return "" if value is None else str(value)


def safe_decimal(value):
    if value in (None, ""):
        return Decimal("0")
    try:
        return Decimal(safe_str(value).replace(",", "").strip() or "0")
    except (InvalidOperation, TypeError, ValueError):
        return Decimal("0")


def safe_float(value):
    return float(safe_decimal(value))


def safe_int(value):
    try:
        return int(safe_decimal(value))
    except (TypeError, ValueError):
        return 0


def format_date(value, fmt="%d-%m-%Y"):
    if not value:
        return ""
    if isinstance(value, datetime):
        return value.strftime(fmt)
    if isinstance(value, date):
        return value.strftime(fmt)

    text = safe_str(value).strip()
    if not text:
        return ""

    for candidate in (text, text.replace("T", " ", 1)):
        try:
            return datetime.fromisoformat(candidate).strftime(fmt)
        except ValueError:
            pass

    for parser in (
        "%Y-%m-%d %H:%M:%S",
        "%Y-%m-%dT%H:%M:%S",
        "%Y-%m-%dT%H:%M:%S.%f",
        "%Y-%m-%d",
        "%d-%m-%Y",
        "%d/%m/%Y",
    ):
        try:
            return datetime.strptime(text, parser).strftime(fmt)
        except ValueError:
            continue
    return text


def status_text(sts):
    value = safe_str(sts).strip() or "0"
    if value == "1":
        return "Approved"
    if value == "2":
        return "Rejected"
    return "Pending"


def payment_status_text(sts):
    return "Paid" if safe_str(sts).strip() == "1" else "Pending"


def first_non_empty(*values):
    for value in values:
        text = safe_str(value).strip()
        if text:
            return text
    return ""


def limit_str(value, length):
    return safe_str(value).strip()[:length]


def get_financial_year(ref_date=None):
    if ref_date is None:
        ref_date = date.today()
    if isinstance(ref_date, datetime):
        ref_date = ref_date.date()
    if ref_date.month >= 4:
        return f"{ref_date.year}-{str(ref_date.year + 1)[2:]}"
    return f"{ref_date.year - 1}-{str(ref_date.year)[2:]}"


def generate_unique_id():
    return uuid.uuid4().hex[:18]


def generate_vendor_bill_no():
    prefix = f"VEN-{datetime.now().strftime('%Y%m')}"
    last_bill = (
        VendorPaymentMain.objects.filter(is_delete=0, bill_no__startswith=prefix)
        .order_by("-id")
        .values_list("bill_no", flat=True)
        .first()
    )
    if not last_bill:
        return f"{prefix}-0001"
    try:
        sequence = int(safe_str(last_bill).split("-")[-1]) + 1
    except ValueError:
        sequence = 1
    return f"{prefix}-{sequence:04d}"


def table_columns(table_name):
    try:
        return {
            safe_str(row.get("Field"))
            for row in db_fetch(f"SHOW COLUMNS FROM {table_name}")
        }
    except Exception:
        return set()


def pick_col(columns, *candidates):
    for candidate in candidates:
        if candidate in columns:
            return candidate
    return ""


def ensure_decimal_column(table_name, *candidates):
    columns = table_columns(table_name)
    existing = pick_col(columns, *candidates)
    if existing:
        return existing

    target = candidates[0] if candidates else ""
    if not target:
        return ""

    try:
        with connection.cursor() as cursor:
            cursor.execute(
                f"ALTER TABLE `{table_name}` ADD COLUMN `{target}` DECIMAL(15,2) NOT NULL DEFAULT 0"
            )
    except Exception:
        pass

    return pick_col(table_columns(table_name), *candidates)


def parse_request_date(value, fallback=None):
    if fallback is None:
        fallback = date.today()
    if isinstance(value, datetime):
        return value.date()
    if isinstance(value, date):
        return value

    text = safe_str(value).strip()
    if not text:
        return fallback

    for parser in ("%Y-%m-%d", "%d-%m-%Y", "%d/%m/%Y", "%Y/%m/%d"):
        try:
            return datetime.strptime(text, parser).date()
        except ValueError:
            continue

    try:
        return datetime.fromisoformat(text.replace("T", " ", 1)).date()
    except ValueError:
        return fallback


def generate_vendor_invoice_no():
    row = db_fetchone(
        """
        SELECT COALESCE(MAX(seq_no), 0) AS last_seq
        FROM (
            SELECT CAST(SUBSTRING_INDEX(COALESCE(veninvverifyid, ''), '-', -1) AS UNSIGNED) AS seq_no
            FROM vendor_payment_details_main
            WHERE COALESCE(is_delete, 0) = 0
              AND COALESCE(veninvverifyid, '') REGEXP '^VEN-INV-[0-9]+$'
            UNION ALL
            SELECT CAST(SUBSTRING_INDEX(COALESCE(veninvid, ''), '-', -1) AS UNSIGNED) AS seq_no
            FROM invoice_verfication_table
            WHERE COALESCE(veninvid, '') REGEXP '^VEN-INV-[0-9]+$'
        ) seqs
        """
    )
    return f"VEN-INV-{safe_int(row.get('last_seq') if row else 0) + 1}"


def vendor_invoice_no_in_use(value):
    invoice_no = safe_str(value).strip().upper()
    if not invoice_no:
        return False

    row = db_fetchone(
        """
        SELECT 1 AS found
        FROM (
            SELECT COALESCE(veninvverifyid, '') AS invoice_no
            FROM vendor_payment_details_main
            WHERE COALESCE(is_delete, 0) = 0
            UNION ALL
            SELECT COALESCE(veninvid, '') AS invoice_no
            FROM invoice_verfication_table
        ) existing
        WHERE UPPER(TRIM(invoice_no)) = %s
        LIMIT 1
        """,
        [invoice_no],
    )
    return bool(row)


def save_vendor_payment_attachment(file_obj, filename, file_kind):
    original = Path(safe_str(getattr(file_obj, "name", ""))).name
    extension = Path(original).suffix.lower() or ".pdf"
    if extension != ".pdf":
        raise ValueError("Only PDF files are allowed.")

    roots_map = {
        "invoice": [
            LEGACY_UPLOAD_BASE / "vendorpayment",
            Path(settings.MEDIA_ROOT) / "vendorpayment",
            Path(settings.BASE_DIR) / "uploads" / "vendorpayment",
        ],
        "po": [
            LEGACY_UPLOAD_BASE / "vendorpayment" / "PO copy",
            LEGACY_UPLOAD_BASE / "vendorpayment",
            Path(settings.MEDIA_ROOT) / "vendorpayment" / "PO copy",
            Path(settings.MEDIA_ROOT) / "vendorpayment",
            Path(settings.BASE_DIR) / "uploads" / "vendorpayment" / "PO copy",
            Path(settings.BASE_DIR) / "uploads" / "vendorpayment",
        ],
    }

    roots = roots_map.get(file_kind, [])
    content = b"".join(file_obj.chunks())
    saved = False
    for root in roots:
        try:
            root.mkdir(parents=True, exist_ok=True)
            (root / filename).write_bytes(content)
            saved = True
        except Exception:
            continue
    if not saved:
        raise OSError("Unable to save vendor payment attachment.")
    return filename, original


def split_selected_ids(request):
    parts = []
    if hasattr(request.data, "getlist"):
        parts.extend(request.data.getlist("selected_ids"))
    raw_value = request.data.get("selected_ids", "")
    if raw_value:
        if isinstance(raw_value, (list, tuple)):
            parts.extend(raw_value)
        else:
            parts.append(raw_value)

    selected_ids = []
    for part in parts:
        candidates = (
            part if isinstance(part, (list, tuple)) else safe_str(part).split(",")
        )
        for candidate in candidates:
            value = safe_str(candidate).strip()
            if value and value not in selected_ids:
                selected_ids.append(value)
    return selected_ids


def parse_pagination(request):
    try:
        page = max(int(request.query_params.get("page", 1) or 1), 1)
    except (TypeError, ValueError):
        page = 1
    try:
        length = max(int(request.query_params.get("length", 10) or 10), 1)
    except (TypeError, ValueError):
        length = 10
    return page, length, (page - 1) * length


def request_actor_context(request):
    session_obj = getattr(request, "session", None)
    session_user_type = (
        safe_str(session_obj.get("user_type_unique_id") or session_obj.get("sess_user_type"))
        if session_obj is not None
        else ""
    ).strip()
    session_staff_id = (
        safe_str(session_obj.get("staff_id")) if session_obj is not None else ""
    ).strip()
    session_user_id = (
        safe_str(session_obj.get("sess_user_id") or session_obj.get("unique_id"))
        if session_obj is not None
        else ""
    ).strip()

    user = getattr(request, "user", None)
    user_type_unique_id = first_non_empty(
        getattr(user, "user_type_unique_id", ""),
        session_user_type,
        request.query_params.get("user_type_unique_id", ""),
        request.headers.get("X-User-Type", ""),
    ).strip()
    staff_id = first_non_empty(
        getattr(user, "staff_id", ""),
        session_staff_id,
        request.query_params.get("staff_id", ""),
        request.headers.get("X-Staff-Id", ""),
    ).strip()
    user_unique_id = first_non_empty(
        getattr(user, "unique_id", ""),
        session_user_id,
        request.headers.get("X-User-Id", ""),
    ).strip()

    if not (user_type_unique_id and staff_id and user_unique_id):
        auth_header = safe_str(request.headers.get("Authorization", "")).strip()
        token = auth_header.replace("Bearer", "", 1).strip()
        if not token:
            token = safe_str(request.query_params.get("token", "")).strip()
        if token:
            actor = (
                UserCreation.objects.filter(unique_id=token, is_delete=0, is_active=1)
                .order_by("-s_no")
                .first()
            )
            if actor:
                user_type_unique_id = user_type_unique_id or safe_str(actor.user_type_unique_id).strip()
                staff_id = staff_id or safe_str(actor.staff_id).strip()
                user_unique_id = user_unique_id or safe_str(actor.unique_id).strip()

    return {
        "user_type_unique_id": user_type_unique_id,
        "staff_id": staff_id,
        "user_unique_id": user_unique_id,
    }


def followed_by_scope_values(request):
    context = request_actor_context(request)
    if context["user_type_unique_id"] == SUPER_ADMIN_USER_TYPE_UID:
        return []
    if context["user_type_unique_id"] != FOLLOWED_BY_USER_TYPE_UID:
        return []

    values = []
    for candidate in (context["staff_id"], context["user_unique_id"]):
        candidate = safe_str(candidate).strip()
        if candidate and candidate not in values:
            values.append(candidate)
    return values


def followed_by_scope_sql(request, alias="icm"):
    values = followed_by_scope_values(request)
    if not values:
        return "", []
    placeholders = " OR ".join([f"COALESCE({alias}.team_mem, '') = %s"] * len(values))
    return f"({placeholders})", values


def actor_identity_values(request):
    context = request_actor_context(request)
    values = []
    for candidate in (context.get("user_unique_id"), context.get("staff_id")):
        candidate = safe_str(candidate).strip()
        if candidate and candidate not in values:
            values.append(candidate)
    return values


def onsite_creator_scope_sql(request, alias="vpm"):
    context = request_actor_context(request)
    if context["user_type_unique_id"] == SUPER_ADMIN_USER_TYPE_UID:
        return "", []
    if context["user_type_unique_id"] != FOLLOWED_BY_USER_TYPE_UID:
        return "", []

    values = actor_identity_values(request)
    legacy_system_clause = (
        f"COALESCE({alias}.vendor_bill_created_by, '') IN ('', 'system')"
    )
    if not values:
        return legacy_system_clause, []

    placeholders = ", ".join(["%s"] * len(values))
    return (
        f"(COALESCE({alias}.vendor_bill_created_by, '') IN ({placeholders}) "
        f"OR COALESCE({alias}.sess_user_id, '') IN ({placeholders}) "
        f"OR {legacy_system_clause})"
    ), values + values


def rejected_bill_creator_scope_sql(request, alias="vpd"):
    context = request_actor_context(request)
    if context["user_type_unique_id"] == SUPER_ADMIN_USER_TYPE_UID:
        return "", []
    if context["user_type_unique_id"] != FOLLOWED_BY_USER_TYPE_UID:
        return "", []

    user_unique_id = safe_str(context["user_unique_id"]).strip()
    if not user_unique_id:
        return "1 = 0", []
    return f"COALESCE({alias}.vendor_bill_created_by, '') = %s", [user_unique_id]


def session_payload(request, acting_user=""):
    session_key = ""
    session_obj = getattr(request, "session", None)
    if session_obj is not None:
        session_key = session_obj.session_key or ""
    return {
        "session_id": limit_str(
            first_non_empty(
                request.data.get("session_id"),
                request.headers.get("X-Session-Id"),
                session_key,
            ),
            50,
        ),
        "sess_user_type": limit_str(
            first_non_empty(
                request.data.get("sess_user_type"), request.headers.get("X-User-Type")
            ),
            50,
        ),
        "sess_user_id": limit_str(
            first_non_empty(
                request.data.get("sess_user_id"),
                request.data.get("user_id"),
                request.headers.get("X-User-Id"),
                getattr(getattr(request, "user", None), "username", ""),
                acting_user,
            ),
            50,
        ),
        "sess_company_id": limit_str(
            first_non_empty(
                request.data.get("sess_company_id"), request.headers.get("X-Company-Id")
            ),
            50,
        ),
        "sess_branch_id": limit_str(
            first_non_empty(
                request.data.get("sess_branch_id"), request.headers.get("X-Branch-Id")
            ),
            50,
        ),
    }


def acting_user(request):
    actor_values = actor_identity_values(request)
    return first_non_empty(
        request.data.get("sess_user_id"),
        request.data.get("user_id"),
        request.headers.get("X-User-Id"),
        actor_values[0] if actor_values else "",
        getattr(getattr(request, "user", None), "username", ""),
        "system",
    )


def vendor_summary(vendor_id):
    row = db_fetchone(
        """
        SELECT unique_id, company_name, name, contact_no, mail_id, pan_no, gst_no, address,
               account_no, ifsc_code, bank_name, branch_name, bank_proof,
               pan_attach_file_name, acc_holder_name, vendor_id
        FROM vendor_creation
        WHERE unique_id = %s AND COALESCE(is_delete, 0) = 0
        LIMIT 1
        """,
        [vendor_id],
    )
    return row or {}


def vendor_file_candidates(file_kind, filename):
    safe_name = Path(safe_str(filename)).name
    if not safe_name:
        return []

    folder_map = {
        "invoice": [
            LEGACY_UPLOAD_BASE / "vendorpayment",
            Path(settings.MEDIA_ROOT) / "vendorpayment",
            Path(settings.BASE_DIR) / "uploads" / "vendorpayment",
        ],
        "po": [
            LEGACY_UPLOAD_BASE / "po_form" / "PO copy",
            LEGACY_UPLOAD_BASE / "po_form",
            LEGACY_UPLOAD_BASE / "purchase_order" / "PO copy",
            LEGACY_UPLOAD_BASE / "purchase_order",
            LEGACY_UPLOAD_BASE / "vendorpayment" / "PO copy",
            LEGACY_UPLOAD_BASE / "vendorpayment",
            Path(settings.MEDIA_ROOT) / "po_form" / "PO copy",
            Path(settings.MEDIA_ROOT) / "po_form",
            Path(settings.MEDIA_ROOT) / "purchase_order" / "PO copy",
            Path(settings.MEDIA_ROOT) / "purchase_order",
            Path(settings.MEDIA_ROOT) / "vendorpayment" / "PO copy",
            Path(settings.MEDIA_ROOT) / "vendorpayment",
            Path(settings.BASE_DIR) / "uploads" / "po_form" / "PO copy",
            Path(settings.BASE_DIR) / "uploads" / "po_form",
            Path(settings.BASE_DIR) / "uploads" / "purchase_order" / "PO copy",
            Path(settings.BASE_DIR) / "uploads" / "purchase_order",
            Path(settings.BASE_DIR) / "uploads" / "vendorpayment" / "PO copy",
            Path(settings.BASE_DIR) / "uploads" / "vendorpayment",
        ],
        "pan": [
            LEGACY_UPLOAD_BASE / "vendor_creation",
            Path(settings.MEDIA_ROOT) / "vendor_creation",
            Path(settings.BASE_DIR) / "uploads" / "vendor_creation",
        ],
        "bank": [
            LEGACY_UPLOAD_BASE / "vendor_creation",
            Path(settings.MEDIA_ROOT) / "vendor_creation",
            Path(settings.BASE_DIR) / "uploads" / "vendor_creation",
        ],
    }
    return [root / safe_name for root in folder_map.get(file_kind, [])]


def pending_rows(request, search, from_date, to_date, page, length, offset):
    where = [
        "COALESCE(vv.signed_complete_status, 0) = 2",
        "(vv.dc_required IS NULL OR TRIM(vv.dc_required) <> '1')",
        "COALESCE(vv.vendor_payment_allocated, 0) = 0",
        "icm.unique_id = vv.unique_id",
    ]
    params = []
    scope_where_sql, scope_params = followed_by_scope_sql(request)
    if scope_where_sql:
        where.append(scope_where_sql)
        params.extend(scope_params)

    if from_date:
        where.append("DATE(vv.invoice_date) >= %s")
        params.append(from_date)
    if to_date:
        where.append("DATE(vv.invoice_date) <= %s")
        params.append(to_date)
    if search:
        where.append(
            "(COALESCE(vc.company_name, '') LIKE %s OR COALESCE(vc.name, '') LIKE %s OR "
            "COALESCE(vc.vendor_id, '') LIKE %s OR COALESCE(vc.address, '') LIKE %s OR "
            "COALESCE(vc.contact_no, '') LIKE %s OR COALESCE(vv.outsrc_eng_name, '') LIKE %s OR "
            "COALESCE(vv.engineer_name, '') LIKE %s)"
        )
        params.extend([f"%{search}%"] * 7)

    where_sql = " AND ".join(where)
    total_row = db_fetchone(
        f"""
        SELECT COUNT(*) AS total
        FROM (
            SELECT vv.engineer_name
            FROM view_outsource_vendor_verified_invoice vv
            LEFT JOIN invoice_creation_main icm
              ON icm.unique_id = vv.unique_id
             AND icm.is_delete = 0
            LEFT JOIN vendor_creation vc
              ON vc.unique_id = vv.engineer_name
             AND COALESCE(vc.is_delete, 0) = 0
            WHERE {where_sql}
            GROUP BY vv.engineer_name
        ) grouped
        """,
        params,
    )
    total = safe_int(total_row.get("total") if total_row else 0)

    rows = db_fetch(
        f"""
        SELECT
            vv.engineer_name AS vendor_id,
            COALESCE(MAX(NULLIF(vc.company_name, '')), MAX(NULLIF(vc.name, '')), MAX(NULLIF(vv.outsrc_eng_name, '')), '') AS vendor_name,
            COALESCE(MAX(NULLIF(vc.vendor_id, '')), '') AS vendor_code,
            COALESCE(MAX(NULLIF(vc.contact_no, '')), '') AS contact_no,
            COALESCE(MAX(NULLIF(vc.address, '')), '') AS address,
            COUNT(vv.dc_number) AS dc_count,
            ROUND(
                SUM(
                    CASE
                        WHEN COALESCE(vv.vendor_payment_allocated, 0) = 0
                        THEN (
                            (COALESCE(vv.invoice_qty, 0) * COALESCE(vv.vendor_bulk_rate, 0))
                            + (
                                (COALESCE(vv.invoice_qty, 0) * COALESCE(vv.vendor_bulk_rate, 0))
                                * COALESCE(vv.vendor_bulk_gst, 0) / 100
                            )
                        )
                        ELSE 0
                    END
                ),
                2
            ) AS total_amount,
            CASE
                WHEN MAX(COALESCE(rejection_flags.is_rejected, 0)) = 1 THEN 'Rejected'
                WHEN MAX(COALESCE(vv.vendor_bill_app_status, 0)) = 1 THEN 'Approved'
                WHEN MAX(COALESCE(vv.vendor_bill_app_status, 0)) = 2 THEN 'Bill Rejected'
                ELSE 'Pending'
            END AS status,
            COALESCE(
                MAX(NULLIF(rejection_flags.reject_reason, '')),
                MAX(vv.vendor_bill_reject_reason),
                ''
            ) AS reject_reason,
            COALESCE(
                MAX(NULLIF(rejection_flags.rejected_by, '')),
                MAX(NULLIF(reject_user.staff_name, '')),
                ''
            ) AS rejected_by
        FROM view_outsource_vendor_verified_invoice vv
        LEFT JOIN invoice_creation_main icm
          ON icm.unique_id = vv.unique_id
         AND icm.is_delete = 0
        LEFT JOIN vendor_creation vc
          ON vc.unique_id = vv.engineer_name
         AND COALESCE(vc.is_delete, 0) = 0
        LEFT JOIN user reject_user
          ON reject_user.unique_id = vv.vendor_bill_rejected_by
         AND COALESCE(reject_user.is_delete, 0) = 0
        LEFT JOIN (
            SELECT
                COALESCE(vpd.vendor_id, '') AS vendor_id,
                COALESCE(vpd.dc_num, '') AS dc_num,
                MAX(
                    CASE
                        WHEN COALESCE(vpd.managment_team_approval_sts, 0) = 2
                          OR COALESCE(vpd.finance_approval, 0) = 2
                          OR COALESCE(vpd.acc_ent_sts, COALESCE(vpd.accstatus, 0)) = 2
                          OR COALESCE(vpd.vendor_bill_app_status, 0) = 2
                        THEN 1
                        ELSE 0
                    END
                ) AS is_rejected,
                COALESCE(
                    MAX(
                        CASE
                            WHEN COALESCE(vpd.managment_team_approval_sts, 0) = 2
                            THEN NULLIF(vpd.managment_team_reject_reason, '')
                            ELSE NULL
                        END
                    ),
                    MAX(
                        CASE
                            WHEN COALESCE(vpd.finance_approval, 0) = 2
                            THEN NULLIF(vpd.finance_reject_reason, '')
                            ELSE NULL
                        END
                    ),
                    MAX(
                        CASE
                            WHEN COALESCE(vpd.acc_ent_sts, COALESCE(vpd.accstatus, 0)) = 2
                            THEN NULLIF(vpd.acc_ent_rej_reason, '')
                            ELSE NULL
                        END
                    ),
                    MAX(
                        CASE
                            WHEN COALESCE(vpd.vendor_bill_app_status, 0) = 2
                            THEN NULLIF(vpd.vendor_bill_reject_reason, '')
                            ELSE NULL
                        END
                    ),
                    ''
                ) AS reject_reason,
                COALESCE(
                    MAX(
                        CASE
                            WHEN COALESCE(vpd.managment_team_approval_sts, 0) = 2
                            THEN COALESCE(
                                get_staff_name(NULLIF(vpd.managment_team_approvedby, '')),
                                NULLIF(vpd.managment_team_approvedby, '')
                            )
                            ELSE NULL
                        END
                    ),
                    MAX(
                        CASE
                            WHEN COALESCE(vpd.finance_approval, 0) = 2
                            THEN COALESCE(
                                get_staff_name(NULLIF(vpd.finance_approved_by, '')),
                                NULLIF(vpd.finance_approved_by, '')
                            )
                            ELSE NULL
                        END
                    ),
                    MAX(
                        CASE
                            WHEN COALESCE(vpd.acc_ent_sts, COALESCE(vpd.accstatus, 0)) = 2
                            THEN COALESCE(
                                get_staff_name(COALESCE(NULLIF(vpd.acc_rejected_by, ''), NULLIF(vpd.vendor_account_approved_by, ''))),
                                COALESCE(NULLIF(vpd.acc_rejected_by, ''), NULLIF(vpd.vendor_account_approved_by, ''))
                            )
                            ELSE NULL
                        END
                    ),
                    MAX(
                        CASE
                            WHEN COALESCE(vpd.vendor_bill_app_status, 0) = 2
                            THEN COALESCE(
                                get_staff_name(COALESCE(NULLIF(vpd.vendor_bill_rejected_by, ''), NULLIF(vpd.vendor_bill_approval, ''))),
                                COALESCE(NULLIF(vpd.vendor_bill_rejected_by, ''), NULLIF(vpd.vendor_bill_approval, ''))
                            )
                            ELSE NULL
                        END
                    ),
                    ''
                ) AS rejected_by
            FROM vendor_payment_details vpd
            WHERE COALESCE(vpd.is_delete, 0) = 0
              AND COALESCE(vpd.dc_num, '') <> ''
            GROUP BY COALESCE(vpd.vendor_id, ''), COALESCE(vpd.dc_num, '')
        ) rejection_flags
          ON rejection_flags.vendor_id = COALESCE(vv.engineer_name, '')
         AND rejection_flags.dc_num = COALESCE(vv.dc_number, '')
        WHERE {where_sql}
        GROUP BY vv.engineer_name
        ORDER BY MAX(vv.unique_id) DESC
        LIMIT %s OFFSET %s
        """,
        params + [length, offset],
    )

    data = []
    for index, row in enumerate(rows, start=offset + 1):
        data.append(
            {
                "s_no": index,
                "vendor_id": safe_str(row.get("vendor_id")),
                "vendor_name": safe_str(row.get("vendor_name")),
                "vendor_code": safe_str(row.get("vendor_code")),
                "contact_no": safe_str(row.get("contact_no")),
                "address": safe_str(row.get("address")),
                "dc_count": safe_int(row.get("dc_count")),
                "total_amount": safe_float(row.get("total_amount")),
                "status": safe_str(row.get("status")) or "Pending",
                "reject_reason": safe_str(row.get("reject_reason")),
                "rejected_by": safe_str(row.get("rejected_by")),
            }
        )

    return {
        "status": True,
        "tab": "pending",
        "data": data,
        "total": total,
        "page": page,
    }


def created_rows(request, search, from_date, to_date, page, length, offset):
    where = ["COALESCE(vpm.is_delete, 0) = 0", "COALESCE(vpm.bill_no, '') <> ''"]
    params = []
    vpm_cols = table_columns("vendor_payment_details_main")
    additional_charges_col = pick_col(
        vpm_cols, "additionalcharges", "additional_charges"
    )
    additional_charges_sql = (
        f"COALESCE(vpm.{additional_charges_col}, 0)"
        if additional_charges_col
        else "0"
    )
    scope_where_sql, scope_params = followed_by_scope_sql(request, alias="icm_scope")
    if scope_where_sql:
        onsite_scope_sql, onsite_scope_params = onsite_creator_scope_sql(
            request, alias="vpm"
        )
        onsite_clause = ""
        if onsite_scope_sql:
            onsite_clause = (
                f" OR (COALESCE(vpm.po_form_unique_id, '') = %s AND {onsite_scope_sql})"
            )
        where.append(
            f"""
            (
                EXISTS (
                    SELECT 1
                    FROM vendor_payment_details vpd_scope
                    LEFT JOIN (
                        SELECT MAX(id) AS max_id, invoice_no, dc_number
                        FROM invoice_creation_main
                        WHERE is_delete = 0
                        GROUP BY invoice_no, dc_number
                    ) icm_latest_scope
                      ON icm_latest_scope.invoice_no = vpd_scope.invoice_no
                     AND icm_latest_scope.dc_number = vpd_scope.dc_num
                    LEFT JOIN invoice_creation_main icm_scope
                      ON icm_scope.id = icm_latest_scope.max_id
                    WHERE COALESCE(vpd_scope.is_delete, 0) = 0
                      AND vpd_scope.bill_no = vpm.bill_no
                      AND {scope_where_sql}
                )
                {onsite_clause}
            )
            """
        )
        params.extend(scope_params)
        if onsite_clause:
            params.append(ONSITE_PAYMENT_SOURCE)
            params.extend(onsite_scope_params)

    if from_date:
        where.append(
            "DATE(COALESCE(vpm.bill_date, vpm.vendor_bill_created_date)) >= %s"
        )
        params.append(from_date)
    if to_date:
        where.append(
            "DATE(COALESCE(vpm.bill_date, vpm.vendor_bill_created_date)) <= %s"
        )
        params.append(to_date)
    if search:
        where.append(
            "(vpm.bill_no LIKE %s OR COALESCE(vpm.vendor_name, '') LIKE %s OR COALESCE(vpm.vendor_id, '') LIKE %s OR "
            "COALESCE(vpm.user_vendor_invoice_id, '') LIKE %s OR COALESCE(vpm.veninvverifyid, '') LIKE %s OR "
            "COALESCE(vc.company_name, '') LIKE %s OR COALESCE(vc.name, '') LIKE %s)"
        )
        params.extend([f"%{search}%"] * 7)

    where_sql = " AND ".join(where)
    total_row = db_fetchone(
        f"""
        SELECT COUNT(*) AS total
        FROM vendor_payment_details_main vpm
        LEFT JOIN vendor_creation vc
          ON vc.unique_id = vpm.vendor_id
         AND COALESCE(vc.is_delete, 0) = 0
        WHERE {where_sql}
        """,
        params,
    )
    total = safe_int(total_row.get("total") if total_row else 0)

    rows = db_fetch(
        f"""
        SELECT
            vpm.bill_no,
            COALESCE(vpm.bill_date, vpm.vendor_bill_created_date) AS bill_date,
            COALESCE(NULLIF(vpm.veninvverifyid, ''), NULLIF(vpm.user_vendor_invoice_id, ''), '') AS vendor_invoice_id,
            COALESCE(vpm.vendor_inv_attach_approval_date, '') AS vendor_invoice_date,
            COALESCE(NULLIF(vpm.vendor_name, ''), vc.company_name, vc.name, '') AS vendor_name,
            COALESCE(vpm.vendor_id, '') AS vendor_id,
            COALESCE(dc.dc_count, 0) AS dc_count,
            COALESCE(vpm.total_amount, 0) AS total_amount,
            {additional_charges_sql} AS additional_charges,
            (COALESCE(vpm.total_amount, 0) + {additional_charges_sql}) AS grand_total_amount,
            COALESCE(vc.company_name, '') AS company_name,
            COALESCE(vc.contact_no, '') AS contact_no,
            COALESCE(vc.address, '') AS address,
            COALESCE(vc.mail_id, '') AS mail_id
        FROM vendor_payment_details_main vpm
        LEFT JOIN vendor_creation vc
          ON vc.unique_id = vpm.vendor_id
         AND COALESCE(vc.is_delete, 0) = 0
        LEFT JOIN (
            SELECT bill_no, COUNT(*) AS dc_count
            FROM vendor_payment_details
            WHERE COALESCE(is_delete, 0) = 0
            GROUP BY bill_no
        ) dc ON dc.bill_no = vpm.bill_no
        WHERE {where_sql}
        ORDER BY vpm.id DESC
        LIMIT %s OFFSET %s
        """,
        params + [length, offset],
    )

    data = []
    for index, row in enumerate(rows, start=offset + 1):
        data.append(
            {
                "s_no": index,
                "bill_no": safe_str(row.get("bill_no")),
                "bill_date": format_date(row.get("bill_date")),
                "vendor_invoice_id": safe_str(row.get("vendor_invoice_id")),
                "vendor_invoice_date": format_date(row.get("vendor_invoice_date")),
                "vendor_name": safe_str(row.get("vendor_name")),
                "vendor_id": safe_str(row.get("vendor_id")),
                "dc_count": safe_int(row.get("dc_count")),
                "total_amount": safe_float(row.get("total_amount")),
                "additional_charges": safe_float(row.get("additional_charges")),
                "grand_total_amount": safe_float(row.get("grand_total_amount")),
                "vendor_details": {
                    "company_name": safe_str(row.get("company_name")),
                    "contact_no": safe_str(row.get("contact_no")),
                    "address": safe_str(row.get("address")),
                    "mail_id": safe_str(row.get("mail_id")),
                },
            }
        )

    return {
        "status": True,
        "tab": "created",
        "data": data,
        "total": total,
        "page": page,
    }


def rejected_rows(request, search, from_date, to_date, page, length, offset):
    where = [
        "COALESCE(vpd.is_delete, 0) = 0",
        "COALESCE(vpd.bill_no, '') <> ''",
        "(COALESCE(vpd.managment_team_approval_sts, 0) = 2 OR COALESCE(vpd.finance_approval, 0) = 2 OR "
        "COALESCE(vpd.acc_ent_sts, COALESCE(vpd.accstatus, 0)) = 2 OR COALESCE(vpd.vendor_bill_app_status, 0) = 2)",
    ]
    params = []
    creator_scope_sql, creator_scope_params = rejected_bill_creator_scope_sql(request)
    if creator_scope_sql:
        where.append(creator_scope_sql)
        params.extend(creator_scope_params)

    if from_date:
        where.append("DATE(vpd.bill_date) >= %s")
        params.append(from_date)
    if to_date:
        where.append("DATE(vpd.bill_date) <= %s")
        params.append(to_date)
    if search:
        where.append(
            "(vpd.bill_no LIKE %s OR COALESCE(vpd.vendor_name, '') LIKE %s OR COALESCE(vpd.vendor_id, '') LIKE %s OR "
            "COALESCE(vc.company_name, '') LIKE %s OR COALESCE(vpd.vendor_bill_reject_reason, '') LIKE %s OR "
            "COALESCE(vpd.acc_ent_rej_reason, '') LIKE %s OR COALESCE(vpd.finance_reject_reason, '') LIKE %s OR "
            "COALESCE(vpd.managment_team_reject_reason, '') LIKE %s)"
        )
        params.extend([f"%{search}%"] * 8)

    where_sql = " AND ".join(where)
    total_row = db_fetchone(
        f"""
        SELECT COUNT(*) AS total
        FROM (
            SELECT vpd.bill_no
            FROM vendor_payment_details vpd
            LEFT JOIN vendor_creation vc
              ON vc.unique_id = vpd.vendor_id
             AND COALESCE(vc.is_delete, 0) = 0
            WHERE {where_sql}
            GROUP BY vpd.bill_no
        ) grouped
        """,
        params,
    )
    total = safe_int(total_row.get("total") if total_row else 0)

    rows = db_fetch(
        f"""
        SELECT
            vpd.bill_no,
            DATE_FORMAT(MAX(vpd.bill_date), '%%d-%%m-%%Y') AS bill_date,
            COALESCE(MAX(NULLIF(vc.company_name, '')), MAX(NULLIF(vc.name, '')), MAX(NULLIF(vpd.vendor_name, '')), '') AS vendor_name,
            COALESCE(MAX(NULLIF(vpd.vendor_id, '')), '') AS vendor_id,
            COUNT(DISTINCT vpd.dc_num) AS dc_count,
            ROUND(SUM(COALESCE(vpd.total_amount, 0)), 2) AS total_amount,
            COALESCE(
                get_staff_name(MAX(NULLIF(vpd.vendor_bill_created_by, ''))),
                CAST(MAX(NULLIF(vpd.vendor_bill_created_by, '')) AS CHAR),
                ''
            ) AS vendor_bill_created_by,
            CASE
                WHEN MAX(COALESCE(vpd.managment_team_approval_sts, 0)) = 2 THEN 'Management Approval'
                WHEN MAX(COALESCE(vpd.finance_approval, 0)) = 2 THEN 'Accounts Team Approval'
                WHEN MAX(COALESCE(vpd.acc_ent_sts, COALESCE(vpd.accstatus, 0))) = 2 THEN 'Accounts Team Bill Entry'
                WHEN MAX(COALESCE(vpd.vendor_bill_app_status, 0)) = 2 THEN 'Vendor Bill Approval'
                ELSE COALESCE(MAX(NULLIF(vpd.rejected_stage, '')), 'Rejected')
            END AS rejected_stage,
            CASE
                WHEN MAX(COALESCE(vpd.managment_team_approval_sts, 0)) = 2 THEN COALESCE(get_staff_name(MAX(NULLIF(vpd.managment_team_approvedby, ''))), CAST(MAX(NULLIF(vpd.managment_team_approvedby, '')) AS CHAR), '')
                WHEN MAX(COALESCE(vpd.finance_approval, 0)) = 2 THEN COALESCE(get_staff_name(MAX(NULLIF(vpd.finance_approved_by, ''))), CAST(MAX(NULLIF(vpd.finance_approved_by, '')) AS CHAR), '')
                WHEN MAX(COALESCE(vpd.acc_ent_sts, COALESCE(vpd.accstatus, 0))) = 2 THEN COALESCE(get_staff_name(COALESCE(MAX(NULLIF(vpd.vendor_account_approved_by, '')), MAX(NULLIF(vpd.acc_rejected_by, '')))), CAST(COALESCE(MAX(NULLIF(vpd.vendor_account_approved_by, '')), MAX(NULLIF(vpd.acc_rejected_by, ''))) AS CHAR), '')
                WHEN MAX(COALESCE(vpd.vendor_bill_app_status, 0)) = 2 THEN COALESCE(get_staff_name(COALESCE(MAX(NULLIF(vpd.vendor_bill_rejected_by, '')), MAX(NULLIF(vpd.vendor_bill_approval, '')))), CAST(COALESCE(MAX(NULLIF(vpd.vendor_bill_rejected_by, '')), MAX(NULLIF(vpd.vendor_bill_approval, ''))) AS CHAR), '')
                ELSE ''
            END AS rejected_by,
            CASE
                WHEN MAX(COALESCE(vpd.managment_team_approval_sts, 0)) = 2 THEN COALESCE(MAX(NULLIF(vpd.managment_team_reject_reason, '')), '')
                WHEN MAX(COALESCE(vpd.finance_approval, 0)) = 2 THEN COALESCE(MAX(NULLIF(vpd.finance_reject_reason, '')), '')
                WHEN MAX(COALESCE(vpd.acc_ent_sts, COALESCE(vpd.accstatus, 0))) = 2 THEN COALESCE(MAX(NULLIF(vpd.acc_ent_rej_reason, '')), MAX(NULLIF(vpd.finance_reject_reason, '')), '')
                WHEN MAX(COALESCE(vpd.vendor_bill_app_status, 0)) = 2 THEN COALESCE(MAX(NULLIF(vpd.vendor_bill_reject_reason, '')), '')
                ELSE ''
            END AS reject_reason
        FROM vendor_payment_details vpd
        LEFT JOIN vendor_creation vc
          ON vc.unique_id = vpd.vendor_id
         AND COALESCE(vc.is_delete, 0) = 0
        WHERE {where_sql}
        GROUP BY vpd.bill_no
        ORDER BY MAX(vpd.id) DESC
        LIMIT %s OFFSET %s
        """,
        params + [length, offset],
    )

    data = []
    for index, row in enumerate(rows, start=offset + 1):
        data.append(
            {
                "s_no": index,
                "bill_no": safe_str(row.get("bill_no")),
                "bill_date": safe_str(row.get("bill_date")),
                "vendor_name": safe_str(row.get("vendor_name")),
                "vendor_id": safe_str(row.get("vendor_id")),
                "dc_count": safe_int(row.get("dc_count")),
                "total_amount": safe_float(row.get("total_amount")),
                "vendor_bill_created_by": safe_str(row.get("vendor_bill_created_by")),
                "rejected_stage": safe_str(row.get("rejected_stage")) or "Rejected",
                "rejected_by": safe_str(row.get("rejected_by")),
                "reject_reason": safe_str(row.get("reject_reason")),
            }
        )

    return {
        "status": True,
        "tab": "rejected",
        "data": data,
        "total": total,
        "page": page,
    }


class VendorBillCreationListCreateView(APIView):
    def get(self, request):
        tab = safe_str(request.query_params.get("tab", "pending")).strip().lower()
        search = safe_str(request.query_params.get("search", "")).strip()
        from_date = safe_str(request.query_params.get("from_date", "")).strip()
        to_date = safe_str(request.query_params.get("to_date", "")).strip()
        page, length, offset = parse_pagination(request)

        if tab in {"created", "complete", "generated", "bill-generation"}:
            return Response(
                created_rows(request, search, from_date, to_date, page, length, offset)
            )
        if tab in {"rejected", "reject", "rejected-bills"}:
            return Response(
                rejected_rows(request, search, from_date, to_date, page, length, offset)
            )
        return Response(pending_rows(request, search, from_date, to_date, page, length, offset))

    def post(self, request):
        serializer = VendorBillCreationInputSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(
                {"status": False, "error": serializer.errors},
                status=status.HTTP_400_BAD_REQUEST,
            )

        item = VendorBillCreation.objects.create(
            unique_id=generate_unique_id(),
            name=serializer.validated_data["name"],
            is_active=int(serializer.validated_data["is_active"]),
            is_delete="0",
        )
        return Response(
            {"status": True, "data": VendorBillCreationSerializer(item).data}
        )


class VendorBillCreationPendingDetailView(APIView):
    def get(self, request):
        vendor_id = safe_str(request.query_params.get("vendor_id", "")).strip()
        if not vendor_id:
            return Response(
                {"status": False, "message": "vendor_id is required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        scope_where_sql, scope_params = followed_by_scope_sql(request)
        rows = db_fetch(
            f"""
            SELECT
                vv.unique_id,
                vv.engineer_name AS vendor_id,
                COALESCE(vv.po_num, '') AS po_num,
                DATE_FORMAT(vv.po_date, '%%d-%%m-%%Y') AS po_date,
                COALESCE(vv.invoice_no, '') AS invoice_no,
                DATE_FORMAT(vv.invoice_date, '%%d-%%m-%%Y') AS invoice_date,
                COALESCE(vv.dc_number, '') AS dc_number,
                DATE_FORMAT(vv.dc_date, '%%d-%%m-%%Y') AS dc_date,
                COALESCE(get_address(vv.consignee_unique_id), '') AS consignee_address,
                COALESCE(vv.invoice_qty, 0) AS invoice_qty,
                COALESCE(vv.vendor_bulk_rate, 0) AS rate,
                COALESCE(vv.vendor_bulk_gst, 0) AS gst,
                COALESCE(vc.company_name, vc.name, vv.outsrc_eng_name, '') AS vendor_company_name,
                COALESCE(vv.form_main_unique_id, '') AS form_main_unique_id,
                COALESCE(iv.veninvid, '') AS generated_vendor_invoice_id,
                COALESCE(iv.user_vendor_invoice_id, '') AS user_vendor_invoice_id,
                COALESCE(iv.inv_verfiy_attach, '') AS invoice_file,
                COALESCE(iv.inv_verfiy_attach_org_name, '') AS invoice_file_org_name,
                COALESCE(iv.po_ven_filename, '') AS po_file,
                COALESCE(iv.po_ven_orgfilename, '') AS po_file_org_name
            FROM view_outsource_vendor_verified_invoice vv
            LEFT JOIN invoice_verfication_table iv ON iv.unique_id = vv.unique_id
            LEFT JOIN invoice_creation_main icm
              ON icm.unique_id = vv.unique_id
             AND icm.is_delete = 0
            LEFT JOIN vendor_creation vc
              ON vc.unique_id = vv.engineer_name
             AND COALESCE(vc.is_delete, 0) = 0
            WHERE vv.engineer_name = %s
              AND icm.unique_id = vv.unique_id
              AND COALESCE(vv.signed_complete_status, 0) = 2
              AND (vv.dc_required IS NULL OR TRIM(vv.dc_required) <> '1')
              AND COALESCE(vv.vendor_payment_allocated, 0) = 0
              {f"AND {scope_where_sql}" if scope_where_sql else ""}
            ORDER BY vv.po_date DESC, vv.dc_date DESC, vv.unique_id DESC
            """,
            [vendor_id] + scope_params,
        )

        summary = vendor_summary(vendor_id)
        if rows and not safe_str(summary.get("company_name")):
            summary["company_name"] = safe_str(rows[0].get("vendor_company_name"))

        form_main_ids = {
            safe_str(row.get("form_main_unique_id")).strip()
            for row in rows
            if safe_str(row.get("form_main_unique_id")).strip()
        }
        customer_name_by_form_id = {}
        if form_main_ids:
            po_rows = list(
                PurchaseOrder.objects.filter(unique_id__in=form_main_ids, is_delete=0)
                .values("unique_id", "department")
            )
            department_ids = {
                safe_str(po.get("department")).strip()
                for po in po_rows
                if safe_str(po.get("department")).strip()
            }
            department_name_by_id = {
                safe_str(item.get("unique_id")): safe_str(item.get("department"))
                for item in DepartmentCreation.objects.filter(
                    unique_id__in=department_ids,
                    is_delete=0,
                ).values("unique_id", "department")
            }
            customer_name_by_form_id = {
                safe_str(po.get("unique_id")): first_non_empty(
                    department_name_by_id.get(safe_str(po.get("department")).strip()),
                    po.get("department"),
                )
                for po in po_rows
            }

        detail_rows = []
        generated_invoice_ids = set()
        user_invoice_ids = set()
        for index, row in enumerate(rows, start=1):
            qty = safe_decimal(row.get("invoice_qty"))
            rate = safe_decimal(row.get("rate"))
            gst = safe_decimal(row.get("gst"))
            basic_amount = qty * rate
            gst_amount = (basic_amount * gst) / Decimal("100")
            total_amount = basic_amount + gst_amount
            generated_vendor_invoice_id = safe_str(
                row.get("generated_vendor_invoice_id")
            )
            user_vendor_invoice_id = safe_str(row.get("user_vendor_invoice_id"))
            if generated_vendor_invoice_id:
                generated_invoice_ids.add(generated_vendor_invoice_id)
            if user_vendor_invoice_id:
                user_invoice_ids.add(user_vendor_invoice_id)
            detail_rows.append(
                {
                    "s_no": index,
                    "unique_id": safe_str(row.get("unique_id")),
                    "vendor_id": safe_str(row.get("vendor_id")),
                    "po_num": safe_str(row.get("po_num")),
                    "po_date": safe_str(row.get("po_date")),
                    "invoice_no": safe_str(row.get("invoice_no")),
                    "invoice_date": safe_str(row.get("invoice_date")),
                    "dc_number": safe_str(row.get("dc_number")),
                    "dc_date": safe_str(row.get("dc_date")),
                    "consignee_address": safe_str(row.get("consignee_address")),
                    "customer_name": first_non_empty(
                        customer_name_by_form_id.get(
                            safe_str(row.get("form_main_unique_id")).strip()
                        )
                    ),
                    "invoice_qty": safe_float(qty),
                    "rate": safe_float(rate),
                    "gst": safe_float(gst),
                    "basic_amount": safe_float(basic_amount),
                    "gst_amount": safe_float(gst_amount),
                    "total_amount": safe_float(total_amount),
                    "form_main_unique_id": safe_str(row.get("form_main_unique_id")),
                    "vendor_company_name": safe_str(row.get("vendor_company_name")),
                    "generated_vendor_invoice_id": generated_vendor_invoice_id,
                    "user_vendor_invoice_id": user_vendor_invoice_id,
                    "invoice_file": safe_str(row.get("invoice_file")),
                    "invoice_file_org_name": safe_str(row.get("invoice_file_org_name")),
                    "po_file": safe_str(row.get("po_file")),
                    "po_file_org_name": safe_str(row.get("po_file_org_name")),
                }
            )

        resolved_generated_vendor_invoice_id = (
            next(iter(generated_invoice_ids)) if len(generated_invoice_ids) == 1 else ""
        )
        resolved_user_vendor_invoice_id = (
            next(iter(user_invoice_ids)) if len(user_invoice_ids) == 1 else ""
        )
        if not resolved_generated_vendor_invoice_id:
            resolved_generated_vendor_invoice_id = generate_vendor_invoice_no()

        return Response(
            {
                "status": True,
                "summary": {
                    "vendor_id": vendor_id,
                    "company_name": safe_str(
                        summary.get("company_name") or summary.get("name")
                    ),
                    "contact_person": safe_str(summary.get("name")),
                    "contact_no": safe_str(summary.get("contact_no")),
                    "mail_id": safe_str(summary.get("mail_id")),
                    "pan_no": safe_str(summary.get("pan_no")),
                    "gst_no": safe_str(summary.get("gst_no")),
                    "address": safe_str(summary.get("address")),
                    "account_no": safe_str(summary.get("account_no")),
                    "ifsc_code": safe_str(summary.get("ifsc_code")),
                    "bank_name": safe_str(summary.get("bank_name")),
                    "branch_name": safe_str(summary.get("branch_name")),
                    "bank_proof": safe_str(summary.get("bank_proof")),
                    "pan_attach_file_name": safe_str(
                        summary.get("pan_attach_file_name")
                    ),
                    "acc_holder_name": safe_str(summary.get("acc_holder_name")),
                },
                "rows": detail_rows,
                "generated_vendor_invoice_id": resolved_generated_vendor_invoice_id,
                "user_vendor_invoice_id": resolved_user_vendor_invoice_id,
                "invoice_issue_date": date.today().isoformat(),
            }
        )


class VendorBillCreationBillCreateView(APIView):
    def post(self, request):
        vendor_id = safe_str(request.data.get("vendor_id", "")).strip()
        selected_ids = split_selected_ids(request)
        if not vendor_id or not selected_ids:
            return Response(
                {"status": False, "message": "Vendor and selected rows are required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        placeholders = ", ".join(["%s"] * len(selected_ids))
        scope_where_sql, scope_params = followed_by_scope_sql(request)
        rows = db_fetch(
            f"""
            SELECT
                vv.unique_id,
                vv.engineer_name AS vendor_id,
                COALESCE(vv.po_num, '') AS po_num,
                COALESCE(vv.form_main_unique_id, '') AS form_main_unique_id,
                COALESCE(vv.invoice_no, '') AS invoice_no,
                COALESCE(vv.dc_number, '') AS dc_number,
                COALESCE(vv.dc_date, '') AS dc_date,
                COALESCE(vv.invoice_qty, 0) AS invoice_qty,
                COALESCE(vv.vendor_bulk_rate, 0) AS rate,
                COALESCE(vv.vendor_bulk_gst, 0) AS gst,
                COALESCE(vc.company_name, vc.name, vv.outsrc_eng_name, '') AS vendor_company_name,
                COALESCE(iv.veninvid, '') AS generated_vendor_invoice_id,
                COALESCE(iv.user_vendor_invoice_id, '') AS user_vendor_invoice_id,
                COALESCE(iv.inv_verfiy_attach, '') AS invoice_file,
                COALESCE(iv.inv_verfiy_attach_org_name, '') AS invoice_file_org_name,
                COALESCE(iv.po_ven_filename, '') AS po_file,
                COALESCE(iv.po_ven_orgfilename, '') AS po_file_org_name
            FROM view_outsource_vendor_verified_invoice vv
            LEFT JOIN invoice_verfication_table iv ON iv.unique_id = vv.unique_id
            LEFT JOIN invoice_creation_main icm
              ON icm.unique_id = vv.unique_id
             AND icm.is_delete = 0
            LEFT JOIN vendor_creation vc
              ON vc.unique_id = vv.engineer_name
             AND COALESCE(vc.is_delete, 0) = 0
            WHERE vv.engineer_name = %s
              AND icm.unique_id = vv.unique_id
              AND vv.unique_id IN ({placeholders})
              AND COALESCE(vv.signed_complete_status, 0) = 2
              AND (vv.dc_required IS NULL OR TRIM(vv.dc_required) <> '1')
              AND COALESCE(vv.vendor_payment_allocated, 0) = 0
              {f"AND {scope_where_sql}" if scope_where_sql else ""}
            ORDER BY vv.unique_id
            """,
            [vendor_id] + selected_ids + scope_params,
        )
        if not rows:
            return Response(
                {
                    "status": False,
                    "message": "No pending invoice rows found for the selected vendor.",
                },
                status=status.HTTP_404_NOT_FOUND,
            )

        now = datetime.now()
        current_user = acting_user(request)
        acc_year = get_financial_year(now)
        session_values = session_payload(request, current_user)
        bill_no = generate_vendor_bill_no()
        main_unique_id = generate_unique_id()
        summary = vendor_summary(vendor_id)
        resolved_vendor_name = first_non_empty(
            request.data.get("vendor_name"),
            rows[0].get("vendor_company_name"),
            summary.get("company_name"),
            summary.get("name"),
        )

        submitted_generated_vendor_invoice_id = (
            safe_str(request.data.get("generated_vendor_invoice_id")).strip().upper()
        )
        existing_generated_vendor_invoice_ids = {
            safe_str(row.get("generated_vendor_invoice_id")).strip().upper()
            for row in rows
            if safe_str(row.get("generated_vendor_invoice_id")).strip()
        }
        existing_generated_vendor_invoice_id = (
            next(iter(existing_generated_vendor_invoice_ids))
            if len(existing_generated_vendor_invoice_ids) == 1
            else ""
        )
        if existing_generated_vendor_invoice_id:
            final_generated_vendor_invoice_id = existing_generated_vendor_invoice_id
        elif submitted_generated_vendor_invoice_id and not vendor_invoice_no_in_use(
            submitted_generated_vendor_invoice_id
        ):
            final_generated_vendor_invoice_id = submitted_generated_vendor_invoice_id
        else:
            final_generated_vendor_invoice_id = generate_vendor_invoice_no()

        existing_user_vendor_invoice_ids = {
            safe_str(row.get("user_vendor_invoice_id")).strip()
            for row in rows
            if safe_str(row.get("user_vendor_invoice_id")).strip()
        }
        existing_user_vendor_invoice_id = (
            next(iter(existing_user_vendor_invoice_ids))
            if len(existing_user_vendor_invoice_ids) == 1
            else ""
        )
        manual_user_vendor_invoice_id = (
            safe_str(request.data.get("user_vendor_invoice_id")).strip()
            or existing_user_vendor_invoice_id
        )
        display_vendor_invoice_id = (
            manual_user_vendor_invoice_id or final_generated_vendor_invoice_id
        )
        invoice_issue_date = parse_request_date(
            request.data.get("invoice_issue_date"), now.date()
        )
        additional_charges = safe_decimal(request.data.get("additional_charges"))

        invoice_upload = request.FILES.get("invoice_file") or request.FILES.get("file")
        po_upload = request.FILES.get("po_file") or request.FILES.get("pofile")
        invoice_file_name = first_non_empty(*[row.get("invoice_file") for row in rows])
        invoice_original = first_non_empty(
            *[row.get("invoice_file_org_name") for row in rows]
        )
        po_file_name = first_non_empty(*[row.get("po_file") for row in rows])
        po_original = first_non_empty(*[row.get("po_file_org_name") for row in rows])
        invoice_token = (
            re.sub(r"[^A-Za-z0-9._-]+", "-", final_generated_vendor_invoice_id).strip(
                "-"
            )
            or generate_unique_id()
        )

        try:
            if invoice_upload:
                invoice_file_name, invoice_original = save_vendor_payment_attachment(
                    invoice_upload, f"{invoice_token}.pdf", "invoice"
                )
            if po_upload:
                po_file_name, po_original = save_vendor_payment_attachment(
                    po_upload, f"PO{invoice_token}.pdf", "po"
                )
        except ValueError as exc:
            return Response(
                {"status": False, "message": safe_str(exc)},
                status=status.HTTP_400_BAD_REQUEST,
            )
        except OSError as exc:
            return Response(
                {"status": False, "message": safe_str(exc)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

        if not invoice_file_name:
            return Response(
                {"status": False, "message": "Vendor invoice copy PDF is required."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if not po_file_name:
            return Response(
                {"status": False, "message": "Vendor PO copy PDF is required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        detail_additional_col = ensure_decimal_column(
            "vendor_payment_details", "additionalcharges", "additional_charges"
        )
        main_additional_col = ensure_decimal_column(
            "vendor_payment_details_main", "additionalcharges", "additional_charges"
        )

        total_amount = Decimal("0")
        total_qty = Decimal("0")

        with transaction.atomic():
            for row in rows:
                qty = safe_decimal(row.get("invoice_qty"))
                rate = safe_decimal(row.get("rate"))
                gst = safe_decimal(row.get("gst"))
                basic_amount = qty * rate
                gst_amount = (basic_amount * gst) / Decimal("100")
                line_total = basic_amount + gst_amount
                total_amount += line_total
                total_qty += qty

                VendorPaymentDetail.objects.create(
                    unique_id=generate_unique_id(),
                    main_unique_id=main_unique_id,
                    bill_no=bill_no,
                    bill_date=now,
                    po_num=safe_str(row.get("po_num")),
                    po_form_unique_id=safe_str(row.get("form_main_unique_id")),
                    invoice_no=safe_str(row.get("invoice_no")),
                    invoice_qty=qty,
                    dc_num=safe_str(row.get("dc_number")),
                    dc_date=format_date(row.get("dc_date")),
                    rate=rate,
                    gst=gst,
                    amount=line_total,
                    total_amount=line_total,
                    vendor_name=limit_str(resolved_vendor_name, 255),
                    vendor_id=vendor_id,
                    inv_verfiy_attach=invoice_file_name,
                    inv_verfiy_attach_org_name=invoice_original,
                    po_ven_filename=po_file_name,
                    po_ven_orgfilename=po_original,
                    veninvverifyid=final_generated_vendor_invoice_id,
                    vendor_inv_attach_approval=current_user,
                    vendor_inv_attach_approval_date=invoice_issue_date,
                    veninvstatus=1,
                    vendor_bill_created_by=current_user,
                    vendor_bill_created_date=now,
                    acc_year=acc_year,
                    is_delete=0,
                    **session_values,
                )

                with connection.cursor() as cursor:
                    cursor.execute(
                        """
                        UPDATE invoice_verfication_table
                        SET inv_verfiy_attach = %s,
                            inv_verfiy_attach_org_name = %s,
                            po_ven_filename = %s,
                            po_ven_orgfilename = %s,
                            veninvid = %s,
                            user_vendor_invoice_id = %s,
                            vendor_inv_attach_approval = %s,
                            vendor_inv_attach_approval_date = %s,
                            veninvstatus = 1,
                            vendor_payment_allocated = 1,
                            vendor_bill_no = %s,
                            vendor_bill_app_status = 0,
                            vendor_bill_reject_reason = '',
                            vendor_bill_rejected_by = '',
                            vendor_finance_approval = 0,
                            finance_approved_by = '',
                            finance_approved_date = NULL,
                            finance_reject_reason = '',
                            vendor_account_approved_by = '',
                            vendor_account_approval_date = NULL,
                            accstatus = 0,
                            managment_team_allocated = 0,
                            managment_team_approval_sts = 0,
                            managment_team_approved_by = ''
                        WHERE unique_id = %s
                        """,
                        [
                            invoice_file_name,
                            invoice_original,
                            po_file_name,
                            po_original,
                            final_generated_vendor_invoice_id,
                            manual_user_vendor_invoice_id,
                            current_user,
                            invoice_issue_date,
                            bill_no,
                            safe_str(row.get("unique_id")),
                        ],
                    )

            VendorPaymentMain.objects.create(
                unique_id=main_unique_id,
                main_unique_id=main_unique_id,
                bill_no=bill_no,
                bill_date=now,
                po_num=safe_str(rows[0].get("po_num")),
                po_form_unique_id=safe_str(rows[0].get("form_main_unique_id")),
                invoice_no=safe_str(rows[0].get("invoice_no")),
                dc_num=safe_str(rows[0].get("dc_number")),
                dc_date=format_date(rows[0].get("dc_date")),
                invoice_qty=total_qty,
                vendor_id=vendor_id,
                vendor_name=limit_str(resolved_vendor_name, 250),
                rate=safe_decimal(rows[0].get("rate")),
                gst=safe_decimal(rows[0].get("gst")),
                amount=total_amount,
                total_amount=total_amount,
                vendor_payment_allocated=1,
                inv_verfiy_attach=invoice_file_name,
                inv_verfiy_attach_org_name=invoice_original,
                po_ven_filename=po_file_name,
                po_ven_orgfilename=po_original,
                veninvverifyid=final_generated_vendor_invoice_id,
                user_vendor_invoice_id=display_vendor_invoice_id,
                vendor_inv_attach_approval=current_user,
                vendor_inv_attach_approval_date=invoice_issue_date,
                veninvstatus=1,
                vendor_bill_created_by=current_user,
                vendor_bill_created_date=now,
                acc_year=acc_year,
                is_delete=0,
                **session_values,
            )

            with connection.cursor() as cursor:
                if detail_additional_col:
                    cursor.execute(
                        f"UPDATE vendor_payment_details SET {detail_additional_col} = %s WHERE main_unique_id = %s",
                        [additional_charges, main_unique_id],
                    )
                if main_additional_col:
                    cursor.execute(
                        f"UPDATE vendor_payment_details_main SET {main_additional_col} = %s WHERE unique_id = %s",
                        [additional_charges, main_unique_id],
                    )

        return Response(
            {
                "status": True,
                "message": "Vendor bill created successfully.",
                "bill_no": bill_no,
                "generated_vendor_invoice_id": final_generated_vendor_invoice_id,
                "user_vendor_invoice_id": manual_user_vendor_invoice_id,
                "additional_charges": additional_charges,
            }
        )


class VendorBillCreationBillDetailView(APIView):
    def get(self, request):
        bill_no = safe_str(request.query_params.get("bill_no", "")).strip()
        if not bill_no:
            raise Http404("bill_no is required")

        scope_where_sql, scope_params = followed_by_scope_sql(request, alias="icm_scope")
        if scope_where_sql:
            onsite_scope_sql, onsite_scope_params = onsite_creator_scope_sql(
                request, alias="vpd_scope"
            )
            onsite_clause = ""
            if onsite_scope_sql:
                onsite_clause = (
                    f" OR (COALESCE(vpd_scope.po_form_unique_id, '') = %s AND {onsite_scope_sql})"
                )
            access_row = db_fetchone(
                f"""
                SELECT 1 AS allowed
                FROM vendor_payment_details vpd_scope
                LEFT JOIN (
                    SELECT MAX(id) AS max_id, invoice_no, dc_number
                    FROM invoice_creation_main
                    WHERE is_delete = 0
                    GROUP BY invoice_no, dc_number
                ) icm_latest_scope
                  ON icm_latest_scope.invoice_no = vpd_scope.invoice_no
                 AND icm_latest_scope.dc_number = vpd_scope.dc_num
                LEFT JOIN invoice_creation_main icm_scope
                  ON icm_scope.id = icm_latest_scope.max_id
                WHERE COALESCE(vpd_scope.is_delete, 0) = 0
                  AND vpd_scope.bill_no = %s
                  AND (
                      {scope_where_sql}
                      {onsite_clause}
                  )
                LIMIT 1
                """,
                [bill_no] + scope_params + (
                    [ONSITE_PAYMENT_SOURCE] + onsite_scope_params
                    if onsite_clause
                    else []
                ),
            )
            if not access_row:
                raise Http404("Bill not found")

        vpm_cols = table_columns("vendor_payment_details_main")
        additional_charges_col = pick_col(
            vpm_cols, "additionalcharges", "additional_charges"
        )
        additional_charges_sql = (
            f"COALESCE(vpm.{additional_charges_col}, 0)"
            if additional_charges_col
            else "0"
        )

        summary_row = db_fetchone(
            f"""
            SELECT
                vpm.bill_no,
                COALESCE(vpm.bill_date, vpm.vendor_bill_created_date, '') AS bill_date,
                COALESCE(NULLIF(vpm.vendor_name, ''), vc.company_name, vc.name, '') AS vendor_name,
                COALESCE(vpm.vendor_id, '') AS vendor_id,
                COALESCE(NULLIF(vpm.veninvverifyid, ''), NULLIF(vpm.user_vendor_invoice_id, ''), '') AS vendor_invoice_id,
                COALESCE(vpm.vendor_inv_attach_approval_date, '') AS vendor_invoice_date,
                COALESCE(vpm.inv_verfiy_attach, '') AS invoice_file,
                COALESCE(vpm.inv_verfiy_attach_org_name, '') AS invoice_file_name,
                COALESCE(vpm.po_ven_filename, '') AS po_file,
                COALESCE(vpm.po_ven_orgfilename, '') AS po_file_name,
                COALESCE(vpm.vendor_bill_created_by, '') AS bill_created_by,
                COALESCE(vpm.vendor_bill_created_date, '') AS bill_created_date,
                COALESCE(vpm.vendor_bill_reject_reason, '') AS reject_reason,
                COALESCE(vc.company_name, '') AS company_name,
                COALESCE(vc.name, '') AS contact_person,
                COALESCE(vc.contact_no, '') AS contact_no,
                COALESCE(vc.mail_id, '') AS mail_id,
                COALESCE(vc.pan_no, '') AS pan_no,
                COALESCE(vc.gst_no, '') AS gst_no,
                COALESCE(vc.address, '') AS address,
                COALESCE(vc.account_no, '') AS account_no,
                COALESCE(vc.ifsc_code, '') AS ifsc_code,
                COALESCE(vc.bank_name, '') AS bank_name,
                COALESCE(vc.branch_name, '') AS branch_name,
                COALESCE(vc.acc_holder_name, '') AS acc_holder_name,
                COALESCE(vc.pan_attach_file_name, '') AS pan_attach_file_name,
                COALESCE(vc.bank_proof, '') AS bank_proof,
                {additional_charges_sql} AS additional_charges,
                COALESCE(vpm.acctdsvalue, 0) AS tds_deduction,
                COALESCE(vpm.accotherdeduction, 0) AS others_deduction,
                COALESCE(vpm.advancepayment, 0) AS advance_amount,
                COALESCE(vpm.acctotalpaybleamount, 0) AS total_payable
            FROM vendor_payment_details_main vpm
            LEFT JOIN vendor_creation vc
              ON vc.unique_id = vpm.vendor_id
             AND COALESCE(vc.is_delete, 0) = 0
            WHERE vpm.bill_no = %s AND COALESCE(vpm.is_delete, 0) = 0
            LIMIT 1
            """,
            [bill_no],
        )
        if not summary_row:
            raise Http404("Bill not found")

        rows = db_fetch(
            """
            SELECT
                vpd.dc_num AS dc_no,
                COALESCE(vpd.dc_date, '') AS dc_date,
                COALESCE(vpd.invoice_no, '') AS invoice_no,
                DATE_FORMAT(vv.invoice_date, '%%d-%%m-%%Y') AS invoice_date,
                COALESCE(vpd.po_num, '') AS po_no,
                DATE_FORMAT(vv.po_date, '%%d-%%m-%%Y') AS po_date,
                COALESCE(vpd.invoice_qty, 0) AS invoice_qty,
                COALESCE(get_address(vv.consignee_unique_id), '') AS consignee_address,
                COALESCE(vpd.rate, 0) AS unit_price,
                (COALESCE(vpd.invoice_qty, 0) * COALESCE(vpd.rate, 0)) AS basic_amount,
                COALESCE(vpd.gst, 0) AS gst,
                ((COALESCE(vpd.invoice_qty, 0) * COALESCE(vpd.rate, 0)) * (COALESCE(vpd.gst, 0) / 100)) AS gst_amount,
                COALESCE(vpd.total_amount, 0) AS total_amount
            FROM vendor_payment_details vpd
            LEFT JOIN view_outsource_vendor_verified_invoice vv
              ON vv.dc_number = vpd.dc_num
             AND vv.engineer_name = vpd.vendor_id
            WHERE vpd.bill_no = %s AND COALESCE(vpd.is_delete, 0) = 0
            ORDER BY vpd.id
            """,
            [bill_no],
        )

        detail_rows = []
        legacy_rows = []
        total_amount = Decimal("0")
        for index, row in enumerate(rows, start=1):
            line_total = safe_decimal(row.get("total_amount"))
            total_amount += line_total
            item = {
                "s_no": index,
                "dc_no": safe_str(row.get("dc_no")),
                "dc_date": format_date(row.get("dc_date")),
                "invoice_no": safe_str(row.get("invoice_no")),
                "invoice_date": format_date(row.get("invoice_date")),
                "po_no": safe_str(row.get("po_no")),
                "po_date": format_date(row.get("po_date")),
                "consignee_address": safe_str(row.get("consignee_address")),
                "invoice_qty": safe_float(row.get("invoice_qty")),
                "unit_price": safe_float(row.get("unit_price")),
                "basic_amount": safe_float(row.get("basic_amount")),
                "gst": f"{safe_float(row.get('gst')):g} %",
                "gst_amount": safe_float(row.get("gst_amount")),
                "total_amount": safe_float(line_total),
            }
            detail_rows.append(item)
            legacy_rows.append(
                {
                    "s_no": index,
                    "dc_number": item["dc_no"],
                    "dc_date": item["dc_date"],
                    "invoice_no": item["invoice_no"],
                    "invoice_date": item["invoice_date"],
                    "po_num": item["po_no"],
                    "po_date": item["po_date"],
                    "consignee_address": item["consignee_address"],
                    "invoice_qty": item["invoice_qty"],
                    "rate": item["unit_price"],
                    "gst": safe_float(row.get("gst")),
                    "basic_amount": item["basic_amount"],
                    "gst_amount": item["gst_amount"],
                    "total_amount": item["total_amount"],
                }
            )

        additional_charges = safe_decimal(summary_row.get("additional_charges"))
        grand_total_amount = total_amount + additional_charges
        approval_row = (
            db_fetchone(
                """
            SELECT
                COALESCE(
                    get_staff_name(MAX(NULLIF(vendor_bill_created_by, ''))),
                    CAST(MAX(NULLIF(vendor_bill_created_by, '')) AS CHAR),
                    ''
                ) AS bill_created_by,
                COALESCE(DATE_FORMAT(MAX(vendor_bill_created_date), '%%d-%%m-%%Y %%H:%%i:%%s'), '') AS bill_created_at,
                COALESCE(MAX(vendor_bill_approval), '') AS operation_by,
                COALESCE(DATE_FORMAT(MAX(vendor_bill_approval_date), '%%d-%%m-%%Y %%H:%%i:%%s'), '') AS operation_at,
                COALESCE(MAX(vendor_bill_app_status), 0) AS operation_status,
                COALESCE(MAX(vendor_account_approved_by), '') AS account_entry_by,
                COALESCE(DATE_FORMAT(MAX(vendor_account_approval_date), '%%d-%%m-%%Y %%H:%%i:%%s'), '') AS account_entry_at,
                COALESCE(MAX(acc_ent_sts), MAX(accstatus), 0) AS account_entry_status,
                COALESCE(MAX(finance_approved_by), '') AS accounts_approval_by,
                COALESCE(DATE_FORMAT(MAX(finance_approved_date), '%%d-%%m-%%Y %%H:%%i:%%s'), '') AS accounts_approval_at,
                COALESCE(MAX(finance_approval), 0) AS accounts_approval_status,
                COALESCE(MAX(managment_team_approvedby), '') AS management_by,
                COALESCE(DATE_FORMAT(MAX(managment_team_approvaldate), '%%d-%%m-%%Y %%H:%%i:%%s'), '') AS management_at,
                COALESCE(MAX(managment_team_approval_sts), 0) AS management_status,
                COALESCE(MAX(transaction_id), '') AS payment_ref,
                COALESCE(DATE_FORMAT(MAX(transaction_date), '%%d-%%m-%%Y'), '') AS payment_date,
                COALESCE(MAX(acctotalpaybleamount), 0) AS payment_amount,
                COALESCE(MAX(accounts_approval), 0) AS payment_status
            FROM vendor_payment_details
            WHERE bill_no = %s AND COALESCE(is_delete, 0) = 0
            """,
                [bill_no],
            )
            or {}
        )

        approval_item = {
            "s_no": 1,
            "bill_created_by": safe_str(approval_row.get("bill_created_by")),
            "bill_created_at": safe_str(approval_row.get("bill_created_at")),
            "bill_created_status": "Bill Created",
            "operation_by": safe_str(approval_row.get("operation_by")),
            "operation_at": safe_str(approval_row.get("operation_at")),
            "operation_status": status_text(approval_row.get("operation_status")),
            "account_entry_by": safe_str(approval_row.get("account_entry_by")),
            "account_entry_at": safe_str(approval_row.get("account_entry_at")),
            "account_entry_status": status_text(
                approval_row.get("account_entry_status")
            ),
            "accounts_approval_by": safe_str(approval_row.get("accounts_approval_by")),
            "accounts_approval_at": safe_str(approval_row.get("accounts_approval_at")),
            "accounts_approval_status": status_text(
                approval_row.get("accounts_approval_status")
            ),
            "management_by": safe_str(approval_row.get("management_by")),
            "management_at": safe_str(approval_row.get("management_at")),
            "management_status": status_text(approval_row.get("management_status")),
            "payment_ref": safe_str(approval_row.get("payment_ref")),
            "payment_date": safe_str(approval_row.get("payment_date")),
            "payment_amount": f"{safe_float(approval_row.get('payment_amount')):,.2f}",
            "payment_status": payment_status_text(approval_row.get("payment_status")),
        }

        return Response(
            {
                "status": True,
                "id": safe_str(summary_row.get("bill_no")),
                "vendor_name": safe_str(
                    summary_row.get("company_name") or summary_row.get("vendor_name")
                ),
                "vendor_address": safe_str(summary_row.get("address")),
                "vendor_gst": safe_str(summary_row.get("gst_no")),
                "vendor_pan": safe_str(summary_row.get("pan_no")),
                "vendor_email": safe_str(summary_row.get("mail_id")),
                "vendor_phone": safe_str(summary_row.get("contact_no")),
                "vendor_bill_no": safe_str(summary_row.get("bill_no")),
                "vendor_bill_date": format_date(summary_row.get("bill_date")),
                "vendor_invoice_no": safe_str(summary_row.get("vendor_invoice_id")),
                "vendor_invoice_date": format_date(
                    summary_row.get("vendor_invoice_date")
                ),
                "additional_charges": safe_float(additional_charges),
                "invoice_attach_url": safe_str(summary_row.get("invoice_file")),
                "po_attach_url": safe_str(summary_row.get("po_file")),
                "bank_name": safe_str(summary_row.get("bank_name")),
                "branch": safe_str(summary_row.get("branch_name")),
                "account_no": safe_str(summary_row.get("account_no")),
                "ifsc_code": safe_str(summary_row.get("ifsc_code")),
                "account_holder": safe_str(summary_row.get("acc_holder_name")),
                "pan_copy_url": safe_str(summary_row.get("pan_attach_file_name")),
                "bank_proof_url": safe_str(summary_row.get("bank_proof")),
                "reject_reason": safe_str(summary_row.get("reject_reason")),
                "dc_items": detail_rows,
                "rows": legacy_rows,
                "total_amount": safe_float(total_amount),
                "grand_total_amount": safe_float(grand_total_amount),
                "tds_deduction": safe_float(summary_row.get("tds_deduction")),
                "others_deduction": safe_float(summary_row.get("others_deduction")),
                "advance_amount": safe_float(summary_row.get("advance_amount")),
                "total_payable": safe_float(summary_row.get("total_payable"))
                or safe_float(grand_total_amount),
                "approvals": [approval_item],
                "summary": {
                    "bill_no": safe_str(summary_row.get("bill_no")),
                    "bill_date": format_date(summary_row.get("bill_date")),
                    "vendor_name": safe_str(summary_row.get("vendor_name")),
                    "vendor_id": safe_str(summary_row.get("vendor_id")),
                    "vendor_invoice_id": safe_str(summary_row.get("vendor_invoice_id")),
                    "vendor_invoice_date": format_date(
                        summary_row.get("vendor_invoice_date")
                    ),
                    "invoice_file": safe_str(summary_row.get("invoice_file")),
                    "invoice_file_name": safe_str(summary_row.get("invoice_file_name")),
                    "po_file": safe_str(summary_row.get("po_file")),
                    "po_file_name": safe_str(summary_row.get("po_file_name")),
                    "bill_created_by": safe_str(summary_row.get("bill_created_by")),
                    "bill_created_date": format_date(
                        summary_row.get("bill_created_date"), "%d-%m-%Y %H:%M:%S"
                    ),
                    "company_name": safe_str(summary_row.get("company_name")),
                    "contact_person": safe_str(summary_row.get("contact_person")),
                    "contact_no": safe_str(summary_row.get("contact_no")),
                    "mail_id": safe_str(summary_row.get("mail_id")),
                    "pan_no": safe_str(summary_row.get("pan_no")),
                    "gst_no": safe_str(summary_row.get("gst_no")),
                    "address": safe_str(summary_row.get("address")),
                    "account_no": safe_str(summary_row.get("account_no")),
                    "ifsc_code": safe_str(summary_row.get("ifsc_code")),
                    "bank_name": safe_str(summary_row.get("bank_name")),
                    "branch_name": safe_str(summary_row.get("branch_name")),
                    "acc_holder_name": safe_str(summary_row.get("acc_holder_name")),
                    "pan_attach_file_name": safe_str(
                        summary_row.get("pan_attach_file_name")
                    ),
                    "bank_proof": safe_str(summary_row.get("bank_proof")),
                    "reject_reason": safe_str(summary_row.get("reject_reason")),
                },
            }
        )


ONSITE_PAYMENT_SOURCE = "ONSITE_ENGINEER_PAYMENT"


def onsite_file_url(file_kind, filename):
    value = safe_str(filename).strip()
    if not value:
        return ""
    safe_name = Path(value).name
    return f"/api/master/vendor-bill-approval/files/{file_kind}/{safe_name}/"


def generate_onsite_bill_no():
    prefix = f"ONSITE-{datetime.now().strftime('%Y%m')}"
    row = db_fetchone(
        """
        SELECT bill_no
        FROM vendor_payment_details
        WHERE COALESCE(is_delete, 0) = 0
          AND bill_no LIKE %s
        ORDER BY id DESC
        LIMIT 1
        """,
        [f"{prefix}-%"],
    )
    if not row or not row.get("bill_no"):
        return f"{prefix}-0001"
    try:
        sequence = int(safe_str(row.get("bill_no")).split("-")[-1]) + 1
    except ValueError:
        sequence = 1
    return f"{prefix}-{sequence:04d}"


def engineer_display_name(engineer_type, engineer_id):
    value = safe_str(engineer_id).strip()
    if not value:
        return ""
    if engineer_type == "outsource-vendor":
        summary = vendor_summary(value)
        return first_non_empty(summary.get("company_name"), summary.get("name"), value)
    if engineer_type == "own-engineer":
        row = db_fetchone(
            "SELECT engineer_name FROM engineer_name_creation WHERE unique_id=%s AND is_delete=0 LIMIT 1",
            [value],
        )
        return safe_str((row or {}).get("engineer_name")) or value
    if engineer_type == "inhouse":
        row = db_fetchone(
            """
            SELECT staff_name
            FROM user
            WHERE (unique_id=%s OR staff_id=%s) AND is_delete=0
            LIMIT 1
            """,
            [value, value],
        )
        return safe_str((row or {}).get("staff_name")) or value
    return value


class OnsiteEngineerPaymentListCreateView(APIView):
    def get(self, request):
        search = safe_str(request.query_params.get("search")).strip()
        page, length, offset = parse_pagination(request)
        params = [ONSITE_PAYMENT_SOURCE]
        where = ["COALESCE(vpd.po_form_unique_id, '') = %s", "COALESCE(vpd.is_delete, 0) = 0"]
        if search:
            where.append("(vpd.bill_no LIKE %s OR vpd.vendor_name LIKE %s OR vpd.dc_num LIKE %s)")
            like = f"%{search}%"
            params.extend([like, like, like])
        where_sql = " AND ".join(where)
        vpd_cols = table_columns("vendor_payment_details")
        services_col = pick_col(vpd_cols, "bill_remark", "vendor_bill_reject_reason")
        services_sql = (
            f"COALESCE(NULLIF(vpd.{services_col}, ''), vpd.dc_num, '')"
            if services_col
            else "COALESCE(vpd.dc_num, '')"
        )

        total_row = db_fetchone(f"SELECT COUNT(*) AS total FROM vendor_payment_details vpd WHERE {where_sql}", params)
        rows = db_fetch(
            f"""
            SELECT
                vpd.unique_id,
                vpd.bill_no,
                DATE_FORMAT(vpd.bill_date, '%%d-%%m-%%Y') AS bill_date,
                vpd.vendor_id AS engineer_id,
                vpd.vendor_name AS engineer_name,
                vpd.invoice_no AS engineer_type,
                {services_sql} AS services_charges,
                vpd.rate,
                vpd.gst,
                vpd.amount,
                vpd.total_amount,
                vpd.inv_verfiy_attach AS bill_copy,
                vpd.po_ven_filename AS po_copy,
                vpd.vendor_bill_app_status,
                vpd.acc_ent_sts,
                vpd.finance_approval,
                vpd.managment_team_approval_sts,
                vpd.accounts_approval
            FROM vendor_payment_details vpd
            WHERE {where_sql}
            ORDER BY vpd.id DESC
            LIMIT %s OFFSET %s
            """,
            params + [length, offset],
        )
        data = []
        for idx, row in enumerate(rows, start=offset + 1):
            data.append({
                "s_no": idx,
                "unique_id": safe_str(row.get("unique_id")),
                "bill_no": safe_str(row.get("bill_no")),
                "bill_date": safe_str(row.get("bill_date")),
                "engineer_id": safe_str(row.get("engineer_id")),
                "engineer_name": safe_str(row.get("engineer_name")),
                "engineer_type": safe_str(row.get("engineer_type")),
                "services_charges": safe_str(row.get("services_charges")),
                "rate": safe_float(row.get("rate")),
                "gst": safe_float(row.get("gst")),
                "amount": safe_float(row.get("amount")),
                "total_amount": safe_float(row.get("total_amount")),
                "bill_copy_url": onsite_file_url("invoice", row.get("bill_copy")),
                "vendor_po_copy_url": onsite_file_url("po", row.get("po_copy")),
                "status": status_text(row.get("vendor_bill_app_status")),
                "accounts_entry_status": status_text(row.get("acc_ent_sts")),
                "accounts_approval_status": status_text(row.get("finance_approval")),
                "management_status": status_text(row.get("managment_team_approval_sts")),
                "payment_status": payment_status_text(row.get("accounts_approval")),
            })

        total = safe_int((total_row or {}).get("total"))
        return Response({"status": True, "data": data, "total": total, "page": page, "pages": max(1, -(-total // length))})

    def post(self, request):
        engineer_type = safe_str(request.data.get("engineer_type")).strip()
        engineer_id = safe_str(request.data.get("engineer_id")).strip()
        services_charges = safe_str(request.data.get("services_charges")).strip()
        from_date = parse_request_date(request.data.get("from_date"), date.today())
        to_date = parse_request_date(request.data.get("to_date"), date.today())
        rate = safe_decimal(request.data.get("rate"))
        gst_type = safe_str(request.data.get("gst_type")).strip()
        gst = Decimal("18") if engineer_type == "outsource-vendor" and gst_type == "with_gst" else Decimal("0")
        amount = rate
        total_amount = rate + ((rate * gst) / Decimal("100"))

        if engineer_type not in {"own-engineer", "outsource-vendor", "inhouse"}:
            return Response({"status": False, "message": "Engineer type is required."}, status=status.HTTP_400_BAD_REQUEST)
        if not engineer_id:
            return Response({"status": False, "message": "Engineer name is required."}, status=status.HTTP_400_BAD_REQUEST)
        if not services_charges:
            return Response({"status": False, "message": "Services charges details are required."}, status=status.HTTP_400_BAD_REQUEST)
        if rate <= 0:
            return Response({"status": False, "message": "Rate must be greater than zero."}, status=status.HTTP_400_BAD_REQUEST)

        bill_copy = request.FILES.get("bill_copy")
        po_copy = request.FILES.get("vendor_po_copy")
        if not bill_copy:
            return Response({"status": False, "message": "Bill copy PDF is required."}, status=status.HTTP_400_BAD_REQUEST)
        if not po_copy:
            return Response({"status": False, "message": "Vendor PO copy PDF is required."}, status=status.HTTP_400_BAD_REQUEST)

        now = datetime.now()
        current_user = acting_user(request)
        acc_year = get_financial_year(now)
        session_values = session_payload(request, current_user)
        bill_no = generate_onsite_bill_no()
        main_unique_id = generate_unique_id()
        invoice_id = generate_vendor_invoice_no()
        engineer_name = first_non_empty(request.data.get("engineer_name"), engineer_display_name(engineer_type, engineer_id))
        token = re.sub(r"[^A-Za-z0-9._-]+", "-", bill_no).strip("-") or generate_unique_id()

        try:
            bill_file, bill_original = save_vendor_payment_attachment(bill_copy, f"{token}-BILL.pdf", "invoice")
            po_file, po_original = save_vendor_payment_attachment(po_copy, f"{token}-PO.pdf", "po")
        except ValueError as exc:
            return Response({"status": False, "message": safe_str(exc)}, status=status.HTTP_400_BAD_REQUEST)
        except OSError as exc:
            return Response({"status": False, "message": safe_str(exc)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        with transaction.atomic():
            detail = VendorPaymentDetail.objects.create(
                unique_id=generate_unique_id(),
                main_unique_id=main_unique_id,
                bill_no=bill_no,
                bill_date=now,
                po_num=f"{format_date(from_date)} to {format_date(to_date)}",
                po_form_unique_id=ONSITE_PAYMENT_SOURCE,
                invoice_no=engineer_type,
                invoice_qty=1,
                dc_num="ONSITE",
                dc_date=format_date(now),
                rate=rate,
                gst=gst,
                amount=amount,
                total_amount=total_amount,
                vendor_name=limit_str(engineer_name, 255),
                vendor_id=engineer_id,
                inv_verfiy_attach=bill_file,
                inv_verfiy_attach_org_name=bill_original,
                po_ven_filename=po_file,
                po_ven_orgfilename=po_original,
                veninvverifyid=invoice_id,
                vendor_inv_attach_approval=current_user,
                vendor_inv_attach_approval_date=now.date(),
                veninvstatus=1,
                vendor_bill_created_by=current_user,
                vendor_bill_created_date=now,
                acc_year=acc_year,
                is_delete=0,
                **session_values,
            )

            VendorPaymentMain.objects.create(
                unique_id=main_unique_id,
                main_unique_id=main_unique_id,
                bill_no=bill_no,
                bill_date=now,
                po_num=f"{format_date(from_date)} to {format_date(to_date)}",
                po_form_unique_id=ONSITE_PAYMENT_SOURCE,
                invoice_no=engineer_type,
                dc_num="ONSITE",
                dc_date=format_date(now),
                invoice_qty=1,
                vendor_id=engineer_id,
                vendor_name=limit_str(engineer_name, 250),
                rate=rate,
                gst=gst,
                amount=amount,
                total_amount=total_amount,
                vendor_payment_allocated=1,
                inv_verfiy_attach=bill_file,
                inv_verfiy_attach_org_name=bill_original,
                po_ven_filename=po_file,
                po_ven_orgfilename=po_original,
                veninvverifyid=invoice_id,
                user_vendor_invoice_id=invoice_id,
                vendor_inv_attach_approval=current_user,
                vendor_inv_attach_approval_date=now.date(),
                veninvstatus=1,
                vendor_bill_created_by=current_user,
                vendor_bill_created_date=now,
                acc_year=acc_year,
                is_delete=0,
                **session_values,
            )

            with connection.cursor() as cursor:
                detail_remark_col = pick_col(
                    table_columns("vendor_payment_details"),
                    "bill_remark",
                    "vendor_bill_reject_reason",
                )
                main_remark_col = pick_col(
                    table_columns("vendor_payment_details_main"),
                    "bill_remark",
                )
                if detail_remark_col:
                    cursor.execute(
                        f"UPDATE vendor_payment_details SET {detail_remark_col}=%s WHERE unique_id=%s",
                        [services_charges, detail.unique_id],
                    )
                if main_remark_col:
                    cursor.execute(
                        f"UPDATE vendor_payment_details_main SET {main_remark_col}=%s WHERE unique_id=%s",
                        [services_charges, main_unique_id],
                    )

        return Response({"status": True, "message": "Onsite engineer payment saved successfully.", "bill_no": bill_no, "unique_id": detail.unique_id})


class VendorBillCreationFileView(APIView):
    def get(self, request, file_kind, filename):
        if file_kind not in {"invoice", "po", "pan", "bank"}:
            raise Http404("Invalid file type")

        safe_name = Path(safe_str(filename)).name
        if not safe_name:
            raise Http404("File not found")

        for candidate in vendor_file_candidates(file_kind, safe_name):
            try:
                if candidate.exists() and candidate.is_file():
                    return FileResponse(
                        open(candidate, "rb"), as_attachment=False, filename=safe_name
                    )
            except OSError:
                continue

        raise Http404("File not found")


class VendorBillCreationDetailView(APIView):
    def get_object(self, unique_id):
        instance = VendorBillCreation.objects.filter(
            unique_id=unique_id, is_delete="0"
        ).first()
        if not instance:
            raise Http404("Vendor bill creation record not found")
        return instance

    def get(self, request, unique_id):
        serializer = VendorBillCreationSerializer(self.get_object(unique_id))
        return Response(serializer.data)

    def post(self, request, unique_id):
        instance = self.get_object(unique_id)
        serializer = VendorBillCreationInputSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(
                {"status": False, "error": serializer.errors},
                status=status.HTTP_400_BAD_REQUEST,
            )

        instance.name = serializer.validated_data["name"]
        instance.is_active = int(serializer.validated_data["is_active"])
        instance.save(update_fields=["name", "is_active", "updated_at"])
        return Response(
            {"status": True, "data": VendorBillCreationSerializer(instance).data}
        )

    def delete(self, request, unique_id):
        instance = self.get_object(unique_id)
        instance.is_delete = "1"
        instance.save(update_fields=["is_delete", "updated_at"])
        return Response({"status": True, "msg": "Deleted Successfully"})
