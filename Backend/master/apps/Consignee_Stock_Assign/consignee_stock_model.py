from django.db import models

class ConsigneeStock(models.Model):
    invoice_no = models.CharField(max_length=100)
    consignee_name = models.CharField(max_length=255)
    item_name = models.CharField(max_length=255)
    item_code = models.CharField(max_length=100)

    quantity = models.IntegerField()
    serial_numbers = models.TextField(blank=True, null=True)

    status = models.CharField(max_length=50, default="pending")

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.invoice_no