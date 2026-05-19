from django.db import models
import uuid


class DistrictCreation(models.Model):
    unique_id     = models.CharField(max_length=50, unique=True)
    district_name = models.CharField(max_length=100)
    state_name    = models.CharField(max_length=50)   # stores state unique_id (FK by value)
    is_active     = models.IntegerField(default=1)
    is_delete     = models.IntegerField(default=0)

    class Meta:
        db_table = 'district_creation'

    def __str__(self):
        return self.district_name

    def save(self, *args, **kwargs):
        if not self.unique_id:
            self.unique_id = uuid.uuid4().hex[:18]
        super().save(*args, **kwargs)