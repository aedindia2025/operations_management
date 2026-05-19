import os
import re
import uuid
from datetime import date
from pathlib import Path
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from django.db.models import Q
from django.conf import settings

from master.apps.vendor_creation.vendormodel import VendorCreation
from master.serializers.vendor_creation.vendor_serializer import VendorCreationSerializer
from master.tenant import request_company_id, tenant_audit_payload, tenant_queryset

LEGACY_UPLOAD_BASE = Path(
    os.environ.get("OTM_UPLOAD_BASE", r"Z:\xampp\htdocs\otm_beta\uploads")
)

# Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬ #
#  Helper                                                      #
# Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬ #
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


def first_non_empty(*values):
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

    acting_user = getattr(getattr(request, "user", None), "username", "") or ""
    return {
        "acc_year": current_acc_year(),
        "session_id": first_non_empty(request.data.get("session_id"), request.headers.get("X-Session-Id"), session_key)[:50],
        "sess_user_type": first_non_empty(request.data.get("sess_user_type"), request.headers.get("X-User-Type"))[:50],
        "sess_user_id": first_non_empty(request.data.get("sess_user_id"), request.data.get("user_id"), acting_user)[:50],
        "sess_company_id": first_non_empty(request_company_id(request), request.data.get("sess_company_id"), request.headers.get("X-Company-Id"))[:50],
        "sess_branch_id": first_non_empty(request.data.get("sess_branch_id"), request.headers.get("X-Branch-Id"))[:50],
    }


def next_vendor_id():
    max_number = 0
    vendor_ids = VendorCreation.objects.filter(
        vendor_id__isnull=False,
        is_delete=0,
    ).values_list("vendor_id", flat=True)

    for vendor_id in vendor_ids:
        value = (vendor_id or "").strip().upper()
        match = re.match(r"^VEN-?(\d+)$", value)
        if not match:
            continue
        try:
            max_number = max(max_number, int(match.group(1)))
        except ValueError:
            continue

    return f"VEN-{str(max_number + 1).zfill(3)}"


def save_vendor_attachment(file_obj, filename):
    """Save uploaded attachment to vendor_creation upload roots."""
    roots = [
        LEGACY_UPLOAD_BASE / "vendor_creation",
        Path(settings.MEDIA_ROOT) / "vendor_creation",
        Path(settings.BASE_DIR) / "uploads" / "vendor_creation",
    ]
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
        raise OSError("Unable to save vendor attachment.")
    return filename


# ============================================================ #
#  VENDOR Ã¢â‚¬â€œ List / DataTable                                   #
#  PHP: case 'datatable'                                       #
# ============================================================ #
class VendorListView(APIView):
    """
    GET  /api/vendor-creation/list/   Ã¢â€ â€™ simple list
    POST /api/vendor-creation/list/   Ã¢â€ â€™ DataTable server-side
    """

    def get(self, request):
        qs = tenant_queryset(request, VendorCreation.objects.filter(is_delete=0), include_global=False).order_by('-created_at')
        serializer = VendorCreationSerializer(qs, many=True, context={'request': request})
        return Response({
            "status":  True,
            "data":    serializer.data,
            "message": "Vendor list fetched successfully."
        })

    def post(self, request):
        draw   = request.data.get('draw', 1)
        start  = int(request.data.get('start', 0))
        length = int(request.data.get('length', 10))
        search = request.data.get('search[value]') or request.data.get('search', {})
        if isinstance(search, dict):
            search = search.get('value', '')

        qs    = tenant_queryset(request, VendorCreation.objects.filter(is_delete=0), include_global=False)
        total = qs.count()

        if search:
            qs = qs.filter(
                Q(company_name__icontains=search) |
                Q(name__icontains=search)         |
                Q(contact_no__icontains=search)   |
                Q(vendor_id__icontains=search)    |
                Q(gst_no__icontains=search)
            )

        filtered = qs.count()

        if length != -1:
            qs = qs.order_by('-created_at')[start: start + length]

        result = []
        for idx, vendor in enumerate(qs, start=start + 1):
            row = VendorCreationSerializer(vendor, context={'request': request}).data
            row['s_no'] = idx
            result.append(row)

        return Response(
            datatable_response(draw, total, filtered, result),
            status=status.HTTP_200_OK
        )


