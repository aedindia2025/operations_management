from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status

from master.apps.Accounts_Team_Bill_Approval.accounts_team_model import AccountsTeamBillApproval
from master.serializers.Accounts_Team_Bill_Approval.accounts_team_serializer import AccountsTeamBillApprovalSerializer


class AccountsTeamBillApprovalView(APIView):

    # LIST + DETAIL
    def get(self, request, unique_id=None):
        if unique_id:
            try:
                obj = AccountsTeamBillApproval.objects.get(unique_id=unique_id)
                serializer = AccountsTeamBillApprovalSerializer(obj)
                return Response(serializer.data)
            except AccountsTeamBillApproval.DoesNotExist:
                return Response({"error": "Not found"}, status=404)

        objs = AccountsTeamBillApproval.objects.all().order_by("-id")
        serializer = AccountsTeamBillApprovalSerializer(objs, many=True)
        return Response(serializer.data)

    # CREATE
    def post(self, request):
        serializer = AccountsTeamBillApprovalSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=201)
        return Response(serializer.errors, status=400)

    # UPDATE
    def put(self, request, unique_id):
        try:
            obj = AccountsTeamBillApproval.objects.get(unique_id=unique_id)
        except AccountsTeamBillApproval.DoesNotExist:
            return Response({"error": "Not found"}, status=404)

        serializer = AccountsTeamBillApprovalSerializer(obj, data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=400)

    # DELETE
    def delete(self, request, unique_id):
        try:
            obj = AccountsTeamBillApproval.objects.get(unique_id=unique_id)
            obj.delete()
            return Response({"message": "Deleted successfully"})
        except AccountsTeamBillApproval.DoesNotExist:
            return Response({"error": "Not found"}, status=404)
