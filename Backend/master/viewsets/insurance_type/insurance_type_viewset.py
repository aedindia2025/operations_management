import uuid
from rest_framework import generics
from rest_framework.response import Response
from master.apps.insurance_type.insurance_type_models import InsuranceType
from master.serializers.insurance_type.insurance_type_serializer import InsuranceTypeSerializer

# LIST + CREATE
class InsuranceTypeListCreateView(generics.ListCreateAPIView):
    queryset = InsuranceType.objects.filter(is_delete="0")
    serializer_class = InsuranceTypeSerializer

    def perform_create(self, serializer):
        serializer.save(
            unique_id=uuid.uuid4().hex[:18],
            session_id="",
            sess_user_type="",
            sess_user_id="",
            sess_company_id="",
            sess_branch_id="",
        )


# DETAIL + UPDATE + DELETE
class InsuranceTypeDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = InsuranceType.objects.filter(is_delete="0")
    serializer_class = InsuranceTypeSerializer
    lookup_field = "unique_id"

    def perform_destroy(self, instance):
        instance.is_delete = "1"
        instance.save()

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        self.perform_destroy(instance)
        return Response({"status": 1, "msg": "success_delete"})
