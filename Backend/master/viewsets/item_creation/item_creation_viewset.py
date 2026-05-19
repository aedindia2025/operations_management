import uuid
from datetime import date
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.parsers import MultiPartParser, FormParser
from django.db.models import Q

from master.apps.item_creation.itemcreationmodel import ItemCreation, ItemCreationSub
from master.serializers.item_creation.item_creation_serializer import (
    ItemCreationSerializer,
    ItemCreationSubSerializer,
)
from master.tenant import apply_tenant_audit, request_company_id, tenant_audit_payload, tenant_queryset


# ──────────────────────────────────────────────────────────── #
#  Helper                                                      #
# ──────────────────────────────────────────────────────────── #
def datatable_response(draw, total, filtered, data):
    return {
        "draw":            int(draw),
        "recordsTotal":    int(total),
        "recordsFiltered": int(filtered),
        "data":            data,
    }


def current_acc_year():
    today = date.today()
    if today.month >= 4:
        return f"{today.year}-{str(today.year + 1)[2:]}"
    return f"{today.year - 1}-{str(today.year)[2:]}"


def _first_non_empty(*values):
    for value in values:
        if value is None:
            continue
        value = str(value).strip()
        if value:
            return value
    return ""


def audit_payload(request):
    session_key = ""
    session_obj = getattr(request, "session", None)
    if session_obj is not None:
        try:
            session_key = session_obj.session_key or ""
        except Exception:
            session_key = ""

    user = getattr(request, "user", None)
    acting_user = _first_non_empty(
        getattr(user, "unique_id", ""),
        getattr(user, "user_name", ""),
        getattr(user, "username", ""),
    )
    company_id = request_company_id(request)
    return {
        "acc_year": current_acc_year(),
        "session_id": _first_non_empty(
            request.data.get("session_id"),
            request.headers.get("X-Session-Id"),
            session_key,
        )[:50],
        "sess_user_type": _first_non_empty(
            request.data.get("sess_user_type"),
            request.headers.get("X-User-Type"),
        )[:50],
        "sess_user_id": _first_non_empty(
            request.data.get("sess_user_id"),
            request.data.get("user_id"),
            acting_user,
        )[:50],
        "sess_company_id": _first_non_empty(
            company_id,
            request.data.get("sess_company_id"),
            request.headers.get("X-Company-Id"),
        )[:50],
        "sess_branch_id": _first_non_empty(
            request.data.get("sess_branch_id"),
            request.headers.get("X-Branch-Id"),
        )[:50],
    }


# ============================================================ #
#  ITEM CREATION – List / DataTable                            #
#  PHP: case 'datatable'                                       #
# ============================================================ #
class ItemCreationListView(APIView):
    """
    GET  /api/item-creation/list/   → simple list
    POST /api/item-creation/list/   → DataTable server-side
    """

    def get(self, request):
        qs = tenant_queryset(request, tenant_queryset(request, ItemCreation.objects.filter(is_delete=0), include_global=False), include_global=False).order_by('-created_at')
        serializer = ItemCreationSerializer(qs, many=True, context={'request': request})
        return Response({
            "status":  True,
            "data":    serializer.data,
            "message": "Item creation list fetched successfully."
        })

    def post(self, request):
        draw   = request.data.get('draw', 1)
        start  = int(request.data.get('start', 0))
        length = int(request.data.get('length', 10))
        search = request.data.get('search[value]') or request.data.get('search', {})
        if isinstance(search, dict):
            search = search.get('value', '')

        qs    = tenant_queryset(request, ItemCreation.objects.filter(is_delete=0), include_global=False)
        total = qs.count()

        if search:
            qs = qs.filter(
                Q(tender_name__icontains=search) |
                Q(tender_code__icontains=search) |
                Q(tender_no__icontains=search)
            )

        filtered = qs.count()

        if length != -1:
            qs = qs.order_by('-created_at')[start: start + length]

        result = []
        for idx, item in enumerate(qs, start=start + 1):
            row = ItemCreationSerializer(item, context={'request': request}).data
            row['s_no'] = idx
            result.append(row)

        return Response(
            datatable_response(draw, total, filtered, result),
            status=status.HTTP_200_OK
        )


