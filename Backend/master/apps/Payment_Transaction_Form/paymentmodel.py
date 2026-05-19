from django.db import models

class PaymentTransaction(models.Model):
    bill_no = models.CharField(max_length=100)
    invoice_no = models.TextField()
    invoice_val = models.FloatField()
    invoice_qty = models.IntegerField()

    reject_reason = models.TextField(blank=True, null=True)
    cancel_invoice_no = models.TextField(blank=True, null=True)
    remaining_invoice_no = models.TextField(blank=True, null=True)

    status = models.IntegerField(default=1)  # active / processed
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.bill_no