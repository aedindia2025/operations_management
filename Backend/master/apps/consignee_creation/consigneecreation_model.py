from django.db import models


class ConsigneeCreation(models.Model):
    consignee_address       = models.CharField(max_length=500)
    consignee_district      = models.CharField(max_length=100)   # FK → district_creation.unique_id
    consignee_pincode       = models.CharField(max_length=6)
    consignee_contactnumber = models.CharField(max_length=10)
    is_active               = models.IntegerField(default=1)
    is_delete               = models.IntegerField(default=0)
    unique_id               = models.CharField(max_length=100, unique=True)
    created_at              = models.DateTimeField(db_column="created", auto_now_add=True)
    updated_at              = models.DateTimeField(db_column="updated", auto_now=True)
    acc_year                = models.CharField(max_length=50, blank=True, null=True)
    session_id              = models.CharField(max_length=50, blank=True, null=True)
    sess_user_type          = models.CharField(max_length=50, blank=True, null=True)
    sess_user_id            = models.CharField(max_length=50, blank=True, null=True)
    sess_company_id         = models.CharField(max_length=50, blank=True, null=True)
    sess_branch_id          = models.CharField(max_length=50, blank=True, null=True)

    class Meta:
        db_table = "consignee_creation"

    def __str__(self):
        return self.consignee_address
