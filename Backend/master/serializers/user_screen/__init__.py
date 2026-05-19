from django.db import connection
from rest_framework import serializers
from master.apps.user_screen.userscreenmodel import UserScreen


def fetch_label(table_name: str, column_name: str, unique_id: str):
    if not unique_id:
        return ""
    queries = [
        (f"SELECT {column_name} FROM {table_name} WHERE unique_id = %s AND is_delete = 0", [unique_id]),
        (f"SELECT {column_name} FROM {table_name} WHERE unique_id = %s", [unique_id]),
    ]
    for sql, params in queries:
        try:
            with connection.cursor() as cursor:
                cursor.execute(sql, params)
                row = cursor.fetchone()
                if row:
                    return row[0]
        except Exception:
            continue
    return unique_id


class UserScreenSerializer(serializers.ModelSerializer):
    action_list = serializers.SerializerMethodField()
    main_screen_display = serializers.SerializerMethodField()
    screen_section_display = serializers.SerializerMethodField()

    class Meta:
        model = UserScreen
        fields = [
            "unique_id", "main_screen_unique_id", "screen_section_unique_id", "screen_name",
            "folder_name", "actions", "action_list", "icon_name", "order_no", "is_active",
            "description", "dashboard_setting_menu", "main_screen_display", "screen_section_display"
        ]

    def get_action_list(self, obj):
        return [item for item in (obj.actions or "").split(",") if item]

    def get_main_screen_display(self, obj):
        return fetch_label("user_screen_main", "screen_main_name", obj.main_screen_unique_id)

    def get_screen_section_display(self, obj):
        return fetch_label("user_screen_sections", "section_name", obj.screen_section_unique_id)


class UserScreenInputSerializer(serializers.Serializer):
    main_screen_unique_id = serializers.CharField(max_length=100)
    screen_section_unique_id = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    screen_name = serializers.CharField(max_length=150)
    folder_name = serializers.CharField(max_length=150)
    actions = serializers.ListField(child=serializers.CharField(max_length=50), required=False)
    icon_name = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    order_no = serializers.IntegerField()
    is_active = serializers.ChoiceField(choices=[(1, "Active"), (0, "Inactive")], default=1)
    description = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    dashboard_setting_menu = serializers.CharField(required=False, allow_blank=True, allow_null=True)
