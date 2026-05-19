from django.db import models
import uuid


class UserType(models.Model):
    s_no = models.AutoField(primary_key=True)
    unique_id = models.CharField(max_length=50, unique=True)
    user_type = models.CharField(max_length=150)
    under_user_type = models.TextField(blank=True, null=True)
    is_active = models.IntegerField(default=1)
    is_delete = models.IntegerField(default=0)
    updated = models.DateTimeField(auto_now=True)
    created = models.DateTimeField(auto_now_add=True)
    acc_year = models.CharField(max_length=50, blank=True, null=True)
    session_id = models.CharField(max_length=50, blank=True, null=True)
    sess_user_type = models.CharField(max_length=50, blank=True, null=True)
    sess_user_id = models.CharField(max_length=50, blank=True, null=True)
    sess_company_id = models.CharField(max_length=50, blank=True, null=True)
    sess_branch_id = models.CharField(max_length=50, blank=True, null=True)

    class Meta:
        db_table = "user_type"

    def __str__(self):
        return self.user_type

    def save(self, *args, **kwargs):
        if not self.unique_id:
            self.unique_id = uuid.uuid4().hex[:18]
        super().save(*args, **kwargs)
