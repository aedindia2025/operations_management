import uuid

import re

from django.db import connection
from rest_framework import status
from rest_framework.generics import GenericAPIView
from rest_framework.response import Response

from master.apps.user_permission.userpermissionmodel import UserPermission
from master.apps.user_screen.userscreenmodel import UserScreen
from master.apps.user_type.usertypemodel import UserType
from master.serializers.user_permission import UserPermissionSaveSerializer
from master.tenant import request_company_id, tenant_queryset


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


def _normalize_label(value):
    return re.sub(r"[^a-z0-9]+", "", str(value or "").strip().lower())


def fetch_main_screen_options():
    rows = _safe_lookup_query(
        "SELECT unique_id, screen_main_name, COALESCE(order_no, 0) FROM user_screen_main WHERE is_delete = 0 ORDER BY COALESCE(order_no, 0), screen_main_name, unique_id",
        "SELECT unique_id, screen_main_name, COALESCE(order_no, 0) FROM user_screen_main ORDER BY COALESCE(order_no, 0), screen_main_name, unique_id",
    )
    options = []
    seen = set()
    for row in rows:
        key = _normalize_label(row[1])
        if not key or key in seen:
            continue
        seen.add(key)
        options.append({"unique_id": row[0], "label": row[1]})
    return options


def fetch_action_name_map():
    rows = _safe_lookup_query(
        "SELECT unique_id, action_name FROM user_screen_actions WHERE is_delete = 0 ORDER BY action_name",
        "SELECT unique_id, action_name FROM user_screen_actions ORDER BY action_name",
    )
    return {row[0]: row[1] for row in rows}


class UserPermissionOptionsView(GenericAPIView):
    def get(self, request):
        user_types = tenant_queryset(request, UserType.objects.filter(is_delete=0), include_global=True).order_by("user_type")
        return Response({
            "status": 1,
            "data": {
                "user_types": [{"unique_id": row.unique_id, "label": row.user_type} for row in user_types],
                "main_screens": fetch_main_screen_options(),
            },
        })


class UserPermissionMatrixView(GenericAPIView):
    def get(self, request):
        user_type = request.query_params.get("user_type", "")
        main_screen = request.query_params.get("main_screen_unique_id", "")
        company_id = request_company_id(request)
        screens = UserScreen.objects.filter(is_delete=0, is_active=1)
        if main_screen:
            screens = screens.filter(main_screen_unique_id=main_screen)
        screens = screens.order_by("order_no", "screen_name")

        action_name_map = fetch_action_name_map()
        existing = UserPermission.objects.filter(
            is_delete=0,
            user_type=user_type,
            main_screen_unique_id=main_screen,
            sess_company_id__in=["", company_id],
        )
        selected = {(row.screen_unique_id, row.action_unique_id) for row in existing}

        data = []
        for i, screen in enumerate(screens, start=1):
            actions = [item for item in (screen.actions or "").split(",") if item]
            data.append({
                "s_no": i,
                "screen_unique_id": screen.unique_id,
                "screen_name": screen.screen_name,
                "section_unique_id": screen.screen_section_unique_id or "",
                "main_screen_unique_id": screen.main_screen_unique_id,
                "actions": [
                    {
                        "unique_id": action,
                        "label": action_name_map.get(action, action),
                        "checked": (screen.unique_id, action) in selected,
                    }
                    for action in actions
                ],
            })
        return Response({"status": 1, "data": data})


class UserPermissionListCreateView(GenericAPIView):
    serializer_class = UserPermissionSaveSerializer

    def get(self, request):
        search = request.query_params.get("search", "").strip().lower()
        start = int(request.query_params.get("start", 0))
        length = request.query_params.get("length", "10")
        draw = int(request.query_params.get("draw", 1))

        company_id = request_company_id(request)
        qs = UserPermission.objects.filter(is_delete=0, sess_company_id__in=["", company_id]).order_by("user_type")
        grouped = []
        seen = set()
        for row in qs:
            if row.user_type in seen:
                continue
            seen.add(row.user_type)
            try:
                label = UserType.objects.get(unique_id=row.user_type).user_type
            except Exception:
                label = row.user_type
            if search and search not in label.lower():
                continue
            grouped.append({"user_type": label, "unique_id": row.user_type})

        total = len(grouped)
        if length != "-1":
            grouped = grouped[start : start + int(length)]
        data = [{"s_no": i, **row} for i, row in enumerate(grouped, start=start + 1)]
        return Response({"draw": draw, "recordsTotal": total, "recordsFiltered": total, "data": data})

    def post(self, request):
        serializer = UserPermissionSaveSerializer(data=request.data)
        if not serializer.is_valid():
            return Response({"status": 0, "msg": "error", "errors": serializer.errors}, status=status.HTTP_400_BAD_REQUEST)

        data = serializer.validated_data
        user_type = data["user_type"]
        main_screen = data["main_screen_unique_id"]
        request_tenant_id = request_company_id(request)
        company_id = request_tenant_id or data.get("sess_company_id") or ""
        permissions = data.get("permissions") or []

        UserPermission.objects.filter(user_type=user_type, main_screen_unique_id=main_screen, sess_company_id=company_id).delete()
        rows = [UserPermission(unique_id=generate_unique_id(), user_type=user_type, main_screen_unique_id=main_screen, section_unique_id=item.get("section_unique_id") or "", screen_unique_id=item.get("screen_unique_id", ""), action_unique_id=item.get("action_unique_id", ""), sess_company_id=company_id) for item in permissions]
        if rows:
            UserPermission.objects.bulk_create(rows)
        return Response({"status": 1, "msg": "update" if request.data.get("unique_id") else "create"})


class UserPermissionDetailView(GenericAPIView):
    def get(self, request, user_type):
        try:
            label = UserType.objects.get(unique_id=user_type).user_type
        except Exception:
            label = user_type
        company_id = request_company_id(request)
        main_screens = sorted({item.main_screen_unique_id for item in UserPermission.objects.filter(is_delete=0, user_type=user_type, sess_company_id__in=["", company_id]) if item.main_screen_unique_id})
        return Response({"status": 1, "data": {"user_type": user_type, "user_type_label": label, "main_screens": main_screens}})

    def delete(self, request, user_type):
        UserPermission.objects.filter(user_type=user_type, sess_company_id=request_company_id(request)).delete()
        return Response({"status": 1, "msg": "success_delete"})
