from rest_framework import serializers


class UserPermissionSaveSerializer(serializers.Serializer):
    user_type = serializers.CharField(max_length=50)
    main_screen_unique_id = serializers.CharField(max_length=100)
    sess_company_id = serializers.CharField(max_length=50, required=False, allow_blank=True)
    permissions = serializers.ListField(child=serializers.DictField(), required=False)