# ============================================================ #
#  ITEM CREATION – Create                                      #
#  PHP: case 'createupdate' (new record)                       #
# ============================================================ #
class ItemCreationCreateView(APIView):
    """
    POST /api/item-creation/create/
    Body: { tender_name, tender_code, tender_no, tender_type,
            validity_from, validity_to, validity_date_extension }
    """

    def post(self, request):
        serializer = ItemCreationSerializer(
            data=request.data, context={'request': request}
        )
        if serializer.is_valid():
            serializer.save(**audit_payload(request))
            return Response({
                "status":  True,
                "msg":     "create",
                "data":    serializer.data,
                "message": "Item creation saved successfully."
            }, status=status.HTTP_201_CREATED)

        return Response({
            "status":  False,
            "msg":     "error",
            "error":   serializer.errors,
            "message": "Validation failed."
        }, status=status.HTTP_400_BAD_REQUEST)


# ============================================================ #
#  ITEM CREATION – Retrieve / Update / Soft-Delete             #
#  PHP: case 'createupdate' (update) + case 'delete'           #
# ============================================================ #
class ItemCreationDetailView(APIView):
    """
    GET    /api/item-creation/<unique_id>/
    PUT    /api/item-creation/<unique_id>/update/
    DELETE /api/item-creation/<unique_id>/delete/
    """

    def _get_object(self, request, unique_id):
        try:
            return tenant_queryset(request, ItemCreation.objects.filter(unique_id=unique_id, is_delete=0), include_global=False).get()
        except ItemCreation.DoesNotExist:
            return None

    def get(self, request, unique_id):
        item = self._get_object(request, unique_id)
        if not item:
            return Response({
                "status": False, "msg": "error", "message": "Record not found."
            }, status=status.HTTP_404_NOT_FOUND)

        serializer = ItemCreationSerializer(item, context={'request': request})
        return Response({"status": True, "data": serializer.data})

    def put(self, request, unique_id):
        item = self._get_object(request, unique_id)
        if not item:
            return Response({
                "status": False, "msg": "error", "message": "Record not found."
            }, status=status.HTTP_404_NOT_FOUND)

        serializer = ItemCreationSerializer(
            item, data=request.data, partial=True, context={'request': request}
        )
        if serializer.is_valid():
            serializer.save(**tenant_audit_payload(request))
            return Response({
                "status":  True,
                "msg":     "update",
                "data":    serializer.data,
                "message": "Item creation updated successfully."
            })

        return Response({
            "status": False, "msg": "error",
            "error":  serializer.errors, "message": "Validation failed."
        }, status=status.HTTP_400_BAD_REQUEST)

    def delete(self, request, unique_id):
        item = self._get_object(request, unique_id)
        if not item:
            return Response({
                "status": False, "msg": "error", "message": "Record not found."
            }, status=status.HTTP_404_NOT_FOUND)

        item.is_delete = 1
        item.save()
        return Response({
            "status": True, "msg": "success_delete",
            "message": "Record deleted successfully."
        })


