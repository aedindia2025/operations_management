from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView
from django.db.models import Q

from master.apps.department.departmentmodel import DepartmentCreation, DepartmentCreationSublist
from master.serializers.department.department_serializer import (
    DepartmentCreationSerializer,
    DepartmentSublistSerializer,
)
from master.tenant import apply_tenant_audit, tenant_queryset, tenant_save_kwargs


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


def current_academic_year():
    from datetime import date

    today = date.today()
    if today.month >= 4:
        return f"{today.year}-{today.year + 1}"
    return f"{today.year - 1}-{today.year}"


def get_active_sublist_object(request, unique_id):
    return (
        tenant_queryset(request, DepartmentCreationSublist.objects.filter(unique_id=unique_id, is_delete=0), include_global=False)
        .order_by("-id")
        .first()
    )


# ============================================================ #
#  DEPARTMENT – List / DataTable                               #
# ============================================================ #
class DepartmentListView(APIView):
    """
    GET  /api/department/list/   → simple list
    POST /api/department/list/   → DataTable server-side
    """

    def get(self, request):
        qs = tenant_queryset(request, DepartmentCreation.objects.filter(is_delete=0), include_global=False).order_by('department')
        serializer = DepartmentCreationSerializer(qs, many=True, context={'request': request})
        return Response({
            "status":  True,
            "data":    serializer.data,
            "message": "Department list fetched successfully."
        }, status=status.HTTP_200_OK)

    def post(self, request):
        draw   = request.data.get('draw', 1)
        start  = int(request.data.get('start', 0))
        length = int(request.data.get('length', 10))
        search = request.data.get('search[value]') or request.data.get('search', {})
        if isinstance(search, dict):
            search = search.get('value', '')

        qs    = tenant_queryset(request, DepartmentCreation.objects.filter(is_delete=0), include_global=False)
        total = qs.count()

        if search:
            qs = qs.filter(
                Q(department__icontains=search) |
                Q(description__icontains=search) |
                Q(ledger_name__icontains=search)
            )

        filtered = qs.count()

        if length != -1:
            qs = qs[start: start + length]

        result = []
        for idx, dept in enumerate(qs, start=start + 1):
            row = DepartmentCreationSerializer(dept, context={'request': request}).data
            row['s_no'] = idx
            result.append(row)

        return Response(
            datatable_response(draw, total, filtered, result),
            status=status.HTTP_200_OK
        )


# ============================================================ #
#  DEPARTMENT – Create                                         #
# ============================================================ #
class DepartmentCreateView(APIView):
    """
    POST /api/department/create/
    Body: { acc_sector, department, description, ledger_name, ledger_no, is_active }
    """

    def post(self, request):
        serializer = DepartmentCreationSerializer(
            data=request.data, context={'request': request}
        )
        if serializer.is_valid():
            serializer.save(acc_year=current_academic_year(), **tenant_save_kwargs(request, DepartmentCreation))
            return Response({
                "status":  True,
                "msg":     "create",
                "data":    serializer.data,
                "message": "Department created successfully."
            }, status=status.HTTP_201_CREATED)

        return Response({
            "status":  False,
            "msg":     "error",
            "error":   serializer.errors,
            "message": "Validation failed."
        }, status=status.HTTP_400_BAD_REQUEST)


# ============================================================ #
#  DEPARTMENT – Retrieve / Update / Soft-Delete                #
# ============================================================ #
class DepartmentDetailView(APIView):
    """
    GET    /api/department/<unique_id>/
    PUT    /api/department/<unique_id>/update/
    DELETE /api/department/<unique_id>/delete/
    """

    def _get_object(self, request, unique_id):
        return (
            tenant_queryset(request, DepartmentCreation.objects.filter(unique_id=unique_id, is_delete=0), include_global=False)
            .order_by('-id')
            .first()
        )

    def get(self, request, unique_id):
        dept = self._get_object(request, unique_id)
        if not dept:
            return Response({
                "status": False, "msg": "error", "message": "Department not found."
            }, status=status.HTTP_404_NOT_FOUND)

        serializer = DepartmentCreationSerializer(dept, context={'request': request})
        return Response({"status": True, "data": serializer.data})

    def put(self, request, unique_id):
        dept = self._get_object(request, unique_id)
        if not dept:
            return Response({
                "status": False, "msg": "error", "message": "Department not found."
            }, status=status.HTTP_404_NOT_FOUND)

        serializer = DepartmentCreationSerializer(
            dept, data=request.data, partial=True, context={'request': request}
        )
        if serializer.is_valid():
            serializer.save(acc_year=dept.acc_year or current_academic_year(), **tenant_save_kwargs(request, DepartmentCreation))
            return Response({
                "status":  True,
                "msg":     "update",
                "data":    serializer.data,
                "message": "Department updated successfully."
            })

        return Response({
            "status": False, "msg": "error",
            "error":  serializer.errors, "message": "Validation failed."
        }, status=status.HTTP_400_BAD_REQUEST)

    def delete(self, request, unique_id):
        dept = self._get_object(request, unique_id)
        if not dept:
            return Response({
                "status": False, "msg": "error", "message": "Department not found."
            }, status=status.HTTP_404_NOT_FOUND)

        dept.is_delete = 1
        dept.acc_year = dept.acc_year or current_academic_year()
        apply_tenant_audit(dept, request)
        dept.save()
        return Response({
            "status": True, "msg": "success_delete",
            "message": "Department deleted successfully."
        })


