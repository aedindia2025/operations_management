import uuid
from django.db import models


class PincodeCreation(models.Model):
    unique_id = models.CharField(max_length=50, unique=True, default=uuid.uuid4, editable=False)
    state_name = models.CharField(max_length=100)
    district_name = models.CharField(max_length=100)
    city_name = models.CharField(max_length=100)
    pincode = models.CharField(max_length=6)
    is_active = models.IntegerField(default=1)
    is_delete = models.IntegerField(default=0)
    updated = models.DateTimeField(auto_now=True)
    created = models.DateTimeField(auto_now_add=True)
    acc_year = models.CharField(max_length=50, blank=True, default="")
    session_id = models.CharField(max_length=50, blank=True, default="")
    sess_user_type = models.CharField(max_length=50, blank=True, default="")
    sess_user_id = models.CharField(max_length=50, blank=True, default="")
    sess_company_id = models.CharField(max_length=50, blank=True, default="")
    sess_branch_id = models.CharField(max_length=50, blank=True, default="")

    class Meta:
        db_table = "pincode_creation"

    def __str__(self):
        return self.pincode
