from django.db import models


class InsuranceType(models.Model):
    id = models.AutoField(primary_key=True)
    unique_id = models.CharField(max_length=50, unique=True)
    insurance_name = models.CharField(max_length=100, db_column="insurence_type")
    is_active = models.IntegerField(default=1)
    is_delete = models.CharField(max_length=100, default="0", blank=True, null=True)
    acc_year = models.CharField(max_length=10, blank=True, null=True)
    updated_at = models.DateTimeField(db_column="updated", blank=True, null=True)
    created_at = models.DateTimeField(db_column="created", blank=True, null=True)
    session_id = models.CharField(max_length=50, blank=True, null=True)
    sess_user_type = models.CharField(max_length=50, blank=True, null=True)
    sess_user_id = models.CharField(max_length=50, blank=True, null=True)
    sess_company_id = models.CharField(max_length=50, blank=True, null=True)
    sess_branch_id = models.CharField(max_length=50, blank=True, null=True)

    class Meta:
        db_table = "insurence_type"

    def __str__(self):
        return self.insurance_name
