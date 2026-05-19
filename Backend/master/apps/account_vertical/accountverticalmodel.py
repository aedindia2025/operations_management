from django.db import models
import uuid


class AccountVertical(models.Model):
    unique_id      = models.CharField(max_length=50, unique=True)
    account_name   = models.CharField(max_length=100)
    is_active      = models.IntegerField(default=1)
    is_delete      = models.CharField(max_length=100, default='0')
    acc_year       = models.CharField(max_length=10,  blank=True, null=True)
    updated        = models.DateTimeField(blank=True, null=True)
    created        = models.DateTimeField(blank=True, null=True)
    session_id     = models.CharField(max_length=50,  default='')
    sess_user_type = models.CharField(max_length=50,  default='')
    sess_user_id   = models.CharField(max_length=50,  default='')
    sess_company_id= models.CharField(max_length=50,  default='')
    sess_branch_id = models.CharField(max_length=50,  default='')

    class Meta:
        db_table = 'account_vertical'

    def __str__(self):
        return self.account_name

    def save(self, *args, **kwargs):
        if not self.unique_id:
            self.unique_id = uuid.uuid4().hex[:18]
        super().save(*args, **kwargs)