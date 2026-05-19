from django.db import models
import uuid

class AccountsTeamBillApproval(models.Model):
    unique_id = models.CharField(max_length=50, unique=True, editable=False)

    bill_no = models.CharField(max_length=100)
    vendor_name = models.CharField(max_length=255)
    amount = models.DecimalField(max_digits=10, decimal_places=2)

    status = models.CharField(
        max_length=20,
        choices=[
            ("pending", "Pending"),
            ("approved", "Approved"),
            ("rejected", "Rejected"),
        ],
        default="pending"
    )

    remarks = models.TextField(blank=True, null=True)

    created_at = models.DateTimeField(auto_now_add=True)

    def save(self, *args, **kwargs):
        if not self.unique_id:
            self.unique_id = f"ATB-{uuid.uuid4().hex[:8]}"
        super().save(*args, **kwargs)

    def __str__(self):
        return self.bill_no