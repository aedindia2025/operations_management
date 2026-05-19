from django.db import models


class MainCategory(models.Model):
    id = models.AutoField(primary_key=True)
    main_category = models.CharField(max_length=255)
    description   = models.TextField(blank=True, null=True)
    is_active     = models.IntegerField(default=1)
    is_delete     = models.IntegerField(default=0)
    unique_id     = models.CharField(max_length=100, unique=True)
    created_at    = models.DateTimeField(db_column="created", auto_now_add=True)
    updated_at    = models.DateTimeField(db_column="updated", auto_now=True)
    acc_year = models.CharField(max_length=50, blank=True, null=True)
    session_id = models.CharField(max_length=50, blank=True, null=True)
    sess_user_type = models.CharField(max_length=50, blank=True, null=True)
    sess_user_id = models.CharField(max_length=50, blank=True, null=True)
    sess_company_id = models.CharField(max_length=50, blank=True, null=True)
    sess_branch_id = models.CharField(max_length=50, blank=True, null=True)

    class Meta:
        db_table = "main_category"

    def __str__(self):
        return self.main_category
