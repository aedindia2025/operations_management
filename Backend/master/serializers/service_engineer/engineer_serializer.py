from rest_framework import serializers
from master.apps.service_engineer.engineermodel import EngineerNameCreation


class EngineerNameCreationSerializer(serializers.ModelSerializer):

    engineer_name_display = serializers.SerializerMethodField()
    emp_id_display        = serializers.SerializerMethodField()
    is_active_display     = serializers.SerializerMethodField()

    class Meta:
        model  = EngineerNameCreation
        fields = [
            'unique_id',
            'engineer_name',
            'emp_id',
            'is_active',
            'is_delete',
            'engineer_name_display',
            'emp_id_display',
            'is_active_display',
        ]
        read_only_fields = ['unique_id']

    # ── Display helpers ──────────────────────────────────────── #
    def get_engineer_name_display(self, obj):
        try:
            from master.apps.user.usermodel import UserCreation
            user = UserCreation.objects.get(unique_id=obj.engineer_name)
            return user.staff_name
        except Exception:
            return obj.engineer_name

    def get_emp_id_display(self, obj):
        try:
            from master.apps.user.usermodel import UserCreation
            user = UserCreation.objects.get(unique_id=obj.emp_id)
            return user.staff_id
        except Exception:
            return obj.emp_id

    def get_is_active_display(self, obj):
        return "Active" if obj.is_active == 1 else "Inactive"

    # ── Duplicate engineer_name check ────────────────────────── #
    def validate(self, data):
        engineer_name = data.get('engineer_name', '')
        unique_id     = self.instance.unique_id if self.instance else None

        qs = EngineerNameCreation.objects.filter(
            engineer_name=engineer_name,
            is_delete=0
        )
        if unique_id:
            qs = qs.exclude(unique_id=unique_id)

        if qs.exists():
            raise serializers.ValidationError({
                "engineer_name": "Engineer name already exists."
            })
        return data