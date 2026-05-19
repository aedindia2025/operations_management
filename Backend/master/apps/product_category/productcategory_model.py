from django.db import models

class ProductCategory(models.Model):
    unique_id = models.AutoField(primary_key=True)

    category_name = models.CharField(max_length=255)
    description = models.TextField(blank=True, null=True)

    is_active = models.IntegerField(default=1)
    is_delete = models.IntegerField(default=0)

    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.category_name