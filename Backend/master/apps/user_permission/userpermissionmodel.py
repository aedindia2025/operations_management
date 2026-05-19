from django.db import models
import uuid


class UserPermission(models.Model):
    s_no = models.AutoField(primary_key=True)
    unique_id = models.CharField(max_length=50, unique=True)
    user_type = models.CharField(max_length=50)
    main_screen_unique_id = models.CharField(max_length=100)
    section_unique_id = models.CharField(max_length=100, blank=True, null=True)
    screen_unique_id = models.CharField(max_length=50)
    action_unique_id = models.CharField(max_length=50)
    sess_company_id = models.CharField(max_length=50, blank=True, default="")
    is_active = models.IntegerField(default=1)
    is_delete = models.IntegerField(default=0)
    created = models.DateTimeField(auto_now_add=True)
    updated = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "user_screen_permission"
        indexes = [
            models.Index(fields=["sess_company_id", "user_type"]),
        ]

    def __str__(self):
        return f"{self.user_type}:{self.screen_unique_id}:{self.action_unique_id}"

    def save(self, *args, **kwargs):
        if not self.unique_id:
            self.unique_id = uuid.uuid4().hex[:18]
        super().save(*args, **kwargs)
