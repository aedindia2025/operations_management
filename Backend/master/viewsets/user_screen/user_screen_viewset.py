import uuid

from django.db import connection
from django.db.models import Q
from rest_framework import status
from rest_framework.generics import GenericAPIView
from rest_framework.response import Response

from master.apps.user_screen.userscreenmodel import UserScreen
from master.apps.user_type.usertypemodel import UserType
from master.serializers.user_screen import UserScreenInputSerializer, UserScreenSerializer


ACTION_OPTIONS = [
    {"unique_id": "add", "label": "Add"},
    {"unique_id": "update", "label": "Update"},
    {"unique_id": "list", "label": "List"},
    {"unique_id": "delete", "label": "Delete"},
    {"unique_id": "view", "label": "View"},
    {"unique_id": "cancel", "label": "Cancel"},
]


def generate_unique_id():
    return uuid.uuid4().hex[:18]


def _safe_lookup_query(preferred_sql, fallback_sql, params=None):
    params = params or []
    try:
        with connection.cursor() as cursor:
            cursor.execute(preferred_sql, params)
            return cursor.fetchall()
    except Exception:
        try:
            with connection.cursor() as cursor:
                cursor.execute(fallback_sql, params)
                return cursor.fetchall()
        except Exception:
            return []


def fetch_main_screen_options():
    rows = _safe_lookup_query(
        "SELECT unique_id, screen_main_name FROM user_screen_main WHERE is_delete = 0 ORDER BY screen_main_name",
        "SELECT unique_id, screen_main_name FROM user_screen_main ORDER BY screen_main_name",
    )
    return [{"unique_id": row[0], "label": row[1]} for row in rows]


def fetch_main_screen_label(main_screen_unique_id: str):
    if not main_screen_unique_id:
        return ""
    rows = _safe_lookup_query(
        "SELECT screen_main_name FROM user_screen_main WHERE is_delete = 0 AND unique_id = %s",
        "SELECT screen_main_name FROM user_screen_main WHERE unique_id = %s",
        [main_screen_unique_id],
    )
    return rows[0][0] if rows else ""


def fetch_section_options(main_screen_unique_id: str = ""):
    params = []
    if main_screen_unique_id:
        preferred_sql = "SELECT unique_id, section_name FROM user_screen_sections WHERE is_delete = 0 AND screen_main_unique_id LIKE %s ORDER BY section_name"
        fallback_sql = "SELECT unique_id, section_name FROM user_screen_sections WHERE screen_main_unique_id LIKE %s ORDER BY section_name"
        params.append(main_screen_unique_id)
        rows = _safe_lookup_query(preferred_sql, fallback_sql, params)

        if not rows:
            main_screen_label = fetch_main_screen_label(main_screen_unique_id)
            if main_screen_label:
                fallback_by_name_preferred = """
                    SELECT s.unique_id, s.section_name
                    FROM user_screen_sections s
                    JOIN user_screen_main m ON m.screen_main_name = s.section_name
                    WHERE s.is_delete = 0 AND m.unique_id = %s
                    ORDER BY s.section_name
                """
                fallback_by_name_sql = """
                    SELECT s.unique_id, s.section_name
                    FROM user_screen_sections s
                    JOIN user_screen_main m ON m.screen_main_name = s.section_name
                    WHERE m.unique_id = %s
                    ORDER BY s.section_name
                """
                rows = _safe_lookup_query(fallback_by_name_preferred, fallback_by_name_sql, [main_screen_unique_id])

        return [{"unique_id": row[0], "label": row[1]} for row in rows]
    else:
        preferred_sql = "SELECT unique_id, section_name FROM user_screen_sections WHERE is_delete = 0 ORDER BY section_name"
        fallback_sql = "SELECT unique_id, section_name FROM user_screen_sections ORDER BY section_name"
        rows = _safe_lookup_query(preferred_sql, fallback_sql, params)
        return [{"unique_id": row[0], "label": row[1]} for row in rows]


def as_lookup_map(rows):
    return {row["unique_id"]: row["label"] for row in rows}


def product_owner_only(request):
    user = getattr(request, "user", None)
    if not getattr(user, "is_authenticated", False):
        return Response({"status": 0, "error": "Authentication required"}, status=status.HTTP_401_UNAUTHORIZED)
    role_id = str(getattr(user, "user_type_unique_id", "") or "").strip().lower()
    try:
        role_name = (
            UserType.objects.filter(unique_id=getattr(user, "user_type_unique_id", ""), is_delete=0)
            .values_list("user_type", flat=True)
            .first()
            or ""
        )
    except Exception:
        role_name = ""
    normalized_role = "".join(ch for ch in str(role_name or role_id).strip().lower() if ch.isalnum() or ch == "_")
    if normalized_role not in {"product_owner", "productowner"}:
        return Response({"status": 0, "error": "Only product owner can manage user screens"}, status=status.HTTP_403_FORBIDDEN)
    return None


