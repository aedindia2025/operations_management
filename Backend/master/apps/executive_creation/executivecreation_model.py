from django.db import models


class ExecutiveName(models.Model):
    s_no = models.AutoField(primary_key=True)
    under_user_type = models.TextField(default="69b0115ced3bd96390")
    executive_name = models.CharField(max_length=150)
    is_active = models.IntegerField(default=1)
    is_delete = models.IntegerField(default=0)
    unique_id = models.CharField(max_length=50, unique=True)
    created_at = models.DateTimeField(db_column="created", auto_now_add=True)
    updated_at = models.DateTimeField(db_column="updated", auto_now=True)
    acc_year = models.CharField(max_length=50, blank=True, null=True)
    session_id = models.CharField(max_length=50, blank=True, null=True)
    sess_user_type = models.CharField(max_length=50, blank=True, null=True)
    sess_user_id = models.CharField(max_length=50, blank=True, null=True)
    sess_company_id = models.CharField(max_length=50, blank=True, null=True)
    sess_branch_id = models.CharField(max_length=50, blank=True, null=True)

    class Meta:
        db_table = "executive_name"

    def __str__(self):
        return self.executive_name


class ExecutiveUser(models.Model):
    s_no = models.AutoField(primary_key=True)
    staff_name = models.CharField(max_length=100)
    staff_id = models.CharField(max_length=100)
    user_name = models.CharField(max_length=255, blank=True, null=True)
    password = models.CharField(max_length=150)
    en_password = models.CharField(max_length=50)
    email_id = models.CharField(max_length=50)
    mobile_no = models.CharField(max_length=15)
    is_active = models.IntegerField(default=1)
    is_delete = models.IntegerField(default=0)
    user_type_unique_id = models.CharField(max_length=100, default='69b0115ced3bd96390')
    unique_id = models.CharField(max_length=100, unique=True)
    created_at = models.DateTimeField(db_column="created", auto_now_add=True)
    updated_at = models.DateTimeField(db_column="updated", auto_now=True)

    class Meta:
        db_table = "user"
        managed = False

    def __str__(self):
        return self.user_name
