from django.db import models
import uuid


class UserScreen(models.Model):
    s_no = models.AutoField(primary_key=True)
    unique_id = models.CharField(max_length=50, unique=True)
    main_screen_unique_id = models.CharField(max_length=100)
    screen_section_unique_id = models.CharField(max_length=100, blank=True, null=True)
    screen_name = models.CharField(max_length=150)
    folder_name = models.CharField(max_length=150)
    actions = models.TextField(blank=True, null=True)
    icon_name = models.CharField(max_length=150, blank=True, null=True)
    order_no = models.IntegerField(default=0)
    is_active = models.IntegerField(default=1)
    is_delete = models.IntegerField(default=0)
    description = models.TextField(blank=True, null=True)
    dashboard_setting_menu = models.CharField(max_length=50, blank=True, null=True)
    created = models.DateTimeField(auto_now_add=True)
    updated = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "user_screen"

    def __str__(self):
        return self.screen_name

    def save(self, *args, **kwargs):
        if not self.unique_id:
            self.unique_id = uuid.uuid4().hex[:18]
        super().save(*args, **kwargs)
