import uuid
from django.db import models
from django.db.models import Max


def generate_unique_id():
    return uuid.uuid4().hex[:18]


class DepartmentCreation(models.Model):
    id = models.IntegerField(primary_key=True)
    unique_id    = models.CharField(max_length=100, unique=True, default=generate_unique_id, editable=False)
    acc_sector   = models.CharField(max_length=100, blank=True)
    department   = models.CharField(max_length=255)
    description  = models.TextField(blank=True, null=True)
    ledger_name  = models.CharField(max_length=255, blank=True, null=True)
    ledger_no    = models.CharField(max_length=100, blank=True, null=True)
    empty = models.CharField(max_length=250, blank=True, null=True)
    is_active    = models.IntegerField(default=1)
    is_delete    = models.IntegerField(default=0)
    created_at   = models.DateTimeField(db_column="created", auto_now_add=True)
    updated_at   = models.DateTimeField(db_column="updated", auto_now=True)
    acc_year = models.CharField(max_length=50, blank=True, null=True)
    session_id = models.CharField(max_length=50, blank=True, null=True)
    sess_user_type = models.CharField(max_length=50, blank=True, null=True)
    sess_user_id = models.CharField(max_length=50, blank=True, null=True)
    sess_company_id = models.CharField(max_length=50, blank=True, null=True)
    sess_branch_id = models.CharField(max_length=50, blank=True, null=True)

    class Meta:
        db_table = 'department_creation'

    def __str__(self):
        return self.department

    def save(self, *args, **kwargs):
        if self.id in (None, 0, ""):
            max_id = DepartmentCreation.objects.aggregate(max_id=Max("id")).get("max_id") or 0
            self.id = max_id + 1
        if not self.unique_id:
            self.unique_id = generate_unique_id()
        super().save(*args, **kwargs)


class DepartmentCreationSublist(models.Model):
    id = models.IntegerField(primary_key=True)
    unique_id           = models.CharField(max_length=100, unique=True, default=generate_unique_id, editable=False)
    form_main_unique_id = models.CharField(max_length=100)
    ledger_name         = models.CharField(max_length=255, blank=True, null=True)
    ledger_no           = models.CharField(max_length=100, blank=True, null=True)
    is_active = models.IntegerField(default=1)
    is_delete           = models.IntegerField(default=0)
    created_at          = models.DateTimeField(db_column="created", auto_now_add=True)
    updated_at          = models.DateTimeField(db_column="updated", auto_now=True)
    acc_year = models.CharField(max_length=50, blank=True, null=True)
    session_id = models.CharField(max_length=50, blank=True, null=True)
    sess_user_type = models.CharField(max_length=50, blank=True, null=True)
    sess_user_id = models.CharField(max_length=50, blank=True, null=True)
    sess_company_id = models.CharField(max_length=50, blank=True, null=True)
    sess_branch_id = models.CharField(max_length=50, blank=True, null=True)

    class Meta:
        db_table = 'department_creation_sublist'

    def __str__(self):
        return self.ledger_name or self.unique_id

    def save(self, *args, **kwargs):
        if self.id in (None, 0, ""):
            max_id = DepartmentCreationSublist.objects.aggregate(max_id=Max("id")).get("max_id") or 0
            self.id = max_id + 1
        if not self.unique_id:
            self.unique_id = generate_unique_id()
        super().save(*args, **kwargs)
