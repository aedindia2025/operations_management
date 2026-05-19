from django.db import models
import uuid


class Courier(models.Model):
    unique_id = models.CharField(max_length=100, unique=True, default=uuid.uuid4, editable=False)
    courier_name = models.CharField(max_length=255)
    is_active = models.IntegerField(default=1)
    is_delete = models.IntegerField(default=0)
    acc_year = models.CharField(max_length=50, blank=True, null=True)
    updated_at = models.DateTimeField(db_column="updated", auto_now=True)
    created_at = models.DateTimeField(db_column="created", auto_now_add=True)
    session_id = models.CharField(max_length=50, blank=True, null=True)
    sess_user_type = models.CharField(max_length=50, blank=True, null=True)
    sess_user_id = models.CharField(max_length=50, blank=True, null=True)
    sess_company_id = models.CharField(max_length=50, blank=True, null=True)
    sess_branch_id = models.CharField(max_length=50, blank=True, null=True)

    class Meta:
        db_table = "courier_creation"

    def __str__(self):
        return self.courier_name
