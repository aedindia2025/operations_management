from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from django.http import HttpResponse
from django.db import connection
from django.conf import settings
from pathlib import Path
import io
import mimetypes
import os
import re
import zipfile
from urllib.parse import quote
from urllib.request import urlopen


def db_fetch(sql, params=None):
    with connection.cursor() as cursor:
        cursor.execute(sql, params or [])
        cols = [c[0] for c in cursor.description]
        return [dict(zip(cols, row)) for row in cursor.fetchall()]


# â”€â”€ /po-wise-document/customers/ â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
class PowiseDocCustomerOptionsView(APIView):
    def get(self, request):
        rows = db_fetch(
            """
            SELECT DISTINCT dc.unique_id, dc.department
            FROM department_creation dc
            INNER JOIN po_form pf
                ON pf.department = dc.unique_id
               AND pf.is_delete = 0
               AND pf.is_active = 1
            WHERE dc.is_delete = 0
              AND dc.is_active = 1
            ORDER BY dc.department
            """
        )
        return Response(
            [
                {"label": r["department"], "value": r["unique_id"]}
                for r in rows
                if r.get("department") and r.get("unique_id")
            ]
        )


# â”€â”€ /po-wise-document/po-numbers/?customer=X â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
class PowiseDocPoNumberOptionsView(APIView):
    def get(self, request):
        customer = request.query_params.get("customer", "")
        if not customer:
            return Response([], status=status.HTTP_400_BAD_REQUEST)
        rows = db_fetch(
            """
            SELECT DISTINCT unique_id, po_num
            FROM po_form
            WHERE is_delete = 0
              AND is_active = 1
              AND department = %s
            ORDER BY po_num
            """,
            [customer]
        )
        return Response([{"label": r["po_num"], "value": r["unique_id"]} for r in rows])


# â”€â”€ /po-wise-document/states/?po_id=X â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
class PowiseDocStateOptionsView(APIView):
    def get(self, request):
        po_id = request.query_params.get("po_id", "")
        if not po_id:
            return Response([])
        rows = db_fetch(
            """
            SELECT DISTINCT
                   csd.con_state_name AS value,
                   COALESCE(sc.state_name, csd.con_state_name) AS label
            FROM consignee_details_sub csd
            LEFT JOIN state_creation sc
              ON sc.unique_id = csd.con_state_name
             AND sc.is_delete = 0
            WHERE csd.is_delete = 0
              AND csd.form_main_unique_id = %s
              AND COALESCE(csd.con_state_name, '') != ''
            ORDER BY label
            """,
            [po_id]
        )
        return Response([
            {"label": r["label"], "value": r["value"]}
            for r in rows
            if r.get("value")
        ])


# â”€â”€ /po-wise-document/districts/?po_id=X&state=Y â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
class PowiseDocDistrictOptionsView(APIView):
    def get(self, request):
        po_id = request.query_params.get("po_id", "")
        state = request.query_params.get("state", "")
        if not po_id:
            return Response([])
        sql = """
            SELECT DISTINCT
                   csd.con_district AS value,
                   COALESCE(dc.district_name, csd.con_district) AS label
            FROM consignee_details_sub csd
            LEFT JOIN district_creation dc
              ON dc.unique_id = csd.con_district
             AND dc.is_delete = 0
            WHERE csd.is_delete = 0
              AND csd.form_main_unique_id = %s
              AND COALESCE(csd.con_district, '') != ''
        """
        params = [po_id]
        if state:
            sql += " AND csd.con_state_name = %s"
            params.append(state)
        sql += " ORDER BY label"
        rows = db_fetch(sql, params)
        return Response([
            {"label": r["label"], "value": r["value"]}
            for r in rows
            if r.get("value")
        ])


# â”€â”€ /po-wise-document/zones/?po_id=X&state=Y&district=Z â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
class PowiseDocZoneOptionsView(APIView):
    def get(self, request):
        po_id    = request.query_params.get("po_id", "")
        state    = request.query_params.get("state", "")
        district = request.query_params.get("district", "")
        if not po_id:
            return Response([])
        sql = """
            SELECT DISTINCT
                   csd.zone AS value,
                   csd.zone AS label
            FROM consignee_details_sub csd
            WHERE csd.is_delete = 0
              AND csd.form_main_unique_id = %s
              AND COALESCE(csd.zone, '') != ''
        """
        params = [po_id]
        if state:
            sql += " AND csd.con_state_name = %s"
            params.append(state)
        if district:
            sql += " AND csd.con_district = %s"
            params.append(district)
        sql += " ORDER BY label"
        rows = db_fetch(sql, params)
        return Response([
            {"label": r["label"], "value": r["value"]}
            for r in rows
            if r.get("value")
        ])


# â”€â”€ Shared: resolve consignee IDs by filters â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
def get_consignee_ids(po_id, state, district, zone):
    sql = "SELECT unique_id FROM consignee_details_sub WHERE is_delete = 0 AND form_main_unique_id = %s"
    params = [po_id]
    if state:
        sql += " AND con_state_name = %s"; params.append(state)
    if district:
        sql += " AND con_district = %s";   params.append(district)
    if zone:
        sql += " AND zone = %s";           params.append(zone)
    rows = db_fetch(sql, params)
    return [r["unique_id"] for r in rows]


