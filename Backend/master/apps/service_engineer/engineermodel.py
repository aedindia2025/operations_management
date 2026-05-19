import uuid
from django.db import models


class EngineerNameCreation(models.Model):
    unique_id     = models.CharField(max_length=100, unique=True, default=uuid.uuid4, editable=False)
    engineer_name = models.CharField(max_length=100)   # FK unique_id of user
    emp_id        = models.CharField(max_length=100)   # FK unique_id of user (staff_id)
    cate_type     = models.IntegerField(default=1)
    is_active     = models.IntegerField(default=1)     # 1=Active 0=Inactive
    is_delete     = models.IntegerField(default=0)     # 0=Not Deleted 1=Deleted
    updated_at    = models.DateTimeField(db_column="updated", auto_now=True)
    created_at    = models.DateTimeField(db_column="created", auto_now_add=True)
    acc_year      = models.CharField(max_length=50, blank=True, default="")
    session_id    = models.CharField(max_length=50, blank=True, default="")
    sess_user_type = models.CharField(max_length=50, blank=True, default="")
    sess_user_id   = models.CharField(max_length=50, blank=True, default="")
    sess_company_id = models.CharField(max_length=50, blank=True, default="")
    sess_branch_id  = models.CharField(max_length=50, blank=True, default="")

    class Meta:
        db_table = 'engineer_name_creation'

    def __str__(self):
        return self.unique_id
