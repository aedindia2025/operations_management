from __future__ import annotations

from django.db import connection, transaction
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView

from master.tenant import request_company_id


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


def _find_invoice(where_value):
    lookup = str(where_value or "").strip()
    if not lookup:
        return None
    if lookup.isdigit():
        return _one(
            "SELECT id, unique_id, dc_number, COALESCE(material_qc, 0) AS material_qc FROM invoice_creation_main WHERE id = %s AND is_delete = 0",
            [lookup],
        )
    return _one(
        "SELECT id, unique_id, dc_number, COALESCE(material_qc, 0) AS material_qc FROM invoice_creation_main WHERE unique_id = %s AND is_delete = 0",
        [lookup],
    )


def _call_proc_rows(sql, params):
    with connection.cursor() as cursor:
        cursor.execute(sql, params)
        rows = _rows(cursor)
        while cursor.nextset():
            pass
    return rows


def _user_display(staff_id_or_name: str) -> str:
    value = str(staff_id_or_name or "").strip()
    if not value:
        return "--"
    row = _one(
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
    return str(row.get("staff_name") or value) if row else value


def _executive_display(executive_id_or_name: str) -> str:
    value = str(executive_id_or_name or "").strip()
    if not value:
        return ""

    row = _one(
        """
        SELECT executive_name
        FROM executive_name
        WHERE is_delete = 0
          AND (unique_id = %s OR executive_name = %s)
        ORDER BY s_no DESC
        LIMIT 1
        """,
        [value, value],
    )
    if row and row.get("executive_name"):
        return str(row["executive_name"])

    return _user_display(value)


def _district_display(unique_id_or_name: str) -> str:
    value = str(unique_id_or_name or "").strip()
    if not value:
        return ""
    row = _one(
        """
        SELECT district_name
        FROM district_creation
        WHERE is_delete = 0
          AND (unique_id = %s OR district_name = %s)
        ORDER BY id DESC
        LIMIT 1
        """,
        [value, value],
    )
    return str(row.get("district_name") or value) if row else value


def _state_display(unique_id_or_name: str) -> str:
    value = str(unique_id_or_name or "").strip()
    if not value:
        return ""
    row = _one(
        """
        SELECT state_name
        FROM state_creation
        WHERE is_delete = 0
          AND (unique_id = %s OR state_name = %s)
        ORDER BY id DESC
        LIMIT 1
        """,
        [value, value],
    )
    return str(row.get("state_name") or value) if row else value


def _join_nonempty(parts, sep="\n") -> str:
    values = [str(part).strip() for part in parts if str(part or "").strip()]
    return sep.join(values)


def _state_pin_line(state_value: str, pincode_value: str) -> str:
    state_text = str(state_value or "").strip()
    pincode_text = str(pincode_value or "").strip()
    if state_text and pincode_text:
        return f"{state_text}, {pincode_text}"
    return state_text or pincode_text


def _account_status_label(code) -> str:
    mapping = {"0": "Pending", "1": "Approved", "2": "Not Approved"}
    return mapping.get(str(code), "Pending")


def _material_qc_status_label(code) -> str:
    mapping = {"0": "Pending", "1": "Approved", "2": "Rejected"}
    return mapping.get(str(code), "Pending")


def _normalize_material_qc_payload(material_qc_status, approved_by, reject_reason):
    status_code = _coerce_int(material_qc_status, 0)
    approved_value = str(approved_by or "").strip()
    reject_value = str(reject_reason or "").strip()

    if status_code == 0:
        approved_value = ""
        reject_value = ""
    elif status_code == 1:
        reject_value = ""
    elif status_code == 2:
        if not reject_value:
            raise ValueError("Rejected reason is required when Material QC status is No.")
    else:
        raise ValueError("Invalid Material QC status.")

    return status_code, approved_value, reject_value


def _update_material_qc(dc_number, material_qc_status, approved_by, reject_reason):
    status_code, approved_value, reject_value = _normalize_material_qc_payload(
        material_qc_status,
        approved_by,
        reject_reason,
    )

    with transaction.atomic(), connection.cursor() as cursor:
        cursor.execute(
            """
            UPDATE invoice_creation_main
            SET material_qc = %s,
                material_qc_approved = %s,
                material_qc_reject_reason = %s
            WHERE dc_number = %s AND is_delete = 0
            """,
            [status_code, approved_value, reject_value, dc_number],
        )

        if status_code == 1:
            cursor.execute(
                """
                SELECT
                    unique_id,
                    form_main_unique_id,
                    po_num,
                    po_date,
                    dc_number,
                    dc_date,
                    invoice_no,
                    invoice_date,
                    ledger_name,
                    ledger_no,
                    invoice_auto_id,
                    consignee_unique_id,
                    invoice_qty,
                    invoice_value,
                    invoice_doc_status,
                    doc_approval_sts,
                    approved_by,
                    approved_date,
                    ac_team_verifiy_status,
                    ac_team_approved_by,
                    dispatch_status,
                    installation_status,
                    material_qc,
                    material_qc_approved,
                    material_qc_reject_reason,
                    acc_year
                FROM invoice_creation_main
                WHERE dc_number = %s
                  AND is_delete = 0
                ORDER BY id DESC
                LIMIT 1
                """,
                [dc_number],
            )
            invoice_row = cursor.fetchone()
            if invoice_row:
                cursor.execute(
                    """
                    SELECT 1
                    FROM invoice_verfication_table
                    WHERE dc_number = %s
                      AND invoice_no = %s
                    LIMIT 1
                    """,
                    [invoice_row[4], invoice_row[6]],
                )
                exists = cursor.fetchone()
                if not exists:
                    try:
                        cursor.callproc(
                            "insert_into_invoice_verification",
                            [invoice_row[4], invoice_row[6], invoice_row[1]],
                        )
                        while cursor.nextset():
                            pass
                    except Exception:
                        cursor.execute(
                            """
                            INSERT INTO invoice_verfication_table (
                                unique_id,
                                form_main_unique_id,
                                po_num,
                                po_date,
                                dc_number,
                                dc_date,
                                invoice_no,
                                invoice_date,
                                ledger_name,
                                ledger_no,
                                invoice_auto_id,
                                consignee_unique_id,
                                invoice_qty,
                                invoice_value,
                                invoice_doc_status,
                                doc_approval_sts,
                                approved_by,
                                approved_date,
                                ac_team_verifiy_status,
                                ac_team_approved_by,
                                dispatch_status,
                                installation_status,
                                material_qc,
                                material_qc_approved,
                                material_qc_reject_reason,
                                acc_year
                            )
                            VALUES (
                                %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s,
                                %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s
                            )
                            """,
                            invoice_row,
                        )
        try:
            cursor.callproc("update_invoice_verification_by_dcnumber", [dc_number])
            while cursor.nextset():
                pass
        except Exception:
            pass


def _shape_list_row(row):
    po_file = str(row.get("po_file_name") or "").strip()
    dc_file = str(row.get("dc_file_name") or "").strip()
    ir_file = str(row.get("ir_file_name") or "").strip()
    invoice_file = str(row.get("invoice_file_name") or "").strip()

    return {
        **row,
        "id": str(row.get("invoice_unique_id") or row.get("id") or ""),
        "invoice_unique_id": str(row.get("invoice_unique_id") or ""),
        "po_file_name": po_file,
        "dc_file_name": dc_file,
        "ir_file_name": ir_file,
        "invoice_file_name": invoice_file,
        "ac_team_status_label": _account_status_label(row.get("ac_team_verifiy_status")),
        "ac_team_approved_name": str(row.get("ac_team_approved_name") or row.get("ac_team_approved_by") or "--"),
        "material_qc_status_label": _material_qc_status_label(row.get("material_qc")),
        "material_qc_approved_name": str(row.get("material_qc_approved_name") or row.get("material_qc_approved") or "--"),
        "team_member": str(row.get("team_member_display") or row.get("team_member") or "--"),
        "has_po": bool(po_file),
        "has_dc": bool(dc_file),
        "has_ir": bool(ir_file),
        "has_invoice": bool(invoice_file),
        "has_compare": any([po_file, dc_file, ir_file, invoice_file]),
    }


class MaterialQCListView(APIView):
    def get(self, request):
        tab = request.query_params.get("tab", "pending").strip().lower()
        search = request.query_params.get("search", "").strip()
        page = max(_coerce_int(request.query_params.get("page"), 1), 1)
        length = max(_coerce_int(request.query_params.get("length"), 10), 1)
        from_date = request.query_params.get("from_date", "").strip()
        to_date = request.query_params.get("to_date", "").strip()
        opt = request.query_params.get("opt", "4").strip()
        team_mem = request.query_params.get("team_mem", "").strip()

        data_sql = """
            SELECT
                icm.id,
                icm.unique_id AS invoice_unique_id,
                COALESCE(pf.po_num, '') AS po_num,
                DATE_FORMAT(icm.po_date, '%%d-%%m-%%Y') AS po_date,
                COALESCE(csd.con_address, '') AS con_address,
                COALESCE(u.staff_name, NULLIF(icm.team_mem, ''), '') AS team_member_display,
                COALESCE(icm.invoice_no, '') AS invoice_no,
                DATE_FORMAT(icm.invoice_date, '%%d-%%m-%%Y') AS invoice_date,
                COALESCE(icm.dc_number, '') AS dc_number,
                DATE_FORMAT(icm.dc_date, '%%d-%%m-%%Y') AS dc_date,
                COALESCE(icm.invoice_value, 0) AS invoice_value,
                COALESCE(pf.file_name, '') AS po_file_name,
                COALESCE(sub.dc_file_name, '') AS dc_file_name,
                COALESCE(sub.ir_file_name, '') AS ir_file_name,
                COALESCE(sub.file_invoice, '') AS invoice_file_name,
                COALESCE(icm.ac_team_verifiy_status, 0) AS ac_team_verifiy_status,
                COALESCE(icm.ac_team_approved_by, '') AS ac_team_approved_by,
                COALESCE(acu.staff_name, NULLIF(icm.ac_team_approved_by, ''), '') AS ac_team_approved_name,
                COALESCE(icm.material_qc, 0) AS material_qc,
                COALESCE(icm.material_qc_reject_reason, '') AS material_qc_reject_reason,
                COALESCE(icm.material_qc_approved, '') AS material_qc_approved,
                COALESCE(mqu.staff_name, NULLIF(icm.material_qc_approved, ''), '') AS material_qc_approved_name,
                COALESCE(NULLIF(get_ledger_name(icm.ledger_name), ''), icm.ledger_name, '') AS ledger_name
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
            LEFT JOIN po_form pf
              ON pf.unique_id = icm.form_main_unique_id
             AND pf.is_delete = 0
            LEFT JOIN (
                SELECT c1.unique_id, c1.con_address
                FROM consignee_details_sub c1
                INNER JOIN (
                    SELECT MAX(id) AS max_id
                    FROM consignee_details_sub
                    WHERE is_delete = 0
                    GROUP BY unique_id
                ) c2 ON c2.max_id = c1.id
            ) csd ON csd.unique_id = icm.consignee_unique_id
            LEFT JOIN user u
              ON (
                u.staff_id = icm.team_mem
                OR u.unique_id = icm.team_mem
              )
             AND u.is_delete = 0
            LEFT JOIN user acu
              ON acu.is_delete = 0
             AND (
                acu.staff_id = icm.ac_team_approved_by
                OR acu.unique_id = icm.ac_team_approved_by
                OR acu.staff_name = icm.ac_team_approved_by
                OR acu.user_name = icm.ac_team_approved_by
             )
            LEFT JOIN user mqu
              ON mqu.is_delete = 0
             AND (
                mqu.staff_id = icm.material_qc_approved
                OR mqu.unique_id = icm.material_qc_approved
                OR mqu.staff_name = icm.material_qc_approved
                OR mqu.user_name = icm.material_qc_approved
             )
            LEFT JOIN (
                SELECT s1.dc_number, s1.dc_file_name, s1.ir_file_name, s1.file_invoice
                FROM invoice_sublist s1
                INNER JOIN (
                    SELECT MAX(id) AS max_id
                    FROM invoice_sublist
                    WHERE is_delete = 0
                    GROUP BY UPPER(TRIM(dc_number))
                ) s2 ON s2.max_id = s1.id
            ) sub ON UPPER(TRIM(sub.dc_number)) = UPPER(TRIM(icm.dc_number))
        """

        where_clauses = ["icm.is_delete = 0", "COALESCE(TRIM(icm.dc_number), '') <> ''"]
        params: list[object] = []
        company_id = request_company_id(request)
        if company_id:
            where_clauses.append("pf.sess_company_id = %s")
            params.append(company_id)

        if tab == "completed":
            where_clauses.append("COALESCE(icm.material_qc, 0) IN (1, 2)")
        else:
            where_clauses.extend([
                "COALESCE(icm.doc_approval_sts, 0) = 1",
                "COALESCE(icm.material_qc, 0) = 0",
            ])

        if from_date and to_date:
            if opt == "5":
                where_clauses.append("DATE(icm.invoice_date) BETWEEN %s AND %s")
            else:
                where_clauses.append("DATE(icm.po_date) BETWEEN %s AND %s")
            params.extend([from_date, to_date])

        if team_mem and team_mem.lower() != "all":
            where_clauses.append(
                """(
                    COALESCE(icm.team_mem, '') = %s
                    OR COALESCE(u.staff_name, '') = %s
                )"""
            )
            params.extend([team_mem, team_mem])

        if search:
            like = f"%{search}%"
            where_clauses.append(
                """(
                    COALESCE(pf.po_num, '') LIKE %s
                    OR COALESCE(csd.con_address, '') LIKE %s
                    OR COALESCE(NULLIF(get_ledger_name(icm.ledger_name), ''), icm.ledger_name, '') LIKE %s
                    OR COALESCE(u.staff_name, NULLIF(icm.team_mem, ''), '') LIKE %s
                    OR COALESCE(icm.invoice_no, '') LIKE %s
                    OR COALESCE(icm.dc_number, '') LIKE %s
                    OR COALESCE(icm.material_qc_reject_reason, '') LIKE %s
                )"""
            )
            params.extend([like, like, like, like, like, like, like])

        where_sql = " WHERE " + " AND ".join(where_clauses)
        count_sql = f"SELECT COUNT(*) AS total FROM ({data_sql}{where_sql}) listing"
        total_row = _one(count_sql, params) or {"total": 0}
        total = _coerce_int(total_row.get("total"), 0)

        offset = (page - 1) * length
        rows = _many(
            f"""
            {data_sql}
            {where_sql}
            ORDER BY CASE
                WHEN COALESCE(icm.material_qc, 0) = 2 THEN 1
                WHEN COALESCE(icm.material_qc, 0) = 0 THEN 2
                WHEN COALESCE(icm.material_qc, 0) = 1 THEN 3
                ELSE 4
            END, icm.id DESC
            LIMIT %s OFFSET %s
            """,
            [*params, length, offset],
        )

        return Response(
            {
                "status": True,
                "recordsTotal": total,
                "recordsFiltered": total,
                "data": [_shape_list_row(row) for row in rows],
            }
        )


class MaterialQCCreateView(APIView):
    def post(self, request):
        dc_number = str(request.data.get("dc_number", "")).strip()
        material_qc_status = request.data.get("material_qc_status")
        approved_by = request.data.get("approved_by", "")
        reject_reason = request.data.get("ac_reason_reject", "")

        if not dc_number:
            return Response({"status": False, "message": "dc_number is required."}, status=status.HTTP_400_BAD_REQUEST)

        try:
            _update_material_qc(dc_number, material_qc_status, approved_by, reject_reason)
        except ValueError as exc:
            return Response({"status": False, "message": str(exc)}, status=status.HTTP_400_BAD_REQUEST)

        return Response({"status": True, "msg": "updated"})


class MaterialQCDetailView(APIView):
    def get(self, request, unique_id):
        row = _find_invoice(unique_id)
        if not row:
            return Response({"status": False, "message": "Material QC record not found."}, status=404)

        main = _one(
            """
            SELECT
                icm.id,
                icm.unique_id AS invoice_unique_id,
                icm.form_main_unique_id,
                icm.invoice_auto_id,
                COALESCE(icm.invoice_no, '') AS invoice_no,
                DATE_FORMAT(icm.invoice_date, '%%d-%%m-%%Y') AS invoice_date,
                icm.consignee_unique_id,
                COALESCE(icm.dc_number, '') AS dc_number,
                DATE_FORMAT(icm.dc_date, '%%d-%%m-%%Y') AS dc_date,
                COALESCE(icm.material_qc, 0) AS material_qc,
                COALESCE(icm.material_qc_reject_reason, '') AS material_qc_reject_reason,
                COALESCE(icm.material_qc_approved, '') AS material_qc_approved,
                DATE_FORMAT(icm.approved_date, '%%d-%%m-%%Y') AS approved_date,
                COALESCE(pf.po_num, '') AS po_num,
                DATE_FORMAT(icm.po_date, '%%d-%%m-%%Y') AS po_date,
                COALESCE(get_department_name(pf.department), '') AS department,
                COALESCE(pf.executive_name, '') AS executive_name,
                COALESCE(get_ledger_name(icm.ledger_name), '') AS ledger_name,
                COALESCE(icm.ledger_no, '') AS ledger_no
            FROM invoice_creation_main icm
            LEFT JOIN po_form pf
              ON pf.unique_id = icm.form_main_unique_id
             AND pf.is_delete = 0
            WHERE icm.id = %s AND icm.is_delete = 0
            LIMIT 1
            """,
            [row["id"]],
        )
        if not main:
            return Response({"status": False, "message": "Material QC record not found."}, status=404)

        customer_rows = _call_proc_rows("CALL GetCustomerDetailByponum(%s)", [main["form_main_unique_id"]])
        customer = customer_rows[0] if customer_rows else {}
        consignee_rows = _call_proc_rows("CALL GetConsigneeDetailsById(%s)", [main["consignee_unique_id"]])
        consignee = consignee_rows[0] if consignee_rows else {}

        customer_district = _district_display(customer.get("district", ""))
        customer_state = _state_display(customer.get("state_name", ""))
        consignee_district = _district_display(consignee.get("con_district", ""))
        consignee_state = _state_display(consignee.get("con_state_name", ""))

        items = _many(
            """
            SELECT
                unique_id,
                item_code,
                product,
                COALESCE(invoice_qty, 0) AS invoice_qty,
                COALESCE(invoice_qty_value, 0) AS invoice_qty_value
            FROM invoice_creation
            WHERE po_unique_id = %s
              AND consignee_id = %s
              AND dc_num = %s
              AND is_delete = 0
            ORDER BY id ASC
            """,
            [main["form_main_unique_id"], main["consignee_unique_id"], main["dc_number"]],
        )

        item_rows = []
        for index, item in enumerate(items, start=1):
            base_value = float(item.get("invoice_qty_value") or 0)
            item_rows.append(
                {
                    "s_no": index,
                    "unique_id": item.get("unique_id", ""),
                    "item_code": item.get("item_code", ""),
                    "product": item.get("product", ""),
                    "qty": item.get("invoice_qty", 0),
                    "value": round(base_value + (base_value * 0.18), 2),
                }
            )

        payload = {
            **main,
            "executive_name": _executive_display(main.get("executive_name", "")),
            "material_qc_status_label": _material_qc_status_label(main.get("material_qc")),
            "material_qc_approved_name": _user_display(main.get("material_qc_approved", "")),
            "material_qc_editable": int(main.get("material_qc") or 0) != 1,
            "customer_name": main.get("department", ""),
            "customer_address": _join_nonempty(
                [
                    customer.get("bill_address", ""),
                    customer_district,
                    _state_pin_line(customer_state, customer.get("pin", "")),
                ]
            ),
            "customer_phone": customer.get("contact_number", ""),
            "customer_email": customer.get("email", ""),
            "consignee_name": consignee.get("con_contact_name", ""),
            "consignee_address": _join_nonempty(
                [
                    consignee.get("con_address", ""),
                    consignee_district,
                    _state_pin_line(consignee_state, consignee.get("con_pincode", "")),
                ]
            ),
            "consignee_phone1": consignee.get("con_contact_number", ""),
            "consignee_phone2": consignee.get("con_lan_num", ""),
            "items": item_rows,
        }
        return Response({"status": True, "data": payload})

    def put(self, request, unique_id):
        row = _find_invoice(unique_id)
        if not row:
            return Response({"status": False, "message": "Material QC record not found."}, status=404)

        if _coerce_int(row.get("material_qc"), 0) == 1:
            return Response(
                {"status": False, "message": "Approved Material QC records cannot be updated."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        dc_number = str(request.data.get("dc_number") or row.get("dc_number") or "").strip()
        material_qc_status = request.data.get("material_qc_status")
        approved_by = request.data.get("approved_by", "")
        reject_reason = request.data.get("ac_reason_reject", "")

        if not dc_number:
            return Response({"status": False, "message": "dc_number is required."}, status=status.HTTP_400_BAD_REQUEST)

        try:
            _update_material_qc(dc_number, material_qc_status, approved_by, reject_reason)
        except ValueError as exc:
            return Response({"status": False, "message": str(exc)}, status=status.HTTP_400_BAD_REQUEST)

        return Response({"status": True, "msg": "updated"})

    def delete(self, request, unique_id):
        row = _find_invoice(unique_id)
        if not row:
            return Response({"status": False, "message": "Material QC record not found."}, status=404)

        # Check if bill has been created for this material QC
        with connection.cursor() as cursor:
            cursor.execute("""
                SELECT bill_no FROM sign_doc_verification_detail
                WHERE invoice_no = %s AND dc_number = %s AND is_delete = 0
                LIMIT 1
            """, [row.get("invoice_no"), row.get("dc_number")])
            bill_record = cursor.fetchone()
            
            if bill_record and bill_record[0]:  # bill_no is not empty
                return Response({
                    "status": False, 
                    "message": "Cannot delete material QC record. Bill has already been created for this record."
                }, status=400)
        
        with transaction.atomic(), connection.cursor() as cursor:
            cursor.execute(
                """
                UPDATE invoice_creation_main
                SET material_qc = 0,
                    material_qc_approved = '',
                    material_qc_reject_reason = '',
                    invoice_doc_status = 1,
                    ac_team_verifiy_status = 0,
                    ac_team_approved_by = '',
                    approved_by = '',
                    approved_date = NULL
                WHERE id = %s
                  AND is_delete = 0
                """,
                [row["id"]],
            )
            cursor.execute(
                """
                UPDATE invoice_sublist
                SET ac_team_verifiy_status = 0,
                    reject_reason = '',
                    is_delete = 0
                WHERE invoice_id = %s
                """,
                [row["unique_id"]],
            )
        return Response({"status": True, "msg": "deleted"})
