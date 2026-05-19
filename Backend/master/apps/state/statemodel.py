from django.db import models
import uuid

class StateCreation(models.Model):
    unique_id  = models.CharField(max_length=50, unique=True)
    state_name = models.CharField(max_length=100)
    short_name = models.CharField(max_length=20, blank=True, null=True)
    is_active  = models.IntegerField(default=1)
    is_delete  = models.IntegerField(default=0)

    class Meta:
        db_table = 'state_creation'

    def __str__(self):
        return self.state_name

    def save(self, *args, **kwargs):
        if not self.unique_id:
            self.unique_id = uuid.uuid4().hex[:18]
        super().save(*args, **kwargs)