from django.db import models
import uuid


class UserCreation(models.Model):
    s_no = models.AutoField(primary_key=True)
    unique_id = models.CharField(max_length=50, unique=True)
    staff_name = models.CharField(max_length=150)
    staff_id = models.CharField(max_length=100)
    user_type_unique_id = models.CharField(max_length=50)
    mobile_no = models.CharField(max_length=20)
    email_id = models.CharField(max_length=150)
    user_name = models.CharField(max_length=100)
    address = models.TextField(blank=True, null=True)
    password = models.CharField(max_length=255)
    en_password = models.CharField(max_length=255)
    sess_company_id = models.CharField(max_length=50, blank=True, default="")
    sess_branch_id = models.CharField(max_length=50, blank=True, default="")
    is_active = models.IntegerField(default=1)
    is_delete = models.IntegerField(default=0)
    created = models.DateTimeField(auto_now_add=True)
    updated = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "user"
        indexes = [
            models.Index(fields=["sess_company_id"]),
        ]

    def __str__(self):
        return self.user_name

    @property
    def is_authenticated(self):
        return True

    @property
    def is_anonymous(self):
        return False

    def save(self, *args, **kwargs):
        if not self.unique_id:
            self.unique_id = uuid.uuid4().hex[:18]
        super().save(*args, **kwargs)
