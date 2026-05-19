import hashlib
import re
from rest_framework import serializers

from master.apps.executive_creation.executivecreation_model import ExecutiveName, ExecutiveUser


# ────────────────────────────────────────────────────────────────────── #
#  Executive Name Serializer (executive_name table)                      #
# ────────────────────────────────────────────────────────────────────── #
class ExecutiveNameSerializer(serializers.ModelSerializer):

    is_active_display = serializers.SerializerMethodField()

    class Meta:
        model  = ExecutiveName
        fields = [
            "s_no",
            "executive_name",
            "under_user_type",
            "is_active",
            "is_active_display",
            "unique_id",
        ]

    def get_is_active_display(self, obj):
        return "Active" if obj.is_active == 1 else "Inactive"

    def validate_executive_name(self, value):
        value = value.strip()
        if not re.fullmatch(r"[A-Za-z ]+", value):
            raise serializers.ValidationError("Executive Name allows only alphabets.")
        unique_id = self.instance.unique_id if self.instance else None
        qs = ExecutiveName.objects.filter(
            executive_name__iexact=value,
            is_delete=0,
        )
        if unique_id:
            qs = qs.exclude(unique_id=unique_id)
        if qs.exists():
            raise serializers.ValidationError("Executive name already exists.")
        return value


# ────────────────────────────────────────────────────────────────────── #
#  Combined Create/Update Serializer (both tables together)              #
# ────────────────────────────────────────────────────────────────────── #
class ExecutiveCreationSerializer(serializers.Serializer):
    # executive_name table fields
    executive_name   = serializers.CharField(max_length=255)
    is_active        = serializers.IntegerField(default=1)

    # user table fields
    user_name        = serializers.CharField(max_length=255)
    email_id         = serializers.EmailField()
    mobile_no        = serializers.CharField(max_length=10, min_length=10)
    password         = serializers.CharField(max_length=255, write_only=True)
    confirm_password = serializers.CharField(max_length=255, write_only=True)

    def validate(self, data):
        if data.get("password") != data.get("confirm_password"):
            raise serializers.ValidationError({"confirm_password": "Password and Confirm Password must match."})
        return data

    def validate_executive_name(self, value):
        value = value.strip()
        if not re.fullmatch(r"[A-Za-z ]+", value):
            raise serializers.ValidationError("Executive Name allows only alphabets.")
        unique_id = self.context.get("unique_id")
        qs = ExecutiveName.objects.filter(
            executive_name__iexact=value,
            is_delete=0,
        )
        if unique_id:
            qs = qs.exclude(unique_id=unique_id)
        if qs.exists():
            raise serializers.ValidationError("Executive name already exists.")
        return value

    def validate_user_name(self, value):
        value = value.strip()
        if not re.fullmatch(r"[A-Za-z ]+", value):
            raise serializers.ValidationError("User Name allows only alphabets.")
        return value

    def validate_mobile_no(self, value):
        value = value.strip()
        if not re.fullmatch(r"[6-9]\d{9}", value):
            raise serializers.ValidationError("Mobile number must be 10 digits and start with 6, 7, 8, or 9.")
        return value


# ────────────────────────────────────────────────────────────────────── #
#  Read Serializer — list / retrieve (joins both tables)                 #
# ────────────────────────────────────────────────────────────────────── #
class ExecutiveReadSerializer(serializers.ModelSerializer):

    is_active_display = serializers.SerializerMethodField()

    # user table fields joined via unique_id
    user_name  = serializers.SerializerMethodField()
    email_id   = serializers.SerializerMethodField()
    mobile_no  = serializers.SerializerMethodField()

    class Meta:
        model  = ExecutiveName
        fields = [
            "s_no",
            "executive_name",
            "is_active",
            "is_active_display",
            "unique_id",
            "user_name",
            "email_id",
            "mobile_no",
        ]

    def get_is_active_display(self, obj):
        return "Active" if obj.is_active == 1 else "Inactive"

    def _get_user(self, obj):
        user = (
            ExecutiveUser.objects
            .filter(unique_id=obj.unique_id, is_delete=0)
            .order_by("-s_no")
            .first()
        )
        if user:
            return user

        return (
            ExecutiveUser.objects
            .filter(
                staff_name=obj.executive_name,
                user_type_unique_id='69b0115ced3bd96390',
                is_delete=0,
            )
            .order_by("-s_no")
            .first()
        )

    def get_user_name(self, obj):
        user = self._get_user(obj)
        return user.user_name if user else ""

    def get_email_id(self, obj):
        user = self._get_user(obj)
        return user.email_id if user else ""

    def get_mobile_no(self, obj):
        user = self._get_user(obj)
        return user.mobile_no if user else ""
