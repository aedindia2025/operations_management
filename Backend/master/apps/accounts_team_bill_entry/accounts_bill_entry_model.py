from django.db import models
import uuid

class AccountsTeamBillEntry(models.Model):
    unique_id = models.CharField(max_length=50, unique=True, editable=False)

    bill_no = models.CharField(max_length=100)
    invoice_no = models.CharField(max_length=255)
    vendor_name = models.CharField(max_length=255)

    invoice_qty = models.IntegerField(default=0)
    invoice_value = models.DecimalField(max_digits=12, decimal_places=2)

    cancel_invoice_no = models.TextField(blank=True, null=True)
    remaining_invoice_no = models.TextField(blank=True, null=True)

    reject_reason = models.TextField(blank=True, null=True)

    status = models.CharField(
        max_length=20,
        choices=[
            ("pending", "Pending"),
            ("approved", "Approved"),
            ("rejected", "Rejected"),
            ("cancelled", "Cancelled"),
        ],
        default="pending"
    )

    created_at = models.DateTimeField(auto_now_add=True)

    def save(self, *args, **kwargs):
        if not self.unique_id:
            self.unique_id = f"ATBE-{uuid.uuid4().hex[:8]}"
        super().save(*args, **kwargs)

    def __str__(self):
        return self.bill_no