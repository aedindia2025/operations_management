from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.pagination import PageNumberPagination
from django.db.models import Q

from master.apps.city.citymodel import CityCreation
from master.serializers.city.city_serializer import CityCreationSerializer


# ======================================================================= #
#  Helper – DataTable style paginated response                            #
# ======================================================================= #
def datatable_response(draw, total, filtered, data):
    return {
        "draw":            int(draw),
        "recordsTotal":    int(total),
        "recordsFiltered": int(filtered),
        "data":            data,
    }


# ======================================================================= #
#  City Creation – List / DataTable                                        #
# ======================================================================= #
class CityCreationListView(APIView):
    """
    GET  /api/city/                    → paginated list  (DataTable)
    POST /api/city/datatable/          → DataTable server-side
    """

    def get(self, request):
        cities = CityCreation.objects.filter(is_delete=0).order_by('-id')
        serializer = CityCreationSerializer(cities, many=True, context={'request': request})
        return Response({
            "status":  True,
            "data":    serializer.data,
            "message": "City list fetched successfully."
        }, status=status.HTTP_200_OK)

    def post(self, request):
        # ---------- DataTable server-side params ----------
        draw    = request.data.get('draw', 1)
        start   = int(request.data.get('start', 0))
        length  = int(request.data.get('length', 10))
        search  = request.data.get('search[value]') or request.data.get('search', {})
        if isinstance(search, dict):
            search = search.get('value', '')

        qs = CityCreation.objects.filter(is_delete=0).order_by('-id')
        total = qs.count()

        if search:
            qs = qs.filter(
                Q(city_name__icontains=search)
            )

        filtered = qs.count()

        if length != -1:
            qs = qs[start: start + length]

        result = []
        for idx, city in enumerate(qs, start=start + 1):
            s = CityCreationSerializer(city, context={'request': request})
            row = s.data
            row['s_no'] = idx
            result.append(row)

        return Response(datatable_response(draw, total, filtered, result),
                        status=status.HTTP_200_OK)


# ======================================================================= #
#  City Creation – Create                                                   #
# ======================================================================= #
class CityCreationCreateView(APIView):
    """
    POST /api/city/create/
    Body: { state_name, district_name, city_name, is_active }
    """

    def post(self, request):
        serializer = CityCreationSerializer(data=request.data, context={'request': request})

        if serializer.is_valid():
            serializer.save()
            return Response({
                "status":  True,
                "msg":     "create",
                "data":    serializer.data,
                "message": "City created successfully."
            }, status=status.HTTP_201_CREATED)

        return Response({
            "status":  False,
            "msg":     "error",
            "error":   serializer.errors,
            "message": "Validation failed."
        }, status=status.HTTP_400_BAD_REQUEST)


# ======================================================================= #
#  City Creation – Retrieve / Update / Soft-Delete                         #
# ======================================================================= #
class CityCreationDetailView(APIView):
    """
    GET    /api/city/<unique_id>/         → fetch single record
    PUT    /api/city/<unique_id>/update/  → update record
    DELETE /api/city/<unique_id>/delete/  → soft delete
    """

    def _get_object(self, unique_id):
        return (
            CityCreation.objects
            .filter(unique_id=unique_id, is_delete=0)
            .order_by("-id")
            .first()
        )

    # ---- GET single record ----
    def get(self, request, unique_id):
        city = self._get_object(unique_id)
        if not city:
            return Response({
                "status":  False,
                "msg":     "error",
                "message": "City not found."
            }, status=status.HTTP_404_NOT_FOUND)

        serializer = CityCreationSerializer(city, context={'request': request})
        return Response({
            "status": True,
            "data":   serializer.data,
        }, status=status.HTTP_200_OK)

    # ---- PUT update ----
    def put(self, request, unique_id):
        city = self._get_object(unique_id)
        if not city:
            return Response({
                "status":  False,
                "msg":     "error",
                "message": "City not found."
            }, status=status.HTTP_404_NOT_FOUND)

        serializer = CityCreationSerializer(
            city, data=request.data, partial=True, context={'request': request}
        )
        if serializer.is_valid():
            serializer.save()
            return Response({
                "status":  True,
                "msg":     "update",
                "data":    serializer.data,
                "message": "City updated successfully."
            }, status=status.HTTP_200_OK)

        return Response({
            "status":  False,
            "msg":     "error",
            "error":   serializer.errors,
            "message": "Validation failed."
        }, status=status.HTTP_400_BAD_REQUEST)

    # ---- DELETE (soft delete) ----
    def delete(self, request, unique_id):
        city = self._get_object(unique_id)
        if not city:
            return Response({
                "status":  False,
                "msg":     "error",
                "message": "City not found."
            }, status=status.HTTP_404_NOT_FOUND)

        city.is_delete = 1
        city.save()
        return Response({
            "status":  True,
            "msg":     "success delete",
            "message": "City deleted successfully."
        }, status=status.HTTP_200_OK)


# ======================================================================= #
#  District Options by State  (used in form dropdown – AJAX)              #
# ======================================================================= #
class DistrictOptionByStateView(APIView):
    """
    GET /api/city/district-options/?state_name=<unique_id>
    Returns district list filtered by state.
    """

    def get(self, request):
        state_name = request.query_params.get('state_name', '')

        from master.apps.district.districtmodel import DistrictCreation

        qs = DistrictCreation.objects.filter(is_delete=0)
        if state_name:
            qs = qs.filter(state_name=state_name)

        data = [
            {"unique_id": d.unique_id, "district_name": d.district_name}
            for d in qs
        ]
        return Response({
            "status": True,
            "data":   data,
        }, status=status.HTTP_200_OK)


# ======================================================================= #
#  State Options  (used in form dropdown)                                  #
# ======================================================================= #
class StateOptionView(APIView):
    """
    GET /api/city/state-options/
    Returns all active states.
    """

    def get(self, request):
        from master.apps.state.statemodel import StateCreation

        qs = StateCreation.objects.filter(is_delete=0).order_by('state_name')
        data = [
            {"unique_id": s.unique_id, "state_name": s.state_name}
            for s in qs
        ]
        return Response({
            "status": True,
            "data":   data,
        }, status=status.HTTP_200_OK)
