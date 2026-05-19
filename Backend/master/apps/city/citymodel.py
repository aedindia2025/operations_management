import uuid
from django.db import models
 
 
class CityCreation(models.Model):
    unique_id = models.CharField(max_length=50, unique=True, default=uuid.uuid4, editable=False)
    state_name = models.CharField(max_length=100)           # FK unique_id of state_creation
    district_name = models.CharField(max_length=100)        # FK unique_id of district_creation
    city_name = models.CharField(max_length=255)
    description = models.TextField(blank=True, null=True)
    is_active = models.IntegerField(default=1)              # 1 = Active, 0 = Inactive
    is_delete = models.IntegerField(default=0)              # 0 = Not Deleted, 1 = Deleted
    updated = models.DateTimeField(auto_now=True)
    created = models.DateTimeField(auto_now_add=True)
    acc_year = models.CharField(max_length=50, blank=True, default="")
    session_id = models.CharField(max_length=50, blank=True, default="")
    sess_user_type = models.CharField(max_length=50, blank=True, default="")
    sess_user_id = models.CharField(max_length=50, blank=True, default="")
    sess_company_id = models.CharField(max_length=50, blank=True, default="")
    sess_branch_id = models.CharField(max_length=50, blank=True, default="")
 
    class Meta:
        db_table = 'city_creation'
 
    def __str__(self):
        return self.city_name
 
