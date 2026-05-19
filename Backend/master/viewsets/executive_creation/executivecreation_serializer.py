import uuid
import hashlib

from rest_framework.views    import APIView
from rest_framework.response import Response
from rest_framework          import status

from master.apps.executive_creation.executivecreation_model         import ExecutiveName, ExecutiveUser
from master.serializers.executive_creation.executivecreation_serializer import (
    ExecutiveCreationSerializer,
    ExecutiveReadSerializer,
)

EXECUTIVE_USER_TYPE = '69b0115ced3bd96390'


# ────────────────────────────────────────────────────────────────────── #
#  Helper                                                                 #
# ────────────────────────────────────────────────────────────────────── #
def generate_unique_id():
    return uuid.uuid4().hex[:18]

def md5_password(raw):
    return hashlib.md5(raw.encode()).hexdigest()


# ────────────────────────────────────────────────────────────────────── #
#  List  (GET — DataTable)                                                #
# ────────────────────────────────────────────────────────────────────── #
class ExecutiveCreationListView(APIView):
    """
    GET  /executive-creation/list/
    """

    def get(self, request):
        search = request.query_params.get("search", "").strip()
        page   = int(request.query_params.get("page", 1))
        length = int(request.query_params.get("length", 10))

        qs = ExecutiveName.objects.filter(is_delete=0).order_by("-s_no")

        if search:
            qs = qs.filter(executive_name__icontains=search)

        total = qs.count()
        start = (page - 1) * length
        qs    = qs[start: start + length]

        serializer = ExecutiveReadSerializer(qs, many=True)

        return Response({
            "status"          : True,
            "recordsTotal"    : total,
            "recordsFiltered" : total,
            "data"            : serializer.data,
        })


# ────────────────────────────────────────────────────────────────────── #
#  Create  (POST)                                                         #
# ────────────────────────────────────────────────────────────────────── #
class ExecutiveCreationCreateView(APIView):
    """
    POST /executive-creation/create/
    Writes to BOTH executive_name table and user table
    with the same unique_id (PHP logic preserved)
    """

    def post(self, request):
        serializer = ExecutiveCreationSerializer(data=request.data)

        if not serializer.is_valid():
            return Response({
                "status" : False,
                "msg"    : "error",
                "error"  : serializer.errors,
            }, status=status.HTTP_400_BAD_REQUEST)

        data         = serializer.validated_data
        gen_uid      = generate_unique_id()
        raw_password = data["password"]

        # ── Insert into executive_name ────────────────────────────── #
        executive = ExecutiveName.objects.create(
            under_user_type = EXECUTIVE_USER_TYPE,
            executive_name  = data["executive_name"],
            is_active       = data["is_active"],
            unique_id       = gen_uid,
        )

        # ── Insert into user (same unique_id) ─────────────────────── #
        ExecutiveUser.objects.create(
            staff_name          = data["executive_name"],
            staff_id            = data["executive_name"],
            user_name           = data["user_name"],
            password            = raw_password,
            en_password         = md5_password(raw_password),
            email_id            = data["email_id"],
            mobile_no           = data["mobile_no"],
            is_active           = data["is_active"],
            user_type_unique_id = EXECUTIVE_USER_TYPE,
            unique_id           = gen_uid,
        )

        return Response({
            "status"    : True,
            "msg"       : "create",
            "unique_id" : gen_uid,
        }, status=status.HTTP_201_CREATED)


# ────────────────────────────────────────────────────────────────────── #
#  Retrieve / Update / Delete                                             #
# ────────────────────────────────────────────────────────────────────── #
class ExecutiveCreationDetailView(APIView):
    """
    GET    /executive-creation/<unique_id>/
    PUT    /executive-creation/<unique_id>/update/
    DELETE /executive-creation/<unique_id>/delete/
    """

    def _get_executive(self, unique_id):
        try:
            return ExecutiveName.objects.get(unique_id=unique_id, is_delete=0)
        except ExecutiveName.DoesNotExist:
            return None

    # ── Retrieve ──────────────────────────────────────────────────── #
    def get(self, request, unique_id):
        obj = self._get_executive(unique_id)
        if not obj:
            return Response({
                "status" : False,
                "msg"    : "error",
                "error"  : "Executive not found.",
            }, status=status.HTTP_404_NOT_FOUND)

        serializer = ExecutiveReadSerializer(obj)
        return Response({"status": True, "data": serializer.data})

    # ── Update ────────────────────────────────────────────────────── #
    def put(self, request, unique_id):
        obj = self._get_executive(unique_id)
        if not obj:
            return Response({
                "status" : False,
                "msg"    : "error",
                "error"  : "Executive not found.",
            }, status=status.HTTP_404_NOT_FOUND)

        serializer = ExecutiveCreationSerializer(
            data=request.data,
            context={"unique_id": unique_id},
        )

        if not serializer.is_valid():
            return Response({
                "status" : False,
                "msg"    : "error",
                "error"  : serializer.errors,
            }, status=status.HTTP_400_BAD_REQUEST)

        data         = serializer.validated_data
        raw_password = data["password"]

        # ── Update executive_name table ───────────────────────────── #
        obj.executive_name = data["executive_name"]
        obj.is_active      = data["is_active"]
        obj.save()

        # ── Upsert user table (same PHP logic) ────────────────────── #
        user_cols = dict(
            staff_name          = data["executive_name"],
            staff_id            = data["executive_name"],
            user_name           = data["user_name"],
            password            = raw_password,
            en_password         = md5_password(raw_password),
            email_id            = data["email_id"],
            mobile_no           = data["mobile_no"],
            is_active           = data["is_active"],
            user_type_unique_id = EXECUTIVE_USER_TYPE,
        )

        user_qs = ExecutiveUser.objects.filter(unique_id=unique_id, is_delete=0)

        if user_qs.exists():
            user_qs.update(**user_cols)
        else:
            # user row missing — insert it (same as PHP fallback)
            user_cols["unique_id"] = unique_id
            ExecutiveUser.objects.create(**user_cols)

        return Response({"status": True, "msg": "update"})

    # ── Soft Delete ───────────────────────────────────────────────── #
    def delete(self, request, unique_id):
        obj = self._get_executive(unique_id)
        if not obj:
            return Response({
                "status" : False,
                "msg"    : "error",
                "error"  : "Executive not found.",
            }, status=status.HTTP_404_NOT_FOUND)

        obj.is_delete = 1
        obj.save()

        return Response({"status": True, "msg": "success_delete"})
