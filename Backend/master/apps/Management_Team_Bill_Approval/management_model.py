from django.db import models

class ManagementApproval(models.Model):
    bill_no = models.CharField(max_length=100)
    vendor_name = models.CharField(max_length=255)

    invoice_no = models.TextField()
    invoice_amount = models.FloatField()
    invoice_qty = models.IntegerField()

    approval_status = models.CharField(
        max_length=20,
        choices=[("pending", "Pending"), ("approved", "Approved"), ("rejected", "Rejected")],
        default="pending"
    )

    approved_by = models.CharField(max_length=255, blank=True, null=True)
    approved_at = models.DateTimeField(blank=True, null=True)

    reject_reason = models.TextField(blank=True, null=True)

    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.bill_no