# ============================================================ #
#  ITEM SUB – List (DataTable) filtered by tender_code         #
#  PHP: case 'excel_datatable'                                 #
# ============================================================ #
class ItemSubListView(APIView):
    """
    GET  /api/item-creation/sub/list/?tender_code=<code>
    POST /api/item-creation/sub/list/   → DataTable
    """

    def get(self, request):
        tender_code = request.query_params.get('tender_code', '')
        qs = tenant_queryset(request, ItemCreationSub.objects.filter(is_delete=0), include_global=False)
        if tender_code:
            qs = qs.filter(tender_code=tender_code)

        serializer = ItemCreationSubSerializer(qs, many=True)
        return Response({"status": True, "data": serializer.data})

    def post(self, request):
        draw        = request.data.get('draw', 1)
        start       = int(request.data.get('start', 0))
        length      = int(request.data.get('length', 10))
        tender_code = request.data.get('tender_code', '')
        search      = request.data.get('search[value]') or request.data.get('search', '')
        if isinstance(search, dict):
            search = search.get('value', '')

        qs = tenant_queryset(request, ItemCreationSub.objects.filter(is_delete=0), include_global=False)
        if tender_code:
            qs = qs.filter(tender_code=tender_code)

        if search:
            qs = qs.filter(
                Q(item_code__icontains=search) |
                Q(item_description__icontains=search) |
                Q(item_specification__icontains=search) |
                Q(brand__icontains=search) |
                Q(product_category__icontains=search) |
                Q(short_category__icontains=search)
            )

        total    = qs.count()
        filtered = total

        if length != -1:
            qs = qs.order_by('-created_at')[start: start + length]
        else:
            qs = qs.order_by('-created_at')

        result = []
        for idx, sub in enumerate(qs, start=start + 1):
            row = ItemCreationSubSerializer(sub).data
            row['s_no'] = idx
            result.append(row)

        return Response(
            datatable_response(draw, total, filtered, result),
            status=status.HTTP_200_OK
        )


# ============================================================ #
#  ITEM SUB – Create (get_item) / Update (items)               #
#  PHP: case 'get_item' + case 'items'                         #
# ============================================================ #
class ItemSubCreateUpdateView(APIView):
    """
    POST /api/item-creation/sub/
    Body: { tender_code, item_code, item_description, ..., unique_id(optional) }

    unique_id இருந்தா UPDATE (PHP case 'items')
    unique_id இல்லன்னா INSERT (PHP case 'get_item')
    rc_unit_price = rc_net_price / (1 + gst/100) — auto calculate
    """

    def post(self, request):
        unique_id = request.data.get('unique_id', '')

        if unique_id:
            # ── UPDATE (PHP case 'items') ──
            try:
                sub = tenant_queryset(request, ItemCreationSub.objects.filter(unique_id=unique_id, is_delete=0), include_global=False).get()
            except ItemCreationSub.DoesNotExist:
                return Response({
                    "status": False, "msg": "error", "message": "Item not found."
                }, status=status.HTTP_404_NOT_FOUND)

            serializer = ItemCreationSubSerializer(
                sub, data=request.data, partial=True
            )
            msg = "update"
        else:
            # ── INSERT (PHP case 'get_item') ──
            serializer = ItemCreationSubSerializer(data=request.data)
            msg = "create"

        if serializer.is_valid():
            serializer.save(**audit_payload(request))
            return Response({
                "status":  True,
                "msg":     msg,
                "data":    serializer.data,
                "message": f"Item {msg}d successfully."
            }, status=status.HTTP_200_OK)

        return Response({
            "status": False, "msg": "error",
            "error":  serializer.errors, "message": "Validation failed."
        }, status=status.HTTP_400_BAD_REQUEST)


# ============================================================ #
#  ITEM SUB – Retrieve / Soft-Delete                           #
# ============================================================ #
class ItemSubDetailView(APIView):
    """
    GET    /api/item-creation/sub/<unique_id>/
    DELETE /api/item-creation/sub/<unique_id>/delete/
    """

    def get(self, request, unique_id):
        try:
            sub = tenant_queryset(request, ItemCreationSub.objects.filter(unique_id=unique_id, is_delete=0), include_global=False).get()
        except ItemCreationSub.DoesNotExist:
            return Response({
                "status": False, "msg": "error", "message": "Not found."
            }, status=status.HTTP_404_NOT_FOUND)

        return Response({"status": True, "data": ItemCreationSubSerializer(sub).data})

    def delete(self, request, unique_id):
        try:
            sub = tenant_queryset(request, ItemCreationSub.objects.filter(unique_id=unique_id, is_delete=0), include_global=False).get()
        except ItemCreationSub.DoesNotExist:
            return Response({
                "status": False, "msg": "error", "message": "Not found."
            }, status=status.HTTP_404_NOT_FOUND)

        sub.is_delete = 1
        sub.save()
        return Response({
            "status": True, "msg": "success_delete",
            "message": "Item deleted successfully."
        })


