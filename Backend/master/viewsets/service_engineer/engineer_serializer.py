from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView
from django.db.models import Q

from master.apps.service_engineer.engineermodel import EngineerNameCreation
from master.serializers.service_engineer.engineer_serializer import EngineerNameCreationSerializer

SERVICE_ENGINEER_USER_TYPE_ID = "66a3334baa22534432"


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


# ============================================================ #
#  SERVICE ENGINEER – List / DataTable                         #
#  PHP: case 'datatable'                                       #
# ============================================================ #
class EngineerListView(APIView):
    """
    GET  /api/service-engineer/list/   → simple list
    POST /api/service-engineer/list/   → DataTable server-side
    """

    def get(self, request):
        qs = (
            EngineerNameCreation.objects
            .filter(is_delete=0)
            .order_by('-id')
            .values('unique_id', 'engineer_name', 'emp_id', 'is_active', 'is_delete')
        )
        data = []
        for row in qs:
            row = dict(row)
            row['engineer_name_display'] = self._engineer_name_display(row['engineer_name'])
            row['emp_id_display'] = self._emp_id_display(row['emp_id'])
            row['is_active_display'] = "Active" if row['is_active'] == 1 else "Inactive"
            data.append(row)
        return Response({
            "status":  True,
            "data":    data,
            "message": "Service engineer list fetched successfully."
        })

    def post(self, request):
        draw   = request.data.get('draw', 1)
        start  = int(request.data.get('start', 0))
        length = int(request.data.get('length', 10))
        search = request.data.get('search[value]') or request.data.get('search', {})
        if isinstance(search, dict):
            search = search.get('value', '')

        qs = EngineerNameCreation.objects.filter(is_delete=0)
        total = qs.count()

        if search:
            qs = qs.filter(
                Q(engineer_name__icontains=search) |
                Q(emp_id__icontains=search)
            )

        filtered = qs.count()

        qs = qs.order_by('-id')
        if length != -1:
            qs = qs[start: start + length]

        result = []
        for idx, eng in enumerate(qs, start=start + 1):
            row = {
                'unique_id': eng.unique_id,
                'engineer_name': eng.engineer_name,
                'emp_id': eng.emp_id,
                'is_active': eng.is_active,
                'is_delete': eng.is_delete,
                'engineer_name_display': self._engineer_name_display(eng.engineer_name),
                'emp_id_display': self._emp_id_display(eng.emp_id),
                'is_active_display': "Active" if eng.is_active == 1 else "Inactive",
                's_no': idx,
            }
            result.append(row)

        return Response(
            datatable_response(draw, total, filtered, result),
            status=status.HTTP_200_OK
        )

    @staticmethod
    def _engineer_name_display(unique_id):
        try:
            from master.apps.user.usermodel import UserCreation
            return UserCreation.objects.get(unique_id=unique_id).staff_name
        except Exception:
            return unique_id

    @staticmethod
    def _emp_id_display(unique_id):
        try:
            from master.apps.user.usermodel import UserCreation
            return UserCreation.objects.get(unique_id=unique_id).staff_id
        except Exception:
            return unique_id


# ============================================================ #
#  SERVICE ENGINEER – Create                                   #
#  PHP: case 'createupdate' (new record)                       #
# ============================================================ #
class EngineerCreateView(APIView):
    """
    POST /api/service-engineer/create/
    Body: { engineer_name, emp_id, is_active }
    """

    def post(self, request):
        serializer = EngineerNameCreationSerializer(
            data=request.data, context={'request': request}
        )
        if serializer.is_valid():
            serializer.save()
            return Response({
                "status":  True,
                "msg":     "create",
                "data":    serializer.data,
                "message": "Service engineer created successfully."
            }, status=status.HTTP_201_CREATED)

        return Response({
            "status":  False,
            "msg":     "error",
            "error":   serializer.errors,
            "message": "Validation failed."
        }, status=status.HTTP_400_BAD_REQUEST)


