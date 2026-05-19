import uuid
import openpyxl

from django.db.models import Q
from rest_framework import status
from rest_framework.generics import GenericAPIView
from rest_framework.response import Response

from master.apps.district.districtmodel import DistrictCreation
from master.apps.state.statemodel import StateCreation
from master.serializers.district import DistrictCreationSerializer, DistrictInputSerializer


def generate_unique_id():
    return uuid.uuid4().hex[:18]


def build_district_list_response(request):
    search = request.query_params.get("search", "").strip()

    start = request.query_params.get("start")
    length = request.query_params.get("length")
    draw = request.query_params.get("draw")

    start = int(start) if start and start.isdigit() else 0
    length = int(length) if length and length.isdigit() else 10
    draw = int(draw) if draw and draw.isdigit() else 1

    qs = DistrictCreation.objects.filter(is_delete=0).order_by("-id")

    if search:
        matching_state_ids = StateCreation.objects.filter(
            state_name__icontains=search,
            is_delete=0,
        ).values_list("unique_id", flat=True)

        qs = qs.filter(
            Q(district_name__icontains=search) |
            Q(state_name__in=matching_state_ids)
        )

    filtered = qs.count()

    if length != -1:
        qs = qs[start:start + length]

    state_map = {
        state.unique_id: state.state_name
        for state in StateCreation.objects.filter(is_delete=0)
    }

    data = []
    for i, obj in enumerate(qs, start=start + 1):
        data.append({
            "s_no": i,
            "district_name": obj.district_name,
            "state_name": state_map.get(obj.state_name, "-"),
            "state_uid": obj.state_name,
            "is_active": "Active" if obj.is_active == 1 else "Inactive",
            "unique_id": obj.unique_id,
        })

    return Response({
        "draw": draw,
        "recordsTotal": filtered,
        "recordsFiltered": filtered,
        "data": data,
    })

class DistrictImportView(GenericAPIView):
    def post(self, request):
        file = request.FILES.get("file")
        if not file:
            return Response({"status": 0, "error": "No file provided."}, status=400)

        try:
            wb = openpyxl.load_workbook(file)
            ws = wb.active
            created = 0
            skipped = 0

            for row in ws.iter_rows(min_row=2, values_only=True):  # row 1 is header
                district_name = str(row[0]).strip() if row[0] else None
                state_uid     = str(row[1]).strip() if row[1] else None

                if not district_name or not state_uid:
                    skipped += 1
                    continue

                # validate state exists
                state_exists = StateCreation.objects.filter(
                    unique_id=state_uid, is_delete=0
                ).exists()
                if not state_exists:
                    skipped += 1
                    continue

                # skip duplicates
                if DistrictCreation.objects.filter(
                    district_name__iexact=district_name, is_delete=0
                ).exists():
                    skipped += 1
                    continue

                DistrictCreation.objects.create(
                    unique_id=generate_unique_id(),
                    district_name=district_name,
                    state_name=state_uid,
                    is_active=1,
                )
                created += 1

            return Response({
                "status": 1,
                "msg": f"{created} districts imported, {skipped} skipped."
            })

        except Exception as e:
            return Response({"status": 0, "error": str(e)}, status=400)
            
class DistrictListCreateView(GenericAPIView):
    serializer_class = DistrictInputSerializer

    def get(self, request):
        return build_district_list_response(request)

    def post(self, request):
        serializer = DistrictInputSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(
                {"status": 0, "msg": "error", "errors": serializer.errors},
                status=status.HTTP_400_BAD_REQUEST,
            )

        data = serializer.validated_data

        duplicate = DistrictCreation.objects.filter(
            district_name__iexact=data["district_name"],
            is_delete=0,
        ).exists()
        if duplicate:
            return Response(
                {"status": 1, "msg": "already", "error": "District already exists"},
                status=status.HTTP_409_CONFLICT,
            )

        obj = DistrictCreation.objects.create(
            unique_id=generate_unique_id(),
            district_name=data["district_name"],
            state_name=data["state_name"],
            is_active=data.get("is_active", 1),
        )
        return Response(
            {"status": 1, "msg": "create", "data": DistrictCreationSerializer(obj).data},
            status=status.HTTP_201_CREATED,
        )


class DistrictDetailView(GenericAPIView):
    serializer_class = DistrictInputSerializer

    def get_object(self, unique_id):
        try:
            return DistrictCreation.objects.get(unique_id=unique_id, is_delete=0)
        except DistrictCreation.DoesNotExist:
            return None

    def get(self, request, unique_id):
        district = self.get_object(unique_id)
        if not district:
            return Response(
                {"status": 0, "msg": "error", "error": "District not found"},
                status=status.HTTP_404_NOT_FOUND,
            )

        return Response(
            {"status": 1, "data": DistrictCreationSerializer(district).data},
            status=status.HTTP_200_OK,
        )

    def put(self, request, unique_id):
        district = self.get_object(unique_id)
        if not district:
            return Response(
                {"status": 0, "msg": "error", "error": "District not found"},
                status=status.HTTP_404_NOT_FOUND,
            )

        serializer = DistrictInputSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(
                {"status": 0, "msg": "error", "errors": serializer.errors},
                status=status.HTTP_400_BAD_REQUEST,
            )

        data = serializer.validated_data
        duplicate = DistrictCreation.objects.filter(
            district_name__iexact=data["district_name"],
            is_delete=0,
        ).exclude(unique_id=unique_id).exists()
        if duplicate:
            return Response(
                {"status": 1, "msg": "already", "error": "District already exists"},
                status=status.HTTP_409_CONFLICT,
            )

        district.district_name = data["district_name"]
        district.state_name = data["state_name"]
        district.is_active = data.get("is_active", district.is_active)
        district.save()

        return Response(
            {"status": 1, "msg": "update", "data": DistrictCreationSerializer(district).data},
            status=status.HTTP_200_OK,
        )

    def delete(self, request, unique_id):
        district = self.get_object(unique_id)
        if not district:
            return Response(
                {"status": 0, "msg": "error", "error": "District not found"},
                status=status.HTTP_404_NOT_FOUND,
            )

        district.is_delete = 1
        district.save(update_fields=["is_delete"])

        return Response(
            {"status": 1, "msg": "delete"},
            status=status.HTTP_200_OK,
        )


class StateOptionsView(GenericAPIView):
    """
    GET /api/master/district/state-options/
    Returns all active states for the district form dropdown.
    """

    def get(self, request):
        states = StateCreation.objects.filter(
            is_delete=0,
            is_active=1,
        ).order_by("state_name").values("unique_id", "state_name")
        return Response({"status": 1, "data": list(states)})
