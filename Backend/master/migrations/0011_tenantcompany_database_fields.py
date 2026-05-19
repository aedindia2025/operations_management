from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("master", "0010_billsubmissionform_billsubmissionmaintable_and_more"),
    ]

    operations = [
        migrations.AddField(
            model_name="tenantcompany",
            name="db_name",
            field=models.CharField(blank=True, default="", max_length=100),
        ),
        migrations.AddField(
            model_name="tenantcompany",
            name="db_host",
            field=models.CharField(blank=True, default="", max_length=150),
        ),
        migrations.AddField(
            model_name="tenantcompany",
            name="db_port",
            field=models.CharField(blank=True, default="", max_length=10),
        ),
        migrations.AddField(
            model_name="tenantcompany",
            name="db_user",
            field=models.CharField(blank=True, default="", max_length=100),
        ),
        migrations.AddField(
            model_name="tenantcompany",
            name="db_password",
            field=models.CharField(blank=True, default="", max_length=255),
        ),
    ]
