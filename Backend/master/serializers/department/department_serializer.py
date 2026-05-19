from rest_framework import serializers
from master.apps.department.departmentmodel import DepartmentCreation, DepartmentCreationSublist


# ============================================================ #
#  Sublist Serializer                                          #
# ============================================================ #
class DepartmentSublistSerializer(serializers.ModelSerializer):

    class Meta:
        model  = DepartmentCreationSublist
        fields = [
            'unique_id',
            'form_main_unique_id',
            'ledger_name',
            'ledger_no',
        ]
        read_only_fields = ['unique_id']
        extra_kwargs = {
            'acc_sector': {'required': False, 'allow_blank': True},
            'department': {'required': False, 'allow_blank': True},
            'description': {'required': False, 'allow_blank': True, 'allow_null': True},
            'ledger_name': {'required': False, 'allow_blank': True, 'allow_null': True},
            'ledger_no': {'required': False, 'allow_blank': True, 'allow_null': True},
        }


# ============================================================ #
#  Department Serializer                                       #
# ============================================================ #
class DepartmentCreationSerializer(serializers.ModelSerializer):

    acc_sector_display = serializers.SerializerMethodField()
    is_active_display  = serializers.SerializerMethodField()

    class Meta:
        model  = DepartmentCreation
        fields = [
            'unique_id',
            'acc_sector',
            'department',
            'description',
            'ledger_name',
            'ledger_no',
            'is_active',
            'is_delete',
            'acc_sector_display',
            'is_active_display',
        ]
        read_only_fields = ['unique_id']

    # ── Display helpers ─────────────────────────────────────── #
    def get_acc_sector_display(self, obj):
        try:
            from master.apps.account_sector.accountsectormodel import AccountSector
            sector = (
                AccountSector.objects
                .filter(unique_id=obj.acc_sector, is_delete='0')
                .order_by('-id')
                .first()
            )
            return sector.sector_name if sector else obj.acc_sector
        except Exception:
            return obj.acc_sector

    def get_is_active_display(self, obj):
        return "Active" if obj.is_active == 1 else "Inactive"

    # ── Validation: duplicate department name check ──────────── #
    def validate_department(self, value):
        if not str(value or "").strip():
            return value
        unique_id = self.instance.unique_id if self.instance else None
        qs = DepartmentCreation.objects.filter(
            department__iexact=value,
            is_delete=0
        )
        if unique_id:
            qs = qs.exclude(unique_id=unique_id)
        if qs.exists():
            raise serializers.ValidationError("Department name already exists.")
        return value
