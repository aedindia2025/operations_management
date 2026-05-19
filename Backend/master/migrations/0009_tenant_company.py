from django.db import migrations, models

import master.apps.tenant.tenantmodel


class Migration(migrations.Migration):

    dependencies = [
        ("master", "0008_vendor_bill_creation"),
    ]

    operations = [
        migrations.CreateModel(
            name="TenantCompany",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("unique_id", models.CharField(default=master.apps.tenant.tenantmodel._uid, editable=False, max_length=50, unique=True)),
                ("company_code", models.CharField(max_length=50, unique=True)),
                ("company_name", models.CharField(max_length=255)),
                ("legal_name", models.CharField(blank=True, default="", max_length=255)),
                ("contact_name", models.CharField(blank=True, default="", max_length=150)),
                ("contact_email", models.CharField(blank=True, default="", max_length=150)),
                ("contact_no", models.CharField(blank=True, default="", max_length=20)),
                ("gst_no", models.CharField(blank=True, default="", max_length=30)),
                ("pan_no", models.CharField(blank=True, default="", max_length=30)),
                ("address", models.TextField(blank=True, default="")),
                ("subscription_plan", models.CharField(blank=True, default="standard", max_length=50)),
                ("subscription_status", models.CharField(blank=True, default="active", max_length=30)),
                ("is_active", models.IntegerField(default=1)),
                ("is_delete", models.IntegerField(default=0)),
                ("created", models.DateTimeField(auto_now_add=True)),
                ("updated", models.DateTimeField(auto_now=True)),
            ],
            options={"db_table": "tenant_company"},
        ),
        migrations.CreateModel(
            name="TenantBranch",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("unique_id", models.CharField(default=master.apps.tenant.tenantmodel._uid, editable=False, max_length=50, unique=True)),
                ("company_id", models.CharField(max_length=50)),
                ("branch_code", models.CharField(blank=True, default="", max_length=50)),
                ("branch_name", models.CharField(max_length=150)),
                ("contact_no", models.CharField(blank=True, default="", max_length=20)),
                ("address", models.TextField(blank=True, default="")),
                ("is_default", models.IntegerField(default=0)),
                ("is_active", models.IntegerField(default=1)),
                ("is_delete", models.IntegerField(default=0)),
                ("created", models.DateTimeField(auto_now_add=True)),
                ("updated", models.DateTimeField(auto_now=True)),
            ],
            options={"db_table": "tenant_branch"},
        ),
        migrations.AddField(
            model_name="usercreation",
            name="sess_branch_id",
            field=models.CharField(blank=True, default="", max_length=50),
        ),
        migrations.AddField(
            model_name="usercreation",
            name="sess_company_id",
            field=models.CharField(blank=True, default="", max_length=50),
        ),
        migrations.AddField(
            model_name="userpermission",
            name="sess_company_id",
            field=models.CharField(blank=True, default="", max_length=50),
        ),
        migrations.AddIndex(
            model_name="tenantbranch",
            index=models.Index(fields=["company_id"], name="tenant_bran_company_1d6acf_idx"),
        ),
        migrations.AddIndex(
            model_name="usercreation",
            index=models.Index(fields=["sess_company_id"], name="user_sess_co_670d88_idx"),
        ),
        migrations.AddIndex(
            model_name="userpermission",
            index=models.Index(fields=["sess_company_id", "user_type"], name="user_screen_company_4f0386_idx"),
        ),
    ]
