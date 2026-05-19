from django.core.management.base import BaseCommand
from django.db import connections

from master.apps.tenant.tenantmodel import TenantBranch, TenantCompany
from master.apps.user.usermodel import UserCreation
from master.apps.user_type.usertypemodel import UserType
from master.tenant_db import provision_company_database, use_company_database


DEFAULT_MENU_SCREENS = [
    ("Admin", "Administration", "tenant_creation", "Tenant Creation"),
    ("Admin", "Administration", "user_screen", "User Screen"),
    ("Admin", "Administration", "user_type", "User Type"),
    ("Admin", "Administration", "user", "User Creation"),
    ("Admin", "Administration", "user_permission", "User Permission"),
    ("Settings", "Master Settings", "state_creation", "State Creation"),
    ("Settings", "Master Settings", "district_creation", "District Creation"),
    ("Settings", "Master Settings", "city_creation", "City Creation"),
    ("Settings", "Master Settings", "account_vertical", "Account Vertical"),
    ("Settings", "Master Settings", "account_sector", "Account Sector"),
    ("Settings", "Master Settings", "customer_creation", "Customer Creation"),
    ("Settings", "Master Settings", "item_creation", "Item Creation"),
    ("Settings", "Master Settings", "service_engineer_creation", "Service Engineer"),
    ("Settings", "Master Settings", "vendor_creation", "Vendor Creation"),
    ("Settings", "Master Settings", "insurance_type", "Insurance Type"),
    ("Settings", "Master Settings", "product_category", "Product Category"),
    ("Settings", "Master Settings", "main_category", "Main Category"),
    ("Settings", "Master Settings", "unit_creation", "Unit Creation"),
    ("Settings", "Master Settings", "executive_creation", "Executive Creation"),
    ("Settings", "Master Settings", "consignee_creation", "Consignee Creation"),
    ("Settings", "Master Settings", "pincode_creation", "Pincode Creation"),
    ("Settings", "Master Settings", "courier_creation", "Courier Creation"),
    ("Order", "Purchase", "purchase_order", "Purchase Order"),
    ("Purchase", "Stock", "stock_position", "Stock Position"),
    ("Stores", "Stores", "consignee_stock_assign", "Consignee Stock Assign"),
    ("Stores", "Stores", "invoice_and_dc", "Invoice & DC"),
    ("Stores", "Stores", "material_qc", "Material QC"),
    ("Stores", "Stores", "dispatch", "Dispatch"),
    ("Operation", "Operation", "operation_approval", "Operation Approval"),
    ("Operation", "Operation", "vendor_allocation", "Vendor Allocation"),
    ("Operation", "Operation", "revendor_allocation", "Revendor Allocation"),
    ("Operation", "Operation", "delivery_confirmation", "Delivery Confirmation"),
    ("Operation", "Operation", "signed_document", "Signed Document"),
    ("Accounts", "Accounts", "accounts_approval", "Accounts Approval"),
    ("Accounts", "Accounts", "security_deposit", "Security Deposit"),
    ("Accounts", "Accounts", "customer_payment", "Customer Payment"),
    ("Service & Support", "Service", "installation", "Installation"),
    ("Vendor", "Vendor", "vendor_bill_creation", "Vendor Bill Creation"),
    ("Vendor", "Vendor", "vendor_bill_approval", "Vendor Bill Approval"),
    ("Vendor", "Vendor", "accounts_bill_entry", "Accounts Bill Entry"),
    ("Vendor", "Vendor", "accounts_bill_approval", "Accounts Bill Approval"),
    ("Vendor", "Vendor", "management_approval", "Management Approval"),
    ("Vendor", "Vendor", "payment_transaction", "Payment Transaction"),
    ("Vendor", "Vendor", "bank_details", "Bank Details"),
    ("Vendor", "Vendor", "onsite_engineer_payment", "Onsite Engineer Payment"),
    ("Vendor", "Vendor", "revisit_payment", "Revisit Payment"),
    ("Reports", "Reports", "po_wise_report", "PO Wise Report"),
    ("Reports", "Reports", "completed_po_report", "Completed PO"),
    ("Reports", "Reports", "overdue_incomplete_po_report", "Overdue Incomplete PO"),
    ("Reports", "Reports", "payment_process_report", "Payment Process Report"),
    ("Documents", "Documents", "po_wise_document", "PO Wise Document"),
]


