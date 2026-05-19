import uuid

from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView

from master.apps.city.citymodel import CityCreation
from master.apps.district.districtmodel import DistrictCreation
from master.apps.pincode_creation.pincodemodel import PincodeCreation
from master.apps.state.statemodel import StateCreation
from master.serializers.pincode_creation.pincode_serializer import PincodeCreationSerializer


def generate_unique_id():
    return uuid.uuid4().hex[:18]


class PincodeCreationListView(APIView):
    def post(self, request):
        draw = int(request.data.get("draw", 1))
        start = int(request.data.get("start", 0))
        length = int(request.data.get("length", 10))
        search = (request.data.get("search") or {}).get("value", "").strip()

        qs = PincodeCreation.objects.filter(is_delete=0).order_by("-created", "-id")
        if search:
            qs = qs.filter(pincode__icontains=search)

        total = qs.count()
        rows = qs[start : start + length]
        serializer = PincodeCreationSerializer(rows, many=True)

        data = []
        for index, row in enumerate(serializer.data, start=start + 1):
            row["s_no"] = index
            data.append(row)

        return Response(
            {
                "draw": draw,
                "recordsTotal": total,
                "recordsFiltered": total,
                "data": data,
            }
        )


class PincodeCreationCreateView(APIView):
    def post(self, request):
        data = request.data.copy()
        data["unique_id"] = data.get("unique_id") or generate_unique_id()

        serializer = PincodeCreationSerializer(data=data)
        if serializer.is_valid():
            serializer.save()
            return Response(
                {"status": True, "msg": "create", "data": serializer.data},
                status=status.HTTP_201_CREATED,
            )

        return Response(
            {"status": False, "msg": "error", "error": serializer.errors},
            status=status.HTTP_400_BAD_REQUEST,
        )


class PincodeCreationDetailView(APIView):
    def _get_object(self, unique_id):
        try:
            return PincodeCreation.objects.get(unique_id=unique_id, is_delete=0)
        except PincodeCreation.DoesNotExist:
            return None

    def get(self, request, unique_id):
        obj = self._get_object(unique_id)
        if not obj:
            return Response(
                {"status": False, "msg": "error", "error": "Pincode not found."},
                status=status.HTTP_404_NOT_FOUND,
            )
        return Response({"status": True, "data": PincodeCreationSerializer(obj).data})

    def put(self, request, unique_id):
        obj = self._get_object(unique_id)
        if not obj:
            return Response(
                {"status": False, "msg": "error", "error": "Pincode not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        serializer = PincodeCreationSerializer(obj, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response({"status": True, "msg": "update", "data": serializer.data})

        return Response(
            {"status": False, "msg": "error", "error": serializer.errors},
            status=status.HTTP_400_BAD_REQUEST,
        )

    def delete(self, request, unique_id):
        obj = self._get_object(unique_id)
        if not obj:
            return Response(
                {"status": False, "msg": "error", "error": "Pincode not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        obj.is_delete = 1
        obj.save(update_fields=["is_delete"])
        return Response({"status": True, "msg": "success_delete"})


class PincodeStateOptionView(APIView):
    def get(self, request):
        data = list(
            StateCreation.objects.filter(is_delete=0, is_active=1)
            .order_by("state_name")
            .values("unique_id", "state_name")
        )
        return Response({"status": True, "data": data})


class PincodeDistrictOptionView(APIView):
    def get(self, request):
        state_name = request.query_params.get("state_name", "").strip()
        qs = DistrictCreation.objects.filter(is_delete=0, is_active=1)
        if state_name:
            qs = qs.filter(state_name=state_name)
        data = list(qs.order_by("district_name").values("unique_id", "district_name"))
        return Response({"status": True, "data": data})


class PincodeCityOptionView(APIView):
    def get(self, request):
        district_name = request.query_params.get("district_name", "").strip()
        state_name = request.query_params.get("state_name", "").strip()
        qs = CityCreation.objects.filter(is_delete=0, is_active=1)
        if state_name:
            qs = qs.filter(state_name=state_name)
        if district_name:
            district = (
                DistrictCreation.objects.filter(unique_id=district_name, is_delete=0)
                .order_by("-id")
                .first()
            )
            district_label = district.district_name if district else district_name
            qs = qs.filter(district_name__in=[district_name, district_label])
        data = list(qs.order_by("city_name", "unique_id").values("unique_id", "city_name"))
        return Response({"status": True, "data": data})
