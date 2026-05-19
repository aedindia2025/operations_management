from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("master", "0007_user_admin_modules"),
    ]

    operations = [
        migrations.CreateModel(
            name="VendorBillCreation",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("unique_id", models.CharField(max_length=50, unique=True)),
                ("name", models.CharField(max_length=150)),
                ("is_active", models.IntegerField(default=1)),
                ("is_delete", models.CharField(default="0", max_length=10)),
                ("created_at", models.DateTimeField(auto_now_add=True, null=True)),
                ("updated_at", models.DateTimeField(auto_now=True, null=True)),
            ],
            options={"db_table": "vendor_bill_creation"},
        ),
    ]