# â”€â”€ Doc type config (mirrors your PHP $docConfig) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
DOC_CONFIG = {
    "unsigned_dc":    {"table": "view_doc_approval_list_final",  "field": "dc_file_name",   "fk": "form_main_unique_id",  "folder": "invoice"},
    "unsigned_ir":    {"table": "view_doc_approval_list_final",  "field": "ir_file_name",   "fk": "form_main_unique_id",  "folder": "invoice"},
    "inv":            {"table": "view_doc_approval_list_final",  "field": "file_invoice",   "fk": "form_main_unique_id",  "folder": "invoice"},
    "po":             {"table": "view_doc_approval_list_final",  "field": "file_name",      "fk": "form_main_unique_id",  "folder": "purchase_order/po_copy"},
    "podproof":       {"table": "view_dispatch_delivery_list",   "field": "pod_proof",      "fk": "po_form_unique_id",    "folder": "dispatch"},
    "deliveryproof":  {"table": "view_dispatch_delivery_list",   "field": "delivery_proof", "fk": "po_form_unique_id",    "folder": "dispatch"},
    "einvoice":       {"table": "view_dispatch_delivery_list",   "field": "einvoice",       "fk": "po_form_unique_id",    "folder": "dispatch"},
    "signed_dc":      {"table": "installation_details_sublist",  "field": "dc_file",        "fk": "po_form_unique_id",    "folder": "installation"},
    "signed_ir":      {"table": "installation_details_sublist",  "field": "ir_file",        "fk": "po_form_unique_id",    "folder": "installation"},
    "signed_snr":     {"table": "installation_details_sublist",  "field": "snr_file",       "fk": "po_form_unique_id",    "folder": "installation"},
}

DEFAULT_UPLOAD_BASE = Path(
    os.environ.get("OTM_UPLOAD_BASE", r"Z:\xampp\htdocs\otm_beta\uploads")
)


def _upload_roots(folder):
    base_dir = Path(getattr(settings, "BASE_DIR", Path.cwd()))
    media_root = Path(getattr(settings, "MEDIA_ROOT", base_dir / "media"))
    candidates = [
        DEFAULT_UPLOAD_BASE / folder,
        media_root / folder,
        base_dir / "uploads" / folder,
        base_dir.parent / "uploads" / folder,
        Path(r"D:\xampp\htdocs\otm_beta\uploads") / folder,
    ]
    roots = []
    seen = set()
    for path in candidates:
        key = str(path).lower()
        if key not in seen:
            seen.add(key)
            roots.append(path)
    return roots


def get_file_path(folder, filename):
    safe_name = os.path.basename(str(filename or "").strip())
    if not safe_name:
        return ""
    for root in _upload_roots(folder):
        candidate = root / safe_name
        if candidate.exists():
            return str(candidate)
        normalized_target = re.sub(r"\s+", " ", safe_name).strip().lower()
        try:
            if root.exists():
                for child in root.iterdir():
                    if not child.is_file():
                        continue
                    child_name = child.name.lower()
                    if child_name == safe_name.lower():
                        return str(child)
                    if re.sub(r"\s+", " ", child.name).strip().lower() == normalized_target:
                        return str(child)
        except OSError:
            continue
    return str(_upload_roots(folder)[0] / safe_name)


def _legacy_upload_urls(request, folder, filename):
    safe_name = os.path.basename(str(filename or "").strip())
    if not safe_name:
        return []
    encoded = quote(safe_name)
    host = request.get_host().split(":")[0]
    return [
        f"http://{host}/otm_beta/uploads/{folder}/{encoded}",
        f"http://127.0.0.1/otm_beta/uploads/{folder}/{encoded}",
        f"http://localhost/otm_beta/uploads/{folder}/{encoded}",
    ]


def _read_file_bytes(request, folder, filename):
    file_path = get_file_path(folder, filename)
    if file_path and os.path.isfile(file_path):
        with open(file_path, "rb") as handle:
            return handle.read()

    for url in _legacy_upload_urls(request, folder, filename):
        try:
            with urlopen(url, timeout=5) as response:
                if getattr(response, "status", 200) == 200:
                    return response.read()
        except Exception:
            continue
    return None


def _fetch_doc_rows(po_id, doc_type, state="", district="", zone=""):
    ids = None
    if state or district or zone:
        ids = get_consignee_ids(po_id, state, district, zone)
        if not ids:
            return []

    if doc_type == "unsigned_dc":
        sql = """
            SELECT DISTINCT dc_file_name AS file_name, consignee_unique_id
            FROM invoice_sublist
            WHERE is_delete = 0
              AND form_main_unique_id = %s
              AND COALESCE(dc_file_name, '') <> ''
        """
        params = [po_id]
        if ids is not None:
            placeholders = ",".join(["%s"] * len(ids))
            sql += f" AND consignee_unique_id IN ({placeholders})"
            params.extend(ids)
        return db_fetch(sql, params)

    if doc_type == "unsigned_ir":
        sql = """
            SELECT DISTINCT ir_file_name AS file_name, consignee_unique_id
            FROM invoice_sublist
            WHERE is_delete = 0
              AND form_main_unique_id = %s
              AND COALESCE(ir_file_name, '') <> ''
        """
        params = [po_id]
        if ids is not None:
            placeholders = ",".join(["%s"] * len(ids))
            sql += f" AND consignee_unique_id IN ({placeholders})"
            params.extend(ids)
        return db_fetch(sql, params)

    if doc_type == "inv":
        sql = """
            SELECT DISTINCT file_invoice AS file_name, consignee_unique_id
            FROM invoice_sublist
            WHERE is_delete = 0
              AND form_main_unique_id = %s
              AND COALESCE(file_invoice, '') <> ''
        """
        params = [po_id]
        if ids is not None:
            placeholders = ",".join(["%s"] * len(ids))
            sql += f" AND consignee_unique_id IN ({placeholders})"
            params.extend(ids)
        return db_fetch(sql, params)

    if doc_type == "po":
        sql = """
            SELECT file_name AS file_name, '' AS consignee_unique_id
            FROM po_form
            WHERE is_delete = 0
              AND unique_id = %s
              AND COALESCE(file_name, '') <> ''
            LIMIT 1
        """
        return db_fetch(sql, [po_id])

    cfg = DOC_CONFIG[doc_type]
    sql = f"""
        SELECT {cfg['field']} AS file_name, consignee_unique_id
        FROM {cfg['table']}
        WHERE {cfg['fk']} = %s
          AND {cfg['field']} IS NOT NULL
          AND {cfg['field']} != ''
    """
    params = [po_id]
    if ids is not None:
        placeholders = ",".join(["%s"] * len(ids))
        sql += f" AND consignee_unique_id IN ({placeholders})"
        params.extend(ids)
    return db_fetch(sql, params)


# â”€â”€ /po-wise-document/files/?po_id=X&doc_type=Y&state=&district=&zone= â”€â”€â”€â”€â”€â”€â”€
class PowiseDocFileListView(APIView):
    def get(self, request):
        po_id    = request.query_params.get("po_id", "")
        doc_type = request.query_params.get("doc_type", "")
        state    = request.query_params.get("state", "")
        district = request.query_params.get("district", "")
        zone     = request.query_params.get("zone", "")

        if not po_id or doc_type not in DOC_CONFIG:
            return Response({"error": "po_id and valid doc_type required"},
                            status=status.HTTP_400_BAD_REQUEST)

        cfg = DOC_CONFIG[doc_type]
        rows = _fetch_doc_rows(po_id, doc_type, state, district, zone)
        files = []
        seen = set()
        for r in rows:
            fname = r["file_name"]
            if fname and fname not in seen:
                seen.add(fname)
                files.append({
                    "name":   fname,
                    "exists": True,
                    "folder": cfg["folder"],
                })
        return Response(files)


# â”€â”€ /po-wise-document/download/ (POST) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
class PowiseDocDownloadView(APIView):
    def post(self, request):
        doc_type       = request.data.get("doc_type", "")
        selected_files = request.data.get("selected_files", [])

        if doc_type not in DOC_CONFIG:
            return Response({"error": "Invalid doc_type"}, status=status.HTTP_400_BAD_REQUEST)
        if not selected_files:
            return Response({"error": "No files selected"}, status=status.HTTP_400_BAD_REQUEST)

        folder = DOC_CONFIG[doc_type]["folder"]

        # Single file â€” serve directly
        if len(selected_files) == 1:
            file_bytes = _read_file_bytes(request, folder, selected_files[0])
            if file_bytes is None:
                return Response({"error": "File not found"}, status=status.HTTP_404_NOT_FOUND)
            mime, _ = mimetypes.guess_type(selected_files[0])
            response = HttpResponse(file_bytes, content_type=mime or "application/octet-stream")
            response["Content-Disposition"] = f'attachment; filename="{os.path.basename(selected_files[0])}"'
            return response

        # Multiple files â€” ZIP
        zip_buffer = io.BytesIO()
        added = 0
        seen = set()

        with zipfile.ZipFile(zip_buffer, "w", zipfile.ZIP_DEFLATED) as zf:
            for fname in selected_files:
                if not fname or fname in seen:
                    continue
                seen.add(fname)

                file_bytes = _read_file_bytes(request, folder, fname)
                if file_bytes is not None:
                    zf.writestr(os.path.basename(fname), file_bytes)
                    added += 1

        if added == 0:
            return Response({"error": "No valid files found for this ZIP"}, status=status.HTTP_404_NOT_FOUND)

        zip_buffer.seek(0)
        response = HttpResponse(zip_buffer.getvalue(), content_type="application/zip")
        response["Content-Disposition"] = f'attachment; filename="{doc_type}_files.zip"'
        return response
