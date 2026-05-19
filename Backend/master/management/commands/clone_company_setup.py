import uuid
from importlib import import_module

from django.apps import apps
from django.core.management.base import BaseCommand, CommandError
from django.db import transaction


DEFAULT_SETUP_TABLES = [
    ("master", "UserType"),
    ("master", "UserPermission"),
    ("master", "DepartmentCreation"),
    ("master", "DepartmentCreationSublist"),
    ("master", "AccountSector"),
    ("master", "AccountVertical"),
    ("master", "MainCategory"),
    ("master", "UnitCreation"),
    ("master", "InsuranceType"),
    ("master", "Courier"),
    ("master", "EngineerNameCreation"),
    ("master", "ItemCreation"),
    ("master", "ItemCreationSub"),
]

MODEL_MODULES = {
    "AccountSector": "master.apps.account_sector.accountsectormodel",
    "AccountVertical": "master.apps.account_vertical.accountverticalmodel",
    "Courier": "master.apps.courier.couriermodels",
    "DepartmentCreation": "master.apps.department.departmentmodel",
    "DepartmentCreationSublist": "master.apps.department.departmentmodel",
    "EngineerNameCreation": "master.apps.service_engineer.engineermodel",
    "InsuranceType": "master.apps.insurance_type.insurance_type_models",
    "ItemCreation": "master.apps.item_creation.itemcreationmodel",
    "ItemCreationSub": "master.apps.item_creation.itemcreationmodel",
    "MainCategory": "master.apps.main_category.maincategory_model",
    "UnitCreation": "master.apps.unit_creation.unitcreation_model",
    "UserPermission": "master.apps.user_permission.userpermissionmodel",
    "UserType": "master.apps.user_type.usertypemodel",
}


def new_unique_id():
    return uuid.uuid4().hex[:18]


class Command(BaseCommand):
    help = "Clone tenant setup/master data from one company to another."

    def add_arguments(self, parser):
        parser.add_argument("--source-company", required=True)
        parser.add_argument("--target-company", required=True)
        parser.add_argument(
            "--table",
            action="append",
            default=[],
            help="Optional app_label.ModelName to clone. Can be repeated.",
        )
        parser.add_argument("--dry-run", action="store_true")

    def handle(self, *args, **options):
        source_company = options["source_company"].strip()
        target_company = options["target_company"].strip()
        if not source_company or not target_company:
            raise CommandError("Both source and target company IDs are required.")
        if source_company == target_company:
            raise CommandError("Source and target company IDs must be different.")

        table_specs = options["table"] or [f"{app_label}.{model_name}" for app_label, model_name in DEFAULT_SETUP_TABLES]
        models = [self.get_model(spec) for spec in table_specs]

        cloned_counts = {}
        id_map = {}
        with transaction.atomic():
            for model in models:
                count = self.clone_model(model, source_company, target_company, id_map, dry_run=options["dry_run"])
                cloned_counts[model._meta.db_table] = count

            if options["dry_run"]:
                transaction.set_rollback(True)

        for table_name, count in cloned_counts.items():
            prefix = "Would clone" if options["dry_run"] else "Cloned"
            self.stdout.write(f"{prefix} {count} row(s) in {table_name}")

    def get_model(self, spec):
        if "." not in spec:
            raise CommandError(f"Invalid table spec '{spec}'. Use app_label.ModelName.")
        app_label, model_name = spec.split(".", 1)
        module_path = MODEL_MODULES.get(model_name)
        if module_path:
            import_module(module_path)
        try:
            return apps.get_model(app_label, model_name)
        except LookupError as exc:
            raise CommandError(f"Unknown model '{spec}'.") from exc

    def clone_model(self, model, source_company, target_company, id_map, dry_run=False):
        field_names = [field.name for field in model._meta.fields]
        if "sess_company_id" not in field_names:
            self.stdout.write(f"Skipping {model._meta.db_table}: no sess_company_id field")
            return 0

        rows = list(model.objects.filter(sess_company_id=source_company))
        if dry_run:
            return len(rows)

        clone_fields = [
            field
            for field in model._meta.fields
            if not field.primary_key and not getattr(field, "auto_created", False) and field.name not in {"created", "updated", "created_at", "updated_at"}
        ]

        clones = []
        for row in rows:
            values = {}
            old_unique_id = getattr(row, "unique_id", "")
            new_row_unique_id = ""
            for field in clone_fields:
                value = getattr(row, field.name)
                if field.name == "unique_id":
                    value = new_unique_id()
                    new_row_unique_id = value
                elif field.name == "sess_company_id":
                    value = target_company
                elif field.name in {"form_main_unique_id", "main_unique_id", "bill_form_main_unique_id"} and value in id_map:
                    value = id_map[value]
                values[field.name] = value
            clones.append(model(**values))
            if old_unique_id and new_row_unique_id:
                id_map[old_unique_id] = new_row_unique_id

        if clones:
            model.objects.bulk_create(clones)
        return len(clones)
