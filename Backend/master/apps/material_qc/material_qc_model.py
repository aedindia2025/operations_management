import uuid

from django.db import models


def _uid():
    return uuid.uuid4().hex[:18]


class MaterialQC(models.Model):
    id = models.AutoField(primary_key=True)
    unique_id = models.CharField(max_length=50, unique=True, default=_uid, editable=False)
    status = models.IntegerField(default=0)
    is_active = models.IntegerField(default=1)
    is_delete = models.IntegerField(default=0)
    created_at = models.DateTimeField(db_column="created", auto_now_add=True)
    updated_at = models.DateTimeField(db_column="updated", auto_now=True)

    class Meta:
        db_table = "material_qc"
        managed = False

    def __str__(self):
        return self.unique_id
