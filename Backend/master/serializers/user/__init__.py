from rest_framework import serializers
from master.apps.user.usermodel import UserCreation
from master.apps.user_type.usertypemodel import UserType


class UserCreationSerializer(serializers.ModelSerializer):
    user_type_display = serializers.SerializerMethodField()

    class Meta:
        model = UserCreation
        fields = [
            "unique_id", "staff_name", "staff_id", "user_type_unique_id", "mobile_no",
            "email_id", "user_name", "address", "password", "is_active", "user_type_display",
            "sess_company_id", "sess_branch_id"
        ]

    def get_user_type_display(self, obj):
        try:
            return UserType.objects.get(unique_id=obj.user_type_unique_id).user_type
        except Exception:
            return obj.user_type_unique_id


class UserCreationInputSerializer(serializers.Serializer):
    staff_name = serializers.CharField(max_length=150)
    staff_id = serializers.CharField(max_length=100)
    user_type_unique_id = serializers.CharField(max_length=50)
    mobile_no = serializers.CharField(max_length=20)
    email_id = serializers.CharField(max_length=150)
    user_name = serializers.CharField(max_length=100)
    password = serializers.CharField(max_length=255)
    address = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    is_active = serializers.ChoiceField(choices=[(1, "Active"), (0, "Inactive")], default=1)