class Command(BaseCommand):
    help = "Create the default tenant database and product owner login."

    def add_arguments(self, parser):
        parser.add_argument("--company-code", default="OTM")
        parser.add_argument("--company-name", default="OTM")
        parser.add_argument("--tenant-db", default="otm_otm")
        parser.add_argument("--username", default="owner")
        parser.add_argument("--password", default="owner@123")

    def handle(self, *args, **options):
        company_code = options["company_code"].strip().upper()
        company_name = options["company_name"].strip() or company_code
        tenant_db = options["tenant_db"].strip()
        username = options["username"].strip()
        password = options["password"]

        self._ensure_tenant_registry_tables()

        company, _created = TenantCompany.objects.using("master").update_or_create(
            company_code=company_code,
            defaults={
                "unique_id": f"tenant_{company_code.lower()}",
                "company_name": company_name,
                "legal_name": company_name,
                "contact_name": "Owner",
                "contact_email": "owner@example.com",
                "contact_no": "9999999999",
                "address": "",
                "db_name": tenant_db,
                "db_host": "127.0.0.1",
                "db_port": "3306",
                "db_user": "root",
                "db_password": "qK]11lm.@tEvEE!b",
                "subscription_plan": "standard",
                "subscription_status": "active",
                "is_active": 1,
                "is_delete": 0,
            },
        )

        TenantBranch.objects.using("master").update_or_create(
            unique_id=f"branch_{company_code.lower()}_main",
            defaults={
                "company_id": company.unique_id,
                "branch_code": "MAIN",
                "branch_name": "Main Branch",
                "contact_no": "9999999999",
                "address": "",
                "is_default": 1,
                "is_active": 1,
                "is_delete": 0,
            },
        )

        db_name = provision_company_database(company)
        self._seed_default_screens(using="master")
        self._upsert_owner(
            using="master",
            username=username,
            password=password,
            company_id="",
            branch_id="",
        )

        branch_id = f"branch_{company_code.lower()}_main"
        with use_company_database(company):
            self._seed_default_screens(using=None)
            self._upsert_owner(
                using=None,
                username=username,
                password=password,
                company_id=company.unique_id,
                branch_id=branch_id,
            )

        self.stdout.write(self.style.SUCCESS(f"Tenant database ready: {db_name}"))
        self.stdout.write(self.style.SUCCESS(f"Company code: {company_code}"))
        self.stdout.write(self.style.SUCCESS(f"Username: {username}"))
        self.stdout.write(self.style.SUCCESS(f"Password: {password}"))

    def _upsert_owner(self, using, username, password, company_id, branch_id):
        role_manager = UserType.objects
        user_manager = UserCreation.objects
        if using:
            role_manager = role_manager.using(using)
            user_manager = user_manager.using(using)

        role, _created = role_manager.update_or_create(
            unique_id="product_owner",
            defaults={
                "user_type": "product_owner",
                "under_user_type": "",
                "is_active": 1,
                "is_delete": 0,
                "sess_company_id": company_id,
                "sess_branch_id": branch_id,
            },
        )
        user_manager.update_or_create(
            user_name=username,
            defaults={
                "unique_id": "owner_admin",
                "staff_name": "Owner",
                "staff_id": "OWNER001",
                "user_type_unique_id": role.unique_id,
                "mobile_no": "9999999999",
                "email_id": "owner@example.com",
                "address": "",
                "password": password,
                "en_password": password,
                "sess_company_id": company_id,
                "sess_branch_id": branch_id,
                "is_active": 1,
                "is_delete": 0,
            },
        )

    def _ensure_tenant_registry_tables(self):
        with connections["master"].cursor() as cursor:
            cursor.execute(
                """
                CREATE TABLE IF NOT EXISTS `tenant_company` (
                  `id` bigint(20) NOT NULL AUTO_INCREMENT,
                  `unique_id` varchar(50) NOT NULL,
                  `company_code` varchar(50) NOT NULL,
                  `company_name` varchar(255) NOT NULL,
                  `legal_name` varchar(255) NOT NULL DEFAULT '',
                  `contact_name` varchar(150) NOT NULL DEFAULT '',
                  `contact_email` varchar(150) NOT NULL DEFAULT '',
                  `contact_no` varchar(20) NOT NULL DEFAULT '',
                  `gst_no` varchar(30) NOT NULL DEFAULT '',
                  `pan_no` varchar(30) NOT NULL DEFAULT '',
                  `address` longtext NOT NULL,
                  `db_name` varchar(100) NOT NULL DEFAULT '',
                  `db_host` varchar(150) NOT NULL DEFAULT '',
                  `db_port` varchar(10) NOT NULL DEFAULT '',
                  `db_user` varchar(100) NOT NULL DEFAULT '',
                  `db_password` varchar(255) NOT NULL DEFAULT '',
                  `subscription_plan` varchar(50) NOT NULL DEFAULT 'standard',
                  `subscription_status` varchar(30) NOT NULL DEFAULT 'active',
                  `is_active` int(11) NOT NULL DEFAULT 1,
                  `is_delete` int(11) NOT NULL DEFAULT 0,
                  `created` datetime(6) NOT NULL DEFAULT current_timestamp(6),
                  `updated` datetime(6) NOT NULL DEFAULT current_timestamp(6) ON UPDATE current_timestamp(6),
                  PRIMARY KEY (`id`),
                  UNIQUE KEY `tenant_company_unique_id_uniq` (`unique_id`),
                  UNIQUE KEY `tenant_company_company_code_uniq` (`company_code`)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci
                """
            )
            cursor.execute(
                """
                CREATE TABLE IF NOT EXISTS `tenant_branch` (
                  `id` bigint(20) NOT NULL AUTO_INCREMENT,
                  `unique_id` varchar(50) NOT NULL,
                  `company_id` varchar(50) NOT NULL,
                  `branch_code` varchar(50) NOT NULL DEFAULT '',
                  `branch_name` varchar(150) NOT NULL,
                  `contact_no` varchar(20) NOT NULL DEFAULT '',
                  `address` longtext NOT NULL,
                  `is_default` int(11) NOT NULL DEFAULT 0,
                  `is_active` int(11) NOT NULL DEFAULT 1,
                  `is_delete` int(11) NOT NULL DEFAULT 0,
                  `created` datetime(6) NOT NULL DEFAULT current_timestamp(6),
                  `updated` datetime(6) NOT NULL DEFAULT current_timestamp(6) ON UPDATE current_timestamp(6),
                  PRIMARY KEY (`id`),
                  UNIQUE KEY `tenant_branch_unique_id_uniq` (`unique_id`),
                  KEY `tenant_branch_company_id_idx` (`company_id`)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci
                """
            )

    def _seed_default_screens(self, using):
        connection = connections[using or "default"]
        with connection.cursor() as cursor:
            main_ids = [self._slug(row[0]) for row in DEFAULT_MENU_SCREENS]
            section_ids = [
                f"{self._slug(main_name)}_{self._slug(section_name)}"
                for main_name, section_name, _folder, _screen_name in DEFAULT_MENU_SCREENS
            ]
            screen_ids = [row[2] for row in DEFAULT_MENU_SCREENS]
            cursor.execute(
                f"DELETE FROM `user_screen` WHERE `unique_id` IN ({','.join(['%s'] * len(screen_ids))})",
                screen_ids,
            )
            cursor.execute(
                f"DELETE FROM `user_screen_sections` WHERE `unique_id` IN ({','.join(['%s'] * len(set(section_ids)))})",
                sorted(set(section_ids)),
            )
            cursor.execute(
                f"DELETE FROM `user_screen_main` WHERE `unique_id` IN ({','.join(['%s'] * len(set(main_ids)))})",
                sorted(set(main_ids)),
            )

            for main_order, main_name in enumerate(dict.fromkeys(row[0] for row in DEFAULT_MENU_SCREENS), start=1):
                main_id = self._slug(main_name)
                cursor.execute(
                    """
                    INSERT INTO `user_screen_main` (
                      `unique_id`, `screen_type_unique_id`, `screen_main_name`, `icon_name`,
                      `order_no`, `description`, `is_active`, `is_delete`,
                      `acc_year`, `session_id`, `sess_user_type`, `sess_user_id`,
                      `sess_company_id`, `sess_branch_id`
                    ) VALUES (%s, '', %s, '', %s, '', 1, 0, '', '', '', '', '', '')
                    ON DUPLICATE KEY UPDATE
                      `screen_main_name` = VALUES(`screen_main_name`),
                      `order_no` = VALUES(`order_no`),
                      `is_active` = 1,
                      `is_delete` = 0
                    """,
                    [main_id, main_name, main_order],
                )

            sections = []
            seen_sections = set()
            for main_name, section_name, _folder, _screen_name in DEFAULT_MENU_SCREENS:
                section_id = f"{self._slug(main_name)}_{self._slug(section_name)}"
                if section_id in seen_sections:
                    continue
                seen_sections.add(section_id)
                sections.append((main_name, section_name, section_id))

            for section_order, (main_name, section_name, section_id) in enumerate(sections, start=1):
                cursor.execute(
                    """
                    INSERT INTO `user_screen_sections` (
                      `unique_id`, `screen_main_unique_id`, `section_name`, `folder_name`,
                      `icon_name`, `order_no`, `description`, `is_active`, `is_delete`,
                      `acc_year`, `session_id`, `sess_user_type`, `sess_user_id`,
                      `sess_company_id`, `sess_branch_id`
                    ) VALUES (%s, %s, %s, %s, '', %s, '', 1, 0, '', '', '', '', '', '')
                    ON DUPLICATE KEY UPDATE
                      `screen_main_unique_id` = VALUES(`screen_main_unique_id`),
                      `section_name` = VALUES(`section_name`),
                      `folder_name` = VALUES(`folder_name`),
                      `order_no` = VALUES(`order_no`),
                      `is_active` = 1,
                      `is_delete` = 0
                    """,
                    [section_id, self._slug(main_name), section_name, self._slug(section_name), section_order],
                )

            for order_no, (main_name, section_name, folder_name, screen_name) in enumerate(DEFAULT_MENU_SCREENS, start=1):
                cursor.execute(
                    """
                    INSERT INTO `user_screen` (
                      `unique_id`, `main_screen_unique_id`, `screen_section_unique_id`,
                      `dashboard_setting_menu`, `screen_name`, `folder_name`, `actions`,
                      `icon_name`, `order_no`, `description`, `is_active`, `is_delete`,
                      `acc_year`, `session_id`, `sess_user_type`, `sess_user_id`,
                      `sess_company_id`, `sess_branch_id`
                    ) VALUES (%s, %s, %s, '', %s, %s, 'add,update,list,delete,view', '', %s, '', 1, 0, '', '', '', '', '', '')
                    ON DUPLICATE KEY UPDATE
                      `main_screen_unique_id` = VALUES(`main_screen_unique_id`),
                      `screen_section_unique_id` = VALUES(`screen_section_unique_id`),
                      `screen_name` = VALUES(`screen_name`),
                      `folder_name` = VALUES(`folder_name`),
                      `actions` = VALUES(`actions`),
                      `order_no` = VALUES(`order_no`),
                      `is_active` = 1,
                      `is_delete` = 0
                    """,
                    [
                        folder_name,
                        self._slug(main_name),
                        f"{self._slug(main_name)}_{self._slug(section_name)}",
                        screen_name,
                        folder_name,
                        order_no,
                    ],
                )

    def _slug(self, value):
        return (
            str(value or "")
            .strip()
            .lower()
            .replace("&", "and")
            .replace(" ", "_")
            .replace("-", "_")
        )