class UserScreenOptionsView(GenericAPIView):
    def get(self, request):
        denied = product_owner_only(request)
        if denied:
            return denied
        data = {"main_screens": fetch_main_screen_options(), "actions": ACTION_OPTIONS}
        return Response({"status": 1, "data": data})


class UserScreenSectionOptionsView(GenericAPIView):
    def get(self, request):
        denied = product_owner_only(request)
        if denied:
            return denied
        main_screen = request.query_params.get("main_screen_unique_id", "")
        return Response({"status": 1, "data": fetch_section_options(main_screen)})


class UserScreenListCreateView(GenericAPIView):
    serializer_class = UserScreenInputSerializer

    def get(self, request):
        denied = product_owner_only(request)
        if denied:
            return denied
        search = request.query_params.get("search", "").strip()
        start = int(request.query_params.get("start", 0))
        length = request.query_params.get("length", "10")
        draw = int(request.query_params.get("draw", 1))

        qs = UserScreen.objects.filter(is_delete=0).order_by("order_no", "screen_name")
        if search:
            qs = qs.filter(
                Q(screen_name__icontains=search)
                | Q(main_screen_unique_id__icontains=search)
                | Q(screen_section_unique_id__icontains=search)
                | Q(folder_name__icontains=search)
            )

        total = qs.count()
        if length != "-1":
            qs = qs[start : start + int(length)]

        main_screen_map = as_lookup_map(fetch_main_screen_options())
        section_map = as_lookup_map(fetch_section_options())

        data = []
        for i, obj in enumerate(qs, start=start + 1):
            data.append({
                "s_no": i,
                "screen_name": obj.screen_name,
                "section_screen": section_map.get(obj.screen_section_unique_id or "", obj.screen_section_unique_id or "-"),
                "main_screen": main_screen_map.get(obj.main_screen_unique_id, obj.main_screen_unique_id),
                "order_no": obj.order_no,
                "is_active": "Active" if obj.is_active == 1 else "Inactive",
                "unique_id": obj.unique_id,
            })
        return Response({"draw": draw, "recordsTotal": total, "recordsFiltered": total, "data": data})

    def post(self, request):
        denied = product_owner_only(request)
        if denied:
            return denied
        serializer = UserScreenInputSerializer(data=request.data)
        if not serializer.is_valid():
            return Response({"status": 0, "msg": "error", "errors": serializer.errors}, status=status.HTTP_400_BAD_REQUEST)

        data = serializer.validated_data
        unique_id = request.data.get("unique_id", "")
        duplicate = UserScreen.objects.filter(is_delete=0).filter(
            Q(folder_name__iexact=data["folder_name"])
            | Q(main_screen_unique_id=data["main_screen_unique_id"], screen_section_unique_id=data.get("screen_section_unique_id") or "", screen_name__iexact=data["screen_name"])
        )
        if unique_id:
            duplicate = duplicate.exclude(unique_id=unique_id)
        if duplicate.exists():
            return Response({"status": 1, "msg": "already", "error": "User screen already exists"}, status=status.HTTP_409_CONFLICT)

        payload = {
            "main_screen_unique_id": data["main_screen_unique_id"],
            "screen_section_unique_id": data.get("screen_section_unique_id") or "",
            "screen_name": data["screen_name"],
            "folder_name": data["folder_name"],
            "actions": ",".join(data.get("actions") or []),
            "icon_name": data.get("icon_name") or "",
            "order_no": data["order_no"],
            "is_active": data.get("is_active", 1),
            "description": data.get("description") or "",
            "dashboard_setting_menu": data.get("dashboard_setting_menu") or "",
        }

        if unique_id:
            obj = UserScreen.objects.get(unique_id=unique_id, is_delete=0)
            for key, value in payload.items():
                setattr(obj, key, value)
            obj.save()
            msg = "update"
        else:
            obj = UserScreen.objects.create(unique_id=generate_unique_id(), **payload)
            msg = "create"

        return Response({"status": 1, "msg": msg, "data": UserScreenSerializer(obj).data})


class UserScreenDetailView(GenericAPIView):
    def get_object(self, unique_id):
        try:
            return UserScreen.objects.get(unique_id=unique_id, is_delete=0)
        except UserScreen.DoesNotExist:
            return None

    def get(self, request, unique_id):
        denied = product_owner_only(request)
        if denied:
            return denied
        obj = self.get_object(unique_id)
        if not obj:
            return Response({"status": 0, "error": "Not found"}, status=status.HTTP_404_NOT_FOUND)
        return Response({"status": 1, "data": UserScreenSerializer(obj).data})

    def delete(self, request, unique_id):
        denied = product_owner_only(request)
        if denied:
            return denied
        obj = self.get_object(unique_id)
        if not obj:
            return Response({"status": 0, "error": "Not found"}, status=status.HTTP_404_NOT_FOUND)
        obj.is_delete = 1
        obj.save()
        return Response({"status": 1, "msg": "success_delete"})