# ============================================================ #
#  VENDOR Ã¢â‚¬â€œ Create (with PDF file upload)                      #
#  PHP: case 'createupdate' (new)                              #
# ============================================================ #
class VendorCreateView(APIView):
    """
    POST /api/vendor-creation/create/
    Form-data: all vendor fields + pan_file (PDF) + bank_file (PDF)
    """
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def post(self, request):
        data = request.data.dict() if hasattr(request.data, 'dict') else dict(request.data)
        vendor_id = first_non_empty(data.get("vendor_id"))
        if not vendor_id:
            vendor_id = next_vendor_id()
        data["vendor_id"] = vendor_id

        my_no = data.get('my_no', vendor_id)

        # Ã¢â€â‚¬Ã¢â€â‚¬ PAN file upload Ã¢â€â‚¬Ã¢â€â‚¬
        pan_file = request.FILES.get('pan_file')
        if pan_file:
            ext = os.path.splitext(pan_file.name)[1].lower() or '.pdf'
            filename = f"{my_no}-PAN{ext}"
            data['pan_attach_file_name']     = save_vendor_attachment(pan_file, filename)
            data['pan_attach_file_org_name'] = pan_file.name
        else:
            return Response({
                "status": False,
                "msg": "error",
                "error": {"pan_file": ["Pan Copy Attach is required."]},
                "message": "Validation failed."
            }, status=status.HTTP_400_BAD_REQUEST)

        # Ã¢â€â‚¬Ã¢â€â‚¬ Bank proof upload Ã¢â€â‚¬Ã¢â€â‚¬
        bank_file = request.FILES.get('bank_file')
        if bank_file:
            ext = os.path.splitext(bank_file.name)[1].lower() or '.pdf'
            filename = f"{my_no}-BANK{ext}"
            data['bank_proof']          = save_vendor_attachment(bank_file, filename)
            data['bank_proof_org_name'] = bank_file.name
        else:
            return Response({
                "status": False,
                "msg": "error",
                "error": {"bank_file": ["Bank Proof Attach is required."]},
                "message": "Validation failed."
            }, status=status.HTTP_400_BAD_REQUEST)

        serializer = VendorCreationSerializer(data=data, context={'request': request})
        if serializer.is_valid():
            payload = audit_payload(request)
            payload.update({key: value for key, value in tenant_audit_payload(request).items() if value})
            serializer.save(**payload)
            return Response({
                "status":  True,
                "msg":     "create",
                "data":    serializer.data,
                "message": "Vendor created successfully."
            }, status=status.HTTP_201_CREATED)

        return Response({
            "status":  False,
            "msg":     "error",
            "error":   serializer.errors,
            "message": "Validation failed."
        }, status=status.HTTP_400_BAD_REQUEST)


# ============================================================ #
#  VENDOR Ã¢â‚¬â€œ Retrieve / Update / Soft-Delete                    #
#  PHP: case 'createupdate' (update) + case 'delete'           #
# ============================================================ #
class VendorDetailView(APIView):
    """
    GET    /api/vendor-creation/<unique_id>/
    PUT    /api/vendor-creation/<unique_id>/update/
    DELETE /api/vendor-creation/<unique_id>/delete/
    """
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def _get_object(self, unique_id):
        try:
            return VendorCreation.objects.get(unique_id=unique_id, is_delete=0)
        except VendorCreation.DoesNotExist:
            return None

    def get(self, request, unique_id):
        vendor = self._get_object(unique_id)
        if not vendor:
            return Response({
                "status": False, "msg": "error", "message": "Vendor not found."
            }, status=status.HTTP_404_NOT_FOUND)

        serializer = VendorCreationSerializer(vendor, context={'request': request})
        return Response({"status": True, "data": serializer.data})

    def put(self, request, unique_id):
        vendor = self._get_object(unique_id)
        if not vendor:
            return Response({
                "status": False, "msg": "error", "message": "Vendor not found."
            }, status=status.HTTP_404_NOT_FOUND)

        data  = request.data.dict() if hasattr(request.data, 'dict') else dict(request.data)
        my_no = data.get('my_no', vendor.vendor_id or str(uuid.uuid4().hex[:8]))
        data["vendor_id"] = first_non_empty(data.get("vendor_id"), vendor.vendor_id)

        # Ã¢â€â‚¬Ã¢â€â‚¬ PAN file upload Ã¢â€â‚¬Ã¢â€â‚¬
        pan_file = request.FILES.get('pan_file')
        if pan_file:
            ext = os.path.splitext(pan_file.name)[1].lower() or '.pdf'
            filename = f"{my_no}-PAN{ext}"
            data['pan_attach_file_name']     = save_vendor_attachment(pan_file, filename)
            data['pan_attach_file_org_name'] = pan_file.name
        elif not first_non_empty(vendor.pan_attach_file_name, vendor.pan_attach_file_org_name):
            return Response({
                "status": False,
                "msg": "error",
                "error": {"pan_file": ["Pan Copy Attach is required."]},
                "message": "Validation failed."
            }, status=status.HTTP_400_BAD_REQUEST)

        # Ã¢â€â‚¬Ã¢â€â‚¬ Bank proof upload Ã¢â€â‚¬Ã¢â€â‚¬
        bank_file = request.FILES.get('bank_file')
        if bank_file:
            ext = os.path.splitext(bank_file.name)[1].lower() or '.pdf'
            filename = f"{my_no}-BANK{ext}"
            data['bank_proof']          = save_vendor_attachment(bank_file, filename)
            data['bank_proof_org_name'] = bank_file.name
        elif not first_non_empty(vendor.bank_proof, vendor.bank_proof_org_name):
            return Response({
                "status": False,
                "msg": "error",
                "error": {"bank_file": ["Bank Proof Attach is required."]},
                "message": "Validation failed."
            }, status=status.HTTP_400_BAD_REQUEST)

        serializer = VendorCreationSerializer(
            vendor, data=data, partial=True, context={'request': request}
        )
        if serializer.is_valid():
            serializer.save(**audit_payload(request))
            return Response({
                "status":  True,
                "msg":     "update",
                "data":    serializer.data,
                "message": "Vendor updated successfully."
            })

        return Response({
            "status": False, "msg": "error",
            "error":  serializer.errors, "message": "Validation failed."
        }, status=status.HTTP_400_BAD_REQUEST)

    def delete(self, request, unique_id):
        vendor = self._get_object(unique_id)
        if not vendor:
            return Response({
                "status": False, "msg": "error", "message": "Vendor not found."
            }, status=status.HTTP_404_NOT_FOUND)

        vendor.is_delete = 1
        vendor.save()
        return Response({
            "status": True, "msg": "success_delete",
            "message": "Vendor deleted successfully."
        })