# ============================================================ #
#  EXCEL IMPORT                                                #
#  PHP: myimport.php                                           #
# ============================================================ #
class ItemCreationExcelImportView(APIView):
    """
    POST /api/item-creation/import/
    Form-data: file = <excel file (.xlsx)>

    Excel columns order:
    0: tender_code
    1: item_code
    2: item_description
    3: item_specification
    4: brand
    5: product_category
    6: short_category
    7: rc_net_price
    8: gst
    9: warranty_in_yrs

    rc_unit_price = rc_net_price / (1 + gst/100) — auto calculate
    Duplicate (tender_code + item_code) → skip
    """

    parser_classes = [MultiPartParser, FormParser]

    def post(self, request):
        file = request.FILES.get('file')

        if not file:
            return Response({
                "status": False,
                "message": "File upload பண்ணவும்."
            }, status=status.HTTP_400_BAD_REQUEST)

        # ── File type check ──
        allowed_types = [
            'application/vnd.ms-excel',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'text/xls',
            'text/xlsx',
        ]
        if file.content_type not in allowed_types:
            return Response({
                "status": False,
                "message": "Invalid file type. Excel file மட்டும் upload பண்ணவும்."
            }, status=status.HTTP_400_BAD_REQUEST)

        # ── Read Excel ──
        try:
            import openpyxl
            wb   = openpyxl.load_workbook(file)
            ws   = wb.active
            rows = list(ws.iter_rows(values_only=True))
        except Exception as e:
            return Response({
                "status": False,
                "message": f"Excel file read error: {str(e)}"
            }, status=status.HTTP_400_BAD_REQUEST)

        inserted = 0
        skipped  = 0
        errors   = []

        for idx, row in enumerate(rows):
            # ── Skip header row ──
            if idx == 0:
                continue

            # ── Skip empty rows ──
            if not row[0] or not row[1]:
                continue

            try:
                tender_code        = str(row[0]).strip()
                item_code          = str(row[1]).strip()
                item_description   = str(row[2]).strip() if row[2] else ''
                item_specification = str(row[3]).strip() if row[3] else ''
                brand              = str(row[4]).strip() if row[4] else ''
                product_category   = str(row[5]).strip() if row[5] else ''
                short_category     = str(row[6]).strip() if row[6] else ''
                rc_net_price       = float(row[7]) if row[7] else 0.0
                gst                = float(row[8]) if row[8] else 0.0
                warranty_in_yrs    = str(row[9]).strip() if row[9] else ''

                # ── Auto calculate rc_unit_price ──
                if gst > 0:
                    rc_unit_price = round(rc_net_price / (1 + gst / 100), 2)
                else:
                    rc_unit_price = rc_net_price

                # ── Duplicate check (tender_code + item_code) ──
                exists = tenant_queryset(request, ItemCreationSub.objects.filter(is_delete=0), include_global=False).filter(
                    tender_code=tender_code,
                    item_code=item_code,
                ).exists()

                if exists:
                    skipped += 1
                    continue

                # ── Insert ──
                ItemCreationSub.objects.create(
                    unique_id          = f"item_{uuid.uuid4().hex[:12]}",
                    tender_code        = tender_code,
                    item_code          = item_code,
                    item_description   = item_description,
                    item_specification = item_specification,
                    brand              = brand,
                    product_category   = product_category,
                    short_category     = short_category,
                    rc_net_price       = rc_net_price,
                    gst                = gst,
                    rc_unit_price      = rc_unit_price,
                    warranty_in_yrs    = warranty_in_yrs,
                    **audit_payload(request),
                )
                inserted += 1

            except Exception as e:
                errors.append(f"Row {idx + 1}: {str(e)}")
                continue

        return Response({
            "status":   True,
            "message":  f"Import complete. Inserted: {inserted}, Skipped (duplicate): {skipped}",
            "inserted": inserted,
            "skipped":  skipped,
            "errors":   errors,
        }, status=status.HTTP_200_OK)