# ============================================================ #
#  SUBLIST – Add / Update                                      #
# ============================================================ #
class DepartmentSublistCreateUpdateView(APIView):
    """
    POST /api/department/sublist/
    Body: { form_main_unique_id, ledger_name, ledger_no, sub_unique_id(optional) }
    sub_unique_id இருந்தா UPDATE, இல்லன்னா INSERT.
    """

    def post(self, request):
        sub_unique_id       = request.data.get('sub_unique_id', '')
        form_main_unique_id = request.data.get('form_main_unique_id', '')
        ledger_name         = request.data.get('ledger_name', '')
        ledger_no           = request.data.get('ledger_no', '')

        if sub_unique_id:
            # ── UPDATE ──
            sub = get_active_sublist_object(request, sub_unique_id)
            if not sub:
                return Response({
                    "status": False, "msg": "error", "message": "Sublist record not found."
                }, status=status.HTTP_404_NOT_FOUND)

            serializer = DepartmentSublistSerializer(
                sub,
                data={
                    'ledger_name':         ledger_name,
                    'ledger_no':           ledger_no,
                    'form_main_unique_id': form_main_unique_id,
                },
                partial=True
            )
            msg = "update"
        else:
            # ── INSERT ──
            serializer = DepartmentSublistSerializer(
                data={
                    'form_main_unique_id': form_main_unique_id,
                    'ledger_name':         ledger_name,
                    'ledger_no':           ledger_no,
                }
            )
            msg = "add"

        if serializer.is_valid():
            if sub_unique_id:
                serializer.save(acc_year=sub.acc_year or current_academic_year(), **tenant_save_kwargs(request, DepartmentCreationSublist))
            else:
                serializer.save(acc_year=current_academic_year(), **tenant_save_kwargs(request, DepartmentCreationSublist))
            return Response({
                "status": True, "msg": msg, "data": serializer.data,
                "message": f"Sublist {msg}d successfully."
            }, status=status.HTTP_200_OK)

        return Response({
            "status": False, "msg": "error",
            "error":  serializer.errors, "message": "Validation failed."
        }, status=status.HTTP_400_BAD_REQUEST)


# ============================================================ #
#  SUBLIST – DataTable (filtered by Department)                #
# ============================================================ #
class DepartmentSublistDataTableView(APIView):
    """
    POST /api/department/sublist/datatable/
    Body: { form_main_unique_id }
    """

    def post(self, request):
        form_main_unique_id = request.data.get('form_main_unique_id', '')
        draw  = request.data.get('draw', 1)
        start = int(request.data.get('start', 0))

        qs = tenant_queryset(
            request,
            DepartmentCreationSublist.objects.filter(form_main_unique_id=form_main_unique_id, is_delete=0),
            include_global=False,
        )
        total = qs.count()

        result = []
        for idx, sub in enumerate(qs, start=start + 1):
            result.append({
                "s_no":        idx,
                "unique_id":   sub.unique_id,
                "ledger_name": sub.ledger_name or '-',
                "ledger_no":   sub.ledger_no   or '-',
            })

        return Response(
            datatable_response(draw, total, total, result),
            status=status.HTTP_200_OK
        )


# ============================================================ #
#  SUBLIST – Get single / Soft-Delete                          #
# ============================================================ #
class DepartmentSublistDetailView(APIView):
    """
    GET    /api/department/sublist/<unique_id>/
    DELETE /api/department/sublist/<unique_id>/delete/
    """

    def get(self, request, unique_id):
        sub = get_active_sublist_object(request, unique_id)
        if not sub:
            return Response({
                "status": False, "msg": "error", "message": "Not found."
            }, status=status.HTTP_404_NOT_FOUND)

        serializer = DepartmentSublistSerializer(sub)
        return Response({"status": True, "data": serializer.data})

    def delete(self, request, unique_id):
        sub = get_active_sublist_object(request, unique_id)
        if not sub:
            return Response({
                "status": False, "msg": "error", "message": "Not found."
            }, status=status.HTTP_404_NOT_FOUND)

        sub.is_delete = 1
        sub.acc_year = sub.acc_year or current_academic_year()
        apply_tenant_audit(sub, request)
        sub.save()
        return Response({
            "status": True, "msg": "success_delete",
            "message": "Sublist record deleted successfully."
        })


# ============================================================ #
#  Account Sector Options (Dropdown)                           #
# ============================================================ #
class AccountSectorOptionView(APIView):
    """
    GET /api/department/options/account-sectors/
    """

    def get(self, request):
        try:
            from master.apps.account_sector.accountsectormodel import AccountSector
            qs = tenant_queryset(request, AccountSector.objects.filter(is_delete='0'), include_global=False).order_by('sector_name')
            seen = set()
            data = []
            for s in qs:
                key = (s.sector_name or "").strip().lower()
                if not key or key in seen:
                    continue
                seen.add(key)
                data.append({"unique_id": s.unique_id, "acc_sector": s.sector_name})
        except Exception:
            data = []

        return Response({"status": True, "data": data})