# ============================================================ #
#  VENDOR ID Generate                                          #
#  PHP: case 'vendor_id_creation'                              #
#  Format: VEN-<STATE_SHORT>-001                               #
# ============================================================ #
class VendorIdGenerateView(APIView):
    """
    GET /api/vendor-creation/generate-id/?state_name=<unique_id>
    Returns auto-generated vendor ID like VEN-TN-001
    """

    def get(self, request):
        return Response({"status": True, "vendor_id": next_vendor_id()})
        state_name = request.query_params.get('state_name', '')
        short_name = 'VEN'

        # Ã¢â€â‚¬Ã¢â€â‚¬ Get state short name Ã¢â€â‚¬Ã¢â€â‚¬
        try:
            from master.apps.state.statemodel import StateCreation
            state = StateCreation.objects.get(unique_id=state_name)
            short_name = getattr(state, 'short_name', state.state_name[:2].upper())
        except Exception:
            pass

        # Ã¢â€â‚¬Ã¢â€â‚¬ Get last vendor count for this state Ã¢â€â‚¬Ã¢â€â‚¬
        count = VendorCreation.objects.filter(
            vendor_id__icontains=f"VEN-{short_name}-",
            is_delete=0
        ).count()

        new_id = f"VEN-{short_name}-{str(count + 1).zfill(3)}"
        return Response({"status": True, "vendor_id": new_id})


# ============================================================ #
#  District Options by State (Dropdown)                        #
#  PHP: case 'district_type_option'                            #
# ============================================================ #
class VendorDistrictOptionView(APIView):
    """
    GET /api/vendor-creation/options/districts/?state_name=<unique_id>
    """

    def get(self, request):
        state_name = request.query_params.get('state_name', '')
        try:
            from master.apps.district.districtmodel import DistrictCreation
            qs = DistrictCreation.objects.filter(is_delete=0)
            if state_name:
                qs = qs.filter(state_name=state_name)
            data = [{"unique_id": d.unique_id, "district_name": d.district_name} for d in qs]
        except Exception:
            data = []

        return Response({"status": True, "data": data})


# ============================================================ #
#  State Options (Dropdown)                                    #
# ============================================================ #
class VendorStateOptionView(APIView):
    """
    GET /api/vendor-creation/options/states/
    """

    def get(self, request):
        try:
            from master.apps.state.statemodel import StateCreation
            qs   = StateCreation.objects.filter(is_delete=0).order_by('state_name')
            data = [{"unique_id": s.unique_id, "state_name": s.state_name} for s in qs]
        except Exception:
            data = []

        return Response({"status": True, "data": data})