# ============================================================ #
#  SERVICE ENGINEER – Retrieve / Update / Soft-Delete          #
#  PHP: case 'createupdate' (update) + case 'delete'           #
# ============================================================ #
class EngineerDetailView(APIView):
    """
    GET    /api/service-engineer/<unique_id>/
    PUT    /api/service-engineer/<unique_id>/update/
    DELETE /api/service-engineer/<unique_id>/delete/
    """

    def _get_object(self, unique_id):
        try:
            return EngineerNameCreation.objects.get(unique_id=unique_id, is_delete=0)
        except EngineerNameCreation.DoesNotExist:
            return None

    def get(self, request, unique_id):
        eng = self._get_object(unique_id)
        if not eng:
            return Response({
                "status": False, "msg": "error", "message": "Record not found."
            }, status=status.HTTP_404_NOT_FOUND)

        serializer = EngineerNameCreationSerializer(eng, context={'request': request})
        return Response({"status": True, "data": serializer.data})

    def put(self, request, unique_id):
        eng = self._get_object(unique_id)
        if not eng:
            return Response({
                "status": False, "msg": "error", "message": "Record not found."
            }, status=status.HTTP_404_NOT_FOUND)

        serializer = EngineerNameCreationSerializer(
            eng, data=request.data, partial=True, context={'request': request}
        )
        if serializer.is_valid():
            serializer.save()
            return Response({
                "status":  True,
                "msg":     "update",
                "data":    serializer.data,
                "message": "Service engineer updated successfully."
            })

        return Response({
            "status": False, "msg": "error",
            "error":  serializer.errors, "message": "Validation failed."
        }, status=status.HTTP_400_BAD_REQUEST)

    def delete(self, request, unique_id):
        eng = self._get_object(unique_id)
        if not eng:
            return Response({
                "status": False, "msg": "error", "message": "Record not found."
            }, status=status.HTTP_404_NOT_FOUND)

        eng.is_delete = 1
        eng.save()
        return Response({
            "status": True, "msg": "success_delete",
            "message": "Service engineer deleted successfully."
        })


# ============================================================ #
#  EMP ID Options (Dropdown)                                   #
#  PHP: case 'emp_id' — engineer_name select பண்ணா            #
#  அந்த user-ஓட emp_id dropdown-ல load ஆகும்                  #
# ============================================================ #
class EmpIdOptionView(APIView):
    """
    GET /api/service-engineer/options/emp-id/?engineer_name=<unique_id>
    PHP: case 'emp_id' → user_id_name($engineer_name)
    """

    def get(self, request):
        engineer_name = request.query_params.get('engineer_name', '')

        try:
            from master.apps.user.usermodel import UserCreation
            qs = UserCreation.objects.filter(
                is_delete=0,
                is_active=1,
                user_type_unique_id=SERVICE_ENGINEER_USER_TYPE_ID,
            )
            if engineer_name:
                qs = qs.filter(unique_id=engineer_name)

            data = [
                {"unique_id": u.unique_id, "staff_id": u.staff_id, "staff_name": u.staff_name}
                for u in qs
            ]
        except Exception:
            data = []

        return Response({"status": True, "data": data})


# ============================================================ #
#  Engineer Name Options (Dropdown for form)                   #
# ============================================================ #
class EngineerNameOptionView(APIView):
    """
    GET /api/service-engineer/options/engineer-names/
    Returns all active users as engineer name dropdown options.
    """

    def get(self, request):
        try:
            from master.apps.user.usermodel import UserCreation
            qs = UserCreation.objects.filter(
                is_delete=0,
                is_active=1,
                user_type_unique_id=SERVICE_ENGINEER_USER_TYPE_ID,
            ).order_by('staff_name')
            data = [
                {"unique_id": u.unique_id, "staff_name": u.staff_name, "staff_id": u.staff_id}
                for u in qs
            ]
        except Exception:
            data = []

        return Response({"status": True, "data": data})
