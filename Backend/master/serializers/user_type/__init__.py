from rest_framework import serializers

from master.apps.user_type.usertypemodel import UserType


class UserTypeSerializer(serializers.ModelSerializer):
    class Meta:
        model = UserType
        fields = ["unique_id", "user_type", "under_user_type", "is_active"]


class UserTypeInputSerializer(serializers.Serializer):
    user_type = serializers.CharField(max_length=150)
    under_user_type = serializers.CharField(
        required=False, allow_blank=True, allow_null=True
    )
    is_active = serializers.ChoiceField(
        choices=[(1, "Active"), (0, "Inactive")], default=1
    )
