SET FOREIGN_KEY_CHECKS=0;
SET SQL_MODE="NO_AUTO_VALUE_ON_ZERO";
SET NAMES utf8mb4;

CREATE TABLE IF NOT EXISTS `account_sector` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `unique_id` varchar(50) NOT NULL,
  `sector_name` varchar(100) NOT NULL,
  `is_active` int(11) NOT NULL DEFAULT 1,
  `is_delete` varchar(100) DEFAULT '0',
  `acc_year` varchar(10) DEFAULT NULL,
  `updated` timestamp NULL DEFAULT NULL,
  `created` timestamp NULL DEFAULT NULL,
  `session_id` varchar(50) NOT NULL,
  `sess_user_type` varchar(50) NOT NULL,
  `sess_user_id` varchar(50) NOT NULL,
  `sess_company_id` varchar(50) NOT NULL,
  `sess_branch_id` varchar(50) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=14 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci AVG_ROW_LENGTH=1365;

CREATE TABLE IF NOT EXISTS `account_vertical` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `unique_id` varchar(50) NOT NULL,
  `account_name` varchar(100) NOT NULL,
  `is_active` int(11) NOT NULL DEFAULT 1,
  `is_delete` varchar(100) DEFAULT '0',
  `acc_year` varchar(10) DEFAULT NULL,
  `updated` timestamp NULL DEFAULT NULL,
  `created` timestamp NULL DEFAULT NULL,
  `session_id` varchar(50) NOT NULL,
  `sess_user_type` varchar(50) NOT NULL,
  `sess_user_id` varchar(50) NOT NULL,
  `sess_company_id` varchar(50) NOT NULL,
  `sess_branch_id` varchar(50) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=39 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci AVG_ROW_LENGTH=1365;

CREATE TABLE IF NOT EXISTS `amcrequired` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `unique_id` varchar(250) NOT NULL,
  `form_main_unique_id` varchar(100) DEFAULT NULL,
  `po_no` varchar(100) DEFAULT NULL,
  `batch_id` varchar(100) DEFAULT NULL,
  `po_unique_id` varchar(30) NOT NULL,
  `start_date` date DEFAULT NULL,
  `end_date` date DEFAULT NULL,
  `amc_percentae` varchar(30) DEFAULT NULL,
  `amcvalue` varchar(30) DEFAULT NULL,
  `amc_tax` varchar(100) DEFAULT NULL,
  `amc_unit_price` varchar(100) DEFAULT NULL,
  `amc_remarks` longtext DEFAULT NULL,
  `amcfile_names` varchar(250) DEFAULT NULL,
  `amcfile_org_names` varchar(50) DEFAULT NULL,
  `po_file_name` varchar(250) DEFAULT NULL,
  `po_file_org_name` varchar(250) DEFAULT NULL,
  `acc_year` varchar(30) DEFAULT NULL,
  `session_id` varchar(30) DEFAULT NULL,
  `sess_user_type` varchar(30) DEFAULT NULL,
  `sess_user_id` varchar(30) DEFAULT NULL,
  `sess_company_id` varchar(30) DEFAULT NULL,
  `sess_branch_id` varchar(50) DEFAULT NULL,
  `is_active` int(11) NOT NULL DEFAULT 1,
  `is_delete` int(11) NOT NULL DEFAULT 0,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE IF NOT EXISTS `auth_group` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `name` varchar(150) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `name` (`name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE IF NOT EXISTS `auth_group_permissions` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `group_id` int(11) NOT NULL,
  `permission_id` int(11) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `auth_group_permissions_group_id_permission_id_0cd325b0_uniq` (`group_id`,`permission_id`),
  KEY `auth_group_permissio_permission_id_84c5c92e_fk_auth_perm` (`permission_id`),
  CONSTRAINT `auth_group_permissio_permission_id_84c5c92e_fk_auth_perm` FOREIGN KEY (`permission_id`) REFERENCES `auth_permission` (`id`),
  CONSTRAINT `auth_group_permissions_group_id_b120cbf9_fk_auth_group_id` FOREIGN KEY (`group_id`) REFERENCES `auth_group` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE IF NOT EXISTS `auth_permission` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `name` varchar(255) NOT NULL,
  `content_type_id` int(11) NOT NULL,
  `codename` varchar(100) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `auth_permission_content_type_id_codename_01ab375a_uniq` (`content_type_id`,`codename`),
  CONSTRAINT `auth_permission_content_type_id_2f476e4b_fk_django_co` FOREIGN KEY (`content_type_id`) REFERENCES `django_content_type` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=65 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE IF NOT EXISTS `auth_user` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `password` varchar(128) NOT NULL,
  `last_login` datetime(6) DEFAULT NULL,
  `is_superuser` tinyint(1) NOT NULL,
  `username` varchar(150) NOT NULL,
  `first_name` varchar(150) NOT NULL,
  `last_name` varchar(150) NOT NULL,
  `email` varchar(254) NOT NULL,
  `is_staff` tinyint(1) NOT NULL,
  `is_active` tinyint(1) NOT NULL,
  `date_joined` datetime(6) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `username` (`username`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE IF NOT EXISTS `auth_user_groups` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) NOT NULL,
  `group_id` int(11) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `auth_user_groups_user_id_group_id_94350c0c_uniq` (`user_id`,`group_id`),
  KEY `auth_user_groups_group_id_97559544_fk_auth_group_id` (`group_id`),
  CONSTRAINT `auth_user_groups_group_id_97559544_fk_auth_group_id` FOREIGN KEY (`group_id`) REFERENCES `auth_group` (`id`),
  CONSTRAINT `auth_user_groups_user_id_6a12ed8b_fk_auth_user_id` FOREIGN KEY (`user_id`) REFERENCES `auth_user` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE IF NOT EXISTS `auth_user_user_permissions` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) NOT NULL,
  `permission_id` int(11) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `auth_user_user_permissions_user_id_permission_id_14a6b632_uniq` (`user_id`,`permission_id`),
  KEY `auth_user_user_permi_permission_id_1fbb5f2c_fk_auth_perm` (`permission_id`),
  CONSTRAINT `auth_user_user_permi_permission_id_1fbb5f2c_fk_auth_perm` FOREIGN KEY (`permission_id`) REFERENCES `auth_permission` (`id`),
  CONSTRAINT `auth_user_user_permissions_user_id_a95ead1b_fk_auth_user_id` FOREIGN KEY (`user_id`) REFERENCES `auth_user` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE IF NOT EXISTS `bg_creation_main` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `unique_id` varchar(200) NOT NULL,
  `bg_auto_id` varchar(200) NOT NULL,
  `bg_num` varchar(200) DEFAULT NULL,
  `form_main_unique_id` varchar(200) NOT NULL,
  `po_num` varchar(250) NOT NULL,
  `po_date` date NOT NULL,
  `customer_name` varchar(100) DEFAULT NULL,
  `con_unique_id` varchar(200) DEFAULT NULL,
  `con_name` varchar(250) DEFAULT NULL,
  `con_location` varchar(250) DEFAULT NULL,
  `invoice_no` varchar(250) NOT NULL,
  `invoice_qty` varchar(100) NOT NULL,
  `invoice_value` varchar(100) NOT NULL,
  `invoice_date` varchar(50) DEFAULT NULL,
  `dc_number` varchar(30) DEFAULT NULL,
  `dc_date` varchar(30) DEFAULT NULL,
  `bg_product_name` varchar(250) DEFAULT NULL,
  `bg_month` varchar(100) NOT NULL,
  `bg_percentage` varchar(50) NOT NULL,
  `bg_value` varchar(100) DEFAULT NULL,
  `bg_date` varchar(150) DEFAULT NULL,
  `bg_validity_date` varchar(150) DEFAULT NULL,
  `bg_validity_end_date` varchar(150) DEFAULT NULL,
  `bank_name` varchar(250) DEFAULT NULL,
  `bank_attach_file` varchar(150) DEFAULT NULL,
  `bank_attach_file_org_name` varchar(150) DEFAULT NULL,
  `ins_unique_id` varchar(100) DEFAULT NULL,
  `status` varchar(100) NOT NULL COMMENT '0-pending 1-completed',
  `bill_status` varchar(10) NOT NULL DEFAULT '0' COMMENT '0-Pending,1-billing',
  `is_active` int(11) NOT NULL DEFAULT 1,
  `is_delete` int(11) NOT NULL DEFAULT 0,
  `updated` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `created` timestamp NOT NULL DEFAULT current_timestamp(),
  `acc_year` varchar(50) NOT NULL,
  `session_id` varchar(50) NOT NULL,
  `sess_user_type` varchar(50) NOT NULL,
  `sess_user_id` varchar(50) NOT NULL,
  `sess_company_id` varchar(50) NOT NULL,
  `sess_branch_id` varchar(50) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `unique_id` (`unique_id`),
  KEY `form_main_unique_id` (`form_main_unique_id`,`con_unique_id`),
  KEY `invoice_no` (`invoice_no`,`ins_unique_id`,`is_delete`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE IF NOT EXISTS `bg_creation_sub` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `unique_id` varchar(200) NOT NULL,
  `bg_auto_id` varchar(200) NOT NULL,
  `form_main_unique_id` varchar(200) NOT NULL,
  `po_num` varchar(250) NOT NULL,
  `po_date` varchar(100) NOT NULL,
  `customer_name` varchar(100) DEFAULT NULL,
  `con_unique_id` varchar(200) DEFAULT NULL,
  `con_name` varchar(250) DEFAULT NULL,
  `con_location` varchar(250) DEFAULT NULL,
  `invoice_no` varchar(250) NOT NULL,
  `invoice_qty` varchar(100) NOT NULL,
  `invoice_value` varchar(100) NOT NULL,
  `invoice_date` varchar(50) DEFAULT NULL,
  `invoice_auto_id` varchar(50) DEFAULT NULL,
  `bg_product_name` varchar(250) DEFAULT NULL,
  `bg_percentage` varchar(50) DEFAULT NULL,
  `bg_month` varchar(50) DEFAULT NULL,
  `bg_num` varchar(50) DEFAULT NULL,
  `bg_value` varchar(50) DEFAULT NULL,
  `bg_date` varchar(50) DEFAULT NULL,
  `dc_number` varchar(20) DEFAULT NULL,
  `dc_date` varchar(30) DEFAULT NULL,
  `bg_validity_date` varchar(50) DEFAULT NULL,
  `bg_validity_end_date` varchar(50) DEFAULT NULL,
  `ins_unique_id` varchar(100) DEFAULT NULL,
  `status` varchar(100) NOT NULL,
  `bill_status` varchar(50) DEFAULT '0' COMMENT '0-Pending,1-billing',
  `is_active` int(11) NOT NULL DEFAULT 1,
  `is_delete` int(11) NOT NULL DEFAULT 0,
  `updated` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `created` timestamp NOT NULL DEFAULT current_timestamp(),
  `acc_year` varchar(50) NOT NULL,
  `session_id` varchar(50) NOT NULL,
  `sess_user_type` varchar(50) NOT NULL,
  `sess_user_id` varchar(50) NOT NULL,
  `sess_company_id` varchar(50) NOT NULL,
  `sess_branch_id` varchar(50) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `form_main_unique_id` (`form_main_unique_id`,`con_unique_id`),
  KEY `invoice_no` (`invoice_no`,`ins_unique_id`,`status`,`is_delete`),
  KEY `unique_id` (`unique_id`),
  KEY `bill_status` (`bill_status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE IF NOT EXISTS `bill_generation_summary` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `po_count` int(11) DEFAULT NULL,
  `invoice_count` int(11) DEFAULT NULL,
  `dc_count` int(11) DEFAULT NULL,
  `invoice_value` decimal(15,2) DEFAULT NULL,
  `acc_year` varchar(30) DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE IF NOT EXISTS `bill_submission_form` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `unique_id` varchar(50) NOT NULL,
  `bill_form_main_unique_id` varchar(50) NOT NULL,
  `po_num` varchar(250) NOT NULL,
  `po_date` varchar(100) NOT NULL,
  `customer_name` varchar(100) DEFAULT NULL,
  `con_contact_name` varchar(250) DEFAULT NULL,
  `con_address` longtext DEFAULT NULL,
  `invoice_no` varchar(50) DEFAULT NULL,
  `invoice_date` varchar(50) NOT NULL,
  `invoice_value` varchar(250) DEFAULT NULL,
  `invoice_qty` varchar(50) DEFAULT NULL,
  `file_name` varchar(100) DEFAULT NULL,
  `consignee_unique_id` varchar(50) DEFAULT NULL,
  `scanned_dc_copy` varchar(100) DEFAULT NULL,
  `dc_original_name` varchar(100) DEFAULT NULL,
  `snr_original_name` varchar(100) DEFAULT NULL,
  `scanned_snr_copy` varchar(100) DEFAULT NULL,
  `scanned_ir_copy` varchar(100) DEFAULT NULL,
  `ir_original_name` varchar(100) DEFAULT NULL,
  `invoice_copy` varchar(100) DEFAULT NULL,
  `invoice_original_name` varchar(100) DEFAULT NULL,
  `installation_reference_no` varchar(50) DEFAULT NULL,
  `supplier_invoice_number` varchar(50) DEFAULT NULL,
  `claim_amount` varchar(50) DEFAULT NULL,
  `bill_status` varchar(50) DEFAULT NULL,
  `bill_no` varchar(100) DEFAULT NULL,
  `partial_bill_status` int(11) NOT NULL DEFAULT 0,
  `claim_amt` varchar(100) DEFAULT NULL,
  `inv_cancel_status` int(11) NOT NULL DEFAULT 0,
  `bill_reject_reason` longtext DEFAULT NULL,
  `payment_cancel_reason` longtext DEFAULT NULL,
  `dc_number` varchar(20) DEFAULT NULL,
  `dc_date` varchar(30) DEFAULT NULL,
  `is_active` int(11) NOT NULL DEFAULT 1,
  `status` varchar(50) DEFAULT NULL,
  `ins_unique_id` varchar(100) DEFAULT NULL,
  `is_delete` int(11) NOT NULL DEFAULT 0,
  `updated` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `created` timestamp NOT NULL DEFAULT current_timestamp(),
  `acc_year` varchar(50) NOT NULL,
  `session_id` varchar(50) NOT NULL,
  `sess_user_type` varchar(50) NOT NULL,
  `sess_user_id` varchar(50) NOT NULL,
  `sess_company_id` varchar(50) NOT NULL,
  `sess_branch_id` varchar(50) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE IF NOT EXISTS `bill_submission_main_table` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `unique_id` varchar(50) NOT NULL,
  `bill_form_main_unique_id` varchar(50) NOT NULL,
  `po_num` varchar(250) NOT NULL,
  `po_date` varchar(50) NOT NULL,
  `customer_name` varchar(100) DEFAULT NULL,
  `con_contact_name` varchar(250) DEFAULT NULL,
  `con_address` longtext DEFAULT NULL,
  `invoice_no` varchar(250) DEFAULT NULL,
  `invoice_date` varchar(50) DEFAULT NULL,
  `invoice_value` varchar(250) DEFAULT NULL,
  `invoice_qty` varchar(50) DEFAULT NULL,
  `consignee_unique_id` varchar(50) DEFAULT NULL,
  `bg_num` varchar(200) DEFAULT NULL,
  `bg_id` varchar(200) DEFAULT NULL,
  `bg_date` varchar(100) DEFAULT NULL,
  `bg_value` varchar(100) DEFAULT NULL,
  `bg_doc` varchar(100) DEFAULT NULL,
  `claim_amount` varchar(50) DEFAULT NULL,
  `claimamt` varchar(100) DEFAULT NULL,
  `bill_checkbox` varchar(50) DEFAULT NULL,
  `bill_no` varchar(150) NOT NULL,
  `bill_submission_date` varchar(100) DEFAULT NULL,
  `e_no` varchar(150) DEFAULT NULL,
  `elcot_ent_status` varchar(20) NOT NULL DEFAULT '0' COMMENT '0-Pending,1-Complete',
  `is_active` int(11) NOT NULL DEFAULT 1,
  `bill_status` varchar(40) DEFAULT NULL,
  `payment_date` varchar(100) DEFAULT NULL,
  `payment_status` int(11) NOT NULL DEFAULT 1 COMMENT '1-Pending, 2- Complete',
  `payement_receive` varchar(100) DEFAULT NULL,
  `status` varchar(50) DEFAULT NULL,
  `file_name` varchar(100) DEFAULT NULL,
  `file_org_name` varchar(100) DEFAULT NULL,
  `ld_amount` varchar(100) DEFAULT NULL,
  `ld_days` varchar(50) DEFAULT NULL,
  `inv_cancel_status` int(11) NOT NULL DEFAULT 0,
  `bill_reject_reason` longtext DEFAULT NULL,
  `payment_cancel_reason` longtext DEFAULT NULL,
  `cancel_invoice_no` varchar(100) DEFAULT NULL,
  `rem_inv_no` varchar(100) DEFAULT NULL,
  `bill_created_date` date DEFAULT NULL,
  `dc_number` varchar(30) DEFAULT NULL,
  `dc_date` varchar(30) DEFAULT NULL,
  `partial_bill_status` varchar(11) DEFAULT NULL COMMENT '3-partial completed',
  `is_delete` int(11) NOT NULL DEFAULT 0,
  `updated` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `created` timestamp NOT NULL DEFAULT current_timestamp(),
  `acc_year` varchar(50) NOT NULL,
  `session_id` varchar(50) NOT NULL,
  `sess_user_type` varchar(50) NOT NULL,
  `sess_user_id` varchar(50) NOT NULL,
  `sess_company_id` varchar(50) NOT NULL,
  `sess_branch_id` varchar(50) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `bill_form_main_unique_id` (`bill_form_main_unique_id`,`invoice_no`,`consignee_unique_id`),
  KEY `bill_no` (`bill_no`,`e_no`,`is_delete`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE IF NOT EXISTS `bill_submission_pending_summary` (
  `acc_year` varchar(10) NOT NULL,
  `po_count` int(11) DEFAULT NULL,
  `invoice_count` int(11) DEFAULT NULL,
  `invoice_value` decimal(18,2) DEFAULT NULL,
  `dc_count` int(11) DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`acc_year`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE IF NOT EXISTS `bill_submission_sub` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `bill_no` varchar(100) DEFAULT NULL,
  `unique_id` varchar(100) NOT NULL,
  `bill_form_unique_id` varchar(50) DEFAULT NULL,
  `po_num` varchar(250) DEFAULT NULL,
  `po_date` varchar(100) DEFAULT NULL,
  `con_contact_name` varchar(100) DEFAULT NULL,
  `con_address` longtext DEFAULT NULL,
  `invoice_no` varchar(50) DEFAULT NULL,
  `invoice_date` varchar(50) DEFAULT NULL,
  `invoice_value` varchar(250) DEFAULT NULL,
  `invoice_qty` varchar(50) DEFAULT NULL,
  `invoice_auto_id` varchar(50) DEFAULT NULL,
  `bill_checkbox` varchar(50) DEFAULT NULL,
  `consignee_unique_id` varchar(50) DEFAULT NULL,
  `bill_submission_date` varchar(150) DEFAULT NULL,
  `e_no` varchar(100) DEFAULT NULL,
  `elcot_ent_status` varchar(10) NOT NULL DEFAULT '0' COMMENT '0-Pending,1-Complete',
  `payment_status` varchar(50) DEFAULT NULL,
  `payment_date` varchar(50) DEFAULT NULL,
  `payment_received` varchar(50) DEFAULT NULL,
  `is_active` int(11) NOT NULL DEFAULT 1,
  `bill_status` varchar(100) DEFAULT NULL,
  `sd_status` varchar(10) NOT NULL DEFAULT '0',
  `status` varchar(50) DEFAULT NULL,
  `ld_amount` varchar(100) DEFAULT NULL,
  `ld_days` varchar(50) DEFAULT NULL,
  `ins_unique_id` varchar(50) DEFAULT NULL,
  `file_name` varchar(100) DEFAULT NULL,
  `file_org_name` varchar(100) DEFAULT NULL,
  `claim_status` int(11) NOT NULL DEFAULT 0 COMMENT '0-pending,1-complete	',
  `claim_percentage` int(11) DEFAULT NULL,
  `claimamt` varchar(100) DEFAULT NULL,
  `gst` varchar(250) DEFAULT NULL,
  `gst_value` varchar(250) DEFAULT NULL,
  `tds` varchar(250) DEFAULT NULL,
  `tds_value` varchar(250) DEFAULT NULL,
  `ld` varchar(250) DEFAULT NULL,
  `rem_amt` int(11) DEFAULT NULL,
  `trans_id` varchar(100) DEFAULT NULL,
  `trans_date` varchar(50) DEFAULT NULL,
  `tran_amt` int(11) DEFAULT NULL,
  `ttl_amount` varchar(100) DEFAULT NULL,
  `balance_amount` varchar(100) DEFAULT '',
  `inv_cancel_status` int(11) NOT NULL DEFAULT 0,
  `bill_reject_reason` longtext DEFAULT NULL,
  `payment_cancel_reason` longtext DEFAULT NULL,
  `bill_created_date` date DEFAULT NULL,
  `partial_bill_status` varchar(11) DEFAULT NULL COMMENT '3-partial completed',
  `is_delete` int(11) NOT NULL DEFAULT 0,
  `updated` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `created` timestamp NOT NULL DEFAULT current_timestamp(),
  `acc_year` varchar(50) NOT NULL,
  `session_id` varchar(50) NOT NULL,
  `sess_user_type` varchar(50) NOT NULL,
  `sess_user_id` varchar(50) NOT NULL,
  `sess_company_id` varchar(50) NOT NULL,
  `sess_branch_id` varchar(50) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `bill_no` (`bill_no`,`bill_form_unique_id`,`invoice_no`),
  KEY `consignee_unique_id` (`consignee_unique_id`,`ins_unique_id`,`is_delete`),
  KEY `e_no` (`e_no`,`bill_status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE IF NOT EXISTS `city_creation` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `unique_id` varchar(50) NOT NULL,
  `district_name` varchar(100) NOT NULL,
  `state_name` varchar(100) NOT NULL,
  `city_name` varchar(50) NOT NULL,
  `description` longtext DEFAULT NULL,
  `is_active` int(11) NOT NULL DEFAULT 1,
  `is_delete` int(11) NOT NULL DEFAULT 0,
  `updated` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `created` timestamp NOT NULL DEFAULT current_timestamp(),
  `acc_year` varchar(50) NOT NULL,
  `session_id` varchar(50) NOT NULL,
  `sess_user_type` varchar(50) NOT NULL,
  `sess_user_id` varchar(50) NOT NULL,
  `sess_company_id` varchar(50) NOT NULL,
  `sess_branch_id` varchar(50) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=20 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci AVG_ROW_LENGTH=378;

CREATE TABLE IF NOT EXISTS `consignee_creation` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `unique_id` varchar(50) NOT NULL,
  `consignee_address` varchar(100) NOT NULL,
  `consignee_district` varchar(100) NOT NULL,
  `consignee_pincode` int(50) NOT NULL,
  `consignee_contactnumber` varchar(20) NOT NULL,
  `is_active` int(11) NOT NULL DEFAULT 1,
  `is_delete` int(11) NOT NULL DEFAULT 0,
  `updated` timestamp NOT NULL DEFAULT current_timestamp(),
  `created` timestamp NOT NULL DEFAULT current_timestamp(),
  `acc_year` varchar(50) NOT NULL,
  `session_id` varchar(50) NOT NULL,
  `sess_user_type` varchar(50) NOT NULL,
  `sess_user_id` varchar(50) NOT NULL,
  `sess_company_id` varchar(50) NOT NULL,
  `sess_branch_id` varchar(50) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=22 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE IF NOT EXISTS `consignee_details_sub` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `unique_id` varchar(35) NOT NULL,
  `form_main_unique_id` varchar(100) DEFAULT NULL,
  `screen_unique_id` varchar(100) DEFAULT NULL,
  `no_of_consignee` varchar(100) DEFAULT NULL,
  `team_mem` varchar(50) DEFAULT NULL,
  `con_assign_qty` varchar(100) DEFAULT NULL,
  `con_address` longtext DEFAULT NULL,
  `con_district` varchar(250) DEFAULT NULL,
  `con_state_name` varchar(60) DEFAULT NULL,
  `con_pincode` varchar(100) DEFAULT NULL,
  `zone` varchar(100) DEFAULT NULL,
  `billing_address` varchar(250) DEFAULT NULL,
  `con_branch` varchar(250) DEFAULT NULL,
  `con_contact_name` varchar(250) DEFAULT NULL,
  `con_contact_number` varchar(100) DEFAULT NULL,
  `con_lan_num` varchar(100) NOT NULL,
  `consignee_gst` varchar(30) DEFAULT NULL,
  `inv_cons_status` int(11) DEFAULT 0 COMMENT '0-pending,1-complete',
  `cons_verify_sts` varchar(10) DEFAULT '0',
  `batch_id` varchar(50) DEFAULT NULL,
  `batch_status` int(10) NOT NULL DEFAULT 0,
  `po_number` varchar(250) DEFAULT NULL,
  `batch_entry_date` date NOT NULL,
  `consignee_received_date` date NOT NULL,
  `assign_team_member` varchar(30) DEFAULT NULL,
  `con_branch_code` varchar(255) DEFAULT NULL,
  `alter_contact_name` varchar(255) DEFAULT NULL,
  `alter_number` varchar(255) DEFAULT NULL,
  `cons_email_id` varchar(255) DEFAULT NULL,
  `zone_code` varchar(255) DEFAULT NULL,
  `billing_gst_no` varchar(100) DEFAULT NULL,
  `region` varchar(100) DEFAULT NULL,
  `is_active` int(1) NOT NULL DEFAULT 1,
  `is_delete` int(1) NOT NULL DEFAULT 0,
  `updated` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `created` timestamp NOT NULL DEFAULT current_timestamp(),
  `acc_year` varchar(50) DEFAULT NULL,
  `session_id` varchar(50) DEFAULT NULL,
  `sess_user_type` varchar(50) DEFAULT NULL,
  `sess_user_id` varchar(50) DEFAULT NULL,
  `sess_company_id` varchar(50) DEFAULT NULL,
  `sess_branch_id` varchar(50) DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=27 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE IF NOT EXISTS `copy_this_table` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `unique_id` varchar(50) NOT NULL,
  `is_active` int(11) NOT NULL DEFAULT 1,
  `is_delete` int(11) NOT NULL DEFAULT 0,
  `updated` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `created` timestamp NOT NULL DEFAULT current_timestamp(),
  `acc_year` varchar(50) NOT NULL,
  `session_id` varchar(50) NOT NULL,
  `sess_user_type` varchar(50) NOT NULL,
  `sess_user_id` varchar(50) NOT NULL,
  `sess_company_id` varchar(50) NOT NULL,
  `sess_branch_id` varchar(50) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci COMMENT='vendor_allocation';

CREATE TABLE IF NOT EXISTS `courier_creation` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `unique_id` varchar(250) NOT NULL,
  `form_main_unique_id` varchar(250) DEFAULT NULL,
  `courier_name` varchar(250) NOT NULL,
  `is_active` int(11) NOT NULL DEFAULT 1,
  `is_delete` int(11) NOT NULL DEFAULT 0,
  `updated` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `created` timestamp NOT NULL DEFAULT current_timestamp(),
  `acc_year` varchar(250) NOT NULL,
  `session_id` varchar(250) NOT NULL,
  `sess_user_type` varchar(250) NOT NULL,
  `sess_user_id` varchar(250) NOT NULL,
  `sess_company_id` varchar(250) NOT NULL,
  `sess_branch_id` varchar(250) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=35 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE IF NOT EXISTS `dc_ir_doc_dispatch_details` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `unique_id` varchar(50) NOT NULL,
  `po_form_unique_id` varchar(100) NOT NULL,
  `po_num` varchar(250) NOT NULL,
  `po_auto_id` varchar(100) NOT NULL,
  `po_date` varchar(100) NOT NULL,
  `invoice_auto_id` varchar(100) NOT NULL,
  `dc_number` varchar(100) DEFAULT NULL,
  `invoice_no` varchar(80) NOT NULL,
  `invoice_date` varchar(50) NOT NULL,
  `consignee_unique_id` varchar(100) NOT NULL,
  `dc_dispatch_mode` varchar(100) NOT NULL,
  `name_of_courier` varchar(200) DEFAULT NULL,
  `dc_pod_no` varchar(100) NOT NULL,
  `dc_pod_date` varchar(100) NOT NULL,
  `ir_dispatch_mode` varchar(100) NOT NULL,
  `ins_name_of_courier` varchar(150) DEFAULT NULL,
  `ir_pod_no` varchar(100) NOT NULL,
  `ir_pod_date` varchar(100) NOT NULL,
  `snr_dispatch_mode` varchar(150) DEFAULT NULL,
  `snr_pod_no` varchar(50) DEFAULT NULL,
  `snr_pod_date` varchar(50) DEFAULT NULL,
  `snr_name_courier` varchar(100) DEFAULT NULL,
  `dc_ir_status` varchar(10) NOT NULL DEFAULT '0' COMMENT '0-Pending,1-Processing,2-Complete',
  `sign_mismatch_status` int(11) NOT NULL DEFAULT 0 COMMENT '1-sign_mismatch_status',
  `sign_reject_reason` varchar(100) DEFAULT NULL,
  `is_active` int(11) NOT NULL DEFAULT 1,
  `is_delete` int(11) NOT NULL DEFAULT 0,
  `updated` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `created` timestamp NOT NULL DEFAULT current_timestamp(),
  `acc_year` varchar(50) DEFAULT NULL,
  `session_id` varchar(50) DEFAULT NULL,
  `sess_user_type` varchar(50) DEFAULT NULL,
  `sess_user_id` varchar(50) DEFAULT NULL,
  `sess_company_id` varchar(50) DEFAULT NULL,
  `sess_branch_id` varchar(50) DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE IF NOT EXISTS `dc_num_status` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `unique_id` varchar(50) DEFAULT NULL,
  `form_main_unique_id` varchar(110) DEFAULT NULL,
  `po_unique_id` varchar(100) NOT NULL,
  `po_num` varchar(250) NOT NULL,
  `dc_number` varchar(100) DEFAULT NULL,
  `invoice_unique_id` varchar(100) DEFAULT NULL,
  `invoice_no` varchar(250) DEFAULT NULL,
  `invoice_auto_id` varchar(110) DEFAULT NULL,
  `doc_approval_sts` int(10) NOT NULL DEFAULT 0 COMMENT '0-Pending,1-Approval,2-Rejected',
  `ac_team_verifiy_status` int(10) NOT NULL DEFAULT 0 COMMENT '0-Pending,1-Approval,2-Rejected',
  `ac_team_approved_by` varchar(50) DEFAULT NULL,
  `invoice_doc_status` int(11) NOT NULL DEFAULT 0 COMMENT '0-Pending,1-Approval,2-Rejected, 3- complete',
  `dispatch_status` int(11) NOT NULL DEFAULT 0 COMMENT '0-dispatch pending ',
  `delivery_status` int(11) NOT NULL DEFAULT 0,
  `dc_required` varchar(10) DEFAULT '0',
  `snr_status` varchar(10) DEFAULT '0',
  `ir_required` varchar(10) NOT NULL DEFAULT '0',
  `installation_status` varchar(10) NOT NULL DEFAULT '0' COMMENT '0-pending,1-processing,2-complete 3-REJECTED 4-eng call attn',
  `dc_ir_dispatch_sts` varchar(10) NOT NULL DEFAULT '0' COMMENT '0-pending,1-processing, 3-Completed',
  `material_qc` int(11) NOT NULL DEFAULT 0 COMMENT '0-pending, 1-approved',
  `vendor_bulk_sts` varchar(11) DEFAULT '0',
  `vendor_team_sts` varchar(10) DEFAULT '0',
  `signed_doc_status` varchar(10) DEFAULT NULL,
  `dc_complete_status` varchar(10) DEFAULT '0' COMMENT '0-Not Completed,1-Completed',
  `dc_operation_date` varchar(20) DEFAULT NULL,
  `dc_app_date` varchar(20) DEFAULT NULL,
  `dc_mat_date` varchar(20) DEFAULT NULL,
  `dc_dispatch_date` varchar(20) DEFAULT NULL,
  `delv_conf_status` int(20) DEFAULT 0 COMMENT '0-pending,\r\n3-completed,\r\n5-not deliverd',
  `delv_conf_date` varchar(30) DEFAULT NULL,
  `vend_allc_date` varchar(20) DEFAULT NULL,
  `dc_install_date` varchar(20) DEFAULT NULL,
  `dc_ir_dispatch_date` varchar(20) DEFAULT NULL,
  `dc_sign_doc_date` varchar(20) DEFAULT NULL,
  `signed_complete_status` int(11) DEFAULT NULL,
  `updated` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `created` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE IF NOT EXISTS `delivery_status_in_transit` (
  `acc_year` varchar(10) DEFAULT NULL,
  `po_count` int(11) DEFAULT NULL,
  `invoice_count` int(11) DEFAULT NULL,
  `invoice_value` decimal(10,2) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE IF NOT EXISTS `department_creation` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `unique_id` varchar(50) NOT NULL,
  `acc_sector` varchar(30) NOT NULL,
  `department` varchar(100) NOT NULL,
  `description` longtext DEFAULT NULL,
  `ledger_name` varchar(250) DEFAULT NULL,
  `ledger_no` varchar(250) DEFAULT NULL,
  `empty` varchar(250) DEFAULT NULL,
  `is_active` int(11) DEFAULT 1,
  `is_delete` int(11) DEFAULT 0,
  `updated` timestamp NULL DEFAULT NULL,
  `created` timestamp NOT NULL DEFAULT current_timestamp(),
  `acc_year` varchar(50) DEFAULT NULL,
  `session_id` varchar(50) NOT NULL,
  `sess_user_type` varchar(50) NOT NULL,
  `sess_user_id` varchar(50) NOT NULL,
  `sess_company_id` varchar(50) NOT NULL,
  `sess_branch_id` varchar(50) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=244 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE IF NOT EXISTS `department_creation_sublist` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `unique_id` varchar(250) NOT NULL,
  `form_main_unique_id` varchar(50) NOT NULL,
  `ledger_name` varchar(250) DEFAULT NULL,
  `ledger_no` varchar(250) DEFAULT NULL,
  `is_active` int(11) NOT NULL DEFAULT 1,
  `is_delete` int(11) NOT NULL DEFAULT 0,
  `updated` timestamp NOT NULL DEFAULT current_timestamp(),
  `created` timestamp NOT NULL DEFAULT current_timestamp(),
  `acc_year` varchar(50) DEFAULT NULL,
  `session_id` varchar(50) NOT NULL,
  `sess_user_type` varchar(50) NOT NULL,
  `sess_user_id` varchar(50) NOT NULL,
  `sess_company_id` varchar(50) NOT NULL,
  `sess_branch_id` varchar(50) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=5078 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE IF NOT EXISTS `dispatch_list` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `unique_id` varchar(50) NOT NULL,
  `po_num` varchar(250) NOT NULL,
  `po_unique_id` varchar(50) NOT NULL,
  `po_form_unique_id` varchar(50) NOT NULL,
  `po_date` varchar(30) NOT NULL,
  `stock_id` varchar(50) NOT NULL,
  `name_of_courier` varchar(100) NOT NULL,
  `invoice_no` varchar(50) NOT NULL,
  `invoice_auto_id` varchar(50) NOT NULL,
  `invoice_date` varchar(50) NOT NULL,
  `consignee` varchar(250) NOT NULL,
  `consignee_unique_id` varchar(50) DEFAULT NULL,
  `pod_no` varchar(50) NOT NULL,
  `date` varchar(30) DEFAULT NULL,
  `con_address` varchar(250) NOT NULL,
  `con_contact_number` varchar(50) NOT NULL,
  `dispatch_date` varchar(50) NOT NULL,
  `dc_number` varchar(50) DEFAULT NULL,
  `dc_date` varchar(30) DEFAULT NULL,
  `mode_of_delivery` varchar(100) NOT NULL,
  `partial_sts` int(10) DEFAULT NULL,
  `status` varchar(50) NOT NULL DEFAULT '1' COMMENT '1-transit,2-dispatch,5-not_deliverd',
  `delivery_status` varchar(50) DEFAULT NULL,
  `engineer_name` varchar(100) DEFAULT NULL,
  `engg_type` varchar(100) DEFAULT NULL,
  `rate` varchar(100) DEFAULT NULL,
  `gst` varchar(50) DEFAULT NULL,
  `total_amount` varchar(100) DEFAULT NULL,
  `vendor_timeline` varchar(50) DEFAULT NULL,
  `vendor_bulk_sts` varchar(10) DEFAULT '0',
  `vendor_team_sts` varchar(10) DEFAULT '0',
  `delivery_date` varchar(50) DEFAULT NULL,
  `delivery_proof` varchar(200) DEFAULT NULL,
  `einvoice_file` varchar(80) DEFAULT NULL,
  `einvoice_file_org` varchar(80) DEFAULT NULL,
  `file_org_name` varchar(200) DEFAULT NULL,
  `file_name` varchar(255) DEFAULT NULL,
  `pod_proof` varchar(255) DEFAULT NULL,
  `podfile_org_name` varchar(255) DEFAULT NULL,
  `rec_person_name` varchar(50) DEFAULT NULL,
  `rec_contact_no` varchar(30) DEFAULT NULL,
  `pro_rec_date` varchar(30) DEFAULT NULL,
  `deliv_remarks` varchar(30) DEFAULT NULL,
  `delv_conf_person` varchar(30) DEFAULT NULL,
  `delv_conf_date` varchar(30) DEFAULT NULL,
  `is_active` int(11) NOT NULL DEFAULT 1,
  `is_delete` int(11) NOT NULL DEFAULT 0,
  `updated` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `created` timestamp NOT NULL DEFAULT current_timestamp(),
  `acc_year` varchar(50) NOT NULL,
  `session_id` varchar(50) NOT NULL,
  `sess_user_type` varchar(50) NOT NULL,
  `sess_user_id` varchar(50) NOT NULL,
  `sess_company_id` varchar(50) NOT NULL,
  `sess_branch_id` varchar(50) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE IF NOT EXISTS `district_creation` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `unique_id` varchar(50) NOT NULL,
  `district_name` varchar(100) NOT NULL,
  `state_name` varchar(100) NOT NULL,
  `description` longtext DEFAULT NULL,
  `is_active` int(11) NOT NULL DEFAULT 1,
  `is_delete` int(11) NOT NULL DEFAULT 0,
  `updated` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `created` timestamp NOT NULL DEFAULT current_timestamp(),
  `acc_year` varchar(50) DEFAULT NULL,
  `session_id` varchar(50) DEFAULT NULL,
  `sess_user_type` varchar(50) DEFAULT NULL,
  `sess_user_id` varchar(50) DEFAULT NULL,
  `sess_company_id` varchar(50) DEFAULT NULL,
  `sess_branch_id` varchar(50) DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=1055 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci AVG_ROW_LENGTH=378;

CREATE TABLE IF NOT EXISTS `django_admin_log` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `action_time` datetime(6) NOT NULL,
  `object_id` longtext DEFAULT NULL,
  `object_repr` varchar(200) NOT NULL,
  `action_flag` smallint(5) unsigned NOT NULL CHECK (`action_flag` >= 0),
  `change_message` longtext NOT NULL,
  `content_type_id` int(11) DEFAULT NULL,
  `user_id` int(11) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `django_admin_log_content_type_id_c4bce8eb_fk_django_co` (`content_type_id`),
  KEY `django_admin_log_user_id_c564eba6_fk_auth_user_id` (`user_id`),
  CONSTRAINT `django_admin_log_content_type_id_c4bce8eb_fk_django_co` FOREIGN KEY (`content_type_id`) REFERENCES `django_content_type` (`id`),
  CONSTRAINT `django_admin_log_user_id_c564eba6_fk_auth_user_id` FOREIGN KEY (`user_id`) REFERENCES `auth_user` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE IF NOT EXISTS `django_content_type` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `app_label` varchar(100) NOT NULL,
  `model` varchar(100) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `django_content_type_app_label_model_76bd3d3b_uniq` (`app_label`,`model`)
) ENGINE=InnoDB AUTO_INCREMENT=17 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE IF NOT EXISTS `django_migrations` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `app` varchar(255) NOT NULL,
  `name` varchar(255) NOT NULL,
  `applied` datetime(6) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=30 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE IF NOT EXISTS `django_session` (
  `session_key` varchar(40) NOT NULL,
  `session_data` longtext NOT NULL,
  `expire_date` datetime(6) NOT NULL,
  PRIMARY KEY (`session_key`),
  KEY `django_session_expire_date_a5c62663` (`expire_date`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE IF NOT EXISTS `document_verification_accounts` (
  `acc_year` varchar(10) NOT NULL,
  `po_count` int(11) DEFAULT NULL,
  `invoice_count` int(11) DEFAULT NULL,
  `invoice_value` decimal(10,2) DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`acc_year`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE IF NOT EXISTS `engineer_name_creation` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `engineer_name` varchar(255) DEFAULT NULL,
  `emp_id` varchar(100) NOT NULL,
  `unique_id` varchar(100) NOT NULL,
  `cate_type` int(10) NOT NULL DEFAULT 1,
  `is_active` int(11) NOT NULL DEFAULT 1,
  `is_delete` int(11) NOT NULL DEFAULT 0,
  `updated` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `created` timestamp NOT NULL DEFAULT current_timestamp(),
  `acc_year` varchar(50) NOT NULL,
  `session_id` varchar(50) NOT NULL,
  `sess_user_type` varchar(50) NOT NULL,
  `sess_user_id` varchar(50) NOT NULL,
  `sess_company_id` varchar(50) NOT NULL,
  `sess_branch_id` varchar(50) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=76 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE IF NOT EXISTS `executive_creation` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `unique_id` int(11) NOT NULL,
  `executive_name` varchar(100) NOT NULL,
  `is_active` int(11) NOT NULL,
  `is_delete` int(11) NOT NULL,
  `updated` timestamp NOT NULL DEFAULT current_timestamp(),
  `created` timestamp NOT NULL DEFAULT current_timestamp(),
  `acc_year` varchar(50) NOT NULL,
  `session_id` varchar(50) NOT NULL,
  `sess_user_type` varchar(50) NOT NULL,
  `sess_user_id` varchar(50) NOT NULL,
  `sess_company_id` varchar(50) NOT NULL,
  `sess_branch_id` varchar(50) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE IF NOT EXISTS `executive_name` (
  `s_no` int(11) NOT NULL AUTO_INCREMENT,
  `unique_id` varchar(50) NOT NULL,
  `executive_name` varchar(150) NOT NULL,
  `under_user_type` longtext DEFAULT NULL,
  `is_active` int(1) NOT NULL DEFAULT 1,
  `is_delete` int(1) NOT NULL DEFAULT 0,
  `updated` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `created` timestamp NOT NULL DEFAULT current_timestamp(),
  `acc_year` varchar(50) DEFAULT NULL,
  `session_id` varchar(50) DEFAULT NULL,
  `sess_user_type` varchar(50) DEFAULT NULL,
  `sess_user_id` varchar(50) DEFAULT NULL,
  `sess_company_id` varchar(50) DEFAULT NULL,
  `sess_branch_id` varchar(50) DEFAULT NULL,
  PRIMARY KEY (`s_no`)
) ENGINE=InnoDB AUTO_INCREMENT=72 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci AVG_ROW_LENGTH=1365;

CREATE TABLE IF NOT EXISTS `health_picme_followups_sub` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `unique_id` varchar(35) NOT NULL,
  `form_main_unique_id` varchar(100) NOT NULL,
  `screen_unique_id` varchar(100) NOT NULL,
  `phc_name` varchar(100) NOT NULL,
  `financial_year` varchar(100) NOT NULL,
  `entry_date` date DEFAULT NULL,
  `hsc_name` varchar(100) NOT NULL,
  `mr` varchar(100) NOT NULL,
  `md` varchar(100) NOT NULL,
  `cr` varchar(100) NOT NULL,
  `vr` varchar(100) NOT NULL,
  `is_active` int(1) NOT NULL DEFAULT 1,
  `is_delete` int(1) NOT NULL DEFAULT 0,
  `updated` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `created` timestamp NOT NULL DEFAULT current_timestamp(),
  `acc_year` varchar(50) DEFAULT NULL,
  `session_id` varchar(50) DEFAULT NULL,
  `sess_user_type` varchar(50) DEFAULT NULL,
  `sess_user_id` varchar(50) DEFAULT NULL,
  `sess_company_id` varchar(50) DEFAULT NULL,
  `sess_branch_id` varchar(50) DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE IF NOT EXISTS `installation_details` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `unique_id` varchar(50) DEFAULT NULL,
  `po_form_unique_id` varchar(100) DEFAULT NULL,
  `po_auto_id` varchar(100) DEFAULT NULL,
  `po_num` varchar(250) DEFAULT NULL,
  `po_date` varchar(100) DEFAULT NULL,
  `invoice_auto_id` varchar(100) NOT NULL,
  `invoice_no` varchar(100) NOT NULL,
  `invoice_date` varchar(100) NOT NULL,
  `consignee_unique_id` varchar(100) NOT NULL,
  `engineer_name` varchar(200) NOT NULL,
  `installation_com_date` varchar(100) DEFAULT NULL,
  `eng_remarks` longtext DEFAULT NULL,
  `cus_ack_date` varchar(100) DEFAULT NULL,
  `documents_type` varchar(100) DEFAULT NULL,
  `documents_type1` varchar(100) DEFAULT NULL,
  `documents_type2` varchar(100) DEFAULT NULL,
  `dc_received_sts` varchar(100) DEFAULT NULL,
  `dc_cus_signed_date` varchar(100) DEFAULT NULL,
  `engg_type` varchar(10) DEFAULT NULL,
  `in_charge` varchar(200) DEFAULT NULL,
  `gst_percent` varchar(30) DEFAULT NULL,
  `ttl_amnt` varchar(50) DEFAULT NULL,
  `dc_file` varchar(255) DEFAULT NULL,
  `dc_number` varchar(30) DEFAULT NULL,
  `dc_original_name` varchar(255) DEFAULT NULL,
  `ir_rec_status` varchar(100) DEFAULT NULL,
  `ir_cus_signed_date` varchar(100) DEFAULT NULL,
  `ir_file` varchar(255) DEFAULT NULL,
  `ir_original_name` varchar(255) DEFAULT NULL,
  `snr_rec_status` varchar(100) DEFAULT NULL,
  `snr_cus_signed_date` varchar(100) DEFAULT NULL,
  `snr_file` varchar(255) DEFAULT NULL,
  `snr_original_name` varchar(255) DEFAULT NULL,
  `document_verification_status` varchar(50) NOT NULL DEFAULT '0' COMMENT '0-Pending,1-Mismatch,2-Verified',
  `dc_delivery_status` varchar(50) NOT NULL DEFAULT '0' COMMENT '0-Pending,1-snr,5-partial completed ,3-Complete',
  `dc_required` varchar(50) DEFAULT NULL,
  `sign_mismatch_status` int(11) NOT NULL DEFAULT 0 COMMENT '1-mismatch sign doc',
  `sign_reject_reason` varchar(100) DEFAULT NULL,
  `installation_date` varchar(100) DEFAULT NULL,
  `vendor_bulk_timeline` varchar(15) DEFAULT NULL,
  `ir_complition_date` varchar(100) DEFAULT NULL,
  `without_snr` varchar(250) DEFAULT NULL,
  `snr_verify_status` int(11) NOT NULL DEFAULT 0,
  `team_mem` varchar(30) DEFAULT NULL,
  `is_active` int(11) NOT NULL DEFAULT 1,
  `is_delete` int(11) NOT NULL DEFAULT 0,
  `updated` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `created` timestamp NOT NULL DEFAULT current_timestamp(),
  `acc_year` varchar(50) DEFAULT NULL,
  `session_id` varchar(50) DEFAULT NULL,
  `sess_user_type` varchar(50) DEFAULT NULL,
  `sess_user_id` varchar(50) DEFAULT NULL,
  `sess_company_id` varchar(50) DEFAULT NULL,
  `sess_branch_id` varchar(50) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `po_form_unique_id` (`po_form_unique_id`,`invoice_no`,`consignee_unique_id`),
  KEY `document_verification_status` (`document_verification_status`,`dc_delivery_status`,`dc_required`),
  KEY `documents_type` (`documents_type`,`documents_type1`,`documents_type2`,`is_delete`),
  KEY `po_num` (`po_num`,`engineer_name`),
  KEY `dc_number` (`dc_number`),
  KEY `document_verification_status_2` (`document_verification_status`,`dc_delivery_status`,`dc_required`,`sign_reject_reason`),
  KEY `snr_rec_status` (`snr_rec_status`,`snr_cus_signed_date`,`snr_file`),
  KEY `ir_rec_status` (`ir_rec_status`,`ir_cus_signed_date`,`ir_file`,`ir_original_name`),
  KEY `dc_received_sts` (`dc_received_sts`,`dc_cus_signed_date`,`dc_file`),
  KEY `acc_year` (`acc_year`),
  KEY `team_mem` (`team_mem`),
  KEY `sess_user_id` (`sess_user_id`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE IF NOT EXISTS `installation_details_sublist` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `unique_id` varchar(50) DEFAULT NULL,
  `installation_id` varchar(200) DEFAULT NULL,
  `form_unique_id` varchar(50) DEFAULT NULL,
  `po_form_unique_id` varchar(100) DEFAULT NULL,
  `po_auto_id` varchar(100) DEFAULT NULL,
  `po_num` varchar(100) NOT NULL,
  `po_date` varchar(100) NOT NULL,
  `invoice_auto_id` varchar(100) NOT NULL,
  `invoice_no` varchar(100) NOT NULL,
  `invoice_date` varchar(100) NOT NULL,
  `vendor_bulk_timeline` varchar(15) DEFAULT NULL,
  `ir_complition_date` varchar(15) DEFAULT NULL,
  `consignee_unique_id` varchar(100) NOT NULL,
  `engineer_name` varchar(100) NOT NULL,
  `eng_remarks` longtext DEFAULT NULL,
  `installation_com_date` varchar(100) DEFAULT NULL,
  `cus_ack_date` varchar(100) DEFAULT NULL,
  `documents_type` varchar(20) DEFAULT NULL,
  `documents_type1` varchar(20) DEFAULT NULL,
  `documents_type2` varchar(20) DEFAULT NULL,
  `dc_received_sts` varchar(40) DEFAULT NULL,
  `dc_cus_signed_date` varchar(100) DEFAULT NULL,
  `dc_file` varchar(100) DEFAULT NULL,
  `dc_number` varchar(30) DEFAULT NULL,
  `dc_original_name` varchar(100) DEFAULT NULL,
  `ir_rec_status` varchar(100) DEFAULT NULL,
  `ir_cus_signed_date` varchar(200) DEFAULT NULL,
  `ir_file` varchar(100) DEFAULT NULL,
  `ir_original_name` varchar(100) DEFAULT NULL,
  `snr_rec_status` varchar(100) DEFAULT NULL,
  `snr_cus_signed_date` varchar(100) DEFAULT NULL,
  `snr_file` varchar(100) DEFAULT NULL,
  `snr_original_name` varchar(100) DEFAULT NULL,
  `document_verification_status` varchar(50) NOT NULL DEFAULT '0' COMMENT '0-Pending,1-Mismatch,2-Verified',
  `dc_delivery_status` varchar(50) NOT NULL DEFAULT '0' COMMENT '0-Pending,1-Complete',
  `sign_mismatch_status` int(11) NOT NULL DEFAULT 0 COMMENT 'mismatch sign doc',
  `sign_reject_reason` varchar(100) DEFAULT NULL,
  `installation_date` varchar(250) DEFAULT NULL,
  `team_mem` varchar(50) DEFAULT NULL,
  `is_active` int(11) NOT NULL DEFAULT 1,
  `is_delete` int(11) NOT NULL DEFAULT 0,
  `updated` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `created` timestamp NOT NULL DEFAULT current_timestamp(),
  `acc_year` varchar(50) DEFAULT NULL,
  `session_id` varchar(50) DEFAULT NULL,
  `sess_user_type` varchar(50) DEFAULT NULL,
  `sess_user_id` varchar(50) DEFAULT NULL,
  `sess_company_id` varchar(50) DEFAULT NULL,
  `sess_branch_id` varchar(50) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `form_unique_id` (`form_unique_id`),
  KEY `invoice_no` (`invoice_no`,`consignee_unique_id`),
  KEY `documents_type` (`documents_type`,`documents_type1`,`documents_type2`),
  KEY `document_verification_status` (`document_verification_status`,`dc_delivery_status`,`is_delete`),
  KEY `po_form_unique_id` (`po_form_unique_id`,`engineer_name`,`installation_com_date`),
  KEY `dc_number` (`dc_number`),
  KEY `unique_id` (`unique_id`),
  KEY `team_mem` (`team_mem`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE IF NOT EXISTS `installation_summary` (
  `acc_year` varchar(10) NOT NULL,
  `invoice_count` int(11) DEFAULT NULL,
  `po_count` int(11) DEFAULT NULL,
  `invoice_value` decimal(10,2) DEFAULT NULL,
  `doc_po_count` int(20) DEFAULT NULL,
  `doc_invoice_count` int(20) DEFAULT NULL,
  `doc_invoice_value` int(20) DEFAULT NULL,
  `engg_po_count` int(20) DEFAULT NULL,
  `engg_invoice_count` int(30) DEFAULT NULL,
  `engg_invoice_value` int(30) DEFAULT NULL,
  `snr_po_count` int(30) DEFAULT NULL,
  `snr_invoice_value` int(30) DEFAULT NULL,
  `snr_install_count` int(30) DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE IF NOT EXISTS `insurence_type` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `unique_id` varchar(50) NOT NULL,
  `insurence_type` varchar(100) NOT NULL,
  `is_active` int(11) NOT NULL DEFAULT 1,
  `is_delete` varchar(100) DEFAULT '0',
  `acc_year` varchar(10) DEFAULT NULL,
  `updated` timestamp NULL DEFAULT NULL,
  `created` timestamp NULL DEFAULT NULL,
  `session_id` varchar(50) NOT NULL,
  `sess_user_type` varchar(50) NOT NULL,
  `sess_user_id` varchar(50) NOT NULL,
  `sess_company_id` varchar(50) NOT NULL,
  `sess_branch_id` varchar(50) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=17 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci AVG_ROW_LENGTH=1365;

CREATE TABLE IF NOT EXISTS `invoice_creation` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `unique_id` varchar(50) NOT NULL,
  `invoice_auto_id` varchar(100) NOT NULL,
  `po_unique_id` varchar(50) NOT NULL,
  `po_num` varchar(250) NOT NULL,
  `dc_num` varchar(100) DEFAULT NULL,
  `dc_date` date DEFAULT NULL,
  `batch_id` varchar(30) DEFAULT NULL,
  `po_auto_id` varchar(100) NOT NULL,
  `team_mem` varchar(50) DEFAULT NULL,
  `executive_name` varchar(100) NOT NULL,
  `consignee_id` varchar(100) NOT NULL,
  `ledger_name` varchar(100) DEFAULT NULL,
  `ledger_no` varchar(100) DEFAULT NULL,
  `invoice_no` varchar(100) DEFAULT NULL,
  `invoice_qty` int(11) NOT NULL,
  `unit_price` varchar(20) NOT NULL,
  `invoice_qty_value` varchar(30) NOT NULL,
  `product_unique_id` varchar(80) NOT NULL,
  `item_code` varchar(250) NOT NULL,
  `product` text NOT NULL,
  `stock_id` varchar(50) DEFAULT NULL,
  `stock_date` date DEFAULT NULL,
  `item_qty` int(11) NOT NULL,
  `doc_approval_sts` varchar(50) NOT NULL DEFAULT '0' COMMENT '0-Pending,1-Approved,2-Rejected',
  `approved_by` varchar(50) DEFAULT NULL,
  `approved_date` varchar(50) DEFAULT NULL,
  `material_qc` int(11) NOT NULL DEFAULT 0 COMMENT '0-pending, 1-approved',
  `ser_no` longtext DEFAULT NULL,
  `seril_no_selc` varchar(10) DEFAULT NULL,
  `spec_srl_no` int(11) DEFAULT NULL,
  `mon_ser_no` longtext DEFAULT NULL,
  `ser_num_up_status` varchar(10) DEFAULT NULL,
  `material_qc_approved` varchar(100) DEFAULT NULL,
  `material_qc_reject_reason` varchar(250) DEFAULT NULL,
  `delivery_due_days` varchar(250) DEFAULT NULL,
  `is_active` int(11) NOT NULL DEFAULT 1,
  `is_delete` int(11) NOT NULL DEFAULT 0,
  `updated` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `created` timestamp NOT NULL DEFAULT current_timestamp(),
  `acc_year` varchar(50) NOT NULL,
  `session_id` varchar(50) NOT NULL,
  `sess_user_type` varchar(50) NOT NULL,
  `sess_user_id` varchar(50) NOT NULL,
  `sess_company_id` varchar(50) NOT NULL,
  `sess_branch_id` varchar(50) NOT NULL,
  `po_date` date DEFAULT NULL,
  `invoice_date` date DEFAULT NULL,
  `assign_stock_id` varchar(30) DEFAULT NULL,
  `assign_date` varchar(30) DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE IF NOT EXISTS `invoice_creation_26` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `unique_id` varchar(50) NOT NULL,
  `invoice_auto_id` varchar(100) NOT NULL,
  `po_unique_id` varchar(50) NOT NULL,
  `po_num` varchar(250) NOT NULL,
  `dc_num` varchar(100) DEFAULT NULL,
  `dc_date` date DEFAULT NULL,
  `batch_id` varchar(30) DEFAULT NULL,
  `po_auto_id` varchar(100) NOT NULL,
  `team_mem` varchar(50) DEFAULT NULL,
  `executive_name` varchar(100) NOT NULL,
  `consignee_id` varchar(100) NOT NULL,
  `ledger_name` varchar(100) DEFAULT NULL,
  `ledger_no` varchar(100) DEFAULT NULL,
  `invoice_no` varchar(100) DEFAULT NULL,
  `invoice_qty` int(11) NOT NULL,
  `unit_price` varchar(20) NOT NULL,
  `invoice_qty_value` varchar(30) NOT NULL,
  `product_unique_id` varchar(80) NOT NULL,
  `item_code` varchar(250) NOT NULL,
  `product` text NOT NULL,
  `stock_id` varchar(50) DEFAULT NULL,
  `stock_date` date DEFAULT NULL,
  `item_qty` int(11) NOT NULL,
  `doc_approval_sts` varchar(50) NOT NULL DEFAULT '0' COMMENT '0-Pending,1-Approved,2-Rejected',
  `approved_by` varchar(50) DEFAULT NULL,
  `approved_date` varchar(50) DEFAULT NULL,
  `material_qc` int(11) NOT NULL DEFAULT 0 COMMENT '0-pending, 1-approved',
  `ser_no` longtext DEFAULT NULL,
  `seril_no_selc` varchar(10) DEFAULT NULL,
  `spec_srl_no` int(11) DEFAULT NULL,
  `mon_ser_no` longtext DEFAULT NULL,
  `ser_num_up_status` varchar(10) DEFAULT NULL,
  `material_qc_approved` varchar(100) DEFAULT NULL,
  `material_qc_reject_reason` varchar(250) DEFAULT NULL,
  `delivery_due_days` varchar(250) DEFAULT NULL,
  `is_active` int(11) NOT NULL DEFAULT 1,
  `is_delete` int(11) NOT NULL DEFAULT 0,
  `updated` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `created` timestamp NOT NULL DEFAULT current_timestamp(),
  `acc_year` varchar(50) NOT NULL,
  `session_id` varchar(50) NOT NULL,
  `sess_user_type` varchar(50) NOT NULL,
  `sess_user_id` varchar(50) NOT NULL,
  `sess_company_id` varchar(50) NOT NULL,
  `sess_branch_id` varchar(50) NOT NULL,
  `po_date` date DEFAULT NULL,
  `invoice_date` date DEFAULT NULL,
  `assign_stock_id` varchar(30) DEFAULT NULL,
  `assign_date` varchar(30) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `unique_id` (`unique_id`,`invoice_auto_id`,`po_num`,`dc_num`,`dc_date`)
) ENGINE=InnoDB AUTO_INCREMENT=14704 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE IF NOT EXISTS `invoice_creation_main` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `unique_id` varchar(50) NOT NULL,
  `form_main_unique_id` varchar(100) NOT NULL,
  `po_unique_id` varchar(100) DEFAULT NULL,
  `po_num` varchar(250) DEFAULT NULL,
  `dc_number` varchar(100) DEFAULT NULL,
  `dc_date` date DEFAULT NULL,
  `team_mem` varchar(50) DEFAULT NULL,
  `invoice_no` varchar(250) DEFAULT NULL,
  `ledger_name` varchar(250) DEFAULT NULL,
  `ledger_no` varchar(150) DEFAULT NULL,
  `invoice_auto_id` varchar(100) DEFAULT NULL,
  `stock_id` varchar(100) DEFAULT NULL,
  `stock_date` varchar(100) DEFAULT NULL,
  `assign_stock_id` varchar(30) DEFAULT NULL,
  `assign_date` varchar(30) DEFAULT NULL,
  `stock_qty` varchar(20) DEFAULT NULL,
  `con_assign_qty` varchar(50) DEFAULT NULL,
  `executive_name` varchar(100) DEFAULT NULL,
  `consignee_unique_id` varchar(80) DEFAULT NULL,
  `product_unique_id` varchar(100) DEFAULT NULL,
  `no_of_items` varchar(10) DEFAULT NULL,
  `invoice_qty` varchar(20) DEFAULT NULL,
  `net_price` varchar(250) DEFAULT NULL,
  `invoice_value` varchar(50) DEFAULT NULL,
  `doc_approval_sts` int(10) NOT NULL DEFAULT 0 COMMENT '0-Pending,1-Approval,2-Rejected',
  `ac_team_verifiy_status` int(10) NOT NULL DEFAULT 0 COMMENT '0-Pending,1-Approval,2-Rejected',
  `ac_team_approved_by` varchar(50) DEFAULT NULL,
  `invoice_doc_status` int(11) NOT NULL DEFAULT 0 COMMENT '0-Pending,1-Approval,2-Rejected, 3- complete',
  `approved_by` varchar(80) DEFAULT NULL,
  `approved_date` varchar(50) DEFAULT NULL,
  `dispatch_status` int(11) NOT NULL DEFAULT 0 COMMENT '0-dispatch pending, 2-dispatch',
  `delivery_status` int(11) NOT NULL DEFAULT 0,
  `installation_status` varchar(10) NOT NULL DEFAULT '0' COMMENT '0-pending,1-processing,2-complete 3-REJECTED 4-eng call attn',
  `engineer_name` varchar(100) DEFAULT NULL,
  `engg_type` varchar(255) DEFAULT NULL,
  `date` varchar(255) DEFAULT NULL,
  `in_charge` varchar(255) DEFAULT NULL,
  `bulk_dc_total_amount` varchar(100) DEFAULT NULL,
  `eng_remarks` longtext DEFAULT NULL,
  `installation_com_date` varchar(100) DEFAULT NULL,
  `sign_mismatch_status` int(11) NOT NULL DEFAULT 0 COMMENT '1-sign_mismatch_status',
  `sign_reject_reason` varchar(100) DEFAULT NULL,
  `dc_ir_dispatch_sts` varchar(10) NOT NULL DEFAULT '0' COMMENT '0-pending,1-processing,2-complete 3-rejected sign doc',
  `bg_status` int(5) NOT NULL DEFAULT 0 COMMENT '0-Pending,1-Complete',
  `bill_status` varchar(50) NOT NULL DEFAULT '0' COMMENT '0-Pending,1-Completed,2-billing',
  `invoice_status` int(11) NOT NULL DEFAULT 0 COMMENT '0-pending,1_partial pending,2_complete',
  `reject_reason_elcot` longtext DEFAULT NULL,
  `ac_approved_date` date DEFAULT NULL,
  `material_qc` int(11) NOT NULL DEFAULT 0 COMMENT '0-pending, 1-approved',
  `material_qc_approved` varchar(30) DEFAULT NULL,
  `material_qc_reject_reason` varchar(250) DEFAULT NULL,
  `ser_no` longtext DEFAULT NULL,
  `seril_no_selc` varchar(10) DEFAULT NULL,
  `spec_srl_no` int(11) DEFAULT NULL,
  `is_active` int(11) NOT NULL DEFAULT 1,
  `is_delete` int(11) NOT NULL DEFAULT 0,
  `updated` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `created` timestamp NOT NULL DEFAULT current_timestamp(),
  `acc_year` varchar(50) NOT NULL,
  `session_id` varchar(50) NOT NULL,
  `sess_user_type` varchar(50) NOT NULL,
  `sess_user_id` varchar(50) NOT NULL,
  `sess_company_id` varchar(50) NOT NULL,
  `sess_branch_id` varchar(50) NOT NULL,
  `invoice_date` date DEFAULT NULL,
  `po_date` date DEFAULT NULL,
  `serial_number_status` varchar(10) DEFAULT NULL,
  `vendor_bulk_sts` varchar(11) DEFAULT '0',
  `bulk_eng_type` varchar(40) DEFAULT NULL,
  `bulk_eng_name` varchar(30) DEFAULT NULL,
  `vendor_bulk_rate` varchar(40) DEFAULT NULL,
  `vendor_bulk_gst` varchar(30) DEFAULT NULL,
  `bulk_total_amount` varchar(30) DEFAULT NULL,
  `partial_sts` int(11) DEFAULT NULL,
  `vendor_bulk_zone` varchar(30) DEFAULT NULL,
  `vendor_bulk_timeline` varchar(30) DEFAULT NULL,
  `vendor_team_sts` varchar(10) DEFAULT '0',
  `vendor_payment_status` int(20) DEFAULT 0,
  `team_alloc_region` varchar(30) DEFAULT NULL,
  `team_alloc_state` varchar(30) DEFAULT NULL,
  `team_alloc_district` varchar(30) DEFAULT NULL,
  `team_alloc_eng_type` varchar(100) DEFAULT NULL,
  `team_alloc_eng_name` varchar(100) DEFAULT NULL,
  `assign_remaining_qty` varchar(100) DEFAULT NULL,
  `vendor_timeline` varchar(30) DEFAULT NULL,
  `vendor_ins_date` varchar(30) DEFAULT NULL,
  `ven_assign_no` varchar(30) DEFAULT NULL,
  `ven_assign_date` varchar(30) DEFAULT NULL,
  `vendor_allocated_by` varchar(30) DEFAULT NULL,
  `vendor_allocated_date` varchar(30) DEFAULT NULL,
  `event_status` varchar(30) DEFAULT NULL,
  `vendor_bill_rejected_by` varchar(255) DEFAULT '',
  PRIMARY KEY (`id`),
  KEY `ac_team_verifiy_status` (`ac_team_verifiy_status`,`dispatch_status`,`material_qc`),
  KEY `doc_approval_sts` (`doc_approval_sts`),
  KEY `idx_invoice_unique` (`unique_id`),
  KEY `idx_icm_delete_auto_dc` (`is_delete`,`invoice_auto_id`,`dc_number`)
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE IF NOT EXISTS `invoice_creation_main_payment_data` (
  `id` int(11) NOT NULL,
  `unique_id` varchar(50) NOT NULL,
  `form_main_unique_id` text NOT NULL,
  `po_unique_id` text NOT NULL,
  `po_num` text NOT NULL,
  `dc_number` text DEFAULT NULL,
  `dc_date` date DEFAULT NULL,
  `team_mem` varchar(50) DEFAULT NULL,
  `invoice_no` text DEFAULT NULL,
  `ledger_name` text DEFAULT NULL,
  `ledger_no` text DEFAULT NULL,
  `invoice_auto_id` text DEFAULT NULL,
  `stock_id` text DEFAULT NULL,
  `stock_date` date DEFAULT NULL,
  `assign_stock_id` varchar(30) DEFAULT NULL,
  `assign_date` date DEFAULT NULL,
  `stock_qty` varchar(20) DEFAULT NULL,
  `con_assign_qty` varchar(50) DEFAULT NULL,
  `executive_name` text DEFAULT NULL,
  `consignee_unique_id` varchar(80) DEFAULT NULL,
  `product_unique_id` text DEFAULT NULL,
  `no_of_items` varchar(10) DEFAULT NULL,
  `invoice_qty` varchar(20) DEFAULT NULL,
  `net_price` text DEFAULT NULL,
  `invoice_value` varchar(50) DEFAULT NULL,
  `doc_approval_sts` int(10) NOT NULL DEFAULT 0 COMMENT '0-Pending,1-Approval,2-Rejected',
  `ac_team_verifiy_status` int(10) NOT NULL DEFAULT 0 COMMENT '0-Pending,1-Approval,2-Rejected',
  `ac_team_approved_by` varchar(50) DEFAULT NULL,
  `invoice_doc_status` int(11) NOT NULL DEFAULT 0 COMMENT '0-Pending,1-Approval,2-Rejected, 3- complete',
  `approved_by` varchar(80) DEFAULT NULL,
  `approved_date` date DEFAULT NULL,
  `dispatch_status` int(11) NOT NULL DEFAULT 0 COMMENT '0-dispatch pending, 2-dispatch',
  `delivery_status` int(11) NOT NULL DEFAULT 0,
  `installation_status` varchar(10) NOT NULL DEFAULT '0' COMMENT '0-pending,1-processing,2-complete 3-REJECTED 4-eng call attn',
  `engineer_name` text DEFAULT NULL,
  `engg_type` text DEFAULT NULL,
  `date` text DEFAULT NULL,
  `in_charge` text DEFAULT NULL,
  `bulk_dc_total_amount` text DEFAULT NULL,
  `eng_remarks` longtext DEFAULT NULL,
  `installation_com_date` date DEFAULT NULL,
  `sign_mismatch_status` int(11) NOT NULL DEFAULT 0 COMMENT '1-sign_mismatch_status',
  `sign_reject_reason` text DEFAULT NULL,
  `dc_ir_dispatch_sts` varchar(10) NOT NULL DEFAULT '0' COMMENT '0-pending,1-processing,2-complete 3-rejected sign doc',
  `bg_status` int(5) NOT NULL DEFAULT 0 COMMENT '0-Pending,1-Complete',
  `bill_status` varchar(50) NOT NULL DEFAULT '0' COMMENT '0-Pending,1-Completed,2-billing',
  `invoice_status` int(11) NOT NULL DEFAULT 0 COMMENT '0-pending,1_partial pending,2_complete',
  `reject_reason_elcot` longtext DEFAULT NULL,
  `ac_approved_date` date DEFAULT NULL,
  `material_qc` int(11) NOT NULL DEFAULT 0 COMMENT '0-pending, 1-approved',
  `material_qc_approved` varchar(30) DEFAULT NULL,
  `material_qc_reject_reason` varchar(250) DEFAULT NULL,
  `ser_no` longtext DEFAULT NULL,
  `seril_no_selc` varchar(10) DEFAULT NULL,
  `spec_srl_no` int(11) DEFAULT NULL,
  `is_active` int(11) NOT NULL DEFAULT 1,
  `is_delete` int(11) NOT NULL DEFAULT 0,
  `updated` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `created` timestamp NOT NULL DEFAULT current_timestamp(),
  `acc_year` varchar(50) NOT NULL,
  `session_id` varchar(50) NOT NULL,
  `sess_user_type` varchar(50) NOT NULL,
  `sess_user_id` varchar(50) NOT NULL,
  `sess_company_id` varchar(50) NOT NULL,
  `sess_branch_id` varchar(50) NOT NULL,
  `invoice_date` date DEFAULT NULL,
  `po_date` date DEFAULT NULL,
  `serial_number_status` varchar(10) DEFAULT NULL,
  `vendor_bulk_sts` varchar(11) DEFAULT '0',
  `bulk_eng_type` varchar(40) DEFAULT NULL,
  `bulk_eng_name` varchar(30) DEFAULT NULL,
  `vendor_bulk_rate` varchar(40) DEFAULT NULL,
  `vendor_bulk_gst` varchar(30) DEFAULT NULL,
  `bulk_total_amount` varchar(30) DEFAULT NULL,
  `vendor_bulk_zone` varchar(30) DEFAULT NULL,
  `vendor_bulk_timeline` varchar(30) DEFAULT NULL,
  `vendor_team_sts` varchar(10) DEFAULT '0',
  `team_alloc_region` varchar(30) DEFAULT NULL,
  `team_alloc_state` varchar(30) DEFAULT NULL,
  `team_alloc_district` varchar(30) DEFAULT NULL,
  `team_alloc_eng_type` text DEFAULT NULL,
  `team_alloc_eng_name` text DEFAULT NULL,
  `assign_remaining_qty` text DEFAULT NULL,
  `vendor_timeline` varchar(30) DEFAULT NULL,
  `vendor_ins_date` date DEFAULT NULL,
  `ven_assign_no` varchar(30) DEFAULT NULL,
  `ven_assign_date` date DEFAULT NULL,
  `vendor_allocated_by` varchar(30) DEFAULT NULL,
  `vendor_allocated_date` date DEFAULT NULL,
  `event_status` varchar(30) DEFAULT NULL,
  `bill_address` longtext DEFAULT NULL,
  `contact_name` text DEFAULT NULL,
  `contact_number` varchar(12) DEFAULT NULL,
  `landline_number` text DEFAULT NULL,
  `email` text DEFAULT NULL,
  `district` text DEFAULT NULL,
  `state_name` text DEFAULT NULL,
  `department` text DEFAULT NULL,
  `ins_reqired` varchar(10) DEFAULT NULL,
  `dc_required` text DEFAULT NULL,
  `insurence_required` varchar(10) DEFAULT NULL,
  `ld_required` varchar(10) DEFAULT NULL,
  `po_file_org_name` text DEFAULT NULL,
  `ld_delivery_due_date` date DEFAULT NULL,
  `file_name` text DEFAULT NULL,
  `dc_file_name` text DEFAULT NULL,
  `file_org_name` text DEFAULT NULL,
  `ir_file_name` text DEFAULT NULL,
  `ir_file_org_name` text DEFAULT NULL,
  `file_invoice` text DEFAULT NULL,
  `invoice_file_org_name` text DEFAULT NULL,
  `pod_no` varchar(50) DEFAULT NULL,
  `dispatch_delivery_status` varchar(50) DEFAULT NULL,
  `delivery_date` date DEFAULT NULL,
  `delivery_proof` text DEFAULT NULL,
  `einvoice_file` varchar(80) DEFAULT NULL,
  `pod_proof` text DEFAULT NULL,
  `name_of_courier` varchar(50) DEFAULT NULL,
  `mode_of_delivery` text DEFAULT NULL,
  `status` varchar(50) DEFAULT NULL,
  `documents_type` text DEFAULT NULL,
  `documents_type1` text DEFAULT NULL,
  `documents_type2` text DEFAULT NULL,
  `dc_delivery_status` varchar(50) DEFAULT NULL,
  `ins_dc_required` varchar(50) DEFAULT NULL,
  `doc_appload_person` varchar(50) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE IF NOT EXISTS `invoice_sublist` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `unique_id` varchar(50) NOT NULL,
  `invoice_id` varchar(100) DEFAULT NULL,
  `po_unique_id` varchar(50) DEFAULT NULL,
  `batch_id` varchar(30) DEFAULT NULL,
  `po_num` varchar(250) DEFAULT NULL,
  `dc_number` varchar(100) DEFAULT NULL,
  `dc_date` date DEFAULT NULL,
  `excutive_name` varchar(100) DEFAULT NULL,
  `no_of_consignee` int(11) DEFAULT NULL,
  `consignee` varchar(250) DEFAULT NULL,
  `consignee_unique_id` varchar(100) DEFAULT NULL,
  `form_main_unique_id` varchar(50) NOT NULL,
  `ledger_name` varchar(100) DEFAULT NULL,
  `ledger_no` varchar(100) DEFAULT NULL,
  `invoice_no` varchar(100) DEFAULT NULL,
  `doc_approval_sts` int(11) NOT NULL DEFAULT 0 COMMENT '0-Pending,1-Approval,2-Rejected',
  `ac_team_verifiy_status` int(11) NOT NULL DEFAULT 0 COMMENT '0-Pending,1-Approval,2-Rejected',
  `dc_file_name` varchar(100) DEFAULT NULL,
  `file_org_name` varchar(100) DEFAULT NULL,
  `ir_file_name` varchar(100) DEFAULT NULL,
  `ir_file_org_name` varchar(100) DEFAULT NULL,
  `file_invoice` varchar(100) DEFAULT NULL,
  `invoice_file_org_name` varchar(100) DEFAULT NULL,
  `reject_reason` longtext DEFAULT NULL,
  `is_active` int(11) NOT NULL DEFAULT 1,
  `is_delete` int(11) NOT NULL DEFAULT 0,
  `updated` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `created` timestamp NOT NULL DEFAULT current_timestamp(),
  `acc_year` varchar(50) DEFAULT NULL,
  `session_id` varchar(50) DEFAULT NULL,
  `sess_user_type` varchar(50) DEFAULT NULL,
  `sess_user_id` varchar(50) DEFAULT NULL,
  `sess_company_id` varchar(50) DEFAULT NULL,
  `sess_branch_id` varchar(50) DEFAULT NULL,
  `po_date` date DEFAULT NULL,
  `invoice_date` date DEFAULT NULL,
  `serial_no` varchar(200) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `unique_id` (`unique_id`,`invoice_id`,`po_unique_id`,`dc_number`,`dc_date`,`excutive_name`,`invoice_no`,`po_date`,`invoice_date`),
  KEY `is_delete` (`is_delete`,`acc_year`),
  KEY `consignee_unique_id` (`consignee_unique_id`,`form_main_unique_id`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE IF NOT EXISTS `invoice_sublist1` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `unique_id` varchar(50) NOT NULL,
  `invoice_id` varchar(100) DEFAULT NULL,
  `po_unique_id` varchar(50) DEFAULT NULL,
  `batch_id` varchar(30) DEFAULT NULL,
  `po_num` varchar(250) DEFAULT NULL,
  `dc_number` varchar(100) DEFAULT NULL,
  `dc_date` date DEFAULT NULL,
  `excutive_name` varchar(100) DEFAULT NULL,
  `no_of_consignee` int(11) DEFAULT NULL,
  `consignee` varchar(250) DEFAULT NULL,
  `consignee_unique_id` varchar(100) DEFAULT NULL,
  `form_main_unique_id` varchar(50) NOT NULL,
  `ledger_name` varchar(100) DEFAULT NULL,
  `ledger_no` varchar(100) DEFAULT NULL,
  `invoice_no` varchar(100) DEFAULT NULL,
  `doc_approval_sts` int(11) NOT NULL DEFAULT 0 COMMENT '0-Pending,1-Approval,2-Rejected',
  `ac_team_verifiy_status` int(11) NOT NULL DEFAULT 0 COMMENT '0-Pending,1-Approval,2-Rejected',
  `dc_file_name` varchar(100) DEFAULT NULL,
  `file_org_name` varchar(100) DEFAULT NULL,
  `ir_file_name` varchar(100) DEFAULT NULL,
  `ir_file_org_name` varchar(100) DEFAULT NULL,
  `file_invoice` varchar(100) DEFAULT NULL,
  `invoice_file_org_name` varchar(100) DEFAULT NULL,
  `reject_reason` longtext DEFAULT NULL,
  `is_active` int(11) NOT NULL DEFAULT 1,
  `is_delete` int(11) NOT NULL DEFAULT 0,
  `updated` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `created` timestamp NOT NULL DEFAULT current_timestamp(),
  `acc_year` varchar(50) DEFAULT NULL,
  `session_id` varchar(50) DEFAULT NULL,
  `sess_user_type` varchar(50) DEFAULT NULL,
  `sess_user_id` varchar(50) DEFAULT NULL,
  `sess_company_id` varchar(50) DEFAULT NULL,
  `sess_branch_id` varchar(50) DEFAULT NULL,
  `po_date` date DEFAULT NULL,
  `invoice_date` date DEFAULT NULL,
  `serial_no` varchar(200) DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=2586 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE IF NOT EXISTS `invoice_summary` (
  `acc_year` varchar(10) DEFAULT NULL,
  `po_count` int(11) DEFAULT NULL,
  `invoice_count` int(11) DEFAULT NULL,
  `invoice_value` decimal(10,2) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE IF NOT EXISTS `invoice_summary_approved` (
  `acc_year` varchar(10) DEFAULT NULL,
  `po_count` int(11) DEFAULT NULL,
  `invoice_count` int(11) DEFAULT NULL,
  `invoice_value` decimal(10,2) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE IF NOT EXISTS `invoice_summary_pending_dispatch` (
  `acc_year` varchar(10) DEFAULT NULL,
  `po_count` int(11) DEFAULT NULL,
  `invoice_count` int(11) DEFAULT NULL,
  `invoice_value` decimal(10,2) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE IF NOT EXISTS `invoice_verfication_table` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `unique_id` varchar(250) DEFAULT NULL,
  `form_main_unique_id` varchar(250) DEFAULT NULL,
  `consignee_unique_id` varchar(250) DEFAULT NULL,
  `po_num` varchar(255) DEFAULT NULL,
  `po_date` varchar(100) DEFAULT NULL,
  `dc_number` varchar(100) DEFAULT NULL,
  `dc_date` date DEFAULT NULL,
  `invoice_no` varchar(250) DEFAULT NULL,
  `ledger_name` varchar(250) DEFAULT NULL,
  `ledger_no` varchar(150) DEFAULT NULL,
  `invoice_auto_id` varchar(100) DEFAULT NULL,
  `invoice_date` varchar(100) DEFAULT NULL,
  `invoice_qty` varchar(20) DEFAULT NULL,
  `invoice_value` varchar(50) DEFAULT NULL,
  `doc_approval_sts` varchar(11) DEFAULT NULL COMMENT '0-Pending,1-Approval,2-Rejected',
  `ac_team_verifiy_status` varchar(11) DEFAULT NULL COMMENT '0-Pending,1-Approval,2-Rejected',
  `ac_team_approved_by` varchar(50) DEFAULT NULL,
  `invoice_doc_status` varchar(11) DEFAULT NULL COMMENT '0-Pending,1-Approval,2-Rejected, 3-Complete',
  `approved_by` varchar(80) DEFAULT NULL,
  `approved_date` varchar(100) DEFAULT NULL,
  `dispatch_status` varchar(11) DEFAULT NULL COMMENT '0-dispatch pending, 2-dispatch',
  `installation_status` varchar(10) DEFAULT NULL COMMENT '0-pending,1-processing,2-complete,3-rejected,4-eng call attn',
  `material_qc` int(11) DEFAULT NULL,
  `material_qc_approved` varchar(50) DEFAULT NULL,
  `material_qc_reject_reason` varchar(50) DEFAULT NULL,
  `acc_year` varchar(20) DEFAULT NULL,
  `engineer_name` varchar(100) DEFAULT NULL,
  `engg_type` varchar(100) DEFAULT NULL,
  `dispatch_com_status` varchar(50) DEFAULT NULL,
  `dc_delivery_status` varchar(50) DEFAULT NULL COMMENT '	0-Pending,1-snr,5-partial completed ,3-Complete	',
  `installation_com_date` varchar(50) DEFAULT NULL,
  `vendor_bulk_sts` varchar(11) DEFAULT NULL,
  `bulk_eng_type` varchar(30) DEFAULT NULL,
  `bulk_eng_name` varchar(40) DEFAULT NULL,
  `vendor_bulk_rate` varchar(30) DEFAULT NULL,
  `vendor_bulk_gst` varchar(30) DEFAULT NULL,
  `bulk_total_amount` varchar(30) DEFAULT NULL,
  `bulk_dc_total_amount` varchar(100) DEFAULT NULL,
  `vendor_inst_allocation_date` varchar(100) DEFAULT NULL,
  `vendor_bulk_timeline` varchar(30) DEFAULT NULL,
  `vendor_bulk_zone` varchar(40) DEFAULT NULL,
  `vendor_team_sts` varchar(50) DEFAULT NULL,
  `team_alloc_region` varchar(50) DEFAULT NULL,
  `team_alloc_state` varchar(100) DEFAULT NULL,
  `team_alloc_district` varchar(110) DEFAULT NULL,
  `team_alloc_eng_type` varchar(110) DEFAULT NULL,
  `team_alloc_eng_name` varchar(110) DEFAULT NULL,
  `assign_remaining_qty` varchar(110) DEFAULT NULL,
  `vendor_timeline` varchar(110) DEFAULT NULL,
  `ven_assign_no` varchar(110) DEFAULT NULL,
  `ven_assign_date` varchar(110) DEFAULT NULL,
  `vendor_allocated_by` varchar(110) DEFAULT NULL,
  `vendor_bill_no` varchar(110) DEFAULT NULL,
  `vendor_payment_allocated` varchar(10) DEFAULT '0' COMMENT '0-Pending 1-Allocated',
  `vendor_finance_approval` varchar(10) DEFAULT '0',
  `finance_approved_by` varchar(250) DEFAULT NULL,
  `finance_approved_date` varchar(250) DEFAULT NULL,
  `accountbillid` varchar(100) DEFAULT NULL,
  `finance_reject_reason` varchar(110) DEFAULT NULL,
  `rejected_stage` varchar(10) DEFAULT NULL COMMENT '1-Vendor_bill_approval 2-Accounts Team Entry 3-Accounts Team Approval 4-Management Team Bill Approval',
  `vendor_bill_approval` varchar(110) DEFAULT NULL,
  `document_verification_status` varchar(50) DEFAULT NULL,
  `dc_required` varchar(100) DEFAULT NULL,
  `inv_verify_status` varchar(110) DEFAULT NULL,
  `inv_verify_approvedby` varchar(110) DEFAULT NULL,
  `inv_verify_approved_date` varchar(110) DEFAULT NULL,
  `signed_complete_status` varchar(110) DEFAULT NULL,
  `bill_status` varchar(110) DEFAULT NULL,
  `status_app` varchar(110) DEFAULT NULL,
  `without_bg` varchar(110) DEFAULT NULL,
  `with_bg` varchar(110) DEFAULT NULL,
  `vendor_inv_attach_approval` varchar(110) DEFAULT NULL,
  `vendor_inv_attach_approval_date` varchar(110) DEFAULT NULL,
  `inv_verfiy_attach` varchar(110) DEFAULT NULL,
  `inv_verfiy_attach_org_name` varchar(110) DEFAULT NULL,
  `po_ven_filename` varchar(110) DEFAULT NULL,
  `po_ven_orgfilename` varchar(110) DEFAULT NULL,
  `veninvid` varchar(110) DEFAULT NULL,
  `user_vendor_invoice_id` varchar(110) DEFAULT NULL,
  `veninvstatus` int(110) DEFAULT 0 COMMENT '	0-pending 1-approval-2-rejected',
  `vendor_bill_app_status` int(110) DEFAULT 0 COMMENT '0-pending 1-approval 3-rejected',
  `vendor_bill_reject_reason` varchar(110) DEFAULT NULL,
  `vendor_bill_rejected_by` varchar(110) DEFAULT NULL,
  `vendor_bill_approval_allocated` int(11) DEFAULT 0 COMMENT '	0-pending,1-approval',
  `acctdsvalue` varchar(110) DEFAULT NULL,
  `accotherdeduction` varchar(110) DEFAULT NULL,
  `acctotalpaybleamount` varchar(110) DEFAULT NULL,
  `accid` varchar(110) DEFAULT NULL,
  `vendor_account_approved_by` varchar(110) DEFAULT NULL,
  `vendor_account_approval_date` varchar(100) DEFAULT NULL,
  `accstatus` int(11) DEFAULT 0 COMMENT '0-pending 1-completed',
  `managment_team_allocated` int(11) DEFAULT 0 COMMENT '0-pending 1-Allocated',
  `managment_team_approval_sts` int(11) DEFAULT 0 COMMENT '0-pending 1-Pending 2-completed,3-Rejected',
  `managment_team_approved_by` varchar(110) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `form_main_unique_id` (`form_main_unique_id`,`dc_number`),
  KEY `idx_ivt_auto_dc` (`invoice_auto_id`,`dc_number`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE IF NOT EXISTS `item_creation` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `unique_id` varchar(50) NOT NULL,
  `tender_name` varchar(50) DEFAULT NULL,
  `tender_no` varchar(50) DEFAULT NULL,
  `serial_no` varchar(20) DEFAULT NULL,
  `tender_code` varchar(50) DEFAULT NULL,
  `tender_type` varchar(50) DEFAULT NULL,
  `validity_from` varchar(50) DEFAULT NULL,
  `validity_to` varchar(50) DEFAULT NULL,
  `validity_date_extension` varchar(50) DEFAULT NULL,
  `is_active` int(11) NOT NULL DEFAULT 1,
  `is_delete` int(11) NOT NULL DEFAULT 0,
  `updated` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `created` timestamp NOT NULL DEFAULT current_timestamp(),
  `acc_year` varchar(50) DEFAULT NULL,
  `session_id` varchar(50) NOT NULL,
  `sess_user_type` varchar(50) NOT NULL,
  `sess_user_id` varchar(50) NOT NULL,
  `sess_company_id` varchar(50) NOT NULL,
  `sess_branch_id` varchar(50) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=408 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE IF NOT EXISTS `item_creation_sub` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `unique_id` varchar(50) NOT NULL,
  `tender_code` varchar(250) DEFAULT NULL,
  `item_code` varchar(250) DEFAULT NULL,
  `item_description` longtext DEFAULT NULL,
  `item_specification` longtext DEFAULT NULL,
  `brand` varchar(250) DEFAULT NULL,
  `product_category` varchar(250) DEFAULT NULL,
  `short_category` longtext DEFAULT NULL,
  `rc_unit_price` varchar(100) DEFAULT NULL,
  `rc_net_price` varchar(100) DEFAULT NULL,
  `gst` varchar(50) DEFAULT NULL,
  `warranty_in_yrs` varchar(50) DEFAULT NULL,
  `is_active` int(11) NOT NULL DEFAULT 1,
  `is_delete` int(11) NOT NULL DEFAULT 0,
  `updated` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `created` timestamp NOT NULL DEFAULT current_timestamp(),
  `acc_year` varchar(50) DEFAULT NULL,
  `session_id` varchar(50) DEFAULT NULL,
  `sess_user_type` varchar(50) DEFAULT NULL,
  `sess_user_id` varchar(50) DEFAULT NULL,
  `sess_company_id` varchar(50) DEFAULT NULL,
  `sess_branch_id` varchar(50) DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=1780 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE IF NOT EXISTS `item_schedule` (
  `id` int(250) NOT NULL AUTO_INCREMENT,
  `unique_id` varchar(250) NOT NULL,
  `schedule_name` varchar(250) DEFAULT NULL,
  `schedule_short_name` varchar(250) DEFAULT NULL,
  `item_directory` varchar(100) DEFAULT NULL,
  `is_active` int(11) NOT NULL DEFAULT 1,
  `is_delete` int(11) NOT NULL DEFAULT 0,
  `acc_year` varchar(40) DEFAULT NULL,
  `updated` datetime DEFAULT NULL,
  `created` datetime DEFAULT NULL,
  `session_id` varchar(50) DEFAULT NULL,
  `sess_user_type` varchar(50) DEFAULT NULL,
  `sess_user_id` varchar(50) DEFAULT NULL,
  `sess_company_id` varchar(50) DEFAULT NULL,
  `sess_branch_id` varchar(50) DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE IF NOT EXISTS `main_category` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `unique_id` varchar(40) NOT NULL,
  `main_category` varchar(50) NOT NULL,
  `description` longtext NOT NULL,
  `is_active` int(11) NOT NULL DEFAULT 0,
  `is_delete` int(11) DEFAULT 0,
  `updated` timestamp NOT NULL DEFAULT current_timestamp(),
  `created` timestamp NOT NULL DEFAULT current_timestamp(),
  `acc_year` varchar(50) NOT NULL,
  `session_id` varchar(50) NOT NULL,
  `sess_user_type` varchar(50) NOT NULL,
  `sess_user_id` varchar(50) NOT NULL,
  `sess_company_id` varchar(50) NOT NULL,
  `sess_branch_id` varchar(50) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=13 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE IF NOT EXISTS `master_productcategory` (
  `unique_id` int(11) NOT NULL AUTO_INCREMENT,
  `category_name` varchar(255) NOT NULL,
  `description` longtext DEFAULT NULL,
  `is_active` int(11) NOT NULL DEFAULT 1,
  `is_delete` int(11) NOT NULL DEFAULT 0,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`unique_id`),
  KEY `idx_master_productcategory_name` (`category_name`(191)),
  KEY `idx_master_productcategory_active_delete` (`is_active`,`is_delete`)
) ENGINE=InnoDB AUTO_INCREMENT=369 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE IF NOT EXISTS `material_qc` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `unique_id` varchar(50) DEFAULT NULL,
  `form_main_unique_id` varchar(100) NOT NULL,
  `total_qty` varchar(10) DEFAULT NULL,
  `net_value` varchar(250) DEFAULT NULL,
  `po_unique_id` varchar(100) NOT NULL,
  `po_num` varchar(250) DEFAULT NULL,
  `po_date` date DEFAULT NULL,
  `no_of_consignee` varchar(80) DEFAULT NULL,
  `no_of_item` varchar(100) DEFAULT NULL,
  `executive_name` varchar(100) DEFAULT NULL,
  `product_unique_id` varchar(80) NOT NULL,
  `item_code` varchar(100) NOT NULL,
  `product` varchar(100) NOT NULL,
  `product_tax` varchar(50) DEFAULT NULL,
  `item_qty` varchar(10) NOT NULL,
  `unit_price` varchar(50) NOT NULL,
  `billed_qty` varchar(10) DEFAULT NULL,
  `remaining_qty` varchar(10) DEFAULT NULL,
  `material_qc_status` int(11) NOT NULL DEFAULT 0 COMMENT '0-Pending, 1-processing, 2-Complete',
  `part_no` varchar(250) DEFAULT NULL,
  `is_active` int(11) NOT NULL DEFAULT 1,
  `is_delete` int(11) NOT NULL DEFAULT 0,
  `updated` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `created` timestamp NOT NULL DEFAULT current_timestamp(),
  `acc_year` varchar(50) NOT NULL,
  `session_id` varchar(50) NOT NULL,
  `sess_user_type` varchar(50) NOT NULL,
  `sess_user_id` varchar(50) NOT NULL,
  `sess_company_id` varchar(50) NOT NULL,
  `sess_branch_id` varchar(50) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci AVG_ROW_LENGTH=1365;

CREATE TABLE IF NOT EXISTS `opera_doc_table` (
  `acc_year` varchar(20) NOT NULL,
  `po_count` int(11) DEFAULT 0,
  `dc_count` int(20) DEFAULT NULL,
  `invoice_count` int(11) DEFAULT 0,
  `invoice_value` decimal(15,2) DEFAULT 0.00,
  `sign_po_count` int(30) DEFAULT NULL,
  `sign_invoice_count` int(30) DEFAULT NULL,
  `sign_invoice_value` int(30) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE IF NOT EXISTS `opera_sign_table` (
  `acc_year` varchar(20) NOT NULL,
  `sign_dc_count` int(20) DEFAULT NULL,
  `sign_po_count` int(30) DEFAULT NULL,
  `sign_invoice_count` int(30) DEFAULT NULL,
  `sign_invoice_value` int(30) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE IF NOT EXISTS `payment_transaction_notification_reads` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT,
  `notification_unique_id` varchar(50) NOT NULL,
  `user_id` varchar(50) NOT NULL,
  `read_at` datetime NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_payment_notification_read` (`notification_unique_id`,`user_id`),
  KEY `idx_payment_notification_read_user` (`user_id`,`read_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE IF NOT EXISTS `payment_transaction_notifications` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT,
  `unique_id` varchar(50) NOT NULL,
  `recipient_user_id` varchar(50) NOT NULL,
  `bill_no` varchar(100) NOT NULL,
  `notification_type` varchar(50) NOT NULL,
  `title` varchar(255) NOT NULL,
  `message` text NOT NULL,
  `source_module` varchar(100) NOT NULL DEFAULT 'payment_transaction',
  `source_path` varchar(255) NOT NULL DEFAULT '',
  `is_read` tinyint(1) NOT NULL DEFAULT 0,
  `created_by` varchar(50) NOT NULL DEFAULT '',
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `read_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_payment_notification_unique_id` (`unique_id`),
  KEY `idx_payment_notification_recipient` (`recipient_user_id`,`is_read`,`created_at`),
  KEY `idx_payment_notification_bill` (`bill_no`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE IF NOT EXISTS `pincode_creation` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `unique_id` varchar(100) NOT NULL,
  `state_name` varchar(100) NOT NULL,
  `district_name` varchar(100) NOT NULL,
  `city_name` varchar(50) NOT NULL,
  `pincode` int(100) NOT NULL,
  `is_active` int(11) NOT NULL DEFAULT 1,
  `is_delete` int(11) NOT NULL DEFAULT 0,
  `updated` timestamp NOT NULL DEFAULT current_timestamp(),
  `created` timestamp NOT NULL DEFAULT current_timestamp(),
  `acc_year` varchar(50) NOT NULL,
  `session_id` varchar(50) NOT NULL,
  `sess_user_type` varchar(50) NOT NULL,
  `sess_user_id` varchar(50) NOT NULL,
  `sess_company_id` varchar(50) NOT NULL,
  `sess_branch_id` varchar(50) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=24 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE IF NOT EXISTS `po_combined_summary` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `acc_year` varchar(20) DEFAULT NULL,
  `po_count` int(11) DEFAULT 0,
  `value` decimal(15,2) DEFAULT 0.00,
  `po_count1` int(11) DEFAULT 0,
  `value1` decimal(15,2) DEFAULT 0.00,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE IF NOT EXISTS `po_department_count` (
  `department` varchar(10) DEFAULT NULL,
  `total` int(11) DEFAULT NULL,
  `amc_count` int(20) DEFAULT NULL,
  `amcpercent` int(20) DEFAULT NULL,
  `amc_total_value` int(30) DEFAULT NULL,
  `total_value` varchar(255) DEFAULT NULL,
  `acc_year` varchar(20) DEFAULT NULL,
  `last_updated` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE IF NOT EXISTS `po_form` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `unique_id` varchar(50) DEFAULT NULL,
  `po_unique_id` varchar(50) NOT NULL,
  `type_of_po` int(10) DEFAULT 1,
  `po_num` varchar(250) NOT NULL,
  `po_date` date NOT NULL,
  `department` varchar(250) NOT NULL,
  `gst_option` varchar(10) NOT NULL,
  `gst_value` varchar(100) DEFAULT NULL,
  `executive_name` varchar(250) NOT NULL,
  `bill_address` varchar(250) NOT NULL,
  `contact_name` varchar(250) NOT NULL,
  `contact_number` varchar(100) NOT NULL,
  `landline_number` varchar(100) DEFAULT NULL,
  `acc_vertical` varchar(30) DEFAULT NULL,
  `acc_sector` varchar(30) DEFAULT NULL,
  `email` varchar(100) NOT NULL,
  `district` varchar(250) NOT NULL,
  `pin` varchar(100) NOT NULL,
  `po_prepared_by` varchar(100) DEFAULT NULL,
  `po_type` varchar(100) NOT NULL,
  `no_of_po` varchar(100) NOT NULL,
  `total_qty` varchar(50) DEFAULT NULL,
  `total_amount` varchar(255) DEFAULT NULL,
  `delivery_due_dates` varchar(100) DEFAULT NULL,
  `ld_per_day` varchar(100) DEFAULT NULL,
  `ld_maximum_val` varchar(100) DEFAULT NULL,
  `warranty` varchar(100) DEFAULT NULL,
  `warranty_duration` varchar(100) DEFAULT NULL,
  `ins_reqired` varchar(100) DEFAULT NULL,
  `insurence_required` varchar(10) DEFAULT NULL,
  `insurence_types` longtext DEFAULT NULL,
  `other_insurance_type` text DEFAULT NULL,
  `ld_required` varchar(10) DEFAULT NULL,
  `ld_installation_due_date` varchar(20) DEFAULT NULL,
  `ld_delivery_due_date` varchar(20) DEFAULT NULL,
  `ld_date_type` varchar(20) DEFAULT NULL,
  `bg` varchar(100) DEFAULT NULL,
  `bg_month` varchar(100) DEFAULT NULL,
  `file_name` varchar(250) DEFAULT NULL,
  `file_org_name` varchar(250) DEFAULT NULL,
  `no_of_consignee` varchar(100) DEFAULT NULL,
  `status` int(11) NOT NULL DEFAULT 0 COMMENT '0-stock_Pending, 1-stock_processing, 2-stock_Complete',
  `qc_status` int(11) NOT NULL DEFAULT 0 COMMENT '0-pending 1-comleted',
  `proceed_bg` varchar(11) NOT NULL DEFAULT '0' COMMENT '0-Pending,1-with_bg,2_without_bg',
  `dc_required` varchar(100) DEFAULT NULL,
  `dc_status_bill` int(11) NOT NULL DEFAULT 0 COMMENT '0-dc_pendng,2-dc_complete',
  `reject_reason` longtext DEFAULT NULL,
  `po_cancel_file` varchar(100) DEFAULT NULL,
  `po_cancel_file_orgname` varchar(100) DEFAULT NULL,
  `ld` varchar(30) DEFAULT NULL,
  `tat` varchar(30) DEFAULT NULL,
  `amc` varchar(30) DEFAULT NULL,
  `apd` varchar(30) DEFAULT NULL,
  `state_name` varchar(100) DEFAULT NULL,
  `mq_status` int(10) DEFAULT 0,
  `start_date` date DEFAULT NULL,
  `end_date` date DEFAULT NULL,
  `amc_percentae` varchar(30) DEFAULT NULL,
  `amcvalue` varchar(30) DEFAULT NULL,
  `amc_required` varchar(10) DEFAULT NULL,
  `amcfile_names` varchar(60) DEFAULT NULL,
  `amcfile_org_names` varchar(60) DEFAULT NULL,
  `bank_required` varchar(10) DEFAULT NULL,
  `product_sts` int(2) NOT NULL DEFAULT 0 COMMENT '0-pending,1-complete',
  `consignee_sts` int(2) NOT NULL DEFAULT 0 COMMENT '0-pending,1-complete',
  `assign_sts` int(2) NOT NULL DEFAULT 0 COMMENT '0-pending,1-complete',
  `po_com_sts` int(2) NOT NULL DEFAULT 0 COMMENT '0-pending,1-complete',
  `is_active` int(11) NOT NULL DEFAULT 1,
  `is_delete` int(11) NOT NULL DEFAULT 0,
  `updated` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `created` timestamp NOT NULL DEFAULT current_timestamp(),
  `acc_year` varchar(50) NOT NULL,
  `session_id` varchar(50) NOT NULL,
  `sess_user_type` varchar(50) NOT NULL,
  `sess_user_id` varchar(50) NOT NULL,
  `sess_company_id` varchar(50) NOT NULL,
  `sess_branch_id` varchar(50) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `unique_id` (`unique_id`),
  KEY `is_delete` (`is_delete`,`acc_year`),
  KEY `po_num` (`po_num`),
  KEY `ins_reqired` (`ins_reqired`,`insurence_required`,`ld_required`),
  KEY `dc_required` (`dc_required`,`amc_required`,`bank_required`),
  KEY `po_date` (`po_date`),
  KEY `file_name` (`file_name`),
  KEY `total_qty` (`total_qty`),
  KEY `total_amount` (`total_amount`),
  KEY `idx_po_unique` (`unique_id`,`is_delete`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci AVG_ROW_LENGTH=1365;

CREATE TABLE IF NOT EXISTS `po_form1` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `unique_id` varchar(50) DEFAULT NULL,
  `po_unique_id` varchar(50) NOT NULL,
  `po_num` varchar(250) NOT NULL,
  `po_date` date NOT NULL,
  `department` varchar(250) NOT NULL,
  `gst_option` varchar(10) NOT NULL,
  `gst_value` varchar(100) DEFAULT NULL,
  `executive_name` varchar(250) NOT NULL,
  `bill_address` varchar(250) NOT NULL,
  `contact_name` varchar(250) NOT NULL,
  `contact_number` varchar(100) NOT NULL,
  `landline_number` varchar(100) DEFAULT NULL,
  `acc_vertical` varchar(30) DEFAULT NULL,
  `acc_sector` varchar(30) DEFAULT NULL,
  `email` varchar(100) NOT NULL,
  `district` varchar(250) NOT NULL,
  `pin` varchar(100) NOT NULL,
  `po_prepared_by` varchar(100) DEFAULT NULL,
  `po_type` varchar(100) NOT NULL,
  `no_of_po` varchar(100) NOT NULL,
  `total_qty` varchar(50) DEFAULT NULL,
  `total_amount` varchar(255) DEFAULT NULL,
  `delivery_due_dates` varchar(100) DEFAULT NULL,
  `ld_per_day` varchar(100) DEFAULT NULL,
  `ld_maximum_val` varchar(100) DEFAULT NULL,
  `warranty` varchar(100) DEFAULT NULL,
  `warranty_duration` varchar(100) DEFAULT NULL,
  `ins_reqired` varchar(100) DEFAULT NULL,
  `insurence_required` varchar(10) DEFAULT NULL,
  `insurence_types` longtext DEFAULT NULL,
  `other_insurance_type` text DEFAULT NULL,
  `ld_required` varchar(10) DEFAULT NULL,
  `ld_installation_due_date` varchar(20) DEFAULT NULL,
  `ld_delivery_due_date` varchar(20) DEFAULT NULL,
  `ld_date_type` varchar(11) DEFAULT NULL,
  `bg` varchar(100) DEFAULT NULL,
  `bg_month` varchar(100) DEFAULT NULL,
  `file_name` varchar(250) DEFAULT NULL,
  `file_org_name` varchar(250) DEFAULT NULL,
  `no_of_consignee` varchar(100) DEFAULT NULL,
  `status` int(11) NOT NULL DEFAULT 0 COMMENT '0-stock_Pending, 1-stock_processing, 2-stock_Complete',
  `qc_status` int(11) NOT NULL DEFAULT 0 COMMENT '0-pending 1-comleted',
  `proceed_bg` varchar(11) NOT NULL DEFAULT '0' COMMENT '0-Pending,1-with_bg,2_without_bg',
  `dc_required` varchar(100) DEFAULT NULL,
  `dc_status_bill` int(11) NOT NULL DEFAULT 0 COMMENT '0-dc_pendng,2-dc_complete',
  `reject_reason` longtext DEFAULT NULL,
  `po_cancel_file` varchar(100) DEFAULT NULL,
  `po_cancel_file_orgname` varchar(100) DEFAULT NULL,
  `ld` varchar(30) DEFAULT NULL,
  `tat` varchar(30) DEFAULT NULL,
  `amc` varchar(30) DEFAULT NULL,
  `apd` varchar(30) DEFAULT NULL,
  `state_name` varchar(100) DEFAULT NULL,
  `mq_status` int(10) DEFAULT 0,
  `start_date` date DEFAULT NULL,
  `end_date` date DEFAULT NULL,
  `amc_percentae` varchar(30) DEFAULT NULL,
  `amcvalue` varchar(30) DEFAULT NULL,
  `amc_required` varchar(10) DEFAULT NULL,
  `amcfile_names` varchar(60) DEFAULT NULL,
  `amcfile_org_names` varchar(60) DEFAULT NULL,
  `bank_required` varchar(10) DEFAULT NULL,
  `product_sts` int(2) NOT NULL DEFAULT 0 COMMENT '0-pending,1-complete',
  `consignee_sts` int(2) NOT NULL DEFAULT 0 COMMENT '0-pending,1-complete',
  `assign_sts` int(2) NOT NULL DEFAULT 0 COMMENT '0-pending,1-complete',
  `po_com_sts` int(2) NOT NULL DEFAULT 0 COMMENT '0-pending,1-complete',
  `is_active` int(11) NOT NULL DEFAULT 1,
  `is_delete` int(11) NOT NULL DEFAULT 0,
  `updated` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `created` timestamp NOT NULL DEFAULT current_timestamp(),
  `acc_year` varchar(50) NOT NULL,
  `session_id` varchar(50) NOT NULL,
  `sess_user_type` varchar(50) NOT NULL,
  `sess_user_id` varchar(50) NOT NULL,
  `sess_company_id` varchar(50) NOT NULL,
  `sess_branch_id` varchar(50) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=218 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci AVG_ROW_LENGTH=1365;

CREATE TABLE IF NOT EXISTS `po_form_processed` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `po_unique_id` varchar(30) DEFAULT NULL,
  `po_num` varchar(30) DEFAULT NULL,
  `po_date` date DEFAULT NULL,
  `with_out_tax` decimal(10,2) DEFAULT NULL,
  `tax_percent` decimal(10,2) DEFAULT NULL,
  `with_tax` decimal(10,2) DEFAULT NULL,
  `amc_required` varchar(10) DEFAULT NULL,
  `acc_year` varchar(20) DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=99 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE IF NOT EXISTS `po_product_assign_details` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `unique_id` varchar(50) DEFAULT NULL,
  `form_main_unique_id` varchar(100) NOT NULL,
  `po_unique_id` varchar(80) DEFAULT NULL,
  `con_unique_id` varchar(80) DEFAULT NULL,
  `con_name` longtext DEFAULT NULL,
  `con_contact_no` varchar(255) DEFAULT NULL,
  `con_address` longtext DEFAULT NULL,
  `con_assign_team_member` varchar(30) DEFAULT NULL,
  `unit_price` varchar(100) DEFAULT NULL,
  `item_tax` varchar(50) DEFAULT NULL,
  `po_num` varchar(250) DEFAULT NULL,
  `po_date` varchar(80) DEFAULT NULL,
  `no_of_consignee` varchar(80) DEFAULT NULL,
  `no_of_item` varchar(100) DEFAULT NULL,
  `executive_name` varchar(80) DEFAULT NULL,
  `product_unique_id` varchar(80) DEFAULT NULL,
  `item_code` longtext DEFAULT NULL,
  `product` longtext DEFAULT NULL,
  `qty` int(11) NOT NULL,
  `assign_qty` int(11) NOT NULL,
  `rem_qty` int(11) DEFAULT NULL,
  `assign_value` float(16,2) DEFAULT NULL,
  `status` int(11) NOT NULL DEFAULT 0 COMMENT '0-Pending, 1-processing, 2-Complete',
  `batch_id` varchar(250) DEFAULT NULL,
  `po_number` varchar(250) DEFAULT NULL,
  `is_active` int(11) NOT NULL DEFAULT 1,
  `is_delete` int(11) NOT NULL DEFAULT 0,
  `updated` timestamp NOT NULL DEFAULT current_timestamp(),
  `created` timestamp NOT NULL DEFAULT current_timestamp(),
  `acc_year` varchar(50) DEFAULT NULL,
  `session_id` varchar(50) DEFAULT NULL,
  `sess_user_type` varchar(50) DEFAULT NULL,
  `sess_user_id` varchar(50) DEFAULT NULL,
  `sess_company_id` varchar(50) DEFAULT NULL,
  `sess_branch_id` varchar(50) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `form_main_unique_id` (`form_main_unique_id`,`con_unique_id`),
  KEY `product_unique_id` (`product_unique_id`,`is_delete`,`acc_year`),
  KEY `unique_id` (`unique_id`)
) ENGINE=InnoDB AUTO_INCREMENT=49661 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci AVG_ROW_LENGTH=1365;

CREATE TABLE IF NOT EXISTS `po_type` (
  `s_no` int(11) NOT NULL AUTO_INCREMENT,
  `unique_id` varchar(50) NOT NULL,
  `po_type` varchar(150) NOT NULL,
  `under_user_type` longtext NOT NULL,
  `is_active` int(1) NOT NULL DEFAULT 1,
  `is_delete` int(1) NOT NULL DEFAULT 0,
  `updated` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `created` timestamp NOT NULL DEFAULT current_timestamp(),
  `acc_year` varchar(50) DEFAULT NULL,
  `session_id` varchar(50) DEFAULT NULL,
  `sess_user_type` varchar(50) DEFAULT NULL,
  `sess_user_id` varchar(50) DEFAULT NULL,
  `sess_company_id` varchar(50) DEFAULT NULL,
  `sess_branch_id` varchar(50) DEFAULT NULL,
  PRIMARY KEY (`s_no`)
) ENGINE=InnoDB AUTO_INCREMENT=27 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci AVG_ROW_LENGTH=1365;

CREATE TABLE IF NOT EXISTS `product_creation` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `unique_id` varchar(100) NOT NULL,
  `product_creation` varchar(100) NOT NULL,
  `description` varchar(100) NOT NULL,
  `is_active` int(11) DEFAULT 0,
  `is_delete` int(11) NOT NULL DEFAULT 0,
  `updated` timestamp NOT NULL DEFAULT current_timestamp(),
  `created` timestamp NOT NULL DEFAULT current_timestamp(),
  `acc_year` varchar(50) NOT NULL,
  `session_id` varchar(50) NOT NULL,
  `sess_user_type` varchar(50) NOT NULL,
  `sess_user_id` varchar(50) NOT NULL,
  `sess_company_id` varchar(50) NOT NULL,
  `sess_branch_id` varchar(50) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE IF NOT EXISTS `product_details_sub` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `unique_id` varchar(35) NOT NULL,
  `form_main_unique_id` varchar(100) DEFAULT NULL,
  `screen_unique_id` varchar(100) DEFAULT NULL,
  `no_of_items` varchar(20) DEFAULT NULL,
  `tender_code` longtext DEFAULT NULL,
  `item_code` longtext DEFAULT NULL,
  `product` longtext DEFAULT NULL,
  `qty` varchar(20) DEFAULT NULL,
  `unit_price` varchar(100) DEFAULT NULL,
  `net_price` varchar(20) DEFAULT NULL,
  `tax` varchar(100) DEFAULT NULL,
  `total_value` varchar(100) DEFAULT NULL,
  `net_value` varchar(100) DEFAULT NULL,
  `insta_due_days` varchar(50) DEFAULT NULL,
  `document_required` varchar(20) DEFAULT NULL,
  `warranty_starts` varchar(20) DEFAULT NULL,
  `bg_required` varchar(10) DEFAULT NULL,
  `bg_percen` varchar(30) DEFAULT NULL,
  `bg_month` varchar(50) DEFAULT NULL,
  `rem_qty` varchar(50) DEFAULT NULL,
  `assign_qty` varchar(50) DEFAULT NULL,
  `billed_qty` varchar(50) DEFAULT NULL,
  `con_serial_no` varchar(50) DEFAULT NULL,
  `assign_int_val` varchar(230) DEFAULT NULL,
  `delivery_due_dates` varchar(250) DEFAULT NULL,
  `ld_type` varchar(30) DEFAULT NULL,
  `ld_per_day` varchar(250) DEFAULT NULL,
  `ld_maximum_val` varchar(250) DEFAULT NULL,
  `warranty` varchar(250) DEFAULT NULL,
  `warranty_duration` varchar(250) DEFAULT NULL,
  `is_active` int(1) NOT NULL DEFAULT 1,
  `is_delete` int(1) NOT NULL DEFAULT 0,
  `updated` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `created` timestamp NOT NULL DEFAULT current_timestamp(),
  `acc_year` varchar(50) DEFAULT NULL,
  `session_id` varchar(50) DEFAULT NULL,
  `sess_user_type` varchar(50) DEFAULT NULL,
  `sess_user_id` varchar(50) DEFAULT NULL,
  `sess_company_id` varchar(50) DEFAULT NULL,
  `sess_branch_id` varchar(50) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `form_main_unique_id` (`form_main_unique_id`),
  KEY `unique_id` (`unique_id`),
  KEY `is_delete` (`is_delete`,`acc_year`),
  KEY `tender_code` (`tender_code`(768)),
  KEY `item_code` (`item_code`(768))
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE IF NOT EXISTS `product_warrenty` (
  `s_no` int(11) NOT NULL AUTO_INCREMENT,
  `unique_id` varchar(50) NOT NULL,
  `warrenty_year` varchar(150) NOT NULL,
  `under_user_type` longtext NOT NULL,
  `is_active` int(1) NOT NULL DEFAULT 1,
  `is_delete` int(1) NOT NULL DEFAULT 0,
  `updated` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `created` timestamp NOT NULL DEFAULT current_timestamp(),
  `acc_year` varchar(50) DEFAULT NULL,
  `session_id` varchar(50) DEFAULT NULL,
  `sess_user_type` varchar(50) DEFAULT NULL,
  `sess_user_id` varchar(50) DEFAULT NULL,
  `sess_company_id` varchar(50) DEFAULT NULL,
  `sess_branch_id` varchar(50) DEFAULT NULL,
  PRIMARY KEY (`s_no`)
) ENGINE=InnoDB AUTO_INCREMENT=31 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci AVG_ROW_LENGTH=1365;

CREATE TABLE IF NOT EXISTS `sign_doc_summary` (
  `acc_year` varchar(10) NOT NULL,
  `po_count` int(11) DEFAULT NULL,
  `invoice_count` int(11) DEFAULT NULL,
  `invoice_value` decimal(15,2) DEFAULT NULL,
  `dc_count` int(11) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE IF NOT EXISTS `sign_doc_verification_detail` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `unique_id` varchar(50) NOT NULL,
  `form_main_unique_id` varchar(100) DEFAULT NULL,
  `po_num` varchar(250) NOT NULL,
  `po_date` varchar(100) NOT NULL,
  `con_contact_name` varchar(250) NOT NULL,
  `con_address` varchar(250) NOT NULL,
  `con_unique_id` varchar(50) DEFAULT NULL,
  `dc_received_status` varchar(100) NOT NULL,
  `dc_signed_date` varchar(50) NOT NULL,
  `ir_status` varchar(100) NOT NULL,
  `ir_signed_date` varchar(50) NOT NULL,
  `snr_status` varchar(100) DEFAULT NULL,
  `snr_signed_date` varchar(100) DEFAULT NULL,
  `po_product_name` varchar(250) DEFAULT NULL,
  `approval` varchar(100) DEFAULT NULL,
  `claim_amount` varchar(100) DEFAULT NULL,
  `with_bg` varchar(100) DEFAULT NULL,
  `without_bg` varchar(100) DEFAULT NULL,
  `invoice_no` varchar(100) NOT NULL,
  `dc_number` varchar(50) DEFAULT NULL,
  `invoice_date` varchar(100) NOT NULL,
  `status_app` varchar(50) NOT NULL,
  `doc_chn` varchar(250) NOT NULL,
  `reject_reason` varchar(100) DEFAULT NULL,
  `scanned_dc_copy` varchar(100) DEFAULT NULL,
  `dc_original_name` varchar(100) DEFAULT NULL,
  `scanned_ir_copy` varchar(100) DEFAULT NULL,
  `ir_original_name` varchar(100) DEFAULT NULL,
  `invoice_copy` varchar(100) DEFAULT NULL,
  `invoice_original_name` varchar(100) DEFAULT NULL,
  `installation_reference_no` varchar(100) DEFAULT NULL,
  `supplier_invoice_number` varchar(100) DEFAULT NULL,
  `ir_cus_signed_date` varchar(50) DEFAULT NULL,
  `ins_unique_id` varchar(100) DEFAULT NULL,
  `bill_status` varchar(50) NOT NULL DEFAULT '0' COMMENT '0-pending,1-processing,2,completed,3-bill reject,4-payment reject',
  `bg_status` varchar(50) NOT NULL DEFAULT '0',
  `bill_no` varchar(100) DEFAULT NULL,
  `bill_reject_reason` varchar(100) DEFAULT NULL,
  `inv_cancel_status` int(11) NOT NULL DEFAULT 0,
  `payment_cancel_reason` longtext DEFAULT NULL,
  `snr_verify_status` int(11) NOT NULL DEFAULT 0,
  `inv_verify_status` int(3) DEFAULT NULL,
  `inv_verify_approvedby` varchar(80) DEFAULT NULL,
  `inv_verify_approved_date` date DEFAULT NULL,
  `is_active` int(11) NOT NULL DEFAULT 1,
  `is_delete` int(11) NOT NULL DEFAULT 0,
  `updated` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `created` timestamp NOT NULL DEFAULT current_timestamp(),
  `acc_year` varchar(50) NOT NULL,
  `session_id` varchar(50) NOT NULL,
  `sess_user_type` varchar(50) NOT NULL,
  `sess_user_id` varchar(50) NOT NULL,
  `sess_company_id` varchar(50) NOT NULL,
  `sess_branch_id` varchar(50) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `form_main_unique_id` (`form_main_unique_id`),
  KEY `invoice_no` (`invoice_no`),
  KEY `con_unique_id` (`con_unique_id`,`ins_unique_id`,`bill_no`,`is_delete`)
) ENGINE=InnoDB AUTO_INCREMENT=2189 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE IF NOT EXISTS `sign_doc_verification_detail_sublist` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `unique_id` varchar(50) NOT NULL,
  `form_main_unique_id` varchar(100) DEFAULT NULL,
  `po_num` varchar(250) NOT NULL,
  `po_date` varchar(100) NOT NULL,
  `con_contact_name` varchar(250) NOT NULL,
  `con_address` varchar(250) NOT NULL,
  `con_unique_id` varchar(50) DEFAULT NULL,
  `dc_received_status` varchar(100) NOT NULL,
  `dc_signed_date` varchar(50) NOT NULL,
  `ir_status` varchar(100) NOT NULL,
  `ir_signed_date` varchar(50) NOT NULL,
  `snr_status` varchar(100) DEFAULT NULL,
  `snr_signed_date` varchar(100) DEFAULT NULL,
  `po_product_name` varchar(250) DEFAULT NULL,
  `approval` varchar(100) NOT NULL,
  `claim_amount` varchar(100) NOT NULL,
  `with_bg` varchar(100) DEFAULT NULL,
  `without_bg` varchar(100) DEFAULT NULL,
  `invoice_no` varchar(100) NOT NULL,
  `invoice_date` varchar(100) NOT NULL,
  `status_app` varchar(50) NOT NULL,
  `scanned_dc_copy` varchar(100) DEFAULT NULL,
  `dc_original_name` varchar(100) DEFAULT NULL,
  `scanned_ir_copy` varchar(100) DEFAULT NULL,
  `ir_original_name` varchar(100) DEFAULT NULL,
  `invoice_copy` varchar(100) DEFAULT NULL,
  `invoice_original_name` varchar(100) DEFAULT NULL,
  `installation_reference_no` varchar(100) DEFAULT NULL,
  `supplier_invoice_number` varchar(100) DEFAULT NULL,
  `ir_cus_signed_date` varchar(50) DEFAULT NULL,
  `is_active` int(11) NOT NULL DEFAULT 1,
  `is_delete` int(11) NOT NULL DEFAULT 0,
  `updated` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `created` timestamp NOT NULL DEFAULT current_timestamp(),
  `acc_year` varchar(50) NOT NULL,
  `session_id` varchar(50) NOT NULL,
  `sess_user_type` varchar(50) NOT NULL,
  `sess_user_id` varchar(50) NOT NULL,
  `sess_company_id` varchar(50) NOT NULL,
  `sess_branch_id` varchar(50) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE IF NOT EXISTS `state_creation` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `unique_id` varchar(50) NOT NULL,
  `state_name` varchar(100) NOT NULL,
  `short_name` varchar(10) DEFAULT NULL,
  `description` longtext DEFAULT NULL,
  `is_active` int(11) NOT NULL DEFAULT 1,
  `is_delete` varchar(100) DEFAULT '0',
  `acc_year` varchar(10) DEFAULT NULL,
  `updated` datetime DEFAULT NULL,
  `created` datetime DEFAULT NULL,
  `session_id` varchar(50) DEFAULT NULL,
  `sess_user_type` varchar(50) DEFAULT NULL,
  `sess_user_id` varchar(50) DEFAULT NULL,
  `sess_company_id` varchar(50) DEFAULT NULL,
  `sess_branch_id` varchar(50) DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=59 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci AVG_ROW_LENGTH=1365;

CREATE TABLE IF NOT EXISTS `stock_assign_case_summary` (
  `case_status` int(1) DEFAULT NULL,
  `acc_year` varchar(50) DEFAULT NULL,
  `total_count` int(11) DEFAULT NULL,
  `total_po_assign_qty` decimal(32,0) DEFAULT NULL,
  `total_stc_assign_qty` decimal(10,2) DEFAULT NULL,
  `total_po_total_value` double(19,2) DEFAULT NULL,
  `partial_balance_qty` decimal(18,2) DEFAULT 0.00,
  `partial_balance_value` decimal(18,2) DEFAULT 0.00
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE IF NOT EXISTS `stock_invoice_summary` (
  `acc_year` varchar(10) DEFAULT NULL,
  `po_count` int(11) DEFAULT NULL,
  `stock_value` decimal(10,2) DEFAULT NULL,
  `generated_at` datetime DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE IF NOT EXISTS `stock_position` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `unique_id` varchar(50) DEFAULT NULL,
  `form_main_unique_id` varchar(100) NOT NULL,
  `batch_id` varchar(30) DEFAULT NULL,
  `stock_id` varchar(50) NOT NULL,
  `total_qty` varchar(10) DEFAULT NULL,
  `net_value` varchar(20) DEFAULT NULL,
  `po_unique_id` varchar(100) DEFAULT NULL,
  `po_num` varchar(250) DEFAULT NULL,
  `no_of_consignee` varchar(80) DEFAULT NULL,
  `no_of_item` varchar(100) DEFAULT NULL,
  `executive_name` varchar(100) DEFAULT NULL,
  `product_unique_id` varchar(80) NOT NULL,
  `item_code` varchar(100) NOT NULL,
  `product` varchar(255) NOT NULL,
  `product_tax` varchar(50) DEFAULT NULL,
  `item_qty` varchar(10) NOT NULL,
  `unit_price` varchar(50) NOT NULL,
  `net_price` varchar(100) DEFAULT NULL,
  `billed_qty` varchar(10) DEFAULT NULL,
  `stock_qty` varchar(10) DEFAULT NULL,
  `remaining_qty` varchar(10) DEFAULT NULL,
  `status` int(11) NOT NULL DEFAULT 0 COMMENT '0-Pending, 1-processing, 2-Complete',
  `part_no` varchar(250) DEFAULT NULL,
  `remarks` longtext DEFAULT NULL,
  `remqty` varchar(100) DEFAULT NULL,
  `part_no_file` varchar(250) DEFAULT NULL,
  `part_no_file_orgname` varchar(250) DEFAULT NULL,
  `update_stock_qty` varchar(100) DEFAULT NULL,
  `update_stock_value` varchar(100) DEFAULT NULL,
  `stock_value` varchar(100) DEFAULT NULL,
  `is_active` int(11) NOT NULL DEFAULT 1,
  `is_delete` int(11) NOT NULL DEFAULT 0,
  `updated` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `created` timestamp NOT NULL DEFAULT current_timestamp(),
  `acc_year` varchar(50) DEFAULT NULL,
  `session_id` varchar(50) DEFAULT NULL,
  `sess_user_type` varchar(50) DEFAULT NULL,
  `sess_user_id` varchar(50) DEFAULT NULL,
  `sess_company_id` varchar(50) DEFAULT NULL,
  `sess_branch_id` varchar(50) DEFAULT NULL,
  `po_date` date DEFAULT NULL,
  `stock_date` date DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `form_main_unique_id` (`form_main_unique_id`,`product_unique_id`,`is_delete`,`acc_year`),
  KEY `stock_id` (`stock_id`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci AVG_ROW_LENGTH=1365;

CREATE TABLE IF NOT EXISTS `stock_position_main` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `unique_id` varchar(50) NOT NULL,
  `form_main_unique_id` varchar(100) NOT NULL,
  `batch_id` varchar(30) DEFAULT NULL,
  `po_unique_id` varchar(100) DEFAULT NULL,
  `po_num` varchar(250) DEFAULT NULL,
  `stock_id` varchar(50) NOT NULL,
  `no_of_con` varchar(10) DEFAULT NULL,
  `no_of_item` varchar(10) DEFAULT NULL,
  `executive_name` varchar(100) DEFAULT NULL,
  `stock_qty` varchar(50) NOT NULL,
  `stock_value` varchar(50) NOT NULL,
  `department` varchar(100) DEFAULT NULL,
  `billed_qty` varchar(50) DEFAULT NULL,
  `status` int(11) NOT NULL DEFAULT 0 COMMENT '0-pending,1-processing,2-complete',
  `inv_status_assign` int(11) NOT NULL DEFAULT 0 COMMENT '0-inv-pending,1-complete',
  `part_no` varchar(250) DEFAULT NULL,
  `remarks` varchar(250) DEFAULT NULL,
  `part_no_file` varchar(250) DEFAULT NULL,
  `part_no_file_orgname` varchar(250) DEFAULT NULL,
  `is_active` int(11) NOT NULL DEFAULT 1,
  `is_delete` int(11) NOT NULL DEFAULT 0,
  `updated` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `created` timestamp NOT NULL DEFAULT current_timestamp(),
  `acc_year` varchar(50) DEFAULT NULL,
  `session_id` varchar(50) DEFAULT NULL,
  `sess_user_type` varchar(50) DEFAULT NULL,
  `sess_user_id` varchar(50) DEFAULT NULL,
  `sess_company_id` varchar(50) DEFAULT NULL,
  `sess_branch_id` varchar(50) DEFAULT NULL,
  `po_date` date DEFAULT NULL,
  `stock_date` date DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `form_main_unique_id` (`form_main_unique_id`,`is_delete`),
  KEY `acc_year` (`acc_year`),
  KEY `stock_qty` (`stock_qty`),
  KEY `stock_value` (`stock_value`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE IF NOT EXISTS `stock_position_sublist` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `unique_id` varchar(50) DEFAULT NULL,
  `form_main_unique_id` varchar(100) NOT NULL,
  `batch_id` varchar(30) DEFAULT NULL,
  `stock_id` varchar(50) NOT NULL,
  `stock_sub_id` varchar(30) DEFAULT NULL,
  `stock_date` date DEFAULT NULL,
  `total_qty` varchar(10) DEFAULT NULL,
  `net_value` varchar(250) DEFAULT NULL,
  `po_unique_id` varchar(100) DEFAULT NULL,
  `po_num` varchar(250) DEFAULT NULL,
  `po_date` date DEFAULT NULL,
  `no_of_consignee` varchar(80) DEFAULT NULL,
  `no_of_item` varchar(100) DEFAULT NULL,
  `executive_name` varchar(100) DEFAULT NULL,
  `product_unique_id` varchar(80) NOT NULL,
  `item_code` varchar(100) NOT NULL,
  `product` varchar(250) NOT NULL,
  `product_tax` varchar(50) DEFAULT NULL,
  `item_qty` varchar(10) NOT NULL,
  `unit_price` varchar(50) NOT NULL,
  `net_price` varchar(100) DEFAULT NULL,
  `billed_qty` varchar(10) DEFAULT NULL,
  `stock_qty` varchar(10) DEFAULT NULL,
  `remaining_qty` varchar(10) DEFAULT NULL,
  `bal_qty` varchar(100) DEFAULT NULL,
  `remqty` varchar(100) DEFAULT NULL,
  `status` int(11) NOT NULL DEFAULT 0 COMMENT '0-Pending, 1-processing, 2-Complete',
  `part_no` varchar(250) DEFAULT NULL,
  `is_active` int(11) NOT NULL DEFAULT 1,
  `is_delete` int(11) NOT NULL DEFAULT 0,
  `updated` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `created` timestamp NOT NULL DEFAULT current_timestamp(),
  `acc_year` varchar(50) DEFAULT NULL,
  `session_id` varchar(50) DEFAULT NULL,
  `sess_user_type` varchar(50) DEFAULT NULL,
  `sess_user_id` varchar(50) DEFAULT NULL,
  `sess_company_id` varchar(50) DEFAULT NULL,
  `sess_branch_id` varchar(50) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `stock_date` (`stock_date`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci AVG_ROW_LENGTH=1365;

CREATE TABLE IF NOT EXISTS `team_allocation` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `unique_id` varchar(50) NOT NULL,
  `region` varchar(255) NOT NULL,
  `state_name` varchar(255) NOT NULL,
  `district_name` varchar(255) NOT NULL,
  `po_no` varchar(255) NOT NULL,
  `consignee_name` varchar(255) NOT NULL,
  `consignee_address` varchar(255) NOT NULL,
  `user_role` varchar(255) NOT NULL,
  `consignee_district` varchar(255) NOT NULL,
  `eng_name` varchar(255) NOT NULL,
  `is_active` int(11) NOT NULL DEFAULT 1,
  `is_delete` int(11) NOT NULL DEFAULT 0,
  `updated` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `created` timestamp NOT NULL DEFAULT current_timestamp(),
  `acc_year` varchar(50) NOT NULL,
  `session_id` varchar(50) NOT NULL,
  `sess_user_type` varchar(50) NOT NULL,
  `sess_user_id` varchar(50) NOT NULL,
  `sess_company_id` varchar(50) NOT NULL,
  `sess_branch_id` varchar(50) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE IF NOT EXISTS `tenant_branch` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT,
  `unique_id` varchar(50) NOT NULL,
  `company_id` varchar(50) NOT NULL,
  `branch_code` varchar(50) NOT NULL,
  `branch_name` varchar(150) NOT NULL,
  `contact_no` varchar(20) NOT NULL,
  `address` longtext NOT NULL,
  `is_default` int(11) NOT NULL,
  `is_active` int(11) NOT NULL,
  `is_delete` int(11) NOT NULL,
  `created` datetime(6) NOT NULL,
  `updated` datetime(6) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_id` (`unique_id`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE IF NOT EXISTS `tenant_company` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT,
  `unique_id` varchar(50) NOT NULL,
  `company_code` varchar(50) NOT NULL,
  `company_name` varchar(255) NOT NULL,
  `legal_name` varchar(255) DEFAULT NULL,
  `contact_name` varchar(150) NOT NULL,
  `contact_email` varchar(150) DEFAULT NULL,
  `contact_no` varchar(20) DEFAULT NULL,
  `gst_no` varchar(30) DEFAULT NULL,
  `pan_no` varchar(30) DEFAULT NULL,
  `address` longtext DEFAULT NULL,
  `subscription_plan` varchar(50) DEFAULT NULL,
  `subscription_status` varchar(30) NOT NULL,
  `is_active` int(11) NOT NULL,
  `is_delete` int(11) NOT NULL,
  `created` datetime(6) NOT NULL DEFAULT current_timestamp(6),
  `updated` datetime(6) NOT NULL DEFAULT current_timestamp(6) ON UPDATE current_timestamp(6),
  `db_name` varchar(100) NOT NULL DEFAULT '',
  `db_host` varchar(150) NOT NULL DEFAULT '',
  `db_port` varchar(10) NOT NULL DEFAULT '',
  `db_user` varchar(100) NOT NULL DEFAULT '',
  `db_password` varchar(255) NOT NULL DEFAULT '',
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_id` (`unique_id`),
  UNIQUE KEY `company_code` (`company_code`)
) ENGINE=InnoDB AUTO_INCREMENT=11 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE IF NOT EXISTS `terms_condition` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `unique_id` varchar(50) DEFAULT NULL,
  `form_main_unique_id` varchar(250) DEFAULT NULL,
  `po_num` varchar(250) NOT NULL,
  `delivery_due_dates` varchar(100) DEFAULT NULL,
  `ld_per_day` varchar(100) DEFAULT NULL,
  `ld_maximum_val` varchar(100) DEFAULT NULL,
  `warranty` varchar(100) DEFAULT NULL,
  `warranty_duration` varchar(100) DEFAULT NULL,
  `ins_reqired` varchar(100) DEFAULT NULL,
  `insurence_required` varchar(10) DEFAULT NULL,
  `insurence_types` varchar(30) DEFAULT NULL,
  `other_insurance_type` text DEFAULT NULL,
  `ld_required` varchar(10) DEFAULT NULL,
  `ld_installation_due_date` varchar(20) DEFAULT NULL,
  `ld_delivery_due_date` varchar(20) DEFAULT NULL,
  `bg` varchar(100) DEFAULT NULL,
  `bg_month` varchar(100) DEFAULT NULL,
  `file_name` varchar(250) DEFAULT NULL,
  `file_org_name` varchar(250) DEFAULT NULL,
  `no_of_consignee` varchar(100) DEFAULT NULL,
  `status` int(11) NOT NULL DEFAULT 0 COMMENT '0-stock_Pending, 1-stock_processing, 2-stock_Complete',
  `qc_status` int(11) NOT NULL DEFAULT 0 COMMENT '0-pending 1-comleted',
  `proceed_bg` varchar(11) NOT NULL DEFAULT '0' COMMENT '0-Pending,1-with_bg,2_without_bg',
  `dc_required` varchar(100) DEFAULT NULL,
  `dc_status_bill` int(11) NOT NULL DEFAULT 0 COMMENT '0-dc_pendng,2-dc_complete',
  `reject_reason` longtext DEFAULT NULL,
  `ld` varchar(30) DEFAULT NULL,
  `tat` varchar(30) DEFAULT NULL,
  `amc` varchar(30) DEFAULT NULL,
  `apd` varchar(30) DEFAULT NULL,
  `state_name` varchar(100) DEFAULT NULL,
  `mq_status` int(10) DEFAULT 0,
  `start_date` date DEFAULT NULL,
  `end_date` date DEFAULT NULL,
  `amc_percentae` varchar(30) DEFAULT NULL,
  `amcvalue` varchar(30) DEFAULT NULL,
  `amc_required` varchar(10) DEFAULT NULL,
  `amcfile_names` varchar(60) DEFAULT NULL,
  `amcfile_org_names` varchar(60) DEFAULT NULL,
  `is_active` int(11) NOT NULL DEFAULT 1,
  `is_delete` int(11) NOT NULL DEFAULT 0,
  `updated` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `created` timestamp NOT NULL DEFAULT current_timestamp(),
  `acc_year` varchar(50) NOT NULL,
  `session_id` varchar(50) NOT NULL,
  `sess_user_type` varchar(50) NOT NULL,
  `sess_user_id` varchar(50) NOT NULL,
  `sess_company_id` varchar(50) NOT NULL,
  `sess_branch_id` varchar(50) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci AVG_ROW_LENGTH=1365;

CREATE TABLE IF NOT EXISTS `unit_creation` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `unique_id` varchar(30) NOT NULL,
  `unit_name` varchar(50) NOT NULL,
  `description` longtext NOT NULL,
  `is_active` int(11) NOT NULL,
  `is_delete` int(11) NOT NULL DEFAULT 0,
  `updated` timestamp NOT NULL DEFAULT current_timestamp(),
  `created` timestamp NOT NULL DEFAULT current_timestamp(),
  `acc_year` varchar(50) NOT NULL,
  `session_id` varchar(50) NOT NULL,
  `sess_user_type` varchar(50) NOT NULL,
  `sess_user_id` varchar(50) NOT NULL,
  `sess_company_id` varchar(50) NOT NULL,
  `sess_branch_id` varchar(50) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=14 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE IF NOT EXISTS `user` (
  `s_no` int(11) NOT NULL AUTO_INCREMENT,
  `unique_id` varchar(50) NOT NULL,
  `user_type_unique_id` varchar(50) NOT NULL,
  `staff_name` varchar(100) NOT NULL,
  `staff_id` varchar(100) NOT NULL,
  `designation_id` varchar(100) DEFAULT NULL,
  `user_name` varchar(255) DEFAULT NULL,
  `zone_name` varchar(100) DEFAULT NULL,
  `ward_name` varchar(100) DEFAULT NULL,
  `department_name` varchar(100) DEFAULT NULL,
  `mobile_no` varchar(15) NOT NULL,
  `otp` varchar(30) DEFAULT NULL,
  `email_id` varchar(50) NOT NULL,
  `address` text DEFAULT NULL,
  `password` varchar(150) NOT NULL,
  `profile_image` varchar(250) DEFAULT NULL,
  `en_password` varchar(50) NOT NULL,
  `file_name` varchar(50) DEFAULT NULL,
  `file_original_name` varchar(50) DEFAULT NULL,
  `securityquestion1` text DEFAULT NULL,
  `securityquestion2` text DEFAULT NULL,
  `securityquestion3` text DEFAULT NULL,
  `profile_status` int(11) DEFAULT NULL,
  `document_type` varchar(50) DEFAULT NULL,
  `document_number` varchar(50) DEFAULT NULL,
  `document_upload` varchar(50) DEFAULT NULL,
  `otherProof_name` varchar(50) DEFAULT NULL,
  `is_active` int(1) NOT NULL DEFAULT 1,
  `is_online` tinyint(1) DEFAULT NULL,
  `is_delete` int(1) NOT NULL DEFAULT 0,
  `last_active_time` varchar(100) DEFAULT NULL,
  `updated` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `created` timestamp NOT NULL DEFAULT current_timestamp(),
  `acc_year` varchar(50) DEFAULT NULL,
  `session_id` varchar(50) DEFAULT NULL,
  `sess_user_type` varchar(50) DEFAULT NULL,
  `sess_user_id` varchar(50) DEFAULT NULL,
  `sess_company_id` varchar(50) DEFAULT NULL,
  `sess_branch_id` varchar(50) DEFAULT NULL,
  PRIMARY KEY (`s_no`),
  KEY `staff_id` (`staff_id`),
  KEY `is_delete` (`is_delete`),
  KEY `staff_name` (`staff_name`),
  KEY `idx_user_staff` (`staff_id`,`is_delete`)
) ENGINE=InnoDB AUTO_INCREMENT=213 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci AVG_ROW_LENGTH=910;

CREATE TABLE IF NOT EXISTS `user1` (
  `s_no` int(11) NOT NULL AUTO_INCREMENT,
  `unique_id` varchar(50) NOT NULL,
  `user_type_unique_id` varchar(50) NOT NULL,
  `staff_name` varchar(100) NOT NULL,
  `staff_id` varchar(100) NOT NULL,
  `designation_id` varchar(100) DEFAULT NULL,
  `user_name` varchar(255) DEFAULT NULL,
  `zone_name` varchar(100) DEFAULT NULL,
  `ward_name` varchar(100) DEFAULT NULL,
  `department_name` varchar(100) DEFAULT NULL,
  `mobile_no` varchar(15) NOT NULL,
  `otp` varchar(30) DEFAULT NULL,
  `email_id` varchar(50) NOT NULL,
  `address` text DEFAULT NULL,
  `password` varchar(150) NOT NULL,
  `profile_image` varchar(250) DEFAULT NULL,
  `en_password` varchar(50) NOT NULL,
  `file_name` varchar(50) DEFAULT NULL,
  `file_original_name` varchar(50) DEFAULT NULL,
  `securityquestion1` text DEFAULT NULL,
  `securityquestion2` text DEFAULT NULL,
  `securityquestion3` text DEFAULT NULL,
  `profile_status` int(11) DEFAULT NULL,
  `document_type` varchar(50) DEFAULT NULL,
  `document_number` varchar(50) DEFAULT NULL,
  `document_upload` varchar(50) DEFAULT NULL,
  `otherProof_name` varchar(50) DEFAULT NULL,
  `is_active` int(1) NOT NULL DEFAULT 1,
  `is_online` tinyint(1) DEFAULT NULL,
  `is_delete` int(1) NOT NULL DEFAULT 0,
  `last_active_time` varchar(100) DEFAULT NULL,
  `updated` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `created` timestamp NOT NULL DEFAULT current_timestamp(),
  `acc_year` varchar(50) DEFAULT NULL,
  `session_id` varchar(50) DEFAULT NULL,
  `sess_user_type` varchar(50) DEFAULT NULL,
  `sess_user_id` varchar(50) DEFAULT NULL,
  `sess_company_id` varchar(50) DEFAULT NULL,
  `sess_branch_id` varchar(50) DEFAULT NULL,
  PRIMARY KEY (`s_no`)
) ENGINE=InnoDB AUTO_INCREMENT=107 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci AVG_ROW_LENGTH=910;

CREATE TABLE IF NOT EXISTS `user_chat_messages` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT,
  `unique_id` varchar(50) NOT NULL,
  `sender_user_id` varchar(50) NOT NULL,
  `recipient_user_id` varchar(50) NOT NULL,
  `message_text` text NOT NULL,
  `is_read` tinyint(1) NOT NULL DEFAULT 0,
  `read_at` datetime DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_user_chat_unique_id` (`unique_id`),
  KEY `idx_chat_sender_recipient_created` (`sender_user_id`,`recipient_user_id`,`created_at`),
  KEY `idx_chat_recipient_read_created` (`recipient_user_id`,`is_read`,`created_at`),
  KEY `idx_chat_pair_created` (`sender_user_id`,`recipient_user_id`,`id`)
) ENGINE=InnoDB AUTO_INCREMENT=9 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE IF NOT EXISTS `user_login_details` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `unique_id` varchar(50) NOT NULL,
  `user_id` varchar(100) NOT NULL,
  `entry_date` date NOT NULL,
  `entry_time` varchar(100) NOT NULL,
  `log_type` int(11) NOT NULL,
  `is_active` int(11) NOT NULL DEFAULT 1,
  `is_delete` int(11) NOT NULL DEFAULT 0,
  `updated` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `created` timestamp NOT NULL DEFAULT current_timestamp(),
  `acc_year` varchar(50) NOT NULL,
  `session_id` varchar(50) NOT NULL,
  `sess_user_type` varchar(50) NOT NULL,
  `sess_user_id` varchar(50) NOT NULL,
  `sess_company_id` varchar(50) NOT NULL,
  `sess_branch_id` varchar(50) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=38548 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci AVG_ROW_LENGTH=214;

CREATE TABLE IF NOT EXISTS `user_screen` (
  `s_no` int(11) NOT NULL AUTO_INCREMENT,
  `unique_id` varchar(50) NOT NULL,
  `main_screen_unique_id` varchar(150) NOT NULL,
  `screen_section_unique_id` varchar(50) DEFAULT NULL,
  `dashboard_setting_menu` varchar(50) DEFAULT NULL,
  `screen_name` varchar(150) NOT NULL,
  `folder_name` varchar(150) DEFAULT NULL,
  `actions` text NOT NULL,
  `icon_name` varchar(150) NOT NULL,
  `order_no` int(11) NOT NULL,
  `description` text NOT NULL,
  `is_active` int(1) NOT NULL DEFAULT 1,
  `is_delete` int(1) NOT NULL DEFAULT 0,
  `updated` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `created` timestamp NOT NULL DEFAULT current_timestamp(),
  `acc_year` varchar(50) DEFAULT NULL,
  `session_id` varchar(50) DEFAULT NULL,
  `sess_user_type` varchar(50) DEFAULT NULL,
  `sess_user_id` varchar(50) DEFAULT NULL,
  `sess_company_id` varchar(50) DEFAULT NULL,
  `sess_branch_id` varchar(50) DEFAULT NULL,
  PRIMARY KEY (`s_no`)
) ENGINE=InnoDB AUTO_INCREMENT=174 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE IF NOT EXISTS `user_screen_actions` (
  `s_no` int(11) NOT NULL AUTO_INCREMENT,
  `unique_id` varchar(150) NOT NULL,
  `action_name` varchar(150) NOT NULL,
  `variable_name` varchar(150) NOT NULL,
  `is_active` int(11) NOT NULL DEFAULT 1,
  `is_delete` int(11) NOT NULL DEFAULT 0,
  `updated` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `created` timestamp NOT NULL DEFAULT current_timestamp(),
  `acc_year` varchar(50) NOT NULL,
  `session_id` varchar(50) NOT NULL,
  `sess_user_type` varchar(50) NOT NULL,
  `sess_user_id` varchar(50) NOT NULL,
  `sess_company_id` varchar(50) NOT NULL,
  `sess_branch_id` varchar(50) NOT NULL,
  PRIMARY KEY (`s_no`)
) ENGINE=InnoDB AUTO_INCREMENT=8 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci AVG_ROW_LENGTH=2730;

CREATE TABLE IF NOT EXISTS `user_screen_main` (
  `s_no` int(11) NOT NULL AUTO_INCREMENT,
  `unique_id` varchar(50) NOT NULL,
  `screen_type_unique_id` varchar(50) NOT NULL,
  `screen_main_name` varchar(150) NOT NULL,
  `icon_name` varchar(150) NOT NULL,
  `order_no` int(11) NOT NULL,
  `description` varchar(150) NOT NULL,
  `is_active` int(1) NOT NULL DEFAULT 1,
  `is_delete` int(1) NOT NULL DEFAULT 0,
  `updated` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `created` timestamp NOT NULL DEFAULT current_timestamp(),
  `acc_year` varchar(50) NOT NULL,
  `session_id` varchar(50) NOT NULL,
  `sess_user_type` varchar(50) NOT NULL,
  `sess_user_id` varchar(50) NOT NULL,
  `sess_company_id` varchar(50) NOT NULL,
  `sess_branch_id` varchar(50) NOT NULL,
  PRIMARY KEY (`s_no`)
) ENGINE=InnoDB AUTO_INCREMENT=14 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci AVG_ROW_LENGTH=1170;

CREATE TABLE IF NOT EXISTS `user_screen_permission` (
  `s_no` int(11) NOT NULL AUTO_INCREMENT,
  `unique_id` varchar(50) NOT NULL,
  `user_type` varchar(150) NOT NULL,
  `department_name` varchar(100) DEFAULT NULL,
  `main_screen_unique_id` varchar(50) NOT NULL,
  `section_unique_id` varchar(50) NOT NULL,
  `screen_unique_id` varchar(50) NOT NULL,
  `action_unique_id` varchar(50) NOT NULL,
  `order_no` int(11) DEFAULT NULL,
  `description` text DEFAULT NULL,
  `is_active` int(1) NOT NULL DEFAULT 1,
  `is_delete` int(1) NOT NULL DEFAULT 0,
  `updated` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `created` timestamp NOT NULL DEFAULT current_timestamp(),
  `acc_year` varchar(50) DEFAULT NULL,
  `session_id` varchar(50) DEFAULT NULL,
  `sess_user_type` varchar(50) DEFAULT NULL,
  `sess_user_id` varchar(50) DEFAULT NULL,
  `sess_company_id` varchar(50) DEFAULT NULL,
  `sess_branch_id` varchar(50) DEFAULT NULL,
  PRIMARY KEY (`s_no`)
) ENGINE=InnoDB AUTO_INCREMENT=13143 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE IF NOT EXISTS `user_screen_sections` (
  `s_no` int(11) NOT NULL AUTO_INCREMENT,
  `unique_id` varchar(50) NOT NULL,
  `screen_main_unique_id` varchar(50) NOT NULL,
  `section_name` varchar(150) NOT NULL,
  `folder_name` varchar(150) NOT NULL,
  `icon_name` varchar(150) NOT NULL,
  `order_no` int(11) NOT NULL,
  `description` text NOT NULL,
  `is_active` int(1) NOT NULL DEFAULT 1,
  `is_delete` int(1) NOT NULL DEFAULT 0,
  `updated` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `created` timestamp NOT NULL DEFAULT current_timestamp(),
  `acc_year` varchar(50) DEFAULT NULL,
  `session_id` varchar(50) DEFAULT NULL,
  `sess_user_type` varchar(50) DEFAULT NULL,
  `sess_user_id` varchar(50) DEFAULT NULL,
  `sess_company_id` varchar(50) DEFAULT NULL,
  `sess_branch_id` varchar(50) DEFAULT NULL,
  PRIMARY KEY (`s_no`)
) ENGINE=InnoDB AUTO_INCREMENT=24 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci AVG_ROW_LENGTH=744;

CREATE TABLE IF NOT EXISTS `user_screen_type` (
  `s_no` int(11) NOT NULL AUTO_INCREMENT,
  `unique_id` varchar(50) NOT NULL,
  `type_name` varchar(150) NOT NULL,
  `description` text NOT NULL,
  `is_active` int(1) NOT NULL DEFAULT 1,
  `is_delete` int(1) NOT NULL DEFAULT 0,
  `updated` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `created` timestamp NOT NULL DEFAULT current_timestamp(),
  `acc_year` varchar(50) NOT NULL,
  `session_id` varchar(50) NOT NULL,
  `sess_user_type` varchar(50) NOT NULL,
  `sess_user_id` varchar(50) NOT NULL,
  `sess_company_id` varchar(50) NOT NULL,
  `sess_branch_id` varchar(50) NOT NULL,
  PRIMARY KEY (`s_no`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci AVG_ROW_LENGTH=16384;

CREATE TABLE IF NOT EXISTS `user_type` (
  `s_no` int(11) NOT NULL AUTO_INCREMENT,
  `unique_id` varchar(50) NOT NULL,
  `user_type` varchar(150) NOT NULL,
  `under_user_type` longtext DEFAULT NULL,
  `is_active` int(1) NOT NULL DEFAULT 1,
  `is_delete` int(1) NOT NULL DEFAULT 0,
  `updated` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `created` timestamp NOT NULL DEFAULT current_timestamp(),
  `acc_year` varchar(50) DEFAULT NULL,
  `session_id` varchar(50) DEFAULT NULL,
  `sess_user_type` varchar(50) DEFAULT NULL,
  `sess_user_id` varchar(50) DEFAULT NULL,
  `sess_company_id` varchar(50) DEFAULT NULL,
  `sess_branch_id` varchar(50) DEFAULT NULL,
  PRIMARY KEY (`s_no`)
) ENGINE=InnoDB AUTO_INCREMENT=53 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci AVG_ROW_LENGTH=1365;

CREATE TABLE IF NOT EXISTS `vendor_allocation` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `unique_id` varchar(50) NOT NULL,
  `po_num` varchar(250) NOT NULL,
  `po_date` date NOT NULL,
  `department` varchar(250) DEFAULT NULL,
  `gst_value` varchar(100) NOT NULL,
  `executive_name` varchar(250) NOT NULL,
  `vendor_name` longtext NOT NULL,
  `state_name` longtext NOT NULL,
  `district` longtext NOT NULL,
  `zone` varchar(250) NOT NULL,
  `delivery_due_dates` varchar(100) NOT NULL,
  `file_name` varchar(250) NOT NULL,
  `is_active` int(11) NOT NULL DEFAULT 1,
  `is_delete` int(11) NOT NULL DEFAULT 0,
  `updated` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `created` timestamp NOT NULL DEFAULT current_timestamp(),
  `acc_year` varchar(50) DEFAULT NULL,
  `session_id` varchar(50) DEFAULT NULL,
  `sess_user_type` varchar(50) DEFAULT NULL,
  `sess_user_id` varchar(50) DEFAULT NULL,
  `sess_company_id` varchar(50) DEFAULT NULL,
  `sess_branch_id` varchar(50) DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci COMMENT='vendor_allocation';

CREATE TABLE IF NOT EXISTS `vendor_allocation_list` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `unique_id` varchar(50) NOT NULL,
  `po_num` varchar(250) NOT NULL,
  `po_unique_id` varchar(50) NOT NULL,
  `po_form_unique_id` varchar(50) NOT NULL,
  `po_date` varchar(50) NOT NULL,
  `invoice_no` varchar(50) NOT NULL,
  `invoice_auto_id` varchar(50) NOT NULL,
  `invoice_date` varchar(50) NOT NULL,
  `consignee` varchar(250) NOT NULL,
  `consignee_unique_id` varchar(50) DEFAULT NULL,
  `con_address` varchar(250) NOT NULL,
  `con_contact_number` varchar(50) NOT NULL,
  `is_active` int(11) NOT NULL DEFAULT 1,
  `is_delete` int(11) NOT NULL DEFAULT 0,
  `updated` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `created` timestamp NOT NULL DEFAULT current_timestamp(),
  `acc_year` varchar(50) NOT NULL,
  `session_id` varchar(50) NOT NULL,
  `sess_user_type` varchar(50) NOT NULL,
  `sess_user_id` varchar(50) NOT NULL,
  `sess_company_id` varchar(50) NOT NULL,
  `sess_branch_id` varchar(50) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE IF NOT EXISTS `vendor_allocation_sublist` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `unique_id` varchar(50) NOT NULL,
  `po_unique_id` varchar(50) NOT NULL,
  `dc_num` varchar(100) DEFAULT NULL,
  `invoice_qty` int(11) NOT NULL,
  `product_unique_id` varchar(80) NOT NULL,
  `item_code` varchar(250) NOT NULL,
  `product` text NOT NULL,
  `rate` varchar(50) DEFAULT NULL,
  `gst` varchar(40) DEFAULT NULL,
  `tax_amount` varchar(40) DEFAULT NULL,
  `engg_type` varchar(20) DEFAULT NULL,
  `engg_name` varchar(30) DEFAULT NULL,
  `assign_date` date DEFAULT NULL,
  `partial_qty` varchar(30) DEFAULT NULL,
  `time_line` date DEFAULT NULL,
  `insta_date` date DEFAULT NULL,
  `total_amount` varchar(40) DEFAULT NULL,
  `is_active` int(11) NOT NULL DEFAULT 1,
  `is_delete` int(11) NOT NULL DEFAULT 0,
  `updated` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `created` timestamp NOT NULL DEFAULT current_timestamp(),
  `acc_year` varchar(50) NOT NULL,
  `session_id` varchar(50) NOT NULL,
  `sess_user_type` varchar(50) NOT NULL,
  `sess_user_id` varchar(50) NOT NULL,
  `sess_company_id` varchar(50) NOT NULL,
  `sess_branch_id` varchar(50) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE IF NOT EXISTS `vendor_bill_creation` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT,
  `unique_id` varchar(50) NOT NULL,
  `name` varchar(150) NOT NULL,
  `is_active` int(11) NOT NULL,
  `is_delete` varchar(10) NOT NULL,
  `created_at` datetime(6) DEFAULT NULL,
  `updated_at` datetime(6) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_id` (`unique_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE IF NOT EXISTS `vendor_creation` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `unique_id` varchar(50) NOT NULL,
  `company_name` varchar(255) NOT NULL,
  `name` varchar(255) NOT NULL,
  `contact_no` varchar(255) NOT NULL,
  `alt_contact_no` varchar(40) DEFAULT NULL,
  `mail_id` varchar(255) NOT NULL,
  `pan_no` varchar(255) NOT NULL,
  `gst_no` varchar(255) NOT NULL,
  `address` varchar(255) NOT NULL,
  `account_no` varchar(255) NOT NULL,
  `ifsc_code` varchar(255) NOT NULL,
  `acc_holder_name` varchar(250) DEFAULT NULL,
  `bank_name` varchar(255) NOT NULL,
  `pan_attach_file_name` varchar(250) DEFAULT NULL,
  `pan_attach_file_org_name` varchar(250) DEFAULT NULL,
  `bank_proof` varchar(250) DEFAULT NULL,
  `bank_proof_org_name` varchar(250) DEFAULT NULL,
  `branch_name` varchar(255) NOT NULL,
  `district_name` varchar(255) NOT NULL,
  `zone_name` varchar(255) NOT NULL,
  `state_name` varchar(255) NOT NULL,
  `pincode` varchar(255) NOT NULL,
  `vendor_user_type_unique_id` varchar(30) DEFAULT NULL,
  `vendor_id` varchar(30) DEFAULT NULL,
  `user_name` varchar(255) DEFAULT NULL,
  `password` varchar(255) DEFAULT NULL,
  `confirm_password` varchar(255) DEFAULT NULL,
  `cate_type` int(10) NOT NULL DEFAULT 2,
  `is_active` int(11) NOT NULL DEFAULT 1,
  `is_delete` int(11) NOT NULL DEFAULT 0,
  `updated` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `created` timestamp NOT NULL DEFAULT current_timestamp(),
  `acc_year` varchar(50) NOT NULL,
  `session_id` varchar(50) NOT NULL,
  `sess_user_type` varchar(50) NOT NULL,
  `sess_user_id` varchar(50) NOT NULL,
  `sess_company_id` varchar(50) NOT NULL,
  `sess_branch_id` varchar(50) NOT NULL,
  `accounts_approval` int(11) NOT NULL DEFAULT 0,
  `accounts_approved_by` varchar(100) DEFAULT NULL,
  `accounts_approved_date` datetime DEFAULT NULL,
  `management_approval` int(11) NOT NULL DEFAULT 0,
  `management_approved_by` varchar(100) DEFAULT NULL,
  `management_approved_date` datetime DEFAULT NULL,
  `finance_approval` int(11) NOT NULL DEFAULT 0,
  `finance_approved_by` varchar(100) DEFAULT NULL,
  `finance_approved_date` datetime DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=136 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE IF NOT EXISTS `vendor_creation1` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `unique_id` varchar(50) NOT NULL,
  `company_name` varchar(255) NOT NULL,
  `name` varchar(255) NOT NULL,
  `contact_no` varchar(255) NOT NULL,
  `alt_contact_no` varchar(40) DEFAULT NULL,
  `mail_id` varchar(255) NOT NULL,
  `pan_no` varchar(255) NOT NULL,
  `gst_no` varchar(255) NOT NULL,
  `address` varchar(255) NOT NULL,
  `account_no` varchar(255) NOT NULL,
  `ifsc_code` varchar(255) NOT NULL,
  `bank_name` varchar(255) NOT NULL,
  `branch_name` varchar(255) NOT NULL,
  `district_name` varchar(255) NOT NULL,
  `zone_name` varchar(255) NOT NULL,
  `state_name` varchar(255) NOT NULL,
  `pincode` varchar(255) NOT NULL,
  `vendor_user_type_unique_id` varchar(30) DEFAULT NULL,
  `vendor_id` varchar(30) DEFAULT NULL,
  `user_name` varchar(255) DEFAULT NULL,
  `password` varchar(255) DEFAULT NULL,
  `confirm_password` varchar(255) DEFAULT NULL,
  `cate_type` int(10) NOT NULL DEFAULT 2,
  `is_active` int(11) NOT NULL DEFAULT 1,
  `is_delete` int(11) NOT NULL DEFAULT 0,
  `updated` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `created` timestamp NOT NULL DEFAULT current_timestamp(),
  `acc_year` varchar(50) NOT NULL,
  `session_id` varchar(50) NOT NULL,
  `sess_user_type` varchar(50) NOT NULL,
  `sess_user_id` varchar(50) NOT NULL,
  `sess_company_id` varchar(50) NOT NULL,
  `sess_branch_id` varchar(50) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=35 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE IF NOT EXISTS `vendor_payment_count` (
  `acc_year` varchar(20) DEFAULT NULL,
  `vendor_id` varchar(30) NOT NULL,
  `assign_dc_count` int(11) DEFAULT NULL,
  `assign_dc_value` decimal(10,2) DEFAULT NULL,
  `issue_dc_count` int(11) DEFAULT NULL,
  `issue_dc_value` decimal(10,2) DEFAULT NULL,
  `balance_dc_count` int(11) DEFAULT NULL,
  `balance_dc_value` decimal(10,2) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE IF NOT EXISTS `vendor_payment_details` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `unique_id` varchar(50) NOT NULL,
  `main_unique_id` varchar(50) NOT NULL,
  `bill_no` varchar(80) NOT NULL,
  `bill_date` varchar(30) DEFAULT NULL,
  `po_num` varchar(250) NOT NULL,
  `po_form_unique_id` varchar(50) NOT NULL,
  `invoice_no` varchar(50) NOT NULL,
  `dc_num` varchar(80) NOT NULL,
  `invoice_qty` varchar(50) DEFAULT NULL,
  `vendor_id` varchar(110) DEFAULT NULL,
  `vendor_name` varchar(80) DEFAULT NULL,
  `dc_date` varchar(50) DEFAULT NULL,
  `rate` varchar(100) DEFAULT NULL,
  `gst` varchar(80) DEFAULT NULL,
  `amount` varchar(100) DEFAULT NULL,
  `total_amount` varchar(100) DEFAULT NULL,
  `finance_approval` varchar(10) NOT NULL DEFAULT '0' COMMENT '0-Pending,1-Approved,2-Rejected',
  `finance_reject_reason` varchar(100) DEFAULT NULL,
  `finance_approved_by` varchar(100) DEFAULT NULL,
  `finance_approved_date` varchar(50) DEFAULT NULL,
  `accounts_approval` varchar(100) DEFAULT NULL COMMENT '1-Approved',
  `acc_ent_sts` varchar(10) DEFAULT '0' COMMENT '0-Pending 1-Approved,2-Rejected',
  `acc_ent_rej_reason` longtext DEFAULT NULL,
  `acc_rejected_by` varchar(110) DEFAULT NULL,
  `rejected_stage` varchar(10) DEFAULT NULL COMMENT '1-Vendor_bill_approval\r\n2-Accounts Team Entry\r\n3-Accounts Team Approval\r\n4-Management Team Bill Approval',
  `transaction_type` int(11) DEFAULT NULL COMMENT '1-Cash, 2-Bank, 3-UPI',
  `transaction_date` date DEFAULT NULL,
  `transaction_id` varchar(250) DEFAULT NULL,
  `bank_name` varchar(110) DEFAULT NULL,
  `banknamenew` varchar(100) DEFAULT NULL,
  `ifsc_code` varchar(50) DEFAULT NULL,
  `account_no` varchar(100) DEFAULT NULL,
  `branch_name` varchar(100) DEFAULT NULL,
  `upi_method` varchar(100) DEFAULT NULL,
  `upi_id` varchar(100) DEFAULT NULL,
  `upi_mobile_no` varchar(100) DEFAULT NULL,
  `cash_receipt_file_org` varchar(100) DEFAULT NULL,
  `cash_receipt_file_name` varchar(100) DEFAULT NULL,
  `accounts_approved_by` varchar(80) DEFAULT NULL,
  `accounts_approved_date` varchar(50) DEFAULT NULL,
  `finance_remark` longtext DEFAULT NULL,
  `account_remark` longtext DEFAULT NULL,
  `inv_verfiy_attach` varchar(100) DEFAULT NULL,
  `inv_verfiy_attach_org_name` varchar(100) DEFAULT NULL,
  `po_ven_filename` varchar(110) DEFAULT NULL,
  `po_ven_orgfilename` varchar(110) DEFAULT NULL,
  `vendor_inv_attach_approval` varchar(100) DEFAULT NULL,
  `vendor_inv_attach_approval_date` varchar(100) DEFAULT NULL,
  `veninvverifyid` varchar(100) DEFAULT NULL,
  `veninvstatus` int(11) NOT NULL DEFAULT 0 COMMENT '0-pending 1-approval 2-rejected',
  `bill_remark` longtext DEFAULT NULL,
  `vendor_bill_app_status` int(11) DEFAULT 0 COMMENT '0-pending, 1-approval, 2-rejected',
  `vendor_bill_created_by` varchar(110) DEFAULT NULL,
  `vendor_bill_created_date` varchar(110) DEFAULT NULL,
  `vendor_bill_approval` varchar(100) DEFAULT NULL,
  `vendor_bill_approval_date` datetime DEFAULT NULL,
  `vendor_bill_reject_reason` varchar(250) DEFAULT NULL,
  `accountbillid` varchar(100) DEFAULT NULL,
  `acctdsvalue` varchar(100) DEFAULT NULL,
  `Totaltdsamount` varchar(100) DEFAULT NULL,
  `accotherdeduction` varchar(100) DEFAULT NULL,
  `advancepayment` varchar(100) DEFAULT NULL,
  `acctotalpaybleamount` varchar(100) DEFAULT NULL,
  `accdetuctionremarks` longtext DEFAULT NULL,
  `vendor_account_approved_by` varchar(100) DEFAULT NULL,
  `vendor_account_approval_date` varchar(100) DEFAULT NULL,
  `managementremark` longtext DEFAULT NULL,
  `managment_team_approvedby` varchar(100) DEFAULT NULL,
  `managment_team_approvaldate` datetime DEFAULT NULL,
  `managment_team_allocated` int(11) NOT NULL DEFAULT 0 COMMENT '0-pending 1-Allocated',
  `managment_team_approval_sts` int(11) NOT NULL DEFAULT 0 COMMENT '0-pending 1-Approval 2-rejected',
  `managment_team_reject_reason` longtext DEFAULT NULL,
  `payment_id` varchar(100) DEFAULT NULL,
  `accstatus` int(11) NOT NULL DEFAULT 0 COMMENT '0-pending ,1-completed',
  `is_active` int(11) NOT NULL DEFAULT 1,
  `is_delete` int(11) NOT NULL DEFAULT 0,
  `updated` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `created` timestamp NOT NULL DEFAULT current_timestamp(),
  `acc_year` varchar(50) NOT NULL,
  `session_id` varchar(50) NOT NULL,
  `sess_user_type` varchar(50) NOT NULL,
  `sess_user_id` varchar(50) NOT NULL,
  `sess_company_id` varchar(50) NOT NULL,
  `sess_branch_id` varchar(50) NOT NULL,
  `vendor_bill_rejected_by` varchar(255) DEFAULT '',
  `additionalcharges` decimal(15,2) NOT NULL DEFAULT 0.00,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE IF NOT EXISTS `vendor_payment_details_main` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `unique_id` varchar(50) NOT NULL,
  `main_unique_id` varchar(50) NOT NULL,
  `bill_no` varchar(80) DEFAULT NULL,
  `bill_date` varchar(30) DEFAULT NULL,
  `po_num` mediumtext NOT NULL,
  `po_form_unique_id` mediumtext NOT NULL,
  `invoice_no` mediumtext NOT NULL,
  `dc_num` mediumtext NOT NULL,
  `invoice_qty` varchar(50) DEFAULT NULL,
  `vendor_id` varchar(110) DEFAULT NULL,
  `vendor_name` varchar(250) DEFAULT NULL,
  `dc_date` mediumtext DEFAULT NULL,
  `rate` varchar(100) DEFAULT NULL,
  `gst` varchar(80) DEFAULT NULL,
  `amount` varchar(100) DEFAULT NULL,
  `total_amount` varchar(100) DEFAULT NULL,
  `finance_approval` varchar(10) NOT NULL DEFAULT '0' COMMENT '0-Pending,1-Approved,2-Rejected',
  `vendor_payment_allocated` int(11) NOT NULL DEFAULT 0,
  `finance_reject_reason` varchar(100) DEFAULT NULL,
  `finance_approved_by` varchar(100) DEFAULT NULL,
  `finance_approved_date` varchar(100) DEFAULT NULL,
  `accounts_approval` varchar(100) DEFAULT NULL COMMENT '1-Approved',
  `acc_ent_sts` varchar(10) DEFAULT '0' COMMENT '0-Pending,1-Approved,2-Rejected',
  `acc_ent_rej_reason` longtext DEFAULT NULL,
  `rejected_stage` varchar(10) DEFAULT NULL COMMENT '	1-Vendor_bill_approval 2-Accounts Team Entry 3-Accounts Team Approval 4-Management Team Bill Approval',
  `transaction_type` int(11) DEFAULT NULL COMMENT '1-Cash, 2-Bank, 3-UPI',
  `transaction_date` date DEFAULT NULL,
  `transaction_id` varchar(250) DEFAULT NULL,
  `bank_name` varchar(110) DEFAULT NULL,
  `banknamenew` varchar(100) DEFAULT NULL,
  `ifsc_code` varchar(200) DEFAULT NULL,
  `account_no` varchar(200) DEFAULT NULL,
  `branch_name` varchar(200) DEFAULT NULL,
  `upi_method` varchar(100) DEFAULT NULL,
  `upi_id` varchar(100) DEFAULT NULL,
  `upi_mobile_no` varchar(100) DEFAULT NULL,
  `cash_receipt_file_org` varchar(100) DEFAULT NULL,
  `cash_receipt_file_name` varchar(100) DEFAULT NULL,
  `accounts_approved_by` varchar(80) DEFAULT NULL,
  `accounts_approved_date` varchar(50) DEFAULT NULL,
  `finance_remark` longtext DEFAULT NULL,
  `account_remark` longtext DEFAULT NULL,
  `inv_verfiy_attach` varchar(100) DEFAULT NULL,
  `inv_verfiy_attach_org_name` varchar(100) DEFAULT NULL,
  `po_ven_filename` varchar(110) DEFAULT NULL,
  `po_ven_orgfilename` varchar(110) DEFAULT NULL,
  `vendor_inv_attach_approval` varchar(100) DEFAULT NULL,
  `vendor_inv_attach_approval_date` varchar(100) DEFAULT NULL,
  `veninvverifyid` varchar(250) DEFAULT NULL,
  `user_vendor_invoice_id` varchar(100) DEFAULT NULL,
  `veninvstatus` int(11) NOT NULL DEFAULT 0 COMMENT '0-pending 1-approval-2-rejected',
  `bill_remark` longtext DEFAULT NULL,
  `vendor_bill_app_status` int(11) DEFAULT 0 COMMENT '0-pending,1-approval,2-rejected',
  `vendor_bill_created_by` varchar(110) DEFAULT NULL,
  `vendor_bill_created_date` varchar(110) DEFAULT NULL,
  `vendor_bill_approval` varchar(100) DEFAULT NULL,
  `vendor_bill_approved_by` varchar(110) DEFAULT NULL,
  `vendor_bill_approval_date` date DEFAULT NULL,
  `vendor_bill_reject_reason` varchar(250) DEFAULT NULL,
  `accountbillid` varchar(100) DEFAULT NULL,
  `acctdsvalue` varchar(100) DEFAULT NULL,
  `Totaltdsamount` varchar(100) DEFAULT NULL,
  `accotherdeduction` varchar(100) DEFAULT NULL,
  `advancepayment` varchar(100) DEFAULT NULL,
  `acctotalpaybleamount` varchar(100) DEFAULT NULL,
  `accdetuctionremarks` longtext DEFAULT NULL,
  `vendor_account_approved_by` varchar(100) DEFAULT NULL,
  `vendor_account_approval_date` varchar(100) DEFAULT NULL,
  `accstatus` int(11) NOT NULL DEFAULT 0 COMMENT '0-pending 1-approval 2-rejected',
  `managementremark` longtext DEFAULT NULL,
  `managment_team_allocated` int(11) NOT NULL DEFAULT 0 COMMENT '0-pending 1-allocated',
  `managment_team_approval_sts` int(11) NOT NULL DEFAULT 0 COMMENT '0-pending 1-approval 2-rejected',
  `managment_team_approvedby` varchar(100) DEFAULT NULL,
  `managment_team_approvaldate` date DEFAULT NULL,
  `managment_team_reject_reason` longtext DEFAULT NULL,
  `payment_id` varchar(100) DEFAULT NULL,
  `is_active` int(11) NOT NULL DEFAULT 1,
  `is_delete` int(11) NOT NULL DEFAULT 0,
  `updated` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `created` timestamp NOT NULL DEFAULT current_timestamp(),
  `acc_year` varchar(50) NOT NULL,
  `session_id` varchar(50) NOT NULL,
  `sess_user_type` varchar(50) NOT NULL,
  `sess_user_id` varchar(50) NOT NULL,
  `sess_company_id` varchar(50) NOT NULL,
  `sess_branch_id` varchar(50) NOT NULL,
  `additionalcharges` decimal(15,2) NOT NULL DEFAULT 0.00,
  PRIMARY KEY (`id`),
  KEY `is_delete` (`is_delete`),
  KEY `unique_id` (`unique_id`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE IF NOT EXISTS `vendor_payment_main` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `unique_id` varchar(100) NOT NULL,
  `bill_no` varchar(100) NOT NULL,
  `bill_date` date NOT NULL,
  `po_form_unique_id` varchar(100) DEFAULT NULL,
  `po_num` varchar(100) DEFAULT NULL,
  `vendor_id` varchar(100) DEFAULT NULL,
  `rate` decimal(10,2) DEFAULT 0.00,
  `gst` decimal(10,2) DEFAULT 0.00,
  `total_amount` decimal(12,2) DEFAULT 0.00,
  `is_delete` tinyint(1) DEFAULT 0,
  `is_active` tinyint(1) DEFAULT 1,
  `created_at` datetime DEFAULT current_timestamp(),
  `updated_at` datetime DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE IF NOT EXISTS `zone_creation` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `unique_id` varchar(50) NOT NULL,
  `is_active` int(11) NOT NULL DEFAULT 1,
  `is_delete` int(11) NOT NULL DEFAULT 0,
  `updated` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `created` timestamp NOT NULL DEFAULT current_timestamp(),
  `acc_year` varchar(50) NOT NULL,
  `session_id` varchar(50) NOT NULL,
  `sess_user_type` varchar(50) NOT NULL,
  `sess_user_id` varchar(50) NOT NULL,
  `sess_company_id` varchar(50) NOT NULL,
  `sess_branch_id` varchar(50) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

DROP VIEW IF EXISTS `po_consignee_assign`;
CREATE OR REPLACE ALGORITHM=UNDEFINED DEFINER=`root`@`localhost` SQL SECURITY DEFINER VIEW `po_consignee_assign` AS select `get_po_number`(`spm`.`form_main_unique_id`) AS `po_number`,`spm`.`form_main_unique_id` AS `form_main_unique_id`,`spm`.`sess_user_type` AS `sess_user_type`,`spm`.`stock_qty` AS `stock_qty`,ifnull(`inv_sum`.`total_invoice_qty`,0) AS `total_invoice_qty`,`spm`.`acc_year` AS `acc_year`,round(ifnull(`spm`.`stock_value`,0),2) AS `stock_qty_value`,round(ifnull(`inv_sum`.`total_invoice_qty_value`,0),2) AS `invoice_qty_value`,`spm`.`stock_qty` - ifnull(`inv_sum`.`total_invoice_qty`,0) AS `df`,round(ifnull(`spm`.`stock_value`,0),2) - round(ifnull(`inv_sum`.`total_invoice_qty_value`,0),2) AS `df_val` from ((`stock_position_main` `spm` left join (select `invoice_creation`.`po_unique_id` AS `po_unique_id`,sum(`invoice_creation`.`invoice_qty`) AS `total_invoice_qty`,sum(`invoice_creation`.`invoice_qty_value`) AS `total_invoice_qty_value` from `invoice_creation` where `invoice_creation`.`is_delete` = 0 group by `invoice_creation`.`po_unique_id`) `inv_sum` on(`inv_sum`.`po_unique_id` = `spm`.`form_main_unique_id`)) left join `po_form` `pf` on(`pf`.`unique_id` = `spm`.`form_main_unique_id`));

DROP VIEW IF EXISTS `v_po_status`;
CREATE OR REPLACE ALGORITHM=UNDEFINED DEFINER=`root`@`localhost` SQL SECURITY DEFINER VIEW `v_po_status` AS select `pf`.`unique_id` AS `unique_id`,`pf`.`po_num` AS `po_num`,`pf`.`po_date` AS `po_date`,`pf`.`executive_name` AS `executive_name`,`pf`.`bill_address` AS `bill_address`,`pf`.`contact_name` AS `contact_name`,`pf`.`contact_number` AS `contact_number`,`pf`.`po_prepared_by` AS `po_prepared_by`,`pf`.`total_qty` AS `total_qty`,`pf`.`total_amount` AS `total_amount`,`pf`.`file_name` AS `file_name`,coalesce(`pad_sum`.`conassignqty`,0) AS `conassignqty`,case when count(distinct `pds`.`form_main_unique_id`) = 0 then 0 else 1 end AS `2tabproductstatus`,case when count(distinct `cds`.`form_main_unique_id`) = 0 then 0 else 1 end AS `3tabconstatus`,case when coalesce(`pad_sum`.`conassignqty`,0) > 0 then 1 else 0 end AS `4thtabpoproductstatus`,case when `pf`.`file_name` = '' or `pf`.`file_name` is null then 0 else 1 end AS `5tabpostatus` from (((`po_form` `pf` left join `product_details_sub` `pds` on(`pf`.`unique_id` = `pds`.`form_main_unique_id` and `pds`.`is_delete` = 0)) left join `consignee_details_sub` `cds` on(`pf`.`unique_id` = `cds`.`form_main_unique_id` and `cds`.`is_delete` = 0)) left join (select `po_product_assign_details`.`form_main_unique_id` AS `form_main_unique_id`,sum(`po_product_assign_details`.`assign_qty`) AS `conassignqty` from `po_product_assign_details` where `po_product_assign_details`.`is_delete` = 0 group by `po_product_assign_details`.`form_main_unique_id`) `pad_sum` on(`pf`.`unique_id` = `pad_sum`.`form_main_unique_id`)) where `pf`.`is_delete` = '0' group by `pf`.`unique_id`,`pf`.`po_num`,`pf`.`po_date`,`pf`.`file_name`,`pf`.`executive_name`,`pf`.`bill_address`,`pf`.`contact_name`,`pf`.`contact_number`,`pf`.`po_prepared_by`,`pf`.`total_qty`,`pf`.`total_amount`,`pad_sum`.`conassignqty`;

DROP VIEW IF EXISTS `view_ac_team_pending`;
CREATE OR REPLACE ALGORITHM=UNDEFINED DEFINER=`root`@`localhost` SQL SECURITY DEFINER VIEW `view_ac_team_pending` AS select `invoice_main`.`form_main_unique_id` AS `po_unique_id`,`invoice_main`.`acc_year` AS `acc_year`,`invoice_main`.`sess_user_type` AS `sess_user_type`,count(distinct `invoice_main`.`unique_id`) AS `invoice_count`,round(sum(cast(`invoice_main`.`invoice_value` as decimal(10,2))),2) AS `invoice_value` from `invoice_creation_main` `invoice_main` where `invoice_main`.`doc_approval_sts` = '1' and `invoice_main`.`ac_team_verifiy_status` = '0' and `invoice_main`.`is_delete` = '0' group by `invoice_main`.`form_main_unique_id`;

DROP VIEW IF EXISTS `view_bg_list_final`;
CREATE OR REPLACE ALGORITHM=UNDEFINED DEFINER=`root`@`localhost` SQL SECURITY DEFINER VIEW `view_bg_list_final` AS select `bg_select1`.`po_num` AS `po_num`,`bg_select1`.`po_unique_id` AS `po_unique_id`,`bg_select1`.`form_main_unique_id` AS `form_main_unique_id`,`bg_select1`.`po_date` AS `po_date`,`bg_select1`.`invoice_no` AS `invoice_no`,`bg_select1`.`invoice_date` AS `invoice_date`,`bg_select1`.`ledger_name` AS `ledger_name`,`bg_select1`.`dc_number` AS `dc_number`,`bg_select1`.`dc_date` AS `dc_date`,`bg_select1`.`invoice_auto_id` AS `invoice_auto_id`,`bg_select1`.`executive_name` AS `executive_name`,`bg_select1`.`acc_year` AS `acc_year`,`bg_select1`.`consignee_unique_id` AS `consignee_unique_id`,`bg_select1`.`invoice_qty` AS `invoice_qty`,`bg_select1`.`invoice_value` AS `invoice_value`,`bg_select1`.`bank_required` AS `bank_required`,`bg_select1`.`bg_percentage` AS `bg_percentage`,`bg_select1`.`bg_month` AS `bg_month`,`bg_select1`.`bg_status` AS `bg_status`,`bg_select2`.`po_product_name` AS `po_product_name`,`bg_select2`.`with_bg` AS `with_bg`,`bg_select2`.`status_app` AS `status_app` from (`view_bg_select_list1` `bg_select1` join `view_bg_select_list2` `bg_select2` on(`bg_select2`.`form_main_unique_id` = `bg_select1`.`form_main_unique_id` and `bg_select2`.`invoice_no` = `bg_select1`.`invoice_no`)) group by `bg_select2`.`invoice_no`;

DROP VIEW IF EXISTS `view_bg_pending_count`;
CREATE OR REPLACE ALGORITHM=UNDEFINED DEFINER=`root`@`localhost` SQL SECURITY DEFINER VIEW `view_bg_pending_count` AS select `bg_pending`.`form_main_unique_id` AS `form_main_unique_id`,`bg_pending`.`acc_year` AS `acc_year`,count(`bg_pending`.`invoice_no`) AS `invoice_count`,sum(`bg_pending`.`invoice_value`) AS `invoice_value`,`bg_pending`.`invoice_no` AS `invoice_no`,(select count(distinct `invoice_creation_main`.`dc_number`) from `invoice_creation_main` where `invoice_creation_main`.`invoice_no` = `bg_pending`.`invoice_no` and `invoice_creation_main`.`acc_year` = `bg_pending`.`acc_year`) AS `dc_count` from `view_bg_list_final` `bg_pending` where `bg_pending`.`bg_status` = '0' group by `bg_pending`.`form_main_unique_id`;

DROP VIEW IF EXISTS `view_bg_select_list1`;
CREATE OR REPLACE ALGORITHM=UNDEFINED DEFINER=`root`@`localhost` SQL SECURITY DEFINER VIEW `view_bg_select_list1` AS select `po_form`.`po_num` AS `po_num`,`inv_main`.`po_unique_id` AS `po_unique_id`,`inv_main`.`form_main_unique_id` AS `form_main_unique_id`,`po_form`.`po_date` AS `po_date`,`inv_main`.`invoice_no` AS `invoice_no`,`inv_main`.`invoice_date` AS `invoice_date`,`inv_main`.`ledger_name` AS `ledger_name`,`inv_main`.`dc_number` AS `dc_number`,`inv_main`.`dc_date` AS `dc_date`,`inv_main`.`invoice_auto_id` AS `invoice_auto_id`,`inv_main`.`executive_name` AS `executive_name`,`inv_main`.`consignee_unique_id` AS `consignee_unique_id`,`inv_main`.`invoice_qty` AS `invoice_qty`,`inv_main`.`invoice_value` AS `invoice_value`,`inv_main`.`acc_year` AS `acc_year`,`sign_doc_details`.`bg_status` AS `bg_status`,`sign_doc_details`.`ins_unique_id` AS `ins_unique_id`,`po_form`.`ins_reqired` AS `ins_reqired`,`po_form`.`bank_required` AS `bank_required`,`po_form`.`bg` AS `bg_percentage`,`po_form`.`bg_month` AS `bg_month` from (((`invoice_creation_main` `inv_main` join `po_form` on(`inv_main`.`form_main_unique_id` = `po_form`.`unique_id` and `po_form`.`is_delete` = '0')) join `product_details_sub` `product_sub` on(`product_sub`.`form_main_unique_id` = `inv_main`.`form_main_unique_id` and `product_sub`.`is_delete` = '0')) join `sign_doc_verification_detail` `sign_doc_details` on(`sign_doc_details`.`form_main_unique_id` = `inv_main`.`form_main_unique_id` and `sign_doc_details`.`invoice_no` = `inv_main`.`invoice_no` and `sign_doc_details`.`is_delete` = '0' and `sign_doc_details`.`inv_verify_status` = '1')) where `inv_main`.`invoice_no` <> '' and `product_sub`.`bg_required` = 'yes' and `inv_main`.`is_delete` = '0' group by `inv_main`.`invoice_no`;

DROP VIEW IF EXISTS `view_bg_select_list2`;
CREATE OR REPLACE ALGORITHM=UNDEFINED DEFINER=`root`@`localhost` SQL SECURITY DEFINER VIEW `view_bg_select_list2` AS select `inv_main`.`form_main_unique_id` AS `form_main_unique_id`,`inv_main`.`consignee_unique_id` AS `consignee_unique_id`,`inv_main`.`invoice_no` AS `invoice_no`,`inv_main`.`acc_year` AS `acc_year`,`sign_doc_details`.`bg_status` AS `bg_status`,`sign_doc_details`.`ins_unique_id` AS `ins_unique_id`,`sign_doc_details`.`po_product_name` AS `po_product_name`,`sign_doc_details`.`status_app` AS `status_app`,`sign_doc_details`.`with_bg` AS `with_bg` from (`invoice_creation_main` `inv_main` join `sign_doc_verification_detail` `sign_doc_details` on(`sign_doc_details`.`form_main_unique_id` = `inv_main`.`form_main_unique_id` and `sign_doc_details`.`invoice_no` = `inv_main`.`invoice_no` and `sign_doc_details`.`is_delete` = '0')) where `inv_main`.`is_delete` = '0' and `sign_doc_details`.`status_app` = '2' and `sign_doc_details`.`with_bg` = 'on';

DROP VIEW IF EXISTS `view_bill_pending_count`;
CREATE OR REPLACE ALGORITHM=UNDEFINED DEFINER=`root`@`localhost` SQL SECURITY DEFINER VIEW `view_bill_pending_count` AS select `bill`.`form_main_unique_id` AS `form_main_unique_id`,count(`inv`.`invoice_no`) AS `invoice_count`,`inv`.`invoice_no` AS `invoice_no`,`bill`.`acc_year` AS `acc_year`,round(sum(cast(`inv`.`invoice_value` as decimal(10,2))),2) AS `invoice_value` from (`sign_doc_verification_detail` `bill` left join `invoice_creation_main` `inv` on(`inv`.`form_main_unique_id` = `bill`.`form_main_unique_id` and `inv`.`is_delete` = '0' and `inv`.`invoice_no` = `bill`.`invoice_no`)) where `bill`.`status_app` = '2' and `bill`.`is_delete` = '0' and (`bill`.`bill_status` = '0' or `bill`.`bill_status` = '3' or `bill`.`bill_status` = '4') group by `bill`.`form_main_unique_id`,`bill`.`acc_year`;

DROP VIEW IF EXISTS `view_bill_submission_list_pending_1`;
CREATE OR REPLACE ALGORITHM=UNDEFINED DEFINER=`root`@`localhost` SQL SECURITY DEFINER VIEW `view_bill_submission_list_pending_1` AS select `inv`.`form_main_unique_id` AS `form_main_unique_id`,`inv`.`invoice_no` AS `invoice_no`,`inv`.`invoice_date` AS `invoice_date`,`inv`.`invoice_value` AS `invoice_value`,`inv`.`acc_year` AS `acc_year`,`inv`.`invoice_qty` AS `invoice_qty`,`inv`.`ledger_name` AS `ledger_name`,`inv`.`consignee_unique_id` AS `consignee_unique_id`,`inv`.`dc_number` AS `dc_number`,`inv`.`dc_date` AS `dc_date`,`con_sub`.`con_contact_name` AS `con_contact_name`,`con_sub`.`con_address` AS `con_address`,`sign_doc`.`without_bg` AS `proced_without_bg`,`sign_doc`.`with_bg` AS `proced_with_bg`,`sign_doc`.`ins_unique_id` AS `ins_unique_id`,`sign_doc`.`bill_status` AS `bill_status`,`sign_doc`.`ir_status` AS `ir_status`,`sign_doc`.`snr_status` AS `snr_status`,`sign_doc`.`bill_reject_reason` AS `bill_reject_reason`,`sign_doc`.`payment_cancel_reason` AS `payment_cancel_reason`,`po`.`file_name` AS `file_name`,`po`.`department` AS `department`,`po`.`file_org_name` AS `file_org_name`,ifnull(`po`.`ins_reqired`,0) AS `ins_reqired`,ifnull(`po`.`bank_required`,0) AS `bank_required`,`po`.`po_num` AS `po_num`,`po`.`po_date` AS `po_date` from (((`sign_doc_verification_detail` `sign_doc` left join `po_form` `po` on(`sign_doc`.`form_main_unique_id` = `po`.`unique_id` and `po`.`is_delete` = '0')) left join `consignee_details_sub` `con_sub` on(`con_sub`.`unique_id` = `sign_doc`.`con_unique_id` and `con_sub`.`is_delete` = '0')) left join `invoice_creation_main` `inv` on(`inv`.`form_main_unique_id` = `sign_doc`.`form_main_unique_id` and `inv`.`invoice_no` = `sign_doc`.`invoice_no` and `inv`.`is_delete` = '0')) where `sign_doc`.`status_app` = '2' and `sign_doc`.`is_delete` = '0' and (`sign_doc`.`bill_status` = '0' or `sign_doc`.`bill_status` = '1' or `sign_doc`.`bill_status` = '2' or `sign_doc`.`bill_status` = '3' or `sign_doc`.`bill_status` = '4') group by `sign_doc`.`ins_unique_id`,`inv`.`dc_number`;

DROP VIEW IF EXISTS `view_bill_submission_main_table`;
CREATE OR REPLACE ALGORITHM=UNDEFINED DEFINER=`root`@`localhost` SQL SECURITY DEFINER VIEW `view_bill_submission_main_table` AS select `bill_main`.`id` AS `id`,`bill_main`.`unique_id` AS `unique_id`,`bill_main`.`bill_form_main_unique_id` AS `bill_form_main_unique_id`,`bill_main`.`po_num` AS `po_num`,`bill_main`.`po_date` AS `po_date`,`bill_main`.`con_contact_name` AS `con_contact_name`,`bill_main`.`con_address` AS `con_address`,`bill_main`.`invoice_no` AS `invoice_no`,`bill_main`.`invoice_date` AS `invoice_date`,`bill_main`.`invoice_value` AS `invoice_value`,`bill_main`.`invoice_qty` AS `invoice_qty`,`bill_main`.`consignee_unique_id` AS `consignee_unique_id`,`bill_main`.`bg_num` AS `bg_num`,`bill_main`.`bg_id` AS `bg_id`,`bill_main`.`bg_date` AS `bg_date`,`bill_main`.`bg_value` AS `bg_value`,`bill_main`.`claim_amount` AS `claim_amount`,`bill_main`.`claimamt` AS `claimamt`,`bill_main`.`bill_submission_date` AS `bill_submission_date`,`bill_main`.`e_no` AS `e_no`,`bill_main`.`elcot_ent_status` AS `elcot_ent_status`,`bill_main`.`bill_status` AS `bill_status`,`bill_main`.`bill_no` AS `bill_no`,`bill_main`.`payment_date` AS `payment_date`,`bill_main`.`payment_status` AS `payment_status`,`bill_main`.`payement_receive` AS `payement_receive`,`bill_main`.`status` AS `status`,`bill_main`.`file_name` AS `file_name`,`bill_main`.`file_org_name` AS `file_org_name`,`bill_main`.`ld_amount` AS `ld_amount`,`bill_main`.`ld_days` AS `ld_days`,`bill_main`.`is_delete` AS `is_delete`,`bill_main`.`bill_created_date` AS `bill_created_date`,`bill_main`.`partial_bill_status` AS `partial_bill_status`,`bill_main`.`acc_year` AS `acc_year`,`bill_main`.`is_active` AS `is_active`,`bill_main`.`created` AS `created`,`bill_main`.`updated` AS `updated`,`bill_main`.`session_id` AS `session_id`,`bill_main`.`sess_user_type` AS `sess_user_type`,`bill_main`.`sess_user_id` AS `sess_user_id`,`bill_main`.`sess_company_id` AS `sess_company_id`,`bill_main`.`sess_branch_id` AS `sess_branch_id` from `bill_submission_main_table` `bill_main` where `bill_main`.`is_delete` = '0';

DROP VIEW IF EXISTS `view_bill_submission_otm_without_bg`;
CREATE OR REPLACE ALGORITHM=UNDEFINED DEFINER=`root`@`localhost` SQL SECURITY DEFINER VIEW `view_bill_submission_otm_without_bg` AS select `inv`.`form_main_unique_id` AS `form_main_unique_id`,`inv`.`po_num` AS `po_num`,`inv`.`po_date` AS `po_date`,`inv`.`invoice_no` AS `invoice_no`,`inv`.`invoice_date` AS `invoice_date`,sum(`inv`.`invoice_value`) AS `invoice_value`,sum(`inv`.`invoice_qty`) AS `invoice_qty`,`inv`.`bill_status` AS `bill_status`,`inv`.`inv_verify_status` AS `inv_verify_status`,`bill_sub_form`.`claim_amount` AS `claim_amount`,`po`.`file_name` AS `file_name`,`po`.`file_org_name` AS `file_org_name`,`po`.`proceed_bg` AS `proceed_bg` from ((`invoice_verfication_table` `inv` join `bill_submission_form` `bill_sub_form` on(`inv`.`form_main_unique_id` = `bill_sub_form`.`bill_form_main_unique_id` and `inv`.`invoice_no` = `bill_sub_form`.`invoice_no` and `bill_sub_form`.`is_delete` = '0')) join `po_form` `po` on(`inv`.`form_main_unique_id` = `po`.`unique_id` and `po`.`is_delete` = '0')) where `inv`.`status_app` = '2' group by `inv`.`invoice_no`;

DROP VIEW IF EXISTS `view_bill_submission_sub_table`;
CREATE OR REPLACE ALGORITHM=UNDEFINED DEFINER=`root`@`localhost` SQL SECURITY DEFINER VIEW `view_bill_submission_sub_table` AS select `bill_sub`.`id` AS `id`,`bill_sub`.`unique_id` AS `unique_id`,`bill_sub`.`bill_form_unique_id` AS `bill_form_unique_id`,`bill_sub`.`po_num` AS `po_num`,`bill_sub`.`po_date` AS `po_date`,`bill_sub`.`con_contact_name` AS `con_contact_name`,`bill_sub`.`con_address` AS `con_address`,`bill_sub`.`invoice_no` AS `invoice_no`,`bill_sub`.`invoice_date` AS `invoice_date`,`bill_sub`.`invoice_value` AS `invoice_value`,`bill_sub`.`invoice_qty` AS `invoice_qty`,`bill_sub`.`invoice_auto_id` AS `invoice_auto_id`,`bill_sub`.`bill_status` AS `bill_status`,`bill_sub`.`ins_unique_id` AS `ins_unique_id`,`bill_sub`.`claim_status` AS `claim_status`,`bill_sub`.`claim_percentage` AS `claim_percentage`,`bill_sub`.`consignee_unique_id` AS `consignee_unique_id`,`bill_sub`.`bill_submission_date` AS `bill_submission_date`,`bill_sub`.`e_no` AS `e_no`,`bill_sub`.`elcot_ent_status` AS `elcot_ent_status`,`bill_sub`.`bill_no` AS `bill_no`,`bill_sub`.`payment_date` AS `payment_date`,`bill_sub`.`payment_status` AS `payment_status`,`bill_sub`.`payment_received` AS `payment_received`,`bill_sub`.`status` AS `status`,`bill_sub`.`file_name` AS `file_name`,`bill_sub`.`file_org_name` AS `file_org_name`,`bill_sub`.`ld_amount` AS `ld_amount`,`bill_sub`.`ld_days` AS `ld_days`,`bill_sub`.`is_delete` AS `is_delete`,`bill_sub`.`is_active` AS `is_active`,`bill_sub`.`gst` AS `gst`,`bill_sub`.`gst_value` AS `gst_value`,`bill_sub`.`tds` AS `tds`,`bill_sub`.`tds_value` AS `tds_value`,`bill_sub`.`ld` AS `ld`,`bill_sub`.`tran_amt` AS `tran_amt`,`bill_sub`.`rem_amt` AS `rem_amt`,`bill_sub`.`updated` AS `updated`,`bill_sub`.`created` AS `created`,`bill_sub`.`acc_year` AS `acc_year`,`bill_sub`.`session_id` AS `session_id`,`bill_sub`.`sess_user_type` AS `sess_user_type`,`bill_sub`.`sess_user_id` AS `sess_user_id`,`bill_sub`.`sess_company_id` AS `sess_company_id`,`bill_sub`.`sess_branch_id` AS `sess_branch_id` from `bill_submission_sub` `bill_sub` where `bill_sub`.`is_delete` = '0';

DROP VIEW IF EXISTS `view_bill_submission_with_bg`;
CREATE OR REPLACE ALGORITHM=UNDEFINED DEFINER=`root`@`localhost` SQL SECURITY DEFINER VIEW `view_bill_submission_with_bg` AS select `bg_sub`.`form_main_unique_id` AS `form_main_unique_id`,`po`.`po_num` AS `po_num`,`po`.`po_date` AS `po_date`,`bg_sub`.`invoice_no` AS `invoice_no`,`bg_sub`.`invoice_value` AS `invoice_value`,`bg_sub`.`invoice_date` AS `invoice_date`,`bg_sub`.`invoice_qty` AS `invoice_qty`,`bg_sub`.`bg_num` AS `bg_num`,`bg_sub`.`bg_auto_id` AS `bg_auto_id`,`bg_sub`.`bill_status` AS `bill_status`,`bg_sub`.`bg_date` AS `bg_date`,`bg_main`.`bg_value` AS `bg_value`,`bill_sub_form`.`claim_amount` AS `claim_amount`,`po`.`proceed_bg` AS `proceed_bg`,`po`.`file_name` AS `file_name`,`po`.`file_org_name` AS `file_org_name`,`sign_doc`.`inv_verify_status` AS `inv_verify_status`,`sign_doc`.`bg_status` AS `bg_status` from ((((`bg_creation_sub` `bg_sub` join `po_form` `po` on(`bg_sub`.`form_main_unique_id` = `po`.`unique_id` and `po`.`is_delete` = '0')) join `sign_doc_verification_detail` `sign_doc` on(`sign_doc`.`form_main_unique_id` = `bg_sub`.`form_main_unique_id` and `sign_doc`.`invoice_no` = `bg_sub`.`invoice_no` and `sign_doc`.`is_delete` = '0')) join `bill_submission_form` `bill_sub_form` on(`bg_sub`.`form_main_unique_id` = `bill_sub_form`.`bill_form_main_unique_id` and `bg_sub`.`invoice_no` = `bill_sub_form`.`invoice_no` and `bill_sub_form`.`is_delete` = '0')) left join `bg_creation_main` `bg_main` on(`bg_sub`.`form_main_unique_id` = `bg_main`.`form_main_unique_id` and `bg_sub`.`invoice_no` = `bg_main`.`invoice_no` and `bg_main`.`is_delete` = '0')) where `bg_sub`.`is_delete` = '0' and `bg_sub`.`status` = '1' group by `bg_sub`.`invoice_no`,`bg_sub`.`bg_auto_id`;

DROP VIEW IF EXISTS `view_bill_submission_without_bg`;
CREATE OR REPLACE ALGORITHM=UNDEFINED DEFINER=`root`@`localhost` SQL SECURITY DEFINER VIEW `view_bill_submission_without_bg` AS select `inv`.`form_main_unique_id` AS `form_main_unique_id`,`po`.`po_num` AS `po_num`,`po`.`po_date` AS `po_date`,`con_sub`.`con_contact_name` AS `con_contact_name`,`con_sub`.`con_address` AS `con_address`,`inv`.`invoice_no` AS `invoice_no`,`inv`.`invoice_date` AS `invoice_date`,`inv`.`invoice_value` AS `invoice_value`,`inv`.`invoice_qty` AS `invoice_qty`,`inv`.`consignee_unique_id` AS `consignee_unique_id`,`inv`.`invoice_auto_id` AS `invoice_auto_id`,`inv`.`dc_number` AS `dc_number`,`inv`.`dc_date` AS `dc_date`,`sign_doc`.`bill_status` AS `bill_status`,`bill_sub_form`.`claim_amount` AS `claim_amount`,`bill_sub_form`.`scanned_dc_copy` AS `scanned_dc_copy`,`bill_sub_form`.`scanned_snr_copy` AS `scanned_snr_copy`,`bill_sub_form`.`scanned_ir_copy` AS `scanned_ir_copy`,`bill_sub_form`.`invoice_copy` AS `invoice_copy`,`bill_sub_form`.`installation_reference_no` AS `installation_reference_no`,`bill_sub_form`.`supplier_invoice_number` AS `supplier_invoice_number`,`sign_doc`.`ins_unique_id` AS `ins_unique_id`,`po`.`file_name` AS `file_name`,`po`.`file_org_name` AS `file_org_name`,`po`.`proceed_bg` AS `proceed_bg`,ifnull(`po`.`ins_reqired`,0) AS `ins_reqired`,ifnull(`po`.`bank_required`,0) AS `bank_required` from (((((`invoice_creation_main` `inv` join `po_form` `po` on(`inv`.`form_main_unique_id` = `po`.`unique_id` and `po`.`is_delete` = '0')) join `sign_doc_verification_detail` `sign_doc` on(`sign_doc`.`form_main_unique_id` = `inv`.`form_main_unique_id` and `sign_doc`.`con_unique_id` = `inv`.`consignee_unique_id` and `sign_doc`.`invoice_no` = `inv`.`invoice_no` and `sign_doc`.`is_delete` = '0')) join `bill_submission_form` `bill_sub_form` on(`inv`.`form_main_unique_id` = `bill_sub_form`.`bill_form_main_unique_id` and `inv`.`invoice_no` = `bill_sub_form`.`invoice_no` and `sign_doc`.`ins_unique_id` = `bill_sub_form`.`ins_unique_id` and `bill_sub_form`.`is_delete` = '0')) join `consignee_details_sub` `con_sub` on(`con_sub`.`unique_id` = `inv`.`consignee_unique_id` and `con_sub`.`is_delete` = '0')) join `product_details_sub` `product_sub` on(`product_sub`.`form_main_unique_id` = `inv`.`form_main_unique_id` and `product_sub`.`is_delete` = '0')) where `inv`.`is_delete` = '0' and `sign_doc`.`status_app` = '2' and `sign_doc`.`without_bg` = 'on' group by `sign_doc`.`ins_unique_id`;

DROP VIEW IF EXISTS `view_consignee_product_details`;
CREATE OR REPLACE ALGORITHM=UNDEFINED DEFINER=`root`@`localhost` SQL SECURITY DEFINER VIEW `view_consignee_product_details` AS select `vppd`.`form_main_unique_id` AS `main_unique_id`,`vppd`.`unique_id` AS `product_unique_id`,`vppd`.`item_code` AS `item_code`,`vppd`.`product` AS `product_name`,`vppd`.`qty` AS `qty`,`vppd`.`unit_price` AS `unit_price`,`vppd`.`tax` AS `tax`,`vppd`.`assign_qty` AS `assign_qty`,`cds`.`unique_id` AS `con_unique_id`,`cds`.`con_address` AS `con_address`,`cds`.`con_district` AS `con_district`,`cds`.`con_pincode` AS `con_pincode`,`cds`.`con_contact_name` AS `con_contact_name`,`cds`.`con_contact_number` AS `con_contact_number`,`cds`.`con_lan_num` AS `con_lan_num`,`cds`.`zone` AS `zone`,`cds`.`batch_id` AS `batch_id`,`cds`.`po_number` AS `po_number` from (`product_details_sub` `vppd` join `consignee_details_sub` `cds` on(`vppd`.`form_main_unique_id` = `cds`.`form_main_unique_id`)) where `vppd`.`is_delete` = 0 and `cds`.`is_delete` = 0;

DROP VIEW IF EXISTS `view_dash_stock_position`;
CREATE OR REPLACE ALGORITHM=UNDEFINED DEFINER=`root`@`localhost` SQL SECURITY DEFINER VIEW `view_dash_stock_position` AS select `po_form`.`unique_id` AS `unique_id`,`po_form`.`total_qty` AS `total_qty`,`po_form`.`total_amount` AS `total_amount`,`po_form`.`sess_user_type` AS `sess_user_type`,case when `stock_position_main`.`is_delete` = 1 then NULL else `stock_position_main`.`stock_qty` end AS `stock_qty`,case when `stock_position_main`.`is_delete` = 1 then NULL else cast(`stock_position_main`.`stock_value` as decimal(10,2)) end AS `stock_value`,case when `stock_position_main`.`is_delete` = 1 then NULL else `po_form`.`total_qty` - `stock_position_main`.`stock_qty` end AS `bal_qty`,case when `stock_position_main`.`is_delete` = 1 then NULL else cast(`po_form`.`total_amount` - `stock_position_main`.`stock_value` as decimal(10,2)) end AS `bal_value`,`po_form`.`acc_year` AS `acc_year` from (`po_form` left join `stock_position_main` on(`stock_position_main`.`form_main_unique_id` = `po_form`.`unique_id`)) where `po_form`.`is_delete` = 0 and `po_form`.`file_name` is not null;

DROP VIEW IF EXISTS `view_deleievery_confirmation_complete`;
CREATE OR REPLACE ALGORITHM=UNDEFINED DEFINER=`root`@`localhost` SQL SECURITY DEFINER VIEW `view_deleievery_confirmation_complete` AS select `dispatch`.`unique_id` AS `unique_id`,`dispatch`.`po_num` AS `po_num`,`dispatch`.`po_date` AS `po_date`,`dispatch`.`po_form_unique_id` AS `po_form_unique_id`,`dispatch`.`invoice_auto_id` AS `invoice_auto_id`,`dispatch`.`invoice_no` AS `invoice_no`,`inv`.`invoice_value` AS `invoice_value`,`inv`.`ledger_name` AS `ledger_name`,`inv`.`team_mem` AS `team_mem`,`dispatch`.`invoice_date` AS `invoice_date`,`dispatch`.`dc_number` AS `dc_number`,`dispatch`.`dc_date` AS `dc_date`,`dispatch`.`pod_no` AS `pod_no`,`dispatch`.`delivery_status` AS `delivery_status`,`dispatch`.`delivery_date` AS `delivery_date`,`dispatch`.`delivery_proof` AS `delivery_proof`,`dispatch`.`name_of_courier` AS `name_of_courier`,`dispatch`.`delv_conf_person` AS `delv_conf_person`,`dispatch`.`delv_conf_date` AS `delv_conf_date`,`dispatch`.`mode_of_delivery` AS `mode_of_delivery`,`dispatch`.`status` AS `status`,`dispatch`.`consignee_unique_id` AS `consignee_unique_id`,`stock_position_main`.`department` AS `department` from ((`dispatch_list` `dispatch` left join `stock_position_main` on(`dispatch`.`po_form_unique_id` = `stock_position_main`.`form_main_unique_id` and `stock_position_main`.`is_delete` = '0')) left join `invoice_creation_main` `inv` on(`dispatch`.`po_form_unique_id` = `inv`.`form_main_unique_id` and `dispatch`.`invoice_no` = `inv`.`invoice_no` and `inv`.`is_delete` = '0')) where `dispatch`.`is_delete` = 0 and `dispatch`.`status` = '3' group by `dispatch`.`dc_number`;

DROP VIEW IF EXISTS `view_deleievery_confirmation_pending`;
CREATE OR REPLACE ALGORITHM=UNDEFINED DEFINER=`root`@`localhost` SQL SECURITY DEFINER VIEW `view_deleievery_confirmation_pending` AS select `dispatch`.`unique_id` AS `unique_id`,`dispatch`.`po_num` AS `po_num`,`dispatch`.`po_date` AS `po_date`,`dispatch`.`po_form_unique_id` AS `po_form_unique_id`,`dispatch`.`invoice_auto_id` AS `invoice_auto_id`,`dispatch`.`invoice_no` AS `invoice_no`,`inv`.`invoice_value` AS `invoice_value`,`inv`.`ledger_name` AS `ledger_name`,`inv`.`team_mem` AS `team_mem`,`dispatch`.`invoice_date` AS `invoice_date`,`dispatch`.`dc_number` AS `dc_number`,`dispatch`.`dc_date` AS `dc_date`,`dispatch`.`pod_no` AS `pod_no`,`dispatch`.`delivery_status` AS `delivery_status`,`dispatch`.`delivery_date` AS `delivery_date`,`dispatch`.`delivery_proof` AS `delivery_proof`,`dispatch`.`einvoice_file` AS `einvoice`,`dispatch`.`pod_proof` AS `pod_proof`,`dispatch`.`name_of_courier` AS `name_of_courier`,`dispatch`.`mode_of_delivery` AS `mode_of_delivery`,`dispatch`.`status` AS `status`,`dispatch`.`consignee_unique_id` AS `consignee_unique_id`,`stock_position_main`.`department` AS `department` from ((`dispatch_list` `dispatch` left join `stock_position_main` on(`dispatch`.`po_form_unique_id` = `stock_position_main`.`form_main_unique_id` and `stock_position_main`.`is_delete` = '0')) left join `invoice_creation_main` `inv` on(`dispatch`.`po_form_unique_id` = `inv`.`form_main_unique_id` and `dispatch`.`invoice_no` = `inv`.`invoice_no` and `inv`.`is_delete` = '0')) where `dispatch`.`is_delete` = 0 and `dispatch`.`status` = '2' or `dispatch`.`status` = '5' group by `dispatch`.`dc_number`;

DROP VIEW IF EXISTS `view_delivery_confirmation`;
CREATE OR REPLACE ALGORITHM=UNDEFINED DEFINER=`root`@`localhost` SQL SECURITY DEFINER VIEW `view_delivery_confirmation` AS select `dispatch`.`unique_id` AS `unique_id`,`dispatch`.`po_num` AS `po_num`,`dispatch`.`po_date` AS `po_date`,`dispatch`.`po_form_unique_id` AS `po_form_unique_id`,`dispatch`.`invoice_auto_id` AS `invoice_auto_id`,`dispatch`.`invoice_no` AS `invoice_no`,`inv`.`invoice_value` AS `invoice_value`,`inv`.`ledger_name` AS `ledger_name`,`inv`.`team_mem` AS `team_mem`,`dispatch`.`invoice_date` AS `invoice_date`,`dispatch`.`dc_number` AS `dc_number`,`dispatch`.`dc_date` AS `dc_date`,`dispatch`.`pod_no` AS `pod_no`,`dispatch`.`delivery_status` AS `delivery_status`,`dispatch`.`delivery_date` AS `delivery_date`,`dispatch`.`delivery_proof` AS `delivery_proof`,`dispatch`.`name_of_courier` AS `name_of_courier`,`dispatch`.`delv_conf_person` AS `delv_conf_person`,`dispatch`.`delv_conf_date` AS `delv_conf_date`,`dispatch`.`mode_of_delivery` AS `mode_of_delivery`,`dispatch`.`status` AS `status`,`dispatch`.`consignee_unique_id` AS `consignee_unique_id`,`stock_position_main`.`department` AS `department` from ((`dispatch_list` `dispatch` left join `stock_position_main` on(`dispatch`.`po_form_unique_id` = `stock_position_main`.`form_main_unique_id` and `stock_position_main`.`is_delete` = '0')) left join `invoice_creation_main` `inv` on(`dispatch`.`po_form_unique_id` = `inv`.`form_main_unique_id` and `dispatch`.`invoice_no` = `inv`.`invoice_no` and `inv`.`is_delete` = '0')) where `dispatch`.`is_delete` = 0 and `dispatch`.`status` = '2' or `dispatch`.`status` = '3' group by `dispatch`.`dc_number`;

DROP VIEW IF EXISTS `view_dispatch_complete_count`;
CREATE OR REPLACE ALGORITHM=UNDEFINED DEFINER=`root`@`localhost` SQL SECURITY DEFINER VIEW `view_dispatch_complete_count` AS select `dispatch`.`po_form_unique_id` AS `form_main_unique_id`,`invoice_main`.`acc_year` AS `acc_year`,`invoice_main`.`invoice_no` AS `invoice_no`,`invoice_main`.`sess_user_type` AS `sess_user_type`,count(distinct `invoice_main`.`unique_id`) AS `invoice_count`,round(sum(cast(`invoice_main`.`invoice_value` as decimal(10,2))),2) AS `invoice_value` from (`dispatch_list` `dispatch` left join `invoice_creation_main` `invoice_main` on(`dispatch`.`po_form_unique_id` = `invoice_main`.`form_main_unique_id` and `dispatch`.`invoice_no` = `invoice_main`.`invoice_no` and `dispatch`.`consignee_unique_id` = `invoice_main`.`consignee_unique_id` and `invoice_main`.`is_delete` = '0')) where `dispatch`.`status` = '1' and `dispatch`.`is_delete` = '0' group by `dispatch`.`po_form_unique_id`;

DROP VIEW IF EXISTS `view_dispatch_completed_list`;
CREATE OR REPLACE ALGORITHM=UNDEFINED DEFINER=`root`@`localhost` SQL SECURITY DEFINER VIEW `view_dispatch_completed_list` AS select `inv`.`form_main_unique_id` AS `form_main_unique_id`,`inv`.`invoice_auto_id` AS `invoice_auto_id`,`inv`.`po_num` AS `po_num`,`inv`.`po_date` AS `po_date`,`inv`.`invoice_no` AS `invoice_no`,`inv`.`team_alloc_eng_type` AS `team_alloc_eng_type`,`inv`.`team_alloc_eng_name` AS `team_alloc_eng_name`,`inv`.`invoice_date` AS `invoice_date`,`inv`.`invoice_value` AS `invoice_value`,`inv`.`invoice_qty` AS `invoice_qty`,`inv`.`dc_number` AS `dc_number`,`inv`.`dc_date` AS `dc_date`,`inv`.`unique_id` AS `unique_id`,`inv`.`stock_id` AS `stock_id`,`inv`.`ac_team_approved_by` AS `ac_team_approved_by`,`inv`.`approved_by` AS `approved_by`,`inv`.`material_qc` AS `material_qc`,`inv`.`material_qc_approved` AS `material_qc_approved`,`inv`.`doc_approval_sts` AS `doc_approval_sts`,`inv`.`dispatch_status` AS `inv_dispatch_status`,`inv`.`ac_team_verifiy_status` AS `ac_team_verifiy_status`,`inv`.`consignee_unique_id` AS `consignee_unique_id`,`inv`.`is_delete` AS `is_delete`,`inv`.`ledger_name` AS `ledger_name`,`inv`.`vendor_bulk_sts` AS `vendor_bulk_sts`,`inv`.`vendor_team_sts` AS `vendor_team_sts`,`po_form`.`file_name` AS `file_name`,`po_form`.`bill_address` AS `bill_address`,`inv_sub`.`dc_file_name` AS `dc_file_name`,`inv_sub`.`file_org_name` AS `file_org_name`,`inv_sub`.`ir_file_name` AS `ir_file_name`,`inv_sub`.`ir_file_org_name` AS `ir_file_org_name`,`inv_sub`.`file_invoice` AS `file_invoice`,`inv_sub`.`invoice_file_org_name` AS `invoice_file_org_name`,`stock_position_main`.`department` AS `department`,`dispatch_list`.`status` AS `dispatch_status` from ((((`invoice_creation_main` `inv` left join `dispatch_list` on(`inv`.`invoice_no` = `dispatch_list`.`invoice_no` and `inv`.`dc_number` = `dispatch_list`.`dc_number` and `dispatch_list`.`is_delete` = 0)) left join `invoice_sublist` `inv_sub` on(`inv`.`invoice_no` = `inv_sub`.`invoice_no` and `inv`.`dc_number` = `inv_sub`.`dc_number` and `inv_sub`.`is_delete` = 0)) left join `po_form` on(`inv`.`po_num` = `po_form`.`po_num` and `po_form`.`is_delete` = 0)) left join `stock_position_main` on(`inv`.`form_main_unique_id` = `stock_position_main`.`form_main_unique_id` and `stock_position_main`.`is_delete` = 0)) where `dispatch_list`.`status` = '2' and `inv`.`is_delete` = '0' and `inv_sub`.`is_delete` = '0' and `po_form`.`is_delete` = '0' group by `inv`.`dc_number`;

DROP VIEW IF EXISTS `view_dispatch_delivery_list`;
CREATE OR REPLACE ALGORITHM=UNDEFINED DEFINER=`root`@`localhost` SQL SECURITY DEFINER VIEW `view_dispatch_delivery_list` AS select `dispatch`.`unique_id` AS `unique_id`,`dispatch`.`po_num` AS `po_num`,`dispatch`.`po_date` AS `po_date`,`dispatch`.`po_form_unique_id` AS `po_form_unique_id`,`dispatch`.`invoice_auto_id` AS `invoice_auto_id`,`dispatch`.`invoice_no` AS `invoice_no`,`inv`.`invoice_value` AS `invoice_value`,`inv`.`ledger_name` AS `ledger_name`,`inv`.`team_mem` AS `team_mem`,`dispatch`.`invoice_date` AS `invoice_date`,`dispatch`.`dc_number` AS `dc_number`,`dispatch`.`dc_date` AS `dc_date`,`dispatch`.`pod_no` AS `pod_no`,`dispatch`.`delivery_status` AS `delivery_status`,`dispatch`.`delivery_date` AS `delivery_date`,`dispatch`.`delivery_proof` AS `delivery_proof`,`dispatch`.`einvoice_file` AS `einvoice`,`dispatch`.`pod_proof` AS `pod_proof`,`dispatch`.`name_of_courier` AS `name_of_courier`,`dispatch`.`mode_of_delivery` AS `mode_of_delivery`,`dispatch`.`status` AS `status`,`dispatch`.`consignee_unique_id` AS `consignee_unique_id`,`stock_position_main`.`department` AS `department` from ((`dispatch_list` `dispatch` left join `stock_position_main` on(`dispatch`.`po_form_unique_id` = `stock_position_main`.`form_main_unique_id` and `stock_position_main`.`is_delete` = '0')) left join `invoice_creation_main` `inv` on(`dispatch`.`po_form_unique_id` = `inv`.`form_main_unique_id` and `dispatch`.`invoice_no` = `inv`.`invoice_no` and `inv`.`is_delete` = '0')) where `dispatch`.`is_delete` = 0 and (`dispatch`.`status` = '2' or `dispatch`.`status` = '3') group by `dispatch`.`dc_number`;

DROP VIEW IF EXISTS `view_dispatch_delivery_list_2`;
CREATE OR REPLACE ALGORITHM=UNDEFINED DEFINER=`root`@`localhost` SQL SECURITY DEFINER VIEW `view_dispatch_delivery_list_2` AS select `d`.`unique_id` AS `unique_id`,`d`.`po_num` AS `po_num`,`d`.`po_date` AS `po_date`,`d`.`po_form_unique_id` AS `po_form_unique_id`,`d`.`invoice_auto_id` AS `invoice_auto_id`,`d`.`invoice_no` AS `invoice_no`,`inv`.`invoice_value` AS `invoice_value`,`inv`.`ledger_name` AS `ledger_name`,`inv`.`team_mem` AS `team_mem`,`d`.`invoice_date` AS `invoice_date`,`d`.`dc_number` AS `dc_number`,`d`.`dc_date` AS `dc_date`,`d`.`pod_no` AS `pod_no`,`d`.`delivery_status` AS `delivery_status`,`d`.`delivery_date` AS `delivery_date`,`d`.`delivery_proof` AS `delivery_proof`,`d`.`einvoice_file` AS `einvoice`,`d`.`pod_proof` AS `pod_proof`,`d`.`name_of_courier` AS `name_of_courier`,`d`.`mode_of_delivery` AS `mode_of_delivery`,`d`.`status` AS `status`,`d`.`consignee_unique_id` AS `consignee_unique_id`,`spm`.`department` AS `department` from ((`dispatch_list` `d` left join `stock_position_main` `spm` on(`d`.`po_form_unique_id` = `spm`.`form_main_unique_id` and `spm`.`is_delete` = '0')) left join `invoice_creation_main` `inv` on(`d`.`po_form_unique_id` = `inv`.`form_main_unique_id` and `d`.`invoice_no` = `inv`.`invoice_no` and `inv`.`is_delete` = '0')) where `d`.`is_delete` = 0 and (`d`.`status` = '2' or `d`.`status` = '3');

DROP VIEW IF EXISTS `view_dispatch_list_final`;
CREATE OR REPLACE ALGORITHM=UNDEFINED DEFINER=`root`@`localhost` SQL SECURITY DEFINER VIEW `view_dispatch_list_final` AS select `po_form`.`po_num` AS `po_num`,`po_form`.`po_date` AS `po_date`,`po_form`.`unique_id` AS `unique_id`,`po_form`.`is_delete` AS `is_delete`,`con`.`unique_id` AS `con_unique_id`,`con`.`con_contact_name` AS `con_contact_name`,`con`.`con_address` AS `con_address`,`invoice_creation`.`invoice_auto_id` AS `invoice_auto_id`,`invoice_creation`.`invoice_no` AS `invoice_no`,`invoice_creation`.`invoice_date` AS `invoice_date`,`invoice_creation`.`invoice_qty` AS `invoice_qty`,`invoice_creation`.`unit_price` AS `unit_price`,`invoice_creation`.`product_unique_id` AS `product_unique_id`,`invoice_creation`.`stock_id` AS `stock_id` from ((`po_form` join `consignee_details_sub` `con` on(`po_form`.`unique_id` = `con`.`form_main_unique_id` and `con`.`is_delete` = '0')) join `invoice_creation` on(`po_form`.`unique_id` = `invoice_creation`.`po_unique_id` and `invoice_creation`.`is_delete` = '0')) where `po_form`.`unique_id` <> '' and `po_form`.`is_delete` = '0' group by `invoice_creation`.`invoice_auto_id`;

DROP VIEW IF EXISTS `view_dispatch_pending_count`;
CREATE OR REPLACE ALGORITHM=UNDEFINED DEFINER=`root`@`localhost` SQL SECURITY DEFINER VIEW `view_dispatch_pending_count` AS select `invoice_main`.`form_main_unique_id` AS `form_main_unique_id`,`invoice_main`.`acc_year` AS `acc_year`,`invoice_main`.`sess_user_type` AS `sess_user_type`,count(distinct `invoice_main`.`unique_id`) AS `invoice_count`,round(sum(cast(`invoice_main`.`invoice_value` as decimal(10,2))),2) AS `invoice_value` from `invoice_creation_main` `invoice_main` where `invoice_main`.`dispatch_status` = '0' and `invoice_main`.`ac_team_verifiy_status` = 1 and `invoice_main`.`is_delete` = '0' group by `invoice_main`.`form_main_unique_id`;

DROP VIEW IF EXISTS `view_dispatch_pending_list`;
CREATE OR REPLACE ALGORITHM=UNDEFINED DEFINER=`root`@`localhost` SQL SECURITY DEFINER VIEW `view_dispatch_pending_list` AS select `inv`.`form_main_unique_id` AS `form_main_unique_id`,`inv`.`invoice_auto_id` AS `invoice_auto_id`,`get_po_number`(`inv`.`form_main_unique_id`) AS `po_num`,`inv`.`po_date` AS `po_date`,`inv`.`invoice_no` AS `invoice_no`,`inv`.`invoice_date` AS `invoice_date`,`inv`.`dc_number` AS `dc_number`,`inv`.`dc_date` AS `dc_date`,`inv`.`invoice_value` AS `invoice_value`,`inv`.`invoice_qty` AS `invoice_qty`,`inv`.`unique_id` AS `unique_id`,`inv`.`stock_id` AS `stock_id`,`inv`.`ac_team_approved_by` AS `ac_team_approved_by`,`inv`.`approved_by` AS `approved_by`,`inv`.`material_qc` AS `material_qc`,`inv`.`material_qc_approved` AS `material_qc_approved`,`inv`.`doc_approval_sts` AS `doc_approval_sts`,`inv`.`dispatch_status` AS `dispatch_status`,`inv`.`ac_team_verifiy_status` AS `ac_team_verifiy_status`,`inv`.`consignee_unique_id` AS `consignee_unique_id`,`inv`.`team_mem` AS `team_mem`,`inv`.`is_delete` AS `is_delete`,`inv`.`ledger_name` AS `ledger_name`,`pf`.`file_name` AS `file_name`,`inv_sub`.`dc_file_name` AS `dc_file_name`,`inv_sub`.`file_org_name` AS `file_org_name`,`inv_sub`.`ir_file_name` AS `ir_file_name`,`inv_sub`.`ir_file_org_name` AS `ir_file_org_name`,`inv_sub`.`file_invoice` AS `file_invoice`,`inv_sub`.`invoice_file_org_name` AS `invoice_file_org_name`,`spm`.`department` AS `department` from (((`invoice_creation_main` `inv` left join `stock_position_main` `spm` on(`inv`.`form_main_unique_id` = `spm`.`form_main_unique_id` and `spm`.`is_delete` = '0')) left join `invoice_sublist` `inv_sub` on(`inv`.`invoice_no` = `inv_sub`.`invoice_no` and `inv_sub`.`is_delete` = '0')) left join `po_form` `pf` on(`inv`.`po_num` = `pf`.`po_num` and `pf`.`is_delete` = '0')) where `inv`.`dispatch_status` = '0' and `inv`.`material_qc` = '1' and `inv`.`ac_team_verifiy_status` = '1' and `inv`.`is_delete` = '0' group by `inv`.`dc_number`;

DROP VIEW IF EXISTS `view_dispatch_transit_list`;
CREATE OR REPLACE ALGORITHM=UNDEFINED DEFINER=`root`@`localhost` SQL SECURITY DEFINER VIEW `view_dispatch_transit_list` AS select `dispatch`.`unique_id` AS `unique_id`,`dispatch`.`po_num` AS `po_num`,`dispatch`.`po_date` AS `po_date`,`dispatch`.`po_form_unique_id` AS `po_form_unique_id`,`dispatch`.`invoice_auto_id` AS `invoice_auto_id`,`dispatch`.`invoice_no` AS `invoice_no`,`dispatch`.`invoice_date` AS `invoice_date`,`dispatch`.`dc_number` AS `dc_number`,`dispatch`.`dc_date` AS `dc_date`,`inv`.`invoice_value` AS `invoice_value`,`inv`.`ledger_name` AS `ledger_name`,`inv`.`team_mem` AS `team_mem`,`dispatch`.`pod_no` AS `pod_no`,`dispatch`.`delivery_status` AS `delivery_status`,`dispatch`.`delivery_date` AS `delivery_date`,`dispatch`.`mode_of_delivery` AS `mode_of_delivery`,`dispatch`.`delivery_proof` AS `delivery_proof`,`dispatch`.`einvoice_file` AS `einvoice`,`dispatch`.`name_of_courier` AS `name_of_courier`,`dispatch`.`status` AS `status`,`dispatch`.`dispatch_date` AS `dispatch_date`,`dispatch`.`consignee_unique_id` AS `consignee_unique_id`,`stock_position_main`.`department` AS `department` from ((`dispatch_list` `dispatch` left join `stock_position_main` on(`dispatch`.`po_form_unique_id` = `stock_position_main`.`form_main_unique_id` and `stock_position_main`.`is_delete` = '0')) left join `invoice_creation_main` `inv` on(`dispatch`.`po_form_unique_id` = `inv`.`form_main_unique_id` and `dispatch`.`invoice_no` = `inv`.`invoice_no` and `inv`.`is_delete` = '0')) where `dispatch`.`is_delete` = '0' and `dispatch`.`status` = '1' group by `dispatch`.`dc_number`;

DROP VIEW IF EXISTS `view_doc_approval_list1`;
CREATE OR REPLACE ALGORITHM=UNDEFINED DEFINER=`root`@`localhost` SQL SECURITY DEFINER VIEW `view_doc_approval_list1` AS select `inv`.`po_num` AS `po_num`,`inv`.`po_date` AS `po_date`,`inv`.`consignee_unique_id` AS `consignee_unique_id`,`inv`.`unique_id` AS `invoice_unique_id`,`inv`.`invoice_auto_id` AS `invoice_auto_id`,`inv`.`form_main_unique_id` AS `form_main_unique_id`,`inv`.`executive_name` AS `executive_name`,`inv`.`invoice_no` AS `invoice_no`,`inv`.`invoice_date` AS `invoice_date`,`inv`.`invoice_value` AS `invoice_value`,`inv`.`ledger_name` AS `ledger_name`,`inv`.`ledger_no` AS `ledger_no`,`inv`.`invoice_doc_status` AS `invoice_doc_status`,`inv`.`dispatch_status` AS `dispatch_status`,`inv`.`doc_approval_sts` AS `doc_approval_sts`,`inv`.`approved_by` AS `approved_by`,`inv`.`ac_team_verifiy_status` AS `ac_team_verifiy_status`,`inv`.`ac_team_approved_by` AS `ac_team_approved_by`,`inv`.`approved_date` AS `approved_date`,`inv`.`is_delete` AS `is_delete`,`inv`.`material_qc` AS `material_qc`,`inv`.`material_qc_approved` AS `material_qc_approved`,`inv`.`material_qc_reject_reason` AS `material_qc_reject_reason`,`inv`.`dc_number` AS `dc_number`,`inv`.`dc_date` AS `dc_date`,`inv`.`team_mem` AS `team_mem`,`sub`.`dc_file_name` AS `dc_file_name`,`sub`.`file_org_name` AS `file_org_name`,`sub`.`file_invoice` AS `file_invoice`,`sub`.`invoice_file_org_name` AS `invoice_file_org_name`,`sub`.`ir_file_name` AS `ir_file_name`,`sub`.`ir_file_org_name` AS `ir_file_org_name` from (`invoice_creation_main` `inv` join `invoice_sublist` `sub` on(`inv`.`dc_number` = `sub`.`dc_number`)) where `inv`.`is_delete` = 0 and `inv`.`is_active` = 1 and `sub`.`is_delete` = 0 group by `inv`.`dc_number`;

DROP VIEW IF EXISTS `view_doc_approval_list2`;
CREATE OR REPLACE ALGORITHM=UNDEFINED DEFINER=`root`@`localhost` SQL SECURITY DEFINER VIEW `view_doc_approval_list2` AS select `inv`.`form_main_unique_id` AS `form_main_unique_id`,`inv`.`invoice_no` AS `invoice_no`,`inv`.`consignee_unique_id` AS `consignee_unique_id`,`inv`.`po_unique_id` AS `po_unique_id`,`inv`.`dc_number` AS `dc_number`,`inv`.`dc_date` AS `dc_date`,`po_form`.`po_num` AS `po_num`,`po_form`.`po_date` AS `po_date`,`po_form`.`file_name` AS `file_name`,`po_form`.`file_org_name` AS `file_org_name`,`po_form`.`department` AS `department`,`po_form`.`executive_name` AS `executive_name`,`po_form`.`bill_address` AS `bill_address`,`po_form`.`contact_name` AS `contact_name`,`po_form`.`contact_number` AS `contact_number`,`po_form`.`landline_number` AS `landline_number`,`po_form`.`email` AS `email`,`po_form`.`district` AS `district`,`po_form`.`state_name` AS `state_name` from (`invoice_creation_main` `inv` join `po_form` on(`po_form`.`unique_id` = `inv`.`form_main_unique_id`));

DROP VIEW IF EXISTS `view_doc_approval_list_final`;
CREATE OR REPLACE ALGORITHM=UNDEFINED DEFINER=`root`@`localhost` SQL SECURITY DEFINER VIEW `view_doc_approval_list_final` AS select `app_list1`.`dc_number` AS `dc_number`,`app_list1`.`dc_date` AS `dc_date`,`app_list2`.`po_num` AS `po_num`,`app_list2`.`po_date` AS `po_date`,`app_list1`.`consignee_unique_id` AS `consignee_unique_id`,`app_list1`.`invoice_unique_id` AS `invoice_unique_id`,`app_list1`.`executive_name` AS `executive_name`,`app_list1`.`invoice_no` AS `invoice_no`,`app_list1`.`invoice_date` AS `invoice_date`,`app_list1`.`invoice_auto_id` AS `invoice_auto_id`,`app_list1`.`invoice_value` AS `invoice_value`,`app_list1`.`ledger_name` AS `ledger_name`,`app_list1`.`ledger_no` AS `ledger_no`,`app_list1`.`invoice_doc_status` AS `invoice_doc_status`,`app_list1`.`dispatch_status` AS `dispatch_status`,`app_list1`.`doc_approval_sts` AS `doc_approval_sts`,`app_list1`.`approved_by` AS `approved_by`,`app_list1`.`ac_team_verifiy_status` AS `ac_team_verifiy_status`,`app_list1`.`ac_team_approved_by` AS `ac_team_approved_by`,`app_list1`.`material_qc` AS `material_qc`,`app_list1`.`material_qc_approved` AS `material_qc_approved`,`app_list1`.`material_qc_reject_reason` AS `material_qc_reject_reason`,`app_list1`.`approved_date` AS `approved_date`,`app_list1`.`dc_file_name` AS `dc_file_name`,`app_list1`.`file_org_name` AS `dc_file_org_name`,`app_list1`.`ir_file_name` AS `ir_file_name`,`app_list1`.`ir_file_org_name` AS `ir_file_org_name`,`app_list1`.`file_invoice` AS `file_invoice`,`app_list1`.`invoice_file_org_name` AS `invoice_file_org_name`,`app_list1`.`team_mem` AS `team_mem`,`app_list2`.`department` AS `department`,`app_list2`.`form_main_unique_id` AS `form_main_unique_id`,`app_list2`.`po_unique_id` AS `po_unique_id`,`app_list2`.`file_name` AS `file_name`,`app_list2`.`file_org_name` AS `po_file_original_name`,`app_list2`.`bill_address` AS `bill_address`,`app_list2`.`contact_name` AS `contact_name`,`app_list2`.`contact_number` AS `contact_number`,`app_list2`.`landline_number` AS `landline_number`,`app_list2`.`email` AS `email`,`app_list2`.`district` AS `district`,`app_list2`.`state_name` AS `state_name`,`cons_sub`.`zone` AS `zone` from ((`view_doc_approval_list1` `app_list1` join `view_doc_approval_list2` `app_list2` on(`app_list2`.`form_main_unique_id` = `app_list1`.`form_main_unique_id` and `app_list2`.`consignee_unique_id` = `app_list1`.`consignee_unique_id` and `app_list2`.`invoice_no` = `app_list1`.`invoice_no` and `app_list2`.`dc_number` = `app_list1`.`dc_number`)) left join `consignee_details_sub` `cons_sub` on(`app_list1`.`consignee_unique_id` = `cons_sub`.`unique_id` and `cons_sub`.`is_delete` = 0)) group by `app_list1`.`invoice_auto_id`,`app_list1`.`invoice_no`;

DROP VIEW IF EXISTS `view_doc_approval_list_final_ac_team`;
CREATE OR REPLACE ALGORITHM=UNDEFINED DEFINER=`root`@`localhost` SQL SECURITY DEFINER VIEW `view_doc_approval_list_final_ac_team` AS select `app_list1`.`dc_number` AS `dc_number`,`app_list1`.`dc_date` AS `dc_date`,`app_list2`.`po_num` AS `po_num`,`app_list2`.`po_date` AS `po_date`,`app_list1`.`consignee_unique_id` AS `consignee_unique_id`,`app_list1`.`invoice_unique_id` AS `invoice_unique_id`,`app_list1`.`executive_name` AS `executive_name`,`app_list1`.`invoice_no` AS `invoice_no`,`app_list1`.`invoice_date` AS `invoice_date`,`app_list1`.`invoice_auto_id` AS `invoice_auto_id`,`app_list1`.`invoice_value` AS `invoice_value`,`app_list1`.`ledger_name` AS `ledger_name`,`app_list1`.`ledger_no` AS `ledger_no`,`app_list1`.`invoice_doc_status` AS `invoice_doc_status`,`app_list1`.`dispatch_status` AS `dispatch_status`,`app_list1`.`doc_approval_sts` AS `doc_approval_sts`,`app_list1`.`approved_by` AS `approved_by`,`app_list1`.`ac_team_verifiy_status` AS `ac_team_verifiy_status`,`app_list1`.`ac_team_approved_by` AS `ac_team_approved_by`,`app_list1`.`approved_date` AS `approved_date`,`app_list1`.`dc_file_name` AS `dc_file_name`,`app_list1`.`file_org_name` AS `dc_file_org_name`,`app_list1`.`ir_file_name` AS `ir_file_name`,`app_list1`.`ir_file_org_name` AS `ir_file_org_name`,`app_list1`.`file_invoice` AS `file_invoice`,`app_list1`.`invoice_file_org_name` AS `invoice_file_org_name`,`app_list1`.`team_mem` AS `team_mem`,`app_list2`.`department` AS `department`,`app_list2`.`form_main_unique_id` AS `form_main_unique_id`,`app_list2`.`po_unique_id` AS `po_unique_id`,`app_list2`.`file_name` AS `file_name`,`app_list2`.`file_org_name` AS `po_file_original_name`,`app_list1`.`material_qc` AS `material_qc`,`app_list1`.`material_qc_approved` AS `material_qc_approved`,`app_list1`.`material_qc_reject_reason` AS `material_qc_reject_reason` from (`view_doc_approval_list1` `app_list1` join `view_doc_approval_list2` `app_list2` on(`app_list2`.`form_main_unique_id` = `app_list1`.`form_main_unique_id` and `app_list2`.`consignee_unique_id` = `app_list1`.`consignee_unique_id` and `app_list2`.`invoice_no` = `app_list1`.`invoice_no` and `app_list2`.`dc_number` = `app_list1`.`dc_number`)) where `app_list1`.`doc_approval_sts` = '1' group by `app_list1`.`dc_number`,`app_list2`.`dc_number`;

DROP VIEW IF EXISTS `view_document_engineer_count_1`;
CREATE OR REPLACE ALGORITHM=UNDEFINED DEFINER=`root`@`localhost` SQL SECURITY DEFINER VIEW `view_document_engineer_count_1` AS select `install_pending`.`form_main_unique_id` AS `form_main_unique_id`,`install_pending`.`acc_year` AS `acc_year`,`install_pending`.`sess_user_type` AS `sess_user_type`,count(`install_pending`.`invoice_no`) AS `invoice_count`,sum(`install_pending`.`invoice_value`) AS `invoice_value` from `view_installation_followups1` `install_pending` where `install_pending`.`dc_delivery_status` = '0' group by `install_pending`.`form_main_unique_id`;

DROP VIEW IF EXISTS `view_document_pending_count`;
CREATE OR REPLACE ALGORITHM=UNDEFINED DEFINER=`root`@`localhost` SQL SECURITY DEFINER VIEW `view_document_pending_count` AS select `invoice`.`form_main_unique_id` AS `po_form_unique_id`,`invoice`.`invoice_no` AS `invoice_no`,`invoice`.`acc_year` AS `acc_year`,`invoice`.`sess_user_type` AS `sess_user_type`,count(`invoice`.`dc_number`) AS `invoice_count`,round(sum(cast(`invoice`.`invoice_value` as decimal(10,2))),2) AS `invoice_value` from `invoice_creation_main` `invoice` where `invoice`.`installation_status` = '5' and `invoice`.`is_delete` = '0' group by `invoice`.`form_main_unique_id`;

DROP VIEW IF EXISTS `view_elcot_entry_final_bill_list`;
CREATE OR REPLACE ALGORITHM=UNDEFINED DEFINER=`root`@`localhost` SQL SECURITY DEFINER VIEW `view_elcot_entry_final_bill_list` AS select `with_bg`.`form_main_unique_id` AS `unique_id`,`with_bg`.`po_num` AS `po_num`,`with_bg`.`po_date` AS `po_date`,`with_bg`.`invoice_no` AS `invoice_no`,`with_bg`.`invoice_date` AS `invoice_date`,`with_bg`.`invoice_qty` AS `invoice_qty`,`with_bg`.`invoice_value` AS `invoice_value`,`with_bg`.`bill_status` AS `bill_status`,`with_bg`.`bg_num` AS `bg_num`,`with_bg`.`bg_auto_id` AS `bg_auto_id`,`with_bg`.`bg_date` AS `bg_date`,`with_bg`.`bg_value` AS `bg_value`,`with_bg`.`claim_amount` AS `claim_amount`,`with_bg`.`file_name` AS `file_name`,`with_bg`.`file_org_name` AS `file_org_name`,`with_bg`.`proceed_bg` AS `proceed_bg`,`with_bg`.`inv_verify_status` AS `inv_verify_status`,`with_bg`.`bg_status` AS `bg_status` from `view_bill_submission_with_bg` `with_bg` union all select `without_bg`.`form_main_unique_id` AS `unique_id`,`without_bg`.`po_num` AS `po_num`,`without_bg`.`po_date` AS `po_date`,`without_bg`.`invoice_no` AS `invoice_no`,`without_bg`.`invoice_date` AS `invoice_date`,`without_bg`.`invoice_qty` AS `invoice_qty`,`without_bg`.`invoice_value` AS `invoice_value`,`without_bg`.`bill_status` AS `bill_status`,NULL AS `bg_num`,NULL AS `bg_auto_id`,NULL AS `bg_date`,NULL AS `bg_value`,`without_bg`.`claim_amount` AS `claim_amount`,`without_bg`.`file_name` AS `file_name`,`without_bg`.`file_org_name` AS `file_org_name`,`without_bg`.`proceed_bg` AS `proceed_bg`,`without_bg`.`inv_verify_status` AS `inv_verify_status`,NULL AS `bg_status` from `view_bill_submission_otm_without_bg` `without_bg` where `without_bg`.`bill_status` <> '2' group by `without_bg`.`invoice_no`;

DROP VIEW IF EXISTS `view_elcot_pending`;
CREATE OR REPLACE ALGORITHM=UNDEFINED DEFINER=`root`@`localhost` SQL SECURITY DEFINER VIEW `view_elcot_pending` AS select `invoice_main`.`form_main_unique_id` AS `po_unique_id`,`invoice_main`.`acc_year` AS `acc_year`,`invoice_main`.`invoice_no` AS `invoice_no`,`invoice_main`.`sess_user_type` AS `sess_user_type`,count(distinct `invoice_main`.`unique_id`) AS `invoice_count`,round(sum(cast(`invoice_main`.`invoice_value` as decimal(10,2))),2) AS `invoice_value` from (`invoice_creation_main` `invoice_main` join `invoice_sublist` `sub` on(`invoice_main`.`unique_id` = `sub`.`invoice_id`)) where `invoice_main`.`doc_approval_sts` = '0' and `invoice_main`.`invoice_no` <> '' and `invoice_main`.`is_delete` = '0' and `sub`.`is_delete` = '0' group by `invoice_main`.`form_main_unique_id`;

DROP VIEW IF EXISTS `view_entry_form`;
CREATE OR REPLACE ALGORITHM=UNDEFINED DEFINER=`root`@`localhost` SQL SECURITY DEFINER VIEW `view_entry_form` AS select count(distinct `bill`.`form_main_unique_id`) AS `po_count`,count(distinct `inv`.`invoice_no`) AS `invoice_count`,count(distinct `inv`.`dc_number`) AS `dc_count`,`bill`.`acc_year` AS `acc_year`,round(sum(cast(`inv`.`invoice_value` as decimal(10,2))),2) AS `invoice_value`,`bill`.`id` AS `id`,`bill`.`unique_id` AS `unique_id`,`inv`.`dc_number` AS `dc_number` from (`sign_doc_verification_detail` `bill` left join `invoice_creation_main` `inv` on(`inv`.`form_main_unique_id` = `bill`.`form_main_unique_id` and `inv`.`invoice_no` = `bill`.`invoice_no` and `inv`.`is_delete` = '0')) where `bill`.`status_app` = '2' and `bill`.`is_delete` = '0' and `bill`.`bill_status` in ('0','3','4') group by `bill`.`acc_year`,`bill`.`id`,`bill`.`unique_id`,`inv`.`dc_number`;

DROP VIEW IF EXISTS `view_installation_followups`;
CREATE OR REPLACE ALGORITHM=UNDEFINED DEFINER=`root`@`localhost` SQL SECURITY DEFINER VIEW `view_installation_followups` AS select `inv_m`.`form_main_unique_id` AS `form_main_unique_id`,`inv_m`.`po_unique_id` AS `po_unique_id`,`inv_m`.`po_num` AS `po_num`,`inv_m`.`po_date` AS `po_date`,`inv_m`.`consignee_unique_id` AS `consignee_unique_id`,`inv_m`.`dc_number` AS `dc_number`,`inv_m`.`dc_date` AS `dc_date`,`inv_m`.`invoice_auto_id` AS `invoice_auto_id`,`inv_m`.`invoice_date` AS `invoice_date`,`inv_m`.`invoice_value` AS `invoice_value`,`inv_m`.`date` AS `installation_com_date`,`inv_m`.`installation_status` AS `installation_status`,`inv_m`.`engg_type` AS `engg_type`,`inv_m`.`engineer_name` AS `engineer_name`,`inv_m`.`vendor_bulk_sts` AS `vendor_bulk_status`,`inv_m`.`bulk_eng_type` AS `bulk_eng_type`,`inv_m`.`bulk_eng_name` AS `bulk_eng_name`,`inv_m`.`vendor_ins_date` AS `vendor_ins_date`,`inv_m`.`ven_assign_no` AS `ven_assign_no`,`inv_m`.`ven_assign_date` AS `ven_assign_date`,`inv_m`.`vendor_bulk_timeline` AS `vendor_bulk_timeline`,`inv_m`.`bulk_total_amount` AS `bulk_total_amount`,`inv_m`.`date` AS `date`,`inv_m`.`in_charge` AS `in_charge`,`inv_m`.`eng_remarks` AS `eng_remarks`,`inv_m`.`dispatch_status` AS `dispatch_status`,`inv_m`.`acc_year` AS `acc_year`,`inv_m`.`ledger_name` AS `ledger_name`,`inv_m`.`sess_user_type` AS `sess_user_type`,`inv_m`.`sign_reject_reason` AS `sign_reject_reason`,`inv_m`.`team_mem` AS `team_mem`,`con_sub`.`con_address` AS `con_address`,`con_sub`.`con_district` AS `con_district_unique_id`,`get_district_name`(`con_sub`.`con_district`) AS `con_district`,`con_sub`.`con_state_name` AS `con_state_name_unique_id`,`get_state_name`(`con_sub`.`con_state_name`) AS `con_state_name`,`con_sub`.`zone` AS `zone`,`con_sub`.`con_pincode` AS `con_pincode`,`con_sub`.`con_contact_name` AS `con_contact_name`,`inv_sub`.`dc_file_name` AS `dc_file_name`,`inv_sub`.`ir_file_name` AS `ir_file_name`,`inv_sub`.`file_invoice` AS `file_invoice`,`po_form`.`file_name` AS `po_file_name`,`get_department_name`(`po_form`.`department`) AS `department`,`po_form`.`file_org_name` AS `po_file_org_name`,`po_form`.`ld_delivery_due_date` AS `delivery_due_dates`,`dispatch_list`.`status` AS `status`,`dispatch_list`.`invoice_no` AS `invoice_no`,`product_details_sub`.`document_required` AS `document_required`,ifnull(`po_form`.`ins_reqired`,0) AS `ins_reqired`,ifnull(`po_form`.`dc_required`,0) AS `dc_required`,ifnull(`po_form`.`insurence_required`,0) AS `insurance_required`,ifnull(`po_form`.`ld_required`,0) AS `ld_required` from (((((`dispatch_list` join `consignee_details_sub` `con_sub` on(`con_sub`.`unique_id` = `dispatch_list`.`consignee_unique_id` and `con_sub`.`form_main_unique_id` = `dispatch_list`.`po_form_unique_id` and `con_sub`.`is_delete` = '0')) join `invoice_sublist` `inv_sub` on(`inv_sub`.`invoice_no` = `dispatch_list`.`invoice_no` and `inv_sub`.`dc_number` = `dispatch_list`.`dc_number` and `dispatch_list`.`consignee_unique_id` = `inv_sub`.`consignee_unique_id` and `inv_sub`.`is_delete` = '0')) join `invoice_creation_main` `inv_m` on(`inv_m`.`invoice_no` = `dispatch_list`.`invoice_no` and `inv_m`.`dc_number` = `dispatch_list`.`dc_number` and `inv_m`.`form_main_unique_id` = `dispatch_list`.`po_form_unique_id` and `inv_m`.`is_delete` = '0')) join `po_form` on(`po_form`.`unique_id` = `dispatch_list`.`po_form_unique_id` and `po_form`.`is_delete` = '0')) join `product_details_sub` on(`product_details_sub`.`form_main_unique_id` = `dispatch_list`.`po_form_unique_id`)) where `dispatch_list`.`is_delete` = '0' and (`dispatch_list`.`status` = '2' or `dispatch_list`.`status` = '3' or `po_form`.`dc_required` <> 0) group by `dispatch_list`.`dc_number`;

DROP VIEW IF EXISTS `view_installation_followups1`;
CREATE OR REPLACE ALGORITHM=UNDEFINED DEFINER=`root`@`localhost` SQL SECURITY DEFINER VIEW `view_installation_followups1` AS select `inv_m`.`unique_id` AS `unique_id`,`inv_m`.`form_main_unique_id` AS `form_main_unique_id`,`inv_m`.`po_unique_id` AS `po_unique_id`,`inv_m`.`po_num` AS `po_num`,`inv_m`.`po_date` AS `po_date`,`inv_m`.`consignee_unique_id` AS `consignee_unique_id`,`inv_m`.`invoice_auto_id` AS `invoice_auto_id`,`inv_m`.`invoice_no` AS `invoice_no`,`inv_m`.`invoice_date` AS `invoice_date`,`inv_m`.`installation_status` AS `installation_status`,`inv_m`.`date` AS `installation_com_date`,`inv_m`.`dispatch_status` AS `dispatch_status`,`inv_m`.`dc_ir_dispatch_sts` AS `dc_ir_dispatch_sts`,`inv_m`.`invoice_value` AS `invoice_value`,`inv_m`.`acc_year` AS `acc_year`,`inv_m`.`ledger_name` AS `ledger_name`,`inv_m`.`sess_user_type` AS `sess_user_type`,`inv_m`.`bulk_eng_type` AS `bulk_eng_type`,`inv_m`.`bulk_eng_name` AS `bulk_eng_name`,`inv_m`.`team_mem` AS `team_mem`,`con_sub`.`con_address` AS `con_address`,`con_sub`.`con_pincode` AS `con_pincode`,`con_sub`.`con_contact_name` AS `con_contact_name`,`con_sub`.`con_district` AS `con_district_unique_id`,`get_district_name`(`con_sub`.`con_district`) AS `con_district`,`con_sub`.`con_state_name` AS `con_state_name_unique_id`,`get_state_name`(`con_sub`.`con_state_name`) AS `con_state_name`,`con_sub`.`zone` AS `zone`,`inv_sub`.`dc_file_name` AS `dc_file_name`,`inv_sub`.`ir_file_name` AS `ir_file_name`,`inv_sub`.`file_invoice` AS `file_invoice`,`po_form`.`file_name` AS `po_file_name`,`po_form`.`department` AS `department`,`po_form`.`file_org_name` AS `po_file_org_name`,`dispatch_list`.`status` AS `status`,`installation_details`.`documents_type` AS `documents_type`,`installation_details`.`engineer_name` AS `engineer_name`,`installation_details`.`documents_type1` AS `documents_type1`,`installation_details`.`documents_type2` AS `documents_type2`,`installation_details`.`dc_delivery_status` AS `dc_delivery_status`,`installation_details`.`dc_required` AS `dc_required`,`installation_details`.`dc_number` AS `dc_number`,`installation_details`.`sess_user_id` AS `doc_appload_person`,ifnull(`po_form`.`ins_reqired`,0) AS `ins_reqired` from (((((`invoice_creation_main` `inv_m` join `consignee_details_sub` `con_sub` on(`con_sub`.`unique_id` = `inv_m`.`consignee_unique_id` and `con_sub`.`is_delete` = '0')) join `invoice_sublist` `inv_sub` on(`inv_sub`.`invoice_id` = `inv_m`.`unique_id` and `inv_sub`.`is_delete` = '0')) join `po_form` on(`po_form`.`unique_id` = `inv_m`.`form_main_unique_id` and `po_form`.`is_delete` = '0')) join `dispatch_list` on(`dispatch_list`.`po_form_unique_id` = `inv_m`.`form_main_unique_id` and `dispatch_list`.`consignee_unique_id` = `inv_m`.`consignee_unique_id` and `dispatch_list`.`is_delete` = '0')) join `installation_details` on(`installation_details`.`po_form_unique_id` = `inv_m`.`form_main_unique_id` and `installation_details`.`invoice_no` = `inv_m`.`invoice_no` and `installation_details`.`dc_number` = `inv_m`.`dc_number` and `installation_details`.`is_delete` = '0')) where `inv_m`.`is_delete` = '0' and `inv_m`.`installation_status` = '1' or `inv_m`.`installation_status` = '2' or `inv_m`.`installation_status` = '5' or `inv_m`.`installation_status` = '4' group by `inv_m`.`unique_id`;

DROP VIEW IF EXISTS `view_invoice_assign_qty_count`;
CREATE OR REPLACE ALGORITHM=UNDEFINED DEFINER=`root`@`localhost` SQL SECURITY DEFINER VIEW `view_invoice_assign_qty_count` AS select `stock`.`acc_year` AS `acc_year`,`stock`.`form_main_unique_id` AS `form_main_unique_id`,`stock`.`stock_qty` AS `stk_qty`,sum(`inv`.`invoice_qty`) AS `inv_qty`,`stock`.`stock_value` AS `stk_val`,sum(`inv`.`invoice_value`) AS `inv_val`,`inv`.`sess_user_type` AS `sess_user_type`,round(`stock`.`stock_value` - sum(cast(`inv`.`invoice_value` as decimal(10,2))),2) AS `total_value`,`stock`.`stock_qty` - sum(`inv`.`invoice_qty`) AS `total_qty` from (`stock_position_main` `stock` join `invoice_creation_main` `inv` on(`stock`.`form_main_unique_id` = `inv`.`form_main_unique_id` and `inv`.`is_delete` = '0')) where `stock`.`is_delete` = '0' and `stock`.`stock_qty` <> `inv`.`invoice_qty` group by `stock`.`form_main_unique_id`;

DROP VIEW IF EXISTS `view_invoice_completed_count_value`;
CREATE OR REPLACE ALGORITHM=UNDEFINED DEFINER=`root`@`localhost` SQL SECURITY DEFINER VIEW `view_invoice_completed_count_value` AS select `invoice`.`form_main_unique_id` AS `po_count`,`invoice`.`acc_year` AS `acc_year`,`invoice`.`sess_user_type` AS `sess_user_type`,count(distinct `invoice`.`unique_id`) AS `invoice_count`,round(sum(cast(`invoice`.`invoice_value` as decimal(10,2))),2) AS `invoice_value` from `invoice_creation_main` `invoice` where `invoice`.`is_delete` = '0' and `invoice`.`invoice_doc_status` = '4' and `invoice`.`invoice_no` <> '' group by `invoice`.`form_main_unique_id`;

DROP VIEW IF EXISTS `view_login`;
CREATE OR REPLACE ALGORITHM=UNDEFINED DEFINER=`root`@`localhost` SQL SECURITY DEFINER VIEW `view_login` AS select cast(`u`.`user_type_unique_id` as char charset utf8mb4) AS `user_type_id`,cast(`u`.`unique_id` as char charset utf8mb4) AS `unique_id`,cast(`u`.`user_type` as char charset utf8mb4) AS `user_type`,cast(`u`.`staff_name` as char charset utf8mb4) AS `staff_name`,cast(`u`.`user_name` as char charset utf8mb4) AS `user_name`,cast(`u`.`password` as char charset utf8mb4) AS `password`,cast(0 as char charset utf8mb4) AS `engineer_id`,0 AS `cate_type` from (select `aa`.`user_type_unique_id` AS `user_type_unique_id`,`aa`.`unique_id` AS `unique_id`,`get_user_type`(`aa`.`user_type_unique_id`) AS `user_type`,`aa`.`staff_name` AS `staff_name`,`aa`.`user_name` AS `user_name`,`aa`.`password` AS `password` from `user` `aa` where `aa`.`user_type_unique_id` <> '66a3334baa22534432') `u` union all select cast('1234567' as char charset utf8mb4) AS `user_type_id`,cast(`a`.`unique_id` as char charset utf8mb4) AS `unique_id`,cast('service' as char charset utf8mb4) AS `user_type`,cast(`get_service_engineer_name`(`a`.`engineer_name`) as char charset utf8mb4) AS `staff_name`,cast((select `ab`.`user_name` from `user` `ab` where `ab`.`unique_id` = `a`.`engineer_name`) as char charset utf8mb4) AS `user_name`,cast((select `bb`.`password` from `user` `bb` where `bb`.`unique_id` = `a`.`engineer_name`) as char charset utf8mb4) AS `password`,cast(`a`.`engineer_name` as char charset utf8mb4) AS `engineer_id`,coalesce(`a`.`cate_type`,0) AS `cate_type` from `engineer_name_creation` `a` union all select cast(`b`.`vendor_user_type_unique_id` as char charset utf8mb4) AS `user_type_id`,cast(`b`.`unique_id` as char charset utf8mb4) AS `unique_id`,cast('vendor' as char charset utf8mb4) AS `user_type`,cast(`b`.`name` as char charset utf8mb4) AS `staff_name`,cast(`b`.`user_name` as char charset utf8mb4) AS `user_name`,cast(`b`.`password` as char charset utf8mb4) AS `password`,cast(0 as char charset utf8mb4) AS `engineer_id`,coalesce(`b`.`cate_type`,0) AS `cate_type` from `vendor_creation` `b`;

DROP VIEW IF EXISTS `view_mismatch_data`;
CREATE OR REPLACE ALGORITHM=UNDEFINED DEFINER=`root`@`localhost` SQL SECURITY DEFINER VIEW `view_mismatch_data` AS select `ids`.`po_num` AS `po_num`,`ids`.`po_date` AS `po_date`,(select `get_ledger_name`(`icm`.`ledger_no`) from `invoice_creation_main` `icm` where `icm`.`form_main_unique_id` = `ids`.`po_form_unique_id` and `icm`.`dc_number` = `ids`.`dc_number` limit 1) AS `ledger_name`,(select `u`.`staff_name` from `user` `u` where `u`.`staff_id` = `ids`.`team_mem` limit 1) AS `team_member`,(select `cds`.`con_district` from `consignee_details_sub` `cds` where `cds`.`unique_id` = `ids`.`consignee_unique_id` limit 1) AS `con_district`,(select `cds`.`con_state_name` from `consignee_details_sub` `cds` where `cds`.`unique_id` = `ids`.`consignee_unique_id` limit 1) AS `con_state_name`,(select `cds`.`con_address` from `consignee_details_sub` `cds` where `cds`.`unique_id` = `ids`.`consignee_unique_id` limit 1) AS `con_address`,`ids`.`invoice_no` AS `invoice_no`,`ids`.`invoice_date` AS `invoice_date`,`ids`.`dc_number` AS `dc_number`,(select `icm`.`dc_date` from `invoice_creation_main` `icm` where `icm`.`dc_number` = `ids`.`dc_number` limit 1) AS `dc_date`,`ids`.`dc_file` AS `dc_file`,`ids`.`ir_file` AS `ir_file`,`ids`.`document_verification_status` AS `document_verification_status`,`ids`.`sign_reject_reason` AS `sign_reject_reason`,`ids`.`consignee_unique_id` AS `consignee_unique_id`,`ids`.`po_form_unique_id` AS `po_form_unique_id`,`ids`.`unique_id` AS `ins_unique_id`,(select `ic`.`team_mem` from `invoice_creation` `ic` where `ic`.`dc_num` = `ids`.`dc_number` limit 1) AS `team_mem`,`ids`.`is_delete` AS `is_delete`,`ids`.`unique_id` AS `unique_id` from `installation_details_sublist` `ids` where `ids`.`document_verification_status` = '1' and `ids`.`is_delete` = 1;

DROP VIEW IF EXISTS `view_mismatch_installation`;
CREATE OR REPLACE ALGORITHM=UNDEFINED DEFINER=`root`@`localhost` SQL SECURITY DEFINER VIEW `view_mismatch_installation` AS select `inv_m`.`form_main_unique_id` AS `form_main_unique_id`,`inv_m`.`po_unique_id` AS `po_unique_id`,`po_form`.`po_num` AS `po_num`,`po_form`.`po_date` AS `po_date`,`inv_m`.`consignee_unique_id` AS `consignee_unique_id`,`inv_m`.`invoice_auto_id` AS `invoice_auto_id`,`inv_m`.`invoice_date` AS `invoice_date`,`inv_m`.`invoice_value` AS `invoice_value`,`inv_m`.`invoice_no` AS `invoice_no`,`inv_m`.`dc_number` AS `dc_number`,`inv_m`.`installation_status` AS `installation_status`,`inv_m`.`dispatch_status` AS `dispatch_status`,`inv_m`.`ledger_name` AS `ledger_name`,`ins_det`.`unique_id` AS `ins_unique_id`,`ins_det`.`document_verification_status` AS `document_verification_status`,`ins_det1`.`dc_delivery_status` AS `dc_delivery_status`,`ins_det`.`documents_type` AS `dc_status`,`ins_det`.`documents_type1` AS `ir_status`,`ins_det`.`documents_type2` AS `snr_status`,`ins_det`.`dc_file` AS `dc_file`,`ins_det`.`dc_original_name` AS `dc_original_name`,`ins_det`.`dc_cus_signed_date` AS `dc_cus_signed_date`,`ins_det`.`ir_file` AS `ir_file`,`ins_det`.`ir_original_name` AS `ir_original_name`,`ins_det`.`ir_cus_signed_date` AS `ir_cus_signed_date`,`ins_det`.`snr_file` AS `snr_file`,`ins_det`.`acc_year` AS `acc_year`,`ins_det`.`snr_original_name` AS `snr_original_name`,`ins_det`.`snr_cus_signed_date` AS `snr_cus_signed_date`,`dc_ir_doc`.`dc_ir_status` AS `dc_ir_status`,`dc_ir_doc`.`dc_dispatch_mode` AS `dc_dispatch_mode`,`dc_ir_doc`.`ir_dispatch_mode` AS `ir_dispatch_mode`,`dc_ir_doc`.`snr_dispatch_mode` AS `snr_dispatch_mode`,`po_form`.`file_name` AS `po_file`,`po_form`.`department` AS `department`,`po_form`.`file_org_name` AS `po_file_org_name`,`ins_det1`.`dc_required` AS `dc_required`,`po_form`.`dc_status_bill` AS `dc_status_bill`,`con_sub`.`con_address` AS `con_address`,`con_sub`.`con_district` AS `con_district`,`con_sub`.`con_pincode` AS `con_pincode`,`con_sub`.`con_contact_name` AS `con_contact_name`,ifnull(`po_form`.`ins_reqired`,0) AS `ins_reqired` from (((((`invoice_creation_main` `inv_m` join `installation_details_sublist` `ins_det` on(`inv_m`.`form_main_unique_id` = `ins_det`.`po_form_unique_id` and `inv_m`.`consignee_unique_id` = `ins_det`.`consignee_unique_id` and `inv_m`.`invoice_no` = `ins_det`.`invoice_no` and `ins_det`.`is_delete` = '1')) join `installation_details` `ins_det1` on(`inv_m`.`form_main_unique_id` = `ins_det1`.`po_form_unique_id` and `inv_m`.`consignee_unique_id` = `ins_det1`.`consignee_unique_id` and `inv_m`.`invoice_no` = `ins_det1`.`invoice_no` and `ins_det1`.`is_delete` = '1')) join `dc_ir_doc_dispatch_details` `dc_ir_doc` on(`dc_ir_doc`.`po_form_unique_id` = `inv_m`.`form_main_unique_id` and `inv_m`.`consignee_unique_id` = `dc_ir_doc`.`consignee_unique_id` and `inv_m`.`invoice_no` = `dc_ir_doc`.`invoice_no` and `dc_ir_doc`.`is_delete` = '1')) join `po_form` on(`inv_m`.`form_main_unique_id` = `po_form`.`unique_id` and `po_form`.`is_delete` = '0')) join `consignee_details_sub` `con_sub` on(`con_sub`.`unique_id` = `inv_m`.`consignee_unique_id` and `con_sub`.`form_main_unique_id` = `inv_m`.`form_main_unique_id` and `con_sub`.`is_delete` = '0')) where `inv_m`.`sign_mismatch_status` = '1' or `inv_m`.`sign_reject_reason` <> '';

DROP VIEW IF EXISTS `view_ops_bill_submission_without_bg`;
CREATE OR REPLACE ALGORITHM=UNDEFINED DEFINER=`root`@`localhost` SQL SECURITY DEFINER VIEW `view_ops_bill_submission_without_bg` AS select `inv`.`form_main_unique_id` AS `form_main_unique_id`,`po`.`po_num` AS `po_num`,`po`.`po_date` AS `po_date`,`con_sub`.`con_contact_name` AS `con_contact_name`,`con_sub`.`con_address` AS `con_address`,`inv`.`invoice_no` AS `invoice_no`,`inv`.`invoice_date` AS `invoice_date`,`inv`.`invoice_value` AS `invoice_value`,`inv`.`invoice_qty` AS `invoice_qty`,`inv`.`consignee_unique_id` AS `consignee_unique_id`,`inv`.`invoice_auto_id` AS `invoice_auto_id`,`sign_doc`.`bill_status` AS `bill_status`,`bill_sub_form`.`claim_amount` AS `claim_amount`,`bill_sub_form`.`scanned_dc_copy` AS `scanned_dc_copy`,`bill_sub_form`.`scanned_snr_copy` AS `scanned_snr_copy`,`bill_sub_form`.`scanned_ir_copy` AS `scanned_ir_copy`,`bill_sub_form`.`invoice_copy` AS `invoice_copy`,`bill_sub_form`.`installation_reference_no` AS `installation_reference_no`,`bill_sub_form`.`supplier_invoice_number` AS `supplier_invoice_number`,`sign_doc`.`ins_unique_id` AS `ins_unique_id`,`po`.`file_name` AS `file_name`,`po`.`file_org_name` AS `file_org_name`,`po`.`proceed_bg` AS `proceed_bg`,ifnull(`po`.`ins_reqired`,0) AS `ins_reqired`,ifnull(`po`.`bank_required`,0) AS `bank_required` from (((((`invoice_creation_main` `inv` join `po_form` `po` on(`inv`.`form_main_unique_id` = `po`.`unique_id` and `po`.`is_delete` = '0')) join `sign_doc_verification_detail` `sign_doc` on(`sign_doc`.`form_main_unique_id` = `inv`.`form_main_unique_id` and `sign_doc`.`con_unique_id` = `inv`.`consignee_unique_id` and `sign_doc`.`invoice_no` = `inv`.`invoice_no` and `sign_doc`.`is_delete` = '0')) join `bill_submission_form` `bill_sub_form` on(`inv`.`form_main_unique_id` = `bill_sub_form`.`bill_form_main_unique_id` and `inv`.`invoice_no` = `bill_sub_form`.`invoice_no` and `sign_doc`.`ins_unique_id` = `bill_sub_form`.`ins_unique_id` and `bill_sub_form`.`is_delete` = '0')) join `consignee_details_sub` `con_sub` on(`con_sub`.`unique_id` = `inv`.`consignee_unique_id` and `con_sub`.`is_delete` = '0')) join `product_details_sub` `product_sub` on(`product_sub`.`form_main_unique_id` = `inv`.`form_main_unique_id` and `product_sub`.`is_delete` = '0')) where `inv`.`is_delete` = '0' and `sign_doc`.`status_app` = '2' and `sign_doc`.`without_bg` = 'on' group by `sign_doc`.`ins_unique_id`;

DROP VIEW IF EXISTS `view_otm_bill_pending_list`;
CREATE OR REPLACE ALGORITHM=UNDEFINED DEFINER=`root`@`localhost` SQL SECURITY DEFINER VIEW `view_otm_bill_pending_list` AS select `without_bg`.`form_main_unique_id` AS `unique_id`,`without_bg`.`po_num` AS `po_num`,`without_bg`.`po_date` AS `po_date`,`without_bg`.`invoice_no` AS `invoice_no`,`without_bg`.`invoice_date` AS `invoice_date`,`without_bg`.`invoice_qty` AS `invoice_qty`,`without_bg`.`invoice_value` AS `invoice_value`,`without_bg`.`bill_status` AS `bill_status`,NULL AS `bg_num`,NULL AS `bg_auto_id`,NULL AS `bg_date`,NULL AS `bg_value`,`without_bg`.`file_name` AS `file_name`,`without_bg`.`file_org_name` AS `file_org_name`,`without_bg`.`proceed_bg` AS `proceed_bg`,`without_bg`.`inv_verify_status` AS `inv_verify_status`,NULL AS `bg_status` from `view_otm_withoutbg_peding2list` `without_bg` group by `without_bg`.`invoice_no`;

DROP VIEW IF EXISTS `view_otm_with_bg_pendinglist1`;
CREATE OR REPLACE ALGORITHM=UNDEFINED DEFINER=`root`@`localhost` SQL SECURITY DEFINER VIEW `view_otm_with_bg_pendinglist1` AS select `bg_sub`.`form_main_unique_id` AS `form_main_unique_id`,`po`.`po_num` AS `po_num`,`po`.`po_date` AS `po_date`,`bg_sub`.`invoice_no` AS `invoice_no`,`bg_sub`.`invoice_value` AS `invoice_value`,`bg_sub`.`invoice_date` AS `invoice_date`,`bg_sub`.`invoice_qty` AS `invoice_qty`,`bg_sub`.`bg_num` AS `bg_num`,`bg_sub`.`bg_auto_id` AS `bg_auto_id`,`sign_doc`.`bill_status` AS `bill_status`,`bg_sub`.`bg_date` AS `bg_date`,`bg_main`.`bg_value` AS `bg_value`,`po`.`proceed_bg` AS `proceed_bg`,`po`.`file_name` AS `file_name`,`po`.`file_org_name` AS `file_org_name`,`sign_doc`.`inv_verify_status` AS `inv_verify_status`,`sign_doc`.`bg_status` AS `bg_status` from (((`bg_creation_sub` `bg_sub` join `po_form` `po` on(`bg_sub`.`form_main_unique_id` = `po`.`unique_id` and `po`.`is_delete` = '0')) join `sign_doc_verification_detail` `sign_doc` on(`sign_doc`.`form_main_unique_id` = `bg_sub`.`form_main_unique_id` and `sign_doc`.`invoice_no` = `bg_sub`.`invoice_no` and `sign_doc`.`is_delete` = '0')) join `bg_creation_main` `bg_main` on(`bg_sub`.`form_main_unique_id` = `bg_main`.`form_main_unique_id` and `bg_sub`.`bg_auto_id` = `bg_main`.`bg_auto_id` and `bg_main`.`is_delete` = '0')) where `bg_sub`.`is_delete` = '0' and `sign_doc`.`with_bg` = 'on' and `bg_sub`.`status` = '1' group by `bg_sub`.`invoice_no`;

DROP VIEW IF EXISTS `view_otm_withoutbg_peding2list`;
CREATE OR REPLACE ALGORITHM=UNDEFINED DEFINER=`root`@`localhost` SQL SECURITY DEFINER VIEW `view_otm_withoutbg_peding2list` AS select `inv`.`form_main_unique_id` AS `form_main_unique_id`,`inv`.`po_num` AS `po_num`,`inv`.`po_date` AS `po_date`,`inv`.`invoice_no` AS `invoice_no`,date_format(`inv`.`invoice_date`,'%d-%m-%Y') AS `invoice_date`,sum(`inv`.`invoice_value`) AS `invoice_value`,sum(`inv`.`invoice_qty`) AS `invoice_qty`,`inv`.`bill_status` AS `bill_status`,`inv`.`inv_verify_status` AS `inv_verify_status`,`po`.`file_name` AS `file_name`,`po`.`file_org_name` AS `file_org_name`,`po`.`proceed_bg` AS `proceed_bg` from (`invoice_verfication_table` `inv` join `po_form` `po` on(`inv`.`form_main_unique_id` = `po`.`unique_id` and `po`.`is_delete` = '0')) where `inv`.`status_app` = '2' group by `inv`.`invoice_no`;

DROP VIEW IF EXISTS `view_outsource_vendor_verified_invoice`;
CREATE OR REPLACE ALGORITHM=UNDEFINED DEFINER=`root`@`localhost` SQL SECURITY DEFINER VIEW `view_outsource_vendor_verified_invoice` AS select `invoice_verfication_table`.`unique_id` AS `unique_id`,`invoice_verfication_table`.`invoice_no` AS `invoice_no`,`invoice_verfication_table`.`invoice_date` AS `invoice_date`,`invoice_verfication_table`.`dc_number` AS `dc_number`,`invoice_verfication_table`.`dc_date` AS `dc_date`,`invoice_verfication_table`.`po_num` AS `po_num`,`invoice_verfication_table`.`po_date` AS `po_date`,`invoice_verfication_table`.`form_main_unique_id` AS `form_main_unique_id`,`invoice_verfication_table`.`consignee_unique_id` AS `consignee_unique_id`,`invoice_verfication_table`.`ledger_name` AS `ledger_name`,`invoice_verfication_table`.`ledger_no` AS `ledger_no`,`invoice_verfication_table`.`invoice_qty` AS `invoice_qty`,`invoice_verfication_table`.`invoice_value` AS `invoice_value`,`invoice_verfication_table`.`bulk_eng_type` AS `bulk_eng_type`,`invoice_verfication_table`.`bulk_eng_name` AS `bulk_eng_name`,`invoice_verfication_table`.`vendor_payment_allocated` AS `vendor_payment_allocated`,`invoice_verfication_table`.`vendor_finance_approval` AS `vendor_finance_approval`,`get_outsource_engineer_name`(`invoice_verfication_table`.`bulk_eng_name`) AS `outsrc_eng_name`,`invoice_verfication_table`.`engineer_name` AS `engineer_name`,`invoice_verfication_table`.`bulk_total_amount` AS `bulk_total_amount`,`invoice_verfication_table`.`bulk_dc_total_amount` AS `bulk_dc_total_amount`,`invoice_verfication_table`.`vendor_bulk_rate` AS `vendor_bulk_rate`,`invoice_verfication_table`.`vendor_bulk_sts` AS `vendor_bulk_sts`,`invoice_verfication_table`.`vendor_bulk_gst` AS `vendor_bulk_gst`,`invoice_verfication_table`.`vendor_bulk_timeline` AS `vendor_bulk_timeline`,`invoice_verfication_table`.`vendor_inst_allocation_date` AS `vendor_inst_allocation_date`,`invoice_verfication_table`.`inv_verify_status` AS `inv_verify_status`,`invoice_verfication_table`.`inv_verify_approvedby` AS `inv_verify_approvedby`,`invoice_verfication_table`.`inv_verify_approved_date` AS `inv_verify_approved_date`,`invoice_verfication_table`.`vendor_inv_attach_approval` AS `vendor_inv_attach_approval`,`invoice_verfication_table`.`veninvstatus` AS `veninvstatus`,`invoice_verfication_table`.`vendor_bill_app_status` AS `vendor_bill_app_status`,`invoice_verfication_table`.`vendor_bill_reject_reason` AS `vendor_bill_reject_reason`,`invoice_verfication_table`.`vendor_bill_rejected_by` AS `vendor_bill_rejected_by`,`invoice_verfication_table`.`vendor_bill_approval_allocated` AS `vendor_bill_approval_allocated`,`invoice_verfication_table`.`document_verification_status` AS `document_verification_status`,`invoice_verfication_table`.`dc_required` AS `dc_required`,`invoice_verfication_table`.`signed_complete_status` AS `signed_complete_status` from `invoice_verfication_table` where `invoice_verfication_table`.`bulk_eng_type` = 'outsource-vendor';

DROP VIEW IF EXISTS `view_partial_bill_1`;
CREATE OR REPLACE ALGORITHM=UNDEFINED DEFINER=`root`@`localhost` SQL SECURITY DEFINER VIEW `view_partial_bill_1` AS select `vpp`.`bill_form_unique_id` AS `bill_form_unique_id`,`vpp`.`po_num` AS `po_num`,`vpp`.`po_date` AS `po_date`,`vpp`.`invoice_no` AS `invoice_no`,`vpp`.`invoice_date` AS `invoice_date`,`vpp`.`invoice_value` AS `invoice_value`,`vpp`.`invoice_qty` AS `invoice_qty`,`vpp`.`bill_status` AS `bill_status`,`vpp`.`bill_created_date` AS `bill_created_date`,`vpp`.`partial_bill_status` AS `partial_bill_status`,`vpp`.`bank_required` AS `bank_required`,`vpp`.`bill_submission_date` AS `bill_submission_date`,`vpp`.`customer_name` AS `customer_name`,`vpp`.`ir_status` AS `ir_status`,group_concat(distinct `vpp`.`e_no` order by `vpp`.`e_no` ASC separator ',') AS `e_no`,group_concat(distinct `vpp`.`ld_amount` order by `vpp`.`ld_amount` ASC separator ',') AS `ld_amount`,group_concat(distinct `vpp`.`ld_days` order by `vpp`.`ld_days` ASC separator ',') AS `ld_days`,sum(`vpp`.`payment_received`) AS `payement_receive`,`vpp`.`payment_status` AS `payment_status`,group_concat(distinct `vpp`.`payment_date` order by `vpp`.`payment_date` ASC separator ',') AS `payment_date`,group_concat(distinct `vpp`.`bill_no` order by `vpp`.`bill_no` ASC separator ',') AS `bill_no`,group_concat(distinct `vpp`.`file_name` order by `vpp`.`file_name` ASC separator ',') AS `file_name`,`vpp`.`claim_status` AS `claim_status`,`vpp`.`net_value` AS `net_value`,`vpp`.`qty` AS `qty`,`vpp`.`with_bg` AS `with_bg`,`vpp`.`without_bg` AS `without_bg`,`vpp`.`delivery_due_dates` AS `delivery_due_dates`,`vpp`.`warranty` AS `warranty`,sum(`vpp`.`claim_amount`) AS `claim_amount`,`vpp`.`claim_ttl_amount` AS `claim_ttl_amount` from `view_payment_partial` `vpp` group by `vpp`.`invoice_no`;

DROP VIEW IF EXISTS `view_partial_bill_submission_with_bg`;
CREATE OR REPLACE ALGORITHM=UNDEFINED DEFINER=`root`@`localhost` SQL SECURITY DEFINER VIEW `view_partial_bill_submission_with_bg` AS select `bill_sub_form`.`bill_form_main_unique_id` AS `bill_form_main_unique_id`,`bill_sub_form`.`po_num` AS `po_num`,`bill_sub_form`.`po_date` AS `po_date`,`bill_sub_form`.`invoice_no` AS `invoice_no`,`bill_sub_form`.`invoice_date` AS `invoice_date`,`bill_sub_form`.`invoice_value` AS `invoice_value`,`bill_sub_form`.`invoice_qty` AS `invoice_qty`,`bill_sub_form`.`claim_amount` AS `claim_amount`,`bill_sub_form`.`bill_status` AS `bill_status`,`bg_sub`.`bg_num` AS `bg_num`,`bg_sub`.`bg_auto_id` AS `bg_auto_id`,`bg_sub`.`bg_date` AS `bg_date`,`bg_main`.`bg_value` AS `bg_value`,`po`.`file_name` AS `file_name`,`po`.`file_org_name` AS `file_org_name`,`po`.`proceed_bg` AS `proceed_bg`,ifnull(`po`.`ins_reqired`,0) AS `ins_reqired`,ifnull(`po`.`bank_required`,0) AS `bank_required` from (((`bill_submission_form` `bill_sub_form` join `po_form` `po` on(`bill_sub_form`.`bill_form_main_unique_id` = `po`.`unique_id` and `po`.`is_delete` = '0')) join `bg_creation_sub` `bg_sub` on(`bill_sub_form`.`bill_form_main_unique_id` = `bg_sub`.`form_main_unique_id` and `bg_sub`.`is_delete` = '0')) join `bg_creation_main` `bg_main` on(`bill_sub_form`.`bill_form_main_unique_id` = `bg_main`.`form_main_unique_id` and `bg_main`.`is_delete` = '0')) where `po`.`proceed_bg` = '1' and `bill_sub_form`.`partial_bill_status` = '2' and `bill_sub_form`.`is_delete` = '0' group by `bill_sub_form`.`invoice_no`;

DROP VIEW IF EXISTS `view_partial_bill_submission_without_bg`;
CREATE OR REPLACE ALGORITHM=UNDEFINED DEFINER=`root`@`localhost` SQL SECURITY DEFINER VIEW `view_partial_bill_submission_without_bg` AS select `bill_sub_form`.`bill_form_main_unique_id` AS `bill_form_main_unique_id`,`bill_sub_form`.`po_num` AS `po_num`,`bill_sub_form`.`po_date` AS `po_date`,`bill_sub_form`.`invoice_no` AS `invoice_no`,`bill_sub_form`.`invoice_date` AS `invoice_date`,`bill_sub_form`.`invoice_value` AS `invoice_value`,`bill_sub_form`.`invoice_qty` AS `invoice_qty`,`bill_sub_form`.`claim_amount` AS `claim_amount`,`bill_sub_form`.`bill_status` AS `bill_status`,`po`.`file_name` AS `file_name`,`po`.`file_org_name` AS `file_org_name`,`po`.`proceed_bg` AS `proceed_bg`,ifnull(`po`.`ins_reqired`,0) AS `ins_reqired`,ifnull(`po`.`bank_required`,0) AS `bank_required` from (`bill_submission_form` `bill_sub_form` join `po_form` `po` on(`bill_sub_form`.`bill_form_main_unique_id` = `po`.`unique_id` and `po`.`is_delete` = 0)) where `bill_sub_form`.`partial_bill_status` = '2' and `po`.`proceed_bg` = '2' and `bill_sub_form`.`is_delete` = 0;

DROP VIEW IF EXISTS `view_partial_elcot_entry_final`;
CREATE OR REPLACE ALGORITHM=UNDEFINED DEFINER=`root`@`localhost` SQL SECURITY DEFINER VIEW `view_partial_elcot_entry_final` AS select `with_bg`.`bill_form_main_unique_id` AS `unique_id`,`with_bg`.`po_num` AS `po_num`,`with_bg`.`po_date` AS `po_date`,`with_bg`.`invoice_no` AS `invoice_no`,`with_bg`.`invoice_date` AS `invoice_date`,`with_bg`.`invoice_qty` AS `invoice_qty`,`with_bg`.`invoice_value` AS `invoice_value`,`with_bg`.`bill_status` AS `bill_status`,`with_bg`.`bg_num` AS `bg_num`,`with_bg`.`bg_auto_id` AS `bg_auto_id`,`with_bg`.`bg_date` AS `bg_date`,`with_bg`.`bg_value` AS `bg_value`,`with_bg`.`claim_amount` AS `claim_amount`,`with_bg`.`file_name` AS `file_name`,`with_bg`.`file_org_name` AS `file_org_name`,NULL AS `bank_required`,`with_bg`.`proceed_bg` AS `proceed_bg` from `view_partial_bill_submission_with_bg` `with_bg` union all select `without_bg`.`bill_form_main_unique_id` AS `unique_id`,`without_bg`.`po_num` AS `po_num`,`without_bg`.`po_date` AS `po_date`,`without_bg`.`invoice_no` AS `invoice_no`,`without_bg`.`invoice_date` AS `invoice_date`,`without_bg`.`invoice_qty` AS `invoice_qty`,`without_bg`.`invoice_value` AS `invoice_value`,`without_bg`.`bill_status` AS `bill_status`,NULL AS `bg_num`,NULL AS `bg_auto_id`,NULL AS `bg_date`,NULL AS `bg_value`,`without_bg`.`claim_amount` AS `claim_amount`,`without_bg`.`file_name` AS `file_name`,`without_bg`.`file_org_name` AS `file_org_name`,`without_bg`.`bank_required` AS `bank_required`,`without_bg`.`proceed_bg` AS `proceed_bg` from `view_partial_bill_submission_without_bg` `without_bg`;

DROP VIEW IF EXISTS `view_payment_entry_list`;
CREATE OR REPLACE ALGORITHM=UNDEFINED DEFINER=`root`@`localhost` SQL SECURITY DEFINER VIEW `view_payment_entry_list` AS select `bill_main`.`bill_form_unique_id` AS `bill_form_unique_id`,`bill_main`.`invoice_no` AS `invoice_no`,`bill_main`.`invoice_date` AS `invoice_date`,`bill_main`.`invoice_value` AS `invoice_value`,`bill_main`.`invoice_qty` AS `invoice_qty`,`bill_main`.`bill_submission_date` AS `bill_submission_date`,`bill_main`.`e_no` AS `e_no`,`bill_main`.`ld_amount` AS `ld_amount`,`bill_main`.`ld_days` AS `ld_days`,`bill_main`.`payment_received` AS `payement_receive`,`bill_main`.`payment_status` AS `payment_status`,`bill_main`.`payment_date` AS `payment_date`,`bill_main`.`bill_no` AS `bill_no`,`bill_main`.`acc_year` AS `acc_year`,`bill_main`.`file_name` AS `file_name`,`bill_main`.`claim_status` AS `claim_status`,`bill_main`.`elcot_ent_status` AS `elcot_ent_status`,`bill_main`.`gst` AS `gst`,`bill_main`.`gst_value` AS `gst_value`,`bill_main`.`tds` AS `tds`,`bill_main`.`tds_value` AS `tds_value`,`bill_main`.`ld` AS `ld`,`bill_main`.`rem_amt` AS `rem_amt`,`bill_main`.`tran_amt` AS `tran_amt`,`bill_main`.`po_num` AS `po_num`,`bill_main`.`po_date` AS `po_date`,`bill_main`.`claim_percentage` AS `claim_percent`,`bill_main`.`claimamt` AS `claim_amount`,`bill_main`.`bill_status` AS `bill_status`,`bill_submission_main_table`.`invoice_no` AS `main_invoice_no`,`bill_submission_main_table`.`bill_created_date` AS `bill_created_date`,`bill_submission_form`.`partial_bill_status` AS `partial_bill_status`,`bill_submission_main_table`.`bg_num` AS `bg_num`,`bill_submission_main_table`.`bg_id` AS `bg_id`,`bill_submission_main_table`.`bg_date` AS `bg_date`,`bill_submission_main_table`.`bg_value` AS `bg_value`,`product_details_sub`.`net_value` AS `net_value`,`product_details_sub`.`qty` AS `qty`,`product_details_sub`.`unit_price` AS `unit_price`,`sign_doc_verification_detail`.`with_bg` AS `with_bg`,`sign_doc_verification_detail`.`without_bg` AS `without_bg`,`sign_doc_verification_detail`.`payment_cancel_reason` AS `payment_cancel_reason`,`product_details_sub`.`delivery_due_dates` AS `delivery_due_dates`,`po_form`.`bank_required` AS `bank_required`,`po_form`.`warranty_duration` AS `warranty`,`department_creation_sublist`.`ledger_name` AS `ledger_name`,`department_creation_sublist`.`ledger_no` AS `ledger_no` from ((((((`bill_submission_sub` `bill_main` left join `sign_doc_verification_detail` on(`bill_main`.`bill_form_unique_id` = `sign_doc_verification_detail`.`form_main_unique_id` and `bill_main`.`invoice_no` = `sign_doc_verification_detail`.`invoice_no` and `bill_main`.`bill_no` = `sign_doc_verification_detail`.`bill_no` and `sign_doc_verification_detail`.`is_delete` = '0')) left join `product_details_sub` on(`bill_main`.`bill_form_unique_id` = `product_details_sub`.`form_main_unique_id` and `product_details_sub`.`is_delete` = '0')) left join `bill_submission_main_table` on(`bill_main`.`bill_form_unique_id` = `bill_submission_main_table`.`bill_form_main_unique_id` and `bill_main`.`bill_no` = `bill_submission_main_table`.`bill_no` and `bill_submission_main_table`.`is_delete` = '0')) left join `bill_submission_form` on(`bill_main`.`bill_form_unique_id` = `bill_submission_form`.`bill_form_main_unique_id` and `bill_main`.`invoice_no` = `bill_submission_form`.`invoice_no` and `bill_submission_form`.`is_delete` = '0')) join `po_form` on(`bill_main`.`bill_form_unique_id` = `po_form`.`unique_id` and `po_form`.`is_delete` = '0')) left join `department_creation_sublist` on(`po_form`.`department` = `department_creation_sublist`.`form_main_unique_id` and `department_creation_sublist`.`is_delete` = '0')) where `bill_main`.`is_delete` = '0' and `bill_main`.`bill_submission_date` <> '' and `bill_main`.`claim_status` = 0 group by `bill_main`.`bill_no`,`bill_main`.`invoice_no`;

DROP VIEW IF EXISTS `view_payment_partial`;
CREATE OR REPLACE ALGORITHM=UNDEFINED DEFINER=`root`@`localhost` SQL SECURITY DEFINER VIEW `view_payment_partial` AS select `bill_main`.`bill_form_unique_id` AS `bill_form_unique_id`,`bill_main`.`invoice_no` AS `invoice_no`,`bill_main`.`invoice_date` AS `invoice_date`,`bill_main`.`invoice_value` AS `invoice_value`,`bill_main`.`invoice_qty` AS `invoice_qty`,`bill_main`.`bill_submission_date` AS `bill_submission_date`,`bill_main`.`bill_created_date` AS `bill_created_date`,`bill_main`.`e_no` AS `e_no`,`bill_main`.`ld_amount` AS `ld_amount`,`bill_main`.`ld_days` AS `ld_days`,`bill_main`.`payment_received` AS `payment_received`,`bill_main`.`payment_status` AS `payment_status`,`bill_main`.`partial_bill_status` AS `partial_bill_status`,`bill_main`.`payment_date` AS `payment_date`,`bill_main`.`bill_no` AS `bill_no`,`bill_main`.`acc_year` AS `acc_year`,`bill_main`.`file_name` AS `file_name`,`bill_main`.`claim_status` AS `claim_status`,`bill_main`.`elcot_ent_status` AS `elcot_ent_status`,`bill_main`.`gst` AS `gst`,`bill_main`.`gst_value` AS `gst_value`,`bill_main`.`tds` AS `tds`,`bill_main`.`tds_value` AS `tds_value`,`bill_main`.`ld` AS `ld`,`bill_main`.`rem_amt` AS `rem_amt`,`bill_main`.`tran_amt` AS `tran_amt`,`bill_main`.`po_num` AS `po_num`,`bill_main`.`po_date` AS `po_date`,`bill_main`.`claim_percentage` AS `claim_amount`,`bill_main`.`claimamt` AS `claim_ttl_amount`,`bill_submission_main_table`.`invoice_no` AS `main_invoice_no`,`bill_submission_main_table`.`customer_name` AS `customer_name`,`bill_submission_form`.`bill_status` AS `bill_status`,`bill_submission_form`.`partial_bill_status` AS `partial_status`,`product_details_sub`.`net_value` AS `net_value`,`product_details_sub`.`qty` AS `qty`,`product_details_sub`.`unit_price` AS `unit_price`,`sign_doc_verification_detail`.`ir_status` AS `ir_status`,`sign_doc_verification_detail`.`with_bg` AS `with_bg`,`sign_doc_verification_detail`.`without_bg` AS `without_bg`,`sign_doc_verification_detail`.`payment_cancel_reason` AS `payment_cancel_reason`,`product_details_sub`.`delivery_due_dates` AS `delivery_due_dates`,`product_details_sub`.`bg_required` AS `bank_required`,`product_details_sub`.`warranty_duration` AS `warranty`,`department_creation_sublist`.`ledger_name` AS `ledger_name`,`department_creation_sublist`.`ledger_no` AS `ledger_no` from ((((((`bill_submission_sub` `bill_main` left join `sign_doc_verification_detail` on(`bill_main`.`bill_form_unique_id` = `sign_doc_verification_detail`.`form_main_unique_id` and `bill_main`.`invoice_no` = `sign_doc_verification_detail`.`invoice_no` and `bill_main`.`bill_no` = `sign_doc_verification_detail`.`bill_no` and `sign_doc_verification_detail`.`is_delete` = '0')) left join `product_details_sub` on(`bill_main`.`bill_form_unique_id` = `product_details_sub`.`form_main_unique_id` and `product_details_sub`.`is_delete` = '0')) left join `bill_submission_main_table` on(`bill_main`.`bill_form_unique_id` = `bill_submission_main_table`.`bill_form_main_unique_id` and `bill_main`.`bill_no` = `bill_submission_main_table`.`bill_no` and `bill_submission_main_table`.`is_delete` = '0')) left join `bill_submission_form` on(`bill_main`.`bill_form_unique_id` = `bill_submission_form`.`bill_form_main_unique_id` and `bill_main`.`invoice_no` = `bill_submission_form`.`invoice_no` and `bill_submission_form`.`is_delete` = '0')) left join `po_form` on(`bill_main`.`bill_form_unique_id` = `po_form`.`unique_id` and `po_form`.`is_delete` = '0')) left join `department_creation_sublist` on(`po_form`.`department` = `department_creation_sublist`.`form_main_unique_id` and `department_creation_sublist`.`is_delete` = '0')) where `bill_main`.`is_delete` = '0' and `bill_main`.`claim_status` = 0 group by `bill_main`.`invoice_no`;

DROP VIEW IF EXISTS `view_payment_received_count`;
CREATE OR REPLACE ALGORITHM=UNDEFINED DEFINER=`root`@`localhost` SQL SECURITY DEFINER VIEW `view_payment_received_count` AS select `bill_payment`.`bill_form_unique_id` AS `bill_form_unique_id`,`bill_payment`.`acc_year` AS `acc_year`,count(`bill_payment`.`invoice_no`) AS `invoice_count`,sum(`bill_payment`.`invoice_value`) AS `invoice_value` from `view_payment_entry_list` `bill_payment` where `bill_payment`.`payement_receive` <> '' group by `bill_payment`.`bill_form_unique_id`;

DROP VIEW IF EXISTS `view_pending_invoice_count_value`;
CREATE OR REPLACE ALGORITHM=UNDEFINED DEFINER=`root`@`localhost` SQL SECURITY DEFINER VIEW `view_pending_invoice_count_value` AS select `invoice`.`po_num` AS `po_num`,`invoice`.`form_main_unique_id` AS `po_count`,`invoice`.`invoice_no` AS `invoice_no`,`invoice`.`acc_year` AS `acc_year`,`invoice`.`sess_user_type` AS `sess_user_type`,count(distinct `invoice`.`unique_id`) AS `invoice_count`,round(sum(cast(`invoice`.`invoice_value` as decimal(10,2))),2) AS `invoice_value` from `invoice_creation_main` `invoice` where `invoice`.`is_delete` = 0 and (`invoice`.`invoice_doc_status` = '0' or `invoice`.`invoice_doc_status` = '2') group by `invoice`.`form_main_unique_id`;

DROP VIEW IF EXISTS `view_po_consignee_deatail`;
CREATE OR REPLACE ALGORITHM=UNDEFINED DEFINER=`root`@`localhost` SQL SECURITY DEFINER VIEW `view_po_consignee_deatail` AS select `po_form`.`unique_id` AS `main_unique_id`,`po_form`.`po_unique_id` AS `po_unique_id`,`consignee_details_sub`.`unique_id` AS `con_unique_id`,`consignee_details_sub`.`con_address` AS `con_address`,`consignee_details_sub`.`con_district` AS `con_district`,`consignee_details_sub`.`con_pincode` AS `con_pincode`,`consignee_details_sub`.`con_contact_name` AS `con_contact_name`,`consignee_details_sub`.`con_contact_number` AS `con_contact_number`,`consignee_details_sub`.`con_lan_num` AS `con_lan_num`,`consignee_details_sub`.`zone` AS `zone`,`consignee_details_sub`.`batch_id` AS `batch_id`,`consignee_details_sub`.`batch_entry_date` AS `batch_entry_date`,`consignee_details_sub`.`po_number` AS `po_number`,`consignee_details_sub`.`is_delete` AS `is_delete` from (`po_form` join `consignee_details_sub` on(`po_form`.`unique_id` = `consignee_details_sub`.`form_main_unique_id` and `consignee_details_sub`.`is_delete` = '0')) where `po_form`.`is_delete` = 0 and `po_form`.`is_active` = 1;

DROP VIEW IF EXISTS `view_po_consignee_deatail1`;
CREATE OR REPLACE ALGORITHM=UNDEFINED DEFINER=`root`@`localhost` SQL SECURITY DEFINER VIEW `view_po_consignee_deatail1` AS select `po_form`.`unique_id` AS `main_unique_id`,`po_form`.`po_unique_id` AS `po_unique_id`,`consignee_details_sub`.`unique_id` AS `con_unique_id`,`consignee_details_sub`.`con_address` AS `con_address`,`consignee_details_sub`.`con_district` AS `con_district`,`consignee_details_sub`.`con_pincode` AS `con_pincode`,`consignee_details_sub`.`con_contact_name` AS `con_contact_name`,`consignee_details_sub`.`con_contact_number` AS `con_contact_number`,`consignee_details_sub`.`con_lan_num` AS `con_lan_num` from (`po_form` join `consignee_details_sub` on(`po_form`.`unique_id` = `consignee_details_sub`.`form_main_unique_id`)) where `po_form`.`is_delete` = 0 and `po_form`.`is_active` = 1;

DROP VIEW IF EXISTS `view_po_count_value`;
CREATE OR REPLACE ALGORITHM=UNDEFINED DEFINER=`root`@`localhost` SQL SECURITY DEFINER VIEW `view_po_count_value` AS select `po`.`unique_id` AS `unique_id`,`po`.`acc_year` AS `acc_year`,`po`.`po_num` AS `po_num`,count(`po`.`unique_id`) AS `count`,sum(`sub`.`total_value`) AS `invoice_value` from (`view_po_form_list` `po` join `view_product_details_list` `sub` on(`po`.`unique_id` = `sub`.`form_main_unique_id` and `sub`.`is_delete` = '0')) where `po`.`is_delete` = 0 and `po`.`file_name` <> '' or `po`.`file_name` <> '' group by `po`.`unique_id`;

DROP VIEW IF EXISTS `view_po_form_list`;
CREATE OR REPLACE ALGORITHM=UNDEFINED DEFINER=`root`@`localhost` SQL SECURITY DEFINER VIEW `view_po_form_list` AS select `po`.`id` AS `id`,`po`.`unique_id` AS `unique_id`,`po`.`type_of_po` AS `type_of_po`,`po`.`po_num` AS `po_num`,`po`.`po_date` AS `po_date`,`get_department_name`(`po`.`department`) AS `department`,`po`.`gst_option` AS `gst_option`,`po`.`gst_value` AS `gst_value`,`po`.`total_qty` AS `total_qty`,`po`.`total_amount` AS `total_amount`,`po`.`executive_name` AS `executive_name_unique_id`,`get_executive_name`(`po`.`executive_name`) AS `executive_name`,`po`.`bill_address` AS `bill_address`,`po`.`contact_name` AS `contact_name`,`po`.`contact_number` AS `contact_number`,`po`.`email` AS `email`,`get_state_name`(`po`.`state_name`) AS `state_name`,`get_district_name`(`po`.`district`) AS `district`,`po`.`pin` AS `pin`,`po`.`po_prepared_by` AS `po_prepared_by`,`po`.`delivery_due_dates` AS `delivery_due_dates`,`po`.`no_of_po` AS `no_of_po`,`po`.`ld_per_day` AS `ld_per_day`,`po`.`ld_maximum_val` AS `ld_maximum_val`,`po`.`warranty` AS `warranty`,`po`.`warranty_duration` AS `warranty_duration`,`po`.`ins_reqired` AS `ins_reqired`,`po`.`bg` AS `bg`,`po`.`bg_month` AS `bg_month`,`po`.`acc_year` AS `acc_year`,`po`.`file_name` AS `file_name`,`po`.`file_org_name` AS `file_org_name`,`po`.`no_of_consignee` AS `no_of_consignee`,`po`.`status` AS `status`,`po`.`proceed_bg` AS `proceed_bg`,`po`.`dc_required` AS `dc_required`,`po`.`dc_status_bill` AS `dc_status_bill`,`po`.`sess_user_type` AS `sess_user_type`,`po`.`is_active` AS `is_active`,`po`.`is_delete` AS `is_delete`,`po`.`po_unique_id` AS `po_unique_id`,`po`.`ld_required` AS `ld_required`,`po`.`amc_required` AS `amc_required` from `po_form` `po` where `po`.`is_delete` = '0' order by `po`.`unique_id` desc;

DROP VIEW IF EXISTS `view_po_ledger_list`;
CREATE OR REPLACE ALGORITHM=UNDEFINED DEFINER=`root`@`localhost` SQL SECURITY DEFINER VIEW `view_po_ledger_list` AS select `po`.`department` AS `department`,`po`.`unique_id` AS `department_unique_id`,`sub`.`ledger_name` AS `ledger_name`,`sub`.`ledger_no` AS `ledger_no`,`sub`.`unique_id` AS `unique_id` from (`department_creation` `po` join `department_creation_sublist` `sub` on(`po`.`unique_id` = `sub`.`form_main_unique_id` and `sub`.`is_delete` = '0')) where `po`.`is_delete` = '0' and `sub`.`ledger_name` <> '';

DROP VIEW IF EXISTS `view_po_product_deatail`;
CREATE OR REPLACE ALGORITHM=UNDEFINED DEFINER=`root`@`localhost` SQL SECURITY DEFINER VIEW `view_po_product_deatail` AS select `po_form`.`unique_id` AS `main_unique_id`,`po_form`.`po_unique_id` AS `po_unique_id`,`product_details_sub`.`unique_id` AS `product_unique_id`,`product_details_sub`.`item_code` AS `item_code`,`product_details_sub`.`product` AS `product_name`,`product_details_sub`.`qty` AS `qty`,`product_details_sub`.`unit_price` AS `unit_price`,`product_details_sub`.`tax` AS `tax`,`consignee_details_sub`.`unique_id` AS `con_unique_id`,`po_product_assign_details`.`assign_qty` AS `assign_qty` from (((`po_form` join `product_details_sub` on(`po_form`.`unique_id` = `product_details_sub`.`form_main_unique_id` and `product_details_sub`.`is_delete` = '0')) join `consignee_details_sub` on(`po_form`.`unique_id` = `consignee_details_sub`.`form_main_unique_id` and `consignee_details_sub`.`is_delete` = '0')) join `po_product_assign_details` on(`consignee_details_sub`.`unique_id` = `po_product_assign_details`.`con_unique_id` and `product_details_sub`.`unique_id` = `po_product_assign_details`.`product_unique_id` and `po_product_assign_details`.`is_delete` = '0')) where `po_form`.`is_delete` = 0;

DROP VIEW IF EXISTS `view_po_wise_list`;
CREATE OR REPLACE ALGORITHM=UNDEFINED DEFINER=`root`@`localhost` SQL SECURITY DEFINER VIEW `view_po_wise_list` AS select `po`.`unique_id` AS `po_unique_id`,`po`.`po_num` AS `po_num`,`po`.`po_date` AS `po_date`,`po`.`department` AS `department`,`po`.`gst_value` AS `gst`,`po`.`executive_name` AS `executive_name`,`po_assgn`.`con_name` AS `con_name`,`pro_sub`.`warranty_duration` AS `warranty_duration`,`cons`.`billing_address` AS `cons_billing_address`,`cons`.`con_branch` AS `con_branch`,`cons`.`con_branch_code` AS `con_branch_code`,`cons`.`con_address` AS `con_address`,`cons`.`con_district` AS `con_district`,`cons`.`con_state_name` AS `con_state`,`cons`.`con_pincode` AS `con_pincode`,`cons`.`zone` AS `zone`,`cons`.`zone_code` AS `zone_code`,`cons`.`con_contact_number` AS `con_contact_no`,`cons`.`con_lan_num` AS `con_lan_num`,`cons`.`con_contact_name` AS `contact_name`,`cons`.`alter_contact_name` AS `alter_contact_name`,`get_staff_name_with_staff_id`(`cons`.`assign_team_member`) AS `cons_followed_by`,`cons`.`alter_number` AS `alter_number`,`cons`.`cons_email_id` AS `cons_email_id`,`cons`.`consignee_received_date` AS `consignee_received_date`,`cons`.`consignee_gst` AS `consignee_gst`,`cons`.`consignee_received_date` AS `consignee_batch_date`,`cons`.`billing_gst_no` AS `billing_gst_no`,`cons`.`region` AS `region`,`po_assgn`.`con_assign_team_member` AS `con_assign_team_member`,`po_assgn`.`item_code` AS `item_code`,`po_assgn`.`product` AS `product`,`po_assgn`.`qty` AS `qty`,`po_assgn`.`assign_qty` AS `assign_qty`,`inv`.`dc_num` AS `dc_num`,`inv`.`dc_date` AS `dc_date`,`inv`.`invoice_no` AS `invoice_no`,`inv`.`invoice_date` AS `invoice_date`,`inv`.`invoice_qty` AS `invoice_qty`,`inv`.`ser_no` AS `serial_no`,`dsl`.`name_of_courier` AS `courier_name`,`dsl`.`pod_no` AS `pod_no`,`dsl`.`dispatch_date` AS `dispatch_date`,`dsl`.`delivery_status` AS `delivery_status`,`dsl`.`delivery_date` AS `delivery_date`,`ins_sub`.`dc_received_sts` AS `dc_received_sts`,`ins_sub`.`dc_cus_signed_date` AS `dc_cus_signed_date`,`ins_sub`.`ir_rec_status` AS `ir_rec_status`,`ins_sub`.`ir_cus_signed_date` AS `ir_cus_signed_date`,`ins_sub`.`snr_rec_status` AS `snr_rec_status`,`ins_sub`.`snr_cus_signed_date` AS `snr_cus_signed_date`,`inv_main`.`bulk_eng_type` AS `eng_type`,`get_outsource_engineer_name`(`inv_main`.`bulk_eng_name`) AS `eng_name`,`inv_main`.`vendor_bulk_rate` AS `vendor_bulk_rate`,`inv_main`.`vendor_bulk_gst` AS `vendor_bulk_gst`,`inv_main`.`bulk_total_amount` AS `bulk_total_amount`,`item_sub`.`warranty_in_yrs` AS `item_warranty` from ((((((((`po_product_assign_details` `po_assgn` left join `po_form` `po` on(`po_assgn`.`form_main_unique_id` = `po`.`unique_id` and `po`.`is_delete` = 0)) left join `consignee_details_sub` `cons` on(`po_assgn`.`con_unique_id` = `cons`.`unique_id` and `cons`.`is_delete` = 0)) left join `invoice_creation` `inv` on(`po_assgn`.`form_main_unique_id` = `inv`.`po_unique_id` and `inv`.`is_delete` = 0 and `po_assgn`.`con_unique_id` = `inv`.`consignee_id` and `po_assgn`.`product_unique_id` = `inv`.`product_unique_id`)) left join `dispatch_list` `dsl` on(`inv`.`po_unique_id` = `dsl`.`po_form_unique_id` and `inv`.`invoice_no` = `dsl`.`invoice_no` and `inv`.`dc_num` = `dsl`.`dc_number` and `dsl`.`is_delete` = 0 and `inv`.`is_delete` = 0)) left join `installation_details` `ins_sub` on(`dsl`.`po_form_unique_id` = `ins_sub`.`po_form_unique_id` and `dsl`.`invoice_no` = `ins_sub`.`invoice_no` and `dsl`.`dc_number` = `ins_sub`.`dc_number` and `ins_sub`.`is_delete` = 0)) left join `invoice_creation_main` `inv_main` on(`dsl`.`po_form_unique_id` = `inv_main`.`form_main_unique_id` and `dsl`.`invoice_no` = `inv_main`.`invoice_no` and `dsl`.`dc_number` = `inv_main`.`dc_number` and `inv_main`.`is_delete` = '0')) left join `product_details_sub` `pro_sub` on(`po_assgn`.`product_unique_id` = `pro_sub`.`unique_id` and `pro_sub`.`is_delete` = 0)) left join `item_creation_sub` `item_sub` on(`pro_sub`.`item_code` = `item_sub`.`unique_id` and `item_sub`.`is_delete` = 0)) where `po`.`is_delete` = 0 and `po_assgn`.`assign_qty` > 0;

DROP VIEW IF EXISTS `view_product_assign_con_details`;
CREATE OR REPLACE ALGORITHM=UNDEFINED DEFINER=`root`@`localhost` SQL SECURITY DEFINER VIEW `view_product_assign_con_details` AS select `con_sub`.`form_main_unique_id` AS `form_main_unique_id`,`con_sub`.`unique_id` AS `con_unique_id`,`con_sub`.`con_address` AS `con_address`,`con_sub`.`billing_address` AS `billing_address`,`con_sub`.`con_district` AS `con_district`,`con_sub`.`con_contact_name` AS `con_contact_name`,`con_sub`.`con_contact_number` AS `con_contact_number`,`con_sub`.`con_pincode` AS `con_pincode`,`con_sub`.`no_of_consignee` AS `no_of_consignee`,`con_sub`.`assign_team_member` AS `assign_team_member`,`stk_po`.`no_of_item` AS `no_of_item`,`stk_po`.`executive_name` AS `executive_name`,`stk_po`.`po_num` AS `po_num`,`stk_po`.`po_date` AS `po_date`,`stk_po`.`po_unique_id` AS `po_unique_id`,`stk_po`.`stock_id` AS `stock_id`,`stk_po`.`stock_date` AS `stock_date`,`stk_po`.`stock_qty` AS `stock_qty`,`stk_po`.`billed_qty` AS `billed_qty`,`stk_po`.`remaining_qty` AS `remaining_qty`,`stk_po`.`unique_id` AS `unique_id`,`stk_po`.`is_delete` AS `is_delete`,`po_assign`.`assign_qty` AS `assign_qty`,`po_assign`.`status` AS `status`,`po_assign`.`batch_id` AS `batch_id`,`po_assign`.`con_unique_id` AS `consignee_unique_id`,`po_assign`.`unit_price` AS `unit_price`,`product_sub`.`net_price` AS `net_price`,`po_assign`.`product_unique_id` AS `product_unique_id`,`po_assign`.`item_code` AS `item_code`,`po_assign`.`product` AS `product`,`po_assign`.`qty` AS `qty` from (((`stock_position` `stk_po` join `consignee_details_sub` `con_sub` on(`con_sub`.`form_main_unique_id` = `stk_po`.`form_main_unique_id` and `con_sub`.`is_delete` = '0')) join `product_details_sub` `product_sub` on(`stk_po`.`form_main_unique_id` = `product_sub`.`form_main_unique_id` and `stk_po`.`product_unique_id` = `product_sub`.`unique_id` and `product_sub`.`is_delete` = '0')) join `po_product_assign_details` `po_assign` on(`stk_po`.`form_main_unique_id` = `po_assign`.`form_main_unique_id` and `con_sub`.`unique_id` = `po_assign`.`con_unique_id` and `stk_po`.`product_unique_id` = `po_assign`.`product_unique_id` and `po_assign`.`is_delete` = '0')) where `stk_po`.`is_delete` = '0';

DROP VIEW IF EXISTS `view_product_details_list`;
CREATE OR REPLACE ALGORITHM=UNDEFINED DEFINER=`root`@`localhost` SQL SECURITY DEFINER VIEW `view_product_details_list` AS select `product`.`id` AS `id`,`product`.`unique_id` AS `unique_id`,`product`.`form_main_unique_id` AS `form_main_unique_id`,`product`.`no_of_items` AS `no_of_items`,`product`.`tender_code` AS `tender_code`,`product`.`item_code` AS `item_code`,`product`.`product` AS `product`,`product`.`qty` AS `qty`,`product`.`unit_price` AS `unit_price`,`product`.`tax` AS `tax`,`product`.`acc_year` AS `acc_year`,`product`.`total_value` AS `total_value`,`product`.`net_value` AS `net_value`,`product`.`rem_qty` AS `rem_qty`,`product`.`assign_qty` AS `assign_qty`,`product`.`billed_qty` AS `billed_qty`,`product`.`con_serial_no` AS `con_serial_no`,`product`.`assign_int_val` AS `assign_int_val`,`product`.`delivery_due_dates` AS `delivery_due_dates`,`product`.`sess_user_type` AS `sess_user_type`,`product`.`is_active` AS `is_active`,`product`.`is_delete` AS `is_delete` from `product_details_sub` `product` where `product`.`is_delete` = '0';

DROP VIEW IF EXISTS `view_pur_stock_pending_count`;
CREATE OR REPLACE ALGORITHM=UNDEFINED DEFINER=`root`@`localhost` SQL SECURITY DEFINER VIEW `view_pur_stock_pending_count` AS select `view_po_form_list`.`acc_year` AS `acc_year`,`view_po_form_list`.`status` AS `status`,`product`.`form_main_unique_id` AS `po_count1`,round(sum(cast(`product`.`total_value` as decimal(10,2))),2) AS `value1` from (`view_po_form_list` left join `view_product_details_list` `product` on(`view_po_form_list`.`unique_id` = `product`.`form_main_unique_id`)) where `view_po_form_list`.`status` = '0' and `view_po_form_list`.`file_name` <> '' group by `view_po_form_list`.`unique_id`;

DROP VIEW IF EXISTS `view_report_on_customer`;
CREATE OR REPLACE ALGORITHM=UNDEFINED DEFINER=`root`@`localhost` SQL SECURITY DEFINER VIEW `view_report_on_customer` AS select `po_form`.`unique_id` AS `unique_id`,`po_form`.`po_date` AS `po_date`,`po_form`.`executive_name` AS `executive_name`,`po_form`.`department` AS `department`,`po_form`.`po_num` AS `po_num`,`po_form`.`no_of_consignee` AS `no_of_consignee`,sum(`product_details_sub`.`qty`) AS `total_qty`,sum(`product_details_sub`.`total_value`) AS `with_tax_amount`,sum(`product_details_sub`.`net_value`) AS `without_tax_amount` from (`po_form` join `product_details_sub` on(`po_form`.`unique_id` = `product_details_sub`.`form_main_unique_id` and `product_details_sub`.`is_delete` = '0')) where `po_form`.`is_delete` = '0' group by `po_form`.`unique_id`,`po_form`.`po_num`,`po_form`.`po_date`,`po_form`.`executive_name`,`po_form`.`department`,`po_form`.`no_of_consignee`;

DROP VIEW IF EXISTS `view_report_on_excutive`;
CREATE OR REPLACE ALGORITHM=UNDEFINED DEFINER=`root`@`localhost` SQL SECURITY DEFINER VIEW `view_report_on_excutive` AS select `po_form`.`unique_id` AS `unique_id`,`po_form`.`executive_name` AS `executive_name`,`po_form`.`department` AS `department`,`po_form`.`po_num` AS `po_num`,`po_form`.`no_of_po` AS `no_of_po`,`po_form`.`no_of_consignee` AS `no_of_consignee`,`product_details_sub`.`form_main_unique_id` AS `form_main_unique_id`,`po_form`.`po_date` AS `po_date`,sum(`product_details_sub`.`qty`) AS `total_qty`,sum(`product_details_sub`.`total_value`) AS `with_tax_amount`,sum(`product_details_sub`.`net_value`) AS `without_tax_amount` from (`po_form` join `product_details_sub` on(`po_form`.`unique_id` = `product_details_sub`.`form_main_unique_id` and `product_details_sub`.`is_delete` = '0')) where `po_form`.`is_delete` = '0' group by `po_form`.`unique_id`,`po_form`.`po_num`,`po_form`.`po_date`,`po_form`.`executive_name`,`po_form`.`department`,`po_form`.`no_of_po`,`po_form`.`no_of_consignee`;

DROP VIEW IF EXISTS `view_report_on_month`;
CREATE OR REPLACE ALGORITHM=UNDEFINED DEFINER=`root`@`localhost` SQL SECURITY DEFINER VIEW `view_report_on_month` AS select `po_form`.`unique_id` AS `unique_id`,`po_form`.`po_num` AS `po_num`,`po_form`.`executive_name` AS `executive_name`,`po_form`.`department` AS `department`,`po_form`.`po_date` AS `po_date`,date_format(`po_form`.`po_date`,'%b-%Y') AS `month`,`po_form`.`no_of_po` AS `no_of_po`,`po_form`.`no_of_consignee` AS `no_of_consignee`,sum(`product_details_sub`.`qty`) AS `qty`,sum(`product_details_sub`.`total_value`) AS `with_tax_amount`,sum(`product_details_sub`.`net_value`) AS `without_tax_amount` from (`po_form` left join `product_details_sub` on(`po_form`.`unique_id` = `product_details_sub`.`form_main_unique_id` and `product_details_sub`.`is_delete` = '0')) where `po_form`.`is_delete` = '0' group by `po_form`.`unique_id`,`po_form`.`executive_name`,`po_form`.`department`,`po_form`.`po_date`,`po_form`.`no_of_po`,`po_form`.`no_of_consignee`,`po_form`.`po_num` order by case when month(`po_form`.`po_date`) = 1 then 1 when month(`po_form`.`po_date`) = 2 then 2 when month(`po_form`.`po_date`) = 3 then 3 when month(`po_form`.`po_date`) = 4 then 4 when month(`po_form`.`po_date`) = 5 then 5 when month(`po_form`.`po_date`) = 6 then 6 when month(`po_form`.`po_date`) = 7 then 7 when month(`po_form`.`po_date`) = 8 then 8 when month(`po_form`.`po_date`) = 9 then 9 when month(`po_form`.`po_date`) = 10 then 10 when month(`po_form`.`po_date`) = 11 then 11 when month(`po_form`.`po_date`) = 12 then 12 end,`po_form`.`po_date`;

DROP VIEW IF EXISTS `view_report_on_po_date`;
CREATE OR REPLACE ALGORITHM=UNDEFINED DEFINER=`root`@`localhost` SQL SECURITY DEFINER VIEW `view_report_on_po_date` AS select `po_form`.`unique_id` AS `unique_id`,`po_form`.`po_num` AS `po_num`,`po_form`.`po_date` AS `po_date`,`po_form`.`executive_name` AS `executive_name`,`po_form`.`department` AS `department`,`po_form`.`no_of_po` AS `no_of_po`,`po_form`.`no_of_consignee` AS `no_of_consignee`,sum(`product_details_sub`.`qty`) AS `qty`,sum(`product_details_sub`.`total_value`) AS `with_tax_amount`,sum(`product_details_sub`.`net_value`) AS `without_tax_amount` from (`po_form` join `product_details_sub` on(`po_form`.`unique_id` = `product_details_sub`.`form_main_unique_id` and `product_details_sub`.`is_delete` = '0')) where `po_form`.`is_delete` = '0' group by `po_form`.`unique_id`,`po_form`.`po_num`,`po_form`.`po_date`,`po_form`.`executive_name`,`po_form`.`department`,`po_form`.`no_of_po`,`po_form`.`no_of_consignee`;

DROP VIEW IF EXISTS `view_report_on_year`;
CREATE OR REPLACE ALGORITHM=UNDEFINED DEFINER=`root`@`localhost` SQL SECURITY DEFINER VIEW `view_report_on_year` AS select `po_form`.`unique_id` AS `unique_id`,`po_form`.`po_num` AS `po_num`,`po_form`.`po_date` AS `po_date`,`po_form`.`department` AS `department`,`po_form`.`bill_address` AS `bill_address`,`po_form`.`executive_name` AS `executive_name`,`po_form`.`no_of_consignee` AS `no_of_consignee`,`po_form`.`no_of_po` AS `no_of_po`,`product_details_sub`.`no_of_items` AS `no_of_items`,concat(case when month(`po_form`.`po_date`) >= 4 then year(`po_form`.`po_date`) else year(`po_form`.`po_date`) - 1 end,'-',case when month(`po_form`.`po_date`) >= 4 then year(`po_form`.`po_date`) + 1 else year(`po_form`.`po_date`) end) AS `year`,sum(`product_details_sub`.`qty`) AS `qty`,sum(`product_details_sub`.`total_value`) AS `with_tax_amount`,sum(`product_details_sub`.`net_value`) AS `without_tax_amount` from (`po_form` join `product_details_sub` on(`po_form`.`unique_id` = `product_details_sub`.`form_main_unique_id` and `product_details_sub`.`is_delete` = '0')) where `po_form`.`is_delete` = '0' group by `po_form`.`unique_id`,`po_form`.`po_num`,`po_form`.`po_date`,`po_form`.`executive_name`,`po_form`.`department`,`po_form`.`no_of_po`,`po_form`.`no_of_consignee`,`po_form`.`bill_address`;

DROP VIEW IF EXISTS `view_sign_doc_list`;
CREATE OR REPLACE ALGORITHM=UNDEFINED DEFINER=`root`@`localhost` SQL SECURITY DEFINER VIEW `view_sign_doc_list` AS select `sign_doc`.`ins_unique_id` AS `ins_unique_id`,`sign_doc`.`bill_status` AS `bill_status`,`sign_doc`.`ir_status` AS `ir_status`,`sign_doc`.`invoice_no` AS `invoice_no` from `sign_doc_verification_detail` `sign_doc` where `sign_doc`.`is_delete` = '0';

DROP VIEW IF EXISTS `view_sign_document_vertification`;
CREATE OR REPLACE ALGORITHM=UNDEFINED DEFINER=`root`@`localhost` SQL SECURITY DEFINER VIEW `view_sign_document_vertification` AS select `po_form`.`po_num` AS `po_num`,`po_form`.`po_date` AS `po_date`,`ins_follow`.`con_contact_name` AS `con_contact_name`,`ins_follow`.`con_address` AS `con_address`,`ins_follow`.`invoice_no` AS `invoice_no`,`ins_follow`.`dc_number` AS `dc_number`,`ins_follow`.`dc_date` AS `dc_date`,`ins_follow`.`invoice_value` AS `invoice_value`,`ins_follow`.`invoice_date` AS `invoice_date`,`ins_follow`.`form_main_unique_id` AS `form_main_unique_id`,`ins_follow`.`consignee_unique_id` AS `consignee_unique_id`,`ins_follow`.`sess_user_type` AS `sess_user_type`,`ins_det`.`unique_id` AS `ins_unique_id`,`ins_det`.`document_verification_status` AS `document_verification_status`,`ins_det1`.`dc_delivery_status` AS `dc_delivery_status`,`ins_det`.`documents_type` AS `dc_status`,`ins_det`.`documents_type1` AS `ir_status`,`ins_det`.`documents_type2` AS `snr_status`,`ins_det`.`dc_file` AS `dc_file`,`ins_det`.`dc_original_name` AS `dc_original_name`,`ins_det`.`dc_cus_signed_date` AS `dc_cus_signed_date`,`ins_det`.`ir_file` AS `ir_file`,`ins_det`.`ir_original_name` AS `ir_original_name`,`ins_det`.`ir_cus_signed_date` AS `ir_cus_signed_date`,`ins_det`.`snr_file` AS `snr_file`,`ins_det`.`acc_year` AS `acc_year`,`ins_det`.`snr_original_name` AS `snr_original_name`,`ins_det`.`snr_cus_signed_date` AS `snr_cus_signed_date`,`dc_ir_doc`.`dc_ir_status` AS `dc_ir_status`,`dc_ir_doc`.`dc_dispatch_mode` AS `dc_dispatch_mode`,`dc_ir_doc`.`ir_dispatch_mode` AS `ir_dispatch_mode`,`dc_ir_doc`.`snr_dispatch_mode` AS `snr_dispatch_mode`,`po_form`.`file_name` AS `po_file`,`po_form`.`department` AS `department`,`po_form`.`file_org_name` AS `po_file_org_name`,`ins_det1`.`dc_required` AS `dc_required`,`po_form`.`dc_status_bill` AS `dc_status_bill`,ifnull(`po_form`.`ins_reqired`,0) AS `ins_reqired`,ifnull(`po_form`.`bank_required`,0) AS `bank_required` from ((((`view_installation_followups` `ins_follow` join `installation_details_sublist` `ins_det` on(`ins_follow`.`form_main_unique_id` = `ins_det`.`po_form_unique_id` and `ins_follow`.`consignee_unique_id` = `ins_det`.`consignee_unique_id` and `ins_follow`.`invoice_no` = `ins_det`.`invoice_no` and `ins_follow`.`dc_number` = `ins_det`.`dc_number` and `ins_det`.`is_delete` = '0')) join `installation_details` `ins_det1` on(`ins_follow`.`form_main_unique_id` = `ins_det1`.`po_form_unique_id` and `ins_follow`.`consignee_unique_id` = `ins_det1`.`consignee_unique_id` and `ins_follow`.`invoice_no` = `ins_det1`.`invoice_no` and `ins_follow`.`dc_number` = `ins_det1`.`dc_number` and `ins_det1`.`is_delete` = '0')) join `dc_ir_doc_dispatch_details` `dc_ir_doc` on(`dc_ir_doc`.`po_form_unique_id` = `ins_follow`.`form_main_unique_id` and `ins_follow`.`consignee_unique_id` = `dc_ir_doc`.`consignee_unique_id` and `ins_follow`.`invoice_no` = `dc_ir_doc`.`invoice_no` and `ins_follow`.`dc_number` = `dc_ir_doc`.`dc_number` and `dc_ir_doc`.`is_delete` = '0')) join `po_form` on(`ins_follow`.`form_main_unique_id` = `po_form`.`unique_id` and `po_form`.`is_delete` = '0')) group by `ins_follow`.`dc_number`,`ins_det`.`unique_id`;

DROP VIEW IF EXISTS `view_sign_document_vertification_with_ins`;
CREATE OR REPLACE ALGORITHM=UNDEFINED DEFINER=`root`@`localhost` SQL SECURITY DEFINER VIEW `view_sign_document_vertification_with_ins` AS select `dispatch_list`.`po_num` AS `po_num`,`dispatch_list`.`po_date` AS `po_date`,`dispatch_list`.`con_contact_name` AS `con_contact_name`,`dispatch_list`.`con_address` AS `con_address`,`dispatch_list`.`invoice_no` AS `invoice_no`,`dispatch_list`.`invoice_date` AS `invoice_date`,`dispatch_list`.`unique_id` AS `form_main_unique_id`,`dispatch_list`.`con_unique_id` AS `con_unique_id`,ifnull(`ins_det`.`document_verification_status`,0) AS `document_verification_status`,ifnull(`ins_det`.`dc_file`,0) AS `dc_file`,ifnull(`ins_det`.`dc_original_name`,0) AS `dc_original_name`,ifnull(`ins_det`.`ir_file`,0) AS `ir_file`,ifnull(`ins_det`.`ir_original_name`,0) AS `ir_original_name`,ifnull(`ins_det`.`snr_file`,0) AS `snr_file`,ifnull(`ins_det`.`snr_original_name`,0) AS `snr_original_name`,ifnull(`po_form`.`file_name`,0) AS `po_file`,ifnull(`po_form`.`file_org_name`,0) AS `po_file_org_name`,ifnull(`po_form`.`ins_reqired`,0) AS `ins_reqired`,ifnull(`po_form`.`bank_required`,0) AS `bank_required` from ((`view_dispatch_list_final` `dispatch_list` join `installation_details` `ins_det` on(`dispatch_list`.`unique_id` = `ins_det`.`po_form_unique_id` and `dispatch_list`.`con_unique_id` = `ins_det`.`consignee_unique_id`)) join `po_form` on(`dispatch_list`.`unique_id` = `po_form`.`unique_id`));

DROP VIEW IF EXISTS `view_sign_document_vertification_with_ir`;
CREATE OR REPLACE ALGORITHM=UNDEFINED DEFINER=`root`@`localhost` SQL SECURITY DEFINER VIEW `view_sign_document_vertification_with_ir` AS select `po_form`.`po_num` AS `po_num`,`po_form`.`po_date` AS `po_date`,`ins_follow`.`con_contact_name` AS `con_contact_name`,`ins_follow`.`con_address` AS `con_address`,`ins_follow`.`invoice_no` AS `invoice_no`,`ins_follow`.`dc_number` AS `dc_number`,`ins_follow`.`dc_date` AS `dc_date`,(select `invoice_creation_main`.`team_mem` from `invoice_creation_main` where `invoice_creation_main`.`dc_number` = `ins_follow`.`dc_number` and `invoice_creation_main`.`invoice_no` = `ins_follow`.`invoice_no`) AS `team_member`,`ins_follow`.`invoice_value` AS `invoice_value`,`ins_follow`.`invoice_date` AS `invoice_date`,`ins_follow`.`form_main_unique_id` AS `form_main_unique_id`,`ins_follow`.`consignee_unique_id` AS `consignee_unique_id`,`ins_follow`.`ledger_name` AS `ledger_name`,`ins_det`.`unique_id` AS `ins_unique_id`,`ins_det`.`document_verification_status` AS `document_verification_status`,`ins_det1`.`dc_delivery_status` AS `dc_delivery_status`,`ins_det`.`documents_type` AS `dc_status`,`ins_det`.`documents_type1` AS `ir_status`,`ins_det`.`documents_type2` AS `snr_status`,`ins_det`.`dc_file` AS `dc_file`,`ins_det`.`dc_original_name` AS `dc_original_name`,`ins_det`.`dc_cus_signed_date` AS `dc_cus_signed_date`,`ins_det`.`ir_file` AS `ir_file`,`ins_det`.`ir_original_name` AS `ir_original_name`,`ins_det`.`ir_cus_signed_date` AS `ir_cus_signed_date`,`ins_det`.`snr_file` AS `snr_file`,`ins_det`.`acc_year` AS `acc_year`,`ins_det`.`snr_original_name` AS `snr_original_name`,`ins_det`.`snr_cus_signed_date` AS `snr_cus_signed_date`,`dc_ir_doc`.`dc_ir_status` AS `dc_ir_status`,`dc_ir_doc`.`dc_dispatch_mode` AS `dc_dispatch_mode`,`dc_ir_doc`.`ir_dispatch_mode` AS `ir_dispatch_mode`,`dc_ir_doc`.`snr_dispatch_mode` AS `snr_dispatch_mode`,`po_form`.`file_name` AS `po_file`,`po_form`.`department` AS `department`,`po_form`.`file_org_name` AS `po_file_org_name`,`ins_det1`.`dc_required` AS `dc_required`,`po_form`.`dc_status_bill` AS `dc_status_bill` from ((((`view_installation_followups` `ins_follow` left join `installation_details_sublist` `ins_det` on(`ins_follow`.`form_main_unique_id` = `ins_det`.`po_form_unique_id` and `ins_follow`.`consignee_unique_id` = `ins_det`.`consignee_unique_id` and `ins_follow`.`invoice_no` = `ins_det`.`invoice_no` and `ins_follow`.`dc_number` = `ins_det`.`dc_number` and `ins_det`.`is_delete` = '0')) left join `installation_details` `ins_det1` on(`ins_follow`.`form_main_unique_id` = `ins_det1`.`po_form_unique_id` and `ins_follow`.`consignee_unique_id` = `ins_det1`.`consignee_unique_id` and `ins_follow`.`invoice_no` = `ins_det1`.`invoice_no` and `ins_follow`.`dc_number` = `ins_det1`.`dc_number` and `ins_det1`.`is_delete` = '0')) left join `dc_ir_doc_dispatch_details` `dc_ir_doc` on(`dc_ir_doc`.`po_form_unique_id` = `ins_follow`.`form_main_unique_id` and `ins_follow`.`consignee_unique_id` = `dc_ir_doc`.`consignee_unique_id` and `ins_follow`.`invoice_no` = `dc_ir_doc`.`invoice_no` and `ins_follow`.`dc_number` = `dc_ir_doc`.`dc_number` and `dc_ir_doc`.`is_delete` = '0')) left join `po_form` on(`ins_follow`.`form_main_unique_id` = `po_form`.`unique_id` and `po_form`.`is_delete` = '0')) where `ins_det`.`document_verification_status` = '0' and `ins_det1`.`dc_delivery_status` = '3' and (`ins_det`.`documents_type1` <> '0' or `ins_det`.`documents_type1` is not null) group by `ins_follow`.`dc_number`;

DROP VIEW IF EXISTS `view_sign_document_vertification_with_snr`;
CREATE OR REPLACE ALGORITHM=UNDEFINED DEFINER=`root`@`localhost` SQL SECURITY DEFINER VIEW `view_sign_document_vertification_with_snr` AS select `po_form`.`po_num` AS `po_num`,`po_form`.`po_date` AS `po_date`,`ins_follow`.`con_contact_name` AS `con_contact_name`,`ins_follow`.`con_address` AS `con_address`,`ins_follow`.`invoice_no` AS `invoice_no`,`ins_follow`.`dc_number` AS `dc_number`,`ins_follow`.`dc_date` AS `dc_date`,(select `invoice_creation_main`.`team_mem` from `invoice_creation_main` where `invoice_creation_main`.`dc_number` = `ins_follow`.`dc_number` and `invoice_creation_main`.`invoice_no` = `ins_follow`.`invoice_no`) AS `team_member`,`ins_follow`.`invoice_value` AS `invoice_value`,`ins_follow`.`invoice_date` AS `invoice_date`,`ins_follow`.`form_main_unique_id` AS `form_main_unique_id`,`ins_follow`.`consignee_unique_id` AS `consignee_unique_id`,`ins_follow`.`ledger_name` AS `ledger_name`,`ins_det`.`unique_id` AS `ins_unique_id`,`ins_det`.`document_verification_status` AS `document_verification_status`,`ins_det`.`dc_delivery_status` AS `dc_delivery_status`,`ins_det`.`documents_type` AS `dc_status`,`ins_det`.`documents_type1` AS `ir_status`,`ins_det`.`documents_type2` AS `snr_status`,`ins_det`.`dc_file` AS `dc_file`,`ins_det`.`dc_original_name` AS `dc_original_name`,`ins_det`.`dc_cus_signed_date` AS `dc_cus_signed_date`,`ins_det`.`ir_file` AS `ir_file`,`ins_det`.`ir_original_name` AS `ir_original_name`,`ins_det`.`ir_cus_signed_date` AS `ir_cus_signed_date`,`ins_det`.`snr_file` AS `snr_file`,`ins_det`.`acc_year` AS `acc_year`,`ins_det`.`snr_original_name` AS `snr_original_name`,`ins_det`.`snr_cus_signed_date` AS `snr_cus_signed_date`,`dc_ir_doc`.`dc_ir_status` AS `dc_ir_status`,`dc_ir_doc`.`dc_dispatch_mode` AS `dc_dispatch_mode`,`dc_ir_doc`.`ir_dispatch_mode` AS `ir_dispatch_mode`,`dc_ir_doc`.`snr_dispatch_mode` AS `snr_dispatch_mode`,`po_form`.`file_name` AS `po_file`,`po_form`.`department` AS `department`,`po_form`.`file_org_name` AS `po_file_org_name`,`po_form`.`dc_required` AS `dc_required`,`po_form`.`dc_status_bill` AS `dc_status_bill`,ifnull(`po_form`.`ins_reqired`,0) AS `ins_reqired` from (((`view_installation_followups` `ins_follow` join `installation_details_sublist` `ins_det` on(`ins_follow`.`form_main_unique_id` = `ins_det`.`po_form_unique_id` and `ins_follow`.`consignee_unique_id` = `ins_det`.`consignee_unique_id` and `ins_follow`.`invoice_no` = `ins_det`.`invoice_no` and `ins_follow`.`dc_number` = `ins_det`.`dc_number` and `ins_det`.`is_delete` = '0')) join `dc_ir_doc_dispatch_details` `dc_ir_doc` on(`dc_ir_doc`.`po_form_unique_id` = `ins_follow`.`form_main_unique_id` and `ins_follow`.`consignee_unique_id` = `dc_ir_doc`.`consignee_unique_id` and `ins_follow`.`invoice_no` = `dc_ir_doc`.`invoice_no` and `ins_follow`.`dc_number` = `dc_ir_doc`.`dc_number` and `ins_det`.`is_delete` = '0')) join `po_form` on(`ins_follow`.`form_main_unique_id` = `po_form`.`unique_id` and `po_form`.`is_delete` = '0')) where `ins_det`.`document_verification_status` = '0' and `ins_det`.`documents_type1` = '0' and `dc_ir_doc`.`dc_dispatch_mode` <> '' and `dc_ir_doc`.`snr_dispatch_mode` <> '' and `dc_ir_doc`.`is_delete` = 0 and `ins_det`.`is_delete` = 0 group by `ins_follow`.`dc_number`;

DROP VIEW IF EXISTS `view_sign_document_vertification_without_ins`;
CREATE OR REPLACE ALGORITHM=UNDEFINED DEFINER=`root`@`localhost` SQL SECURITY DEFINER VIEW `view_sign_document_vertification_without_ins` AS select `dispatch_list`.`po_num` AS `po_num`,`dispatch_list`.`po_date` AS `po_date`,`dispatch_list`.`con_contact_name` AS `con_contact_name`,`dispatch_list`.`con_address` AS `con_address`,`dispatch_list`.`invoice_no` AS `invoice_no`,`dispatch_list`.`invoice_date` AS `invoice_date`,`dispatch_list`.`unique_id` AS `form_main_unique_id`,`dispatch_list`.`con_unique_id` AS `con_unique_id`,ifnull(`po_form`.`file_name`,0) AS `po_file`,ifnull(`po_form`.`file_org_name`,0) AS `po_file_org_name`,ifnull(`po_form`.`ins_reqired`,0) AS `ins_reqired`,ifnull(`po_form`.`bank_required`,0) AS `bank_required` from (`view_dispatch_list_final` `dispatch_list` join `po_form` on(`dispatch_list`.`unique_id` = `po_form`.`unique_id`)) where `po_form`.`ins_reqired` = 'off';

DROP VIEW IF EXISTS `view_sign_final_bg`;
CREATE OR REPLACE ALGORITHM=UNDEFINED DEFINER=`root`@`localhost` SQL SECURITY DEFINER VIEW `view_sign_final_bg` AS select `bg_select1`.`po_num` AS `po_num`,`bg_select1`.`po_unique_id` AS `po_unique_id`,`bg_select1`.`form_main_unique_id` AS `form_main_unique_id`,`bg_select1`.`po_date` AS `po_date`,`bg_select1`.`invoice_no` AS `invoice_no`,`bg_select1`.`invoice_date` AS `invoice_date`,`bg_select1`.`ledger_name` AS `ledger_name`,`bg_select1`.`executive_name` AS `executive_name`,`bg_select1`.`acc_year` AS `acc_year`,`bg_select1`.`invoice_qty` AS `invoice_qty`,`bg_select1`.`invoice_value` AS `invoice_value`,`bg_select1`.`bank_required` AS `bank_required`,`bg_select1`.`bg_percentage` AS `bg_percentage`,`bg_select1`.`bg_month` AS `bg_month`,`bg_select1`.`bg_status` AS `bg_status`,`bg_select2`.`with_bg` AS `with_bg`,`bg_select2`.`status_app` AS `status_app` from (`view_sign_with_bg` `bg_select1` join `view_sign_without_bg` `bg_select2` on(`bg_select2`.`form_main_unique_id` = `bg_select1`.`form_main_unique_id` and `bg_select2`.`invoice_no` = `bg_select1`.`invoice_no`)) group by `bg_select1`.`invoice_no`;

DROP VIEW IF EXISTS `view_sign_with_bg`;
CREATE OR REPLACE ALGORITHM=UNDEFINED DEFINER=`root`@`localhost` SQL SECURITY DEFINER VIEW `view_sign_with_bg` AS select `po`.`po_num` AS `po_num`,`inv`.`po_unique_id` AS `po_unique_id`,`inv`.`form_main_unique_id` AS `form_main_unique_id`,`po`.`po_date` AS `po_date`,`inv`.`invoice_no` AS `invoice_no`,`inv`.`invoice_date` AS `invoice_date`,`inv`.`ledger_name` AS `ledger_name`,`inv`.`executive_name` AS `executive_name`,`inv`.`invoice_qty` AS `invoice_qty`,`inv`.`invoice_value` AS `invoice_value`,`inv`.`acc_year` AS `acc_year`,`sign`.`inv_verify_status` AS `inv_verify_status`,`sign`.`inv_verify_approvedby` AS `inv_verify_approvedby`,`sign`.`bg_status` AS `bg_status`,`po`.`ins_reqired` AS `ins_reqired`,`po`.`bank_required` AS `bank_required`,`latest_product`.`bg_percen` AS `bg_percentage`,`latest_product`.`bg_month` AS `bg_month` from ((((select `invoice_creation_main`.`invoice_no` AS `invoice_no`,`invoice_creation_main`.`form_main_unique_id` AS `form_main_unique_id`,`invoice_creation_main`.`po_unique_id` AS `po_unique_id`,`invoice_creation_main`.`invoice_date` AS `invoice_date`,`invoice_creation_main`.`ledger_name` AS `ledger_name`,`invoice_creation_main`.`executive_name` AS `executive_name`,sum(`invoice_creation_main`.`invoice_qty`) AS `invoice_qty`,sum(`invoice_creation_main`.`invoice_value`) AS `invoice_value`,`invoice_creation_main`.`acc_year` AS `acc_year`,`invoice_creation_main`.`consignee_unique_id` AS `consignee_unique_id` from `invoice_creation_main` where `invoice_creation_main`.`is_delete` = '0' group by `invoice_creation_main`.`invoice_no`) `inv` join `po_form` `po` on(`inv`.`form_main_unique_id` = `po`.`unique_id` and `po`.`is_delete` = '0')) join (select `p1`.`id` AS `id`,`p1`.`unique_id` AS `unique_id`,`p1`.`form_main_unique_id` AS `form_main_unique_id`,`p1`.`screen_unique_id` AS `screen_unique_id`,`p1`.`no_of_items` AS `no_of_items`,`p1`.`tender_code` AS `tender_code`,`p1`.`item_code` AS `item_code`,`p1`.`product` AS `product`,`p1`.`qty` AS `qty`,`p1`.`unit_price` AS `unit_price`,`p1`.`net_price` AS `net_price`,`p1`.`tax` AS `tax`,`p1`.`total_value` AS `total_value`,`p1`.`net_value` AS `net_value`,`p1`.`insta_due_days` AS `insta_due_days`,`p1`.`document_required` AS `document_required`,`p1`.`warranty_starts` AS `warranty_starts`,`p1`.`bg_required` AS `bg_required`,`p1`.`bg_percen` AS `bg_percen`,`p1`.`bg_month` AS `bg_month`,`p1`.`rem_qty` AS `rem_qty`,`p1`.`assign_qty` AS `assign_qty`,`p1`.`billed_qty` AS `billed_qty`,`p1`.`con_serial_no` AS `con_serial_no`,`p1`.`assign_int_val` AS `assign_int_val`,`p1`.`delivery_due_dates` AS `delivery_due_dates`,`p1`.`ld_type` AS `ld_type`,`p1`.`ld_per_day` AS `ld_per_day`,`p1`.`ld_maximum_val` AS `ld_maximum_val`,`p1`.`warranty` AS `warranty`,`p1`.`warranty_duration` AS `warranty_duration`,`p1`.`is_active` AS `is_active`,`p1`.`is_delete` AS `is_delete`,`p1`.`updated` AS `updated`,`p1`.`created` AS `created`,`p1`.`acc_year` AS `acc_year`,`p1`.`session_id` AS `session_id`,`p1`.`sess_user_type` AS `sess_user_type`,`p1`.`sess_user_id` AS `sess_user_id`,`p1`.`sess_company_id` AS `sess_company_id`,`p1`.`sess_branch_id` AS `sess_branch_id` from (`product_details_sub` `p1` join (select `product_details_sub`.`form_main_unique_id` AS `form_main_unique_id`,max(`product_details_sub`.`document_required`) AS `max_doc` from `product_details_sub` where `product_details_sub`.`is_delete` = '0' group by `product_details_sub`.`form_main_unique_id`) `p2` on(`p1`.`form_main_unique_id` = `p2`.`form_main_unique_id` and `p1`.`document_required` = `p2`.`max_doc`)) where `p1`.`is_delete` = '0' and `p1`.`bg_required` = 'yes') `latest_product` on(`latest_product`.`form_main_unique_id` = `inv`.`form_main_unique_id`)) join `sign_doc_verification_detail` `sign` on(`sign`.`form_main_unique_id` = `inv`.`form_main_unique_id` and `sign`.`con_unique_id` = `inv`.`consignee_unique_id` and `sign`.`invoice_no` = `inv`.`invoice_no` and `sign`.`is_delete` = '0')) where `sign`.`inv_verify_status` = '1' group by `inv`.`invoice_no`;

DROP VIEW IF EXISTS `view_sign_without_bg`;
CREATE OR REPLACE ALGORITHM=UNDEFINED DEFINER=`root`@`localhost` SQL SECURITY DEFINER VIEW `view_sign_without_bg` AS select `inv_main`.`form_main_unique_id` AS `form_main_unique_id`,`inv_main`.`invoice_no` AS `invoice_no`,`inv_main`.`invoice_date` AS `invoice_date`,`inv_main`.`acc_year` AS `acc_year`,`sign_doc_details`.`bg_status` AS `bg_status`,`sign_doc_details`.`inv_verify_status` AS `inv_verify_status`,`sign_doc_details`.`status_app` AS `status_app`,`sign_doc_details`.`with_bg` AS `with_bg` from (`invoice_creation_main` `inv_main` join `sign_doc_verification_detail` `sign_doc_details` on(`sign_doc_details`.`form_main_unique_id` = `inv_main`.`form_main_unique_id` and `sign_doc_details`.`con_unique_id` = `inv_main`.`consignee_unique_id` and `sign_doc_details`.`invoice_no` = `inv_main`.`invoice_no` and `sign_doc_details`.`is_delete` = '0')) where `inv_main`.`is_delete` = '0' and `sign_doc_details`.`status_app` = '2' and `sign_doc_details`.`with_bg` = 'on' and `sign_doc_details`.`inv_verify_status` = '1' group by `inv_main`.`invoice_no`;

DROP VIEW IF EXISTS `view_snr_pending_count`;
CREATE OR REPLACE ALGORITHM=UNDEFINED DEFINER=`root`@`localhost` SQL SECURITY DEFINER VIEW `view_snr_pending_count` AS select `install`.`po_num` AS `po_num`,`install`.`acc_year` AS `acc_year`,`install`.`invoice_no` AS `invoice_no`,`install`.`po_form_unique_id` AS `po_form_unique_id`,`install`.`sess_user_type` AS `sess_user_type`,sum(distinct `invoice`.`invoice_value`) AS `invoice_qty_value`,count(distinct `install`.`unique_id`) AS `install_count` from (`installation_details` `install` join `invoice_creation_main` `invoice` on(`invoice`.`invoice_no` = `install`.`invoice_no` and `invoice`.`is_delete` = '0')) where `install`.`is_delete` = '0' and `invoice`.`installation_status` = '1' group by `install`.`po_form_unique_id`;

DROP VIEW IF EXISTS `view_status_invoice_list`;
CREATE OR REPLACE ALGORITHM=UNDEFINED DEFINER=`root`@`localhost` SQL SECURITY DEFINER VIEW `view_status_invoice_list` AS select `stock_position_main`.`unique_id` AS `unique_id`,`stock_position_main`.`form_main_unique_id` AS `form_main_unique_id`,`stock_position_main`.`po_unique_id` AS `po_unique_id`,`stock_position_main`.`po_num` AS `po_num`,`stock_position_main`.`stock_id` AS `stock_id`,`stock_position_main`.`stock_date` AS `stock_date`,`stock_position_main`.`po_date` AS `po_date`,`stock_position_main`.`no_of_con` AS `no_of_con`,`stock_position_main`.`stock_value` AS `stock_value`,`stock_position_main`.`stock_qty` AS `stock_qty`,`stock_position_main`.`department` AS `department`,`stock_position_main`.`billed_qty` AS `billed_qty`,`stock_position_main`.`is_delete` AS `is_delete`,`stock_position_main`.`is_active` AS `is_active`,case when `stock_position_main`.`stock_qty` = sum(`stock_position_main`.`billed_qty`) then '1' end AS `inv_status` from `stock_position_main` group by `stock_position_main`.`form_main_unique_id`;

DROP VIEW IF EXISTS `view_stock_completed_list`;
CREATE OR REPLACE ALGORITHM=UNDEFINED DEFINER=`root`@`localhost` SQL SECURITY DEFINER VIEW `view_stock_completed_list` AS select `spm`.`unique_id` AS `unique_id`,`spm`.`form_main_unique_id` AS `form_main_unique_id`,`spm`.`po_unique_id` AS `po_unique_id`,`spm`.`po_num` AS `po_num`,`spm`.`stock_id` AS `stock_id`,`spm`.`stock_date` AS `stock_date`,`spm`.`po_date` AS `po_date`,`spm`.`no_of_con` AS `no_of_con`,`spm`.`no_of_item` AS `no_of_item`,`spm`.`executive_name` AS `executive_name`,sum(`spm`.`stock_qty`) AS `stock_qty`,sum(`spm`.`stock_value`) AS `stock_value_old`,`spm`.`department` AS `department`,sum(`spm`.`billed_qty`) AS `billed_qty`,`spm`.`status` AS `status`,`spm`.`part_no` AS `part_no`,`spm`.`is_delete` AS `is_delete`,`spm`.`batch_id` AS `batch_id`,`pf`.`district` AS `district`,`pf`.`executive_name` AS `executive_name_unique_id`,`pf`.`state_name` AS `state_name`,`pf`.`total_amount` AS `stock_value` from (`stock_position_main` `spm` left join `po_form` `pf` on(`spm`.`form_main_unique_id` = `pf`.`unique_id`)) where `spm`.`is_delete` = 0 and `pf`.`status` = '2' group by `spm`.`form_main_unique_id`;

DROP VIEW IF EXISTS `view_stock_count_value`;
CREATE OR REPLACE ALGORITHM=UNDEFINED DEFINER=`root`@`localhost` SQL SECURITY DEFINER VIEW `view_stock_count_value` AS select `stock`.`acc_year` AS `acc_year`,`stock`.`form_main_unique_id` AS `form_main_unique_id`,`stock`.`remaining_qty` AS `remaining_qty`,`stock`.`stock_qty` AS `stock_qty`,`po`.`sess_user_type` AS `sess_user_type`,sum(`stock`.`remaining_qty` * `stock`.`unit_price` + `stock`.`remaining_qty` * `stock`.`unit_price` * (`stock`.`product_tax` / 100)) AS `value` from (`stock_position` `stock` join `po_form` `po` on(`stock`.`form_main_unique_id` = `po`.`unique_id` and `po`.`is_delete` = '0')) where `stock`.`is_delete` = '0' and `po`.`status` = '1' group by `po`.`unique_id`;

DROP VIEW IF EXISTS `view_stock_position_com_list`;
CREATE OR REPLACE ALGORITHM=UNDEFINED DEFINER=`root`@`localhost` SQL SECURITY DEFINER VIEW `view_stock_position_com_list` AS select `po_form`.`unique_id` AS `unique_id`,`po_form`.`po_unique_id` AS `po_unique_id`,`po_form`.`po_num` AS `po_num`,`po_form`.`po_date` AS `po_date`,`po_form`.`department` AS `department`,`po_form`.`bill_address` AS `bill_address`,`po_form`.`contact_name` AS `contact_name`,`po_form`.`contact_number` AS `contact_number`,`po_form`.`email` AS `email`,`po_form`.`district` AS `district`,`po_form`.`state_name` AS `state_name`,`po_form`.`executive_name` AS `executive_name`,`po_form`.`no_of_po` AS `no_of_po`,`po_form`.`no_of_consignee` AS `no_of_consignee`,`po_form`.`delivery_due_dates` AS `delivery_due_dates`,`po_form`.`status` AS `status`,`po_form`.`is_delete` AS `is_delete`,sum(`product_details_sub`.`qty`) AS `qty`,sum(`product_details_sub`.`total_value`) AS `net_value` from (`po_form` join `product_details_sub` on(`po_form`.`unique_id` = `product_details_sub`.`form_main_unique_id` and `product_details_sub`.`is_delete` = '0')) where `po_form`.`is_delete` = 0 and `po_form`.`unique_id` <> '' group by `po_form`.`unique_id`;

DROP VIEW IF EXISTS `view_stock_position_list`;
CREATE OR REPLACE ALGORITHM=UNDEFINED DEFINER=`root`@`localhost` SQL SECURITY DEFINER VIEW `view_stock_position_list` AS select `po_form`.`unique_id` AS `unique_id`,`po_form`.`po_unique_id` AS `po_unique_id`,`po_form`.`po_num` AS `po_num`,`po_form`.`po_date` AS `po_date`,`po_form`.`bill_address` AS `bill_address`,`po_form`.`contact_number` AS `contact_number`,`po_form`.`email` AS `email`,`po_form`.`contact_name` AS `contact_name`,`po_form`.`department` AS `department`,`po_form`.`district` AS `cusdistrict`,`po_form`.`state_name` AS `cusstate_name`,`po_form`.`executive_name` AS `executive_name`,`po_form`.`no_of_po` AS `no_of_po`,`po_form`.`no_of_consignee` AS `no_of_consignee`,`po_form`.`delivery_due_dates` AS `delivery_due_dates`,`po_form`.`status` AS `status`,`po_form`.`is_delete` AS `is_delete`,`po_form`.`acc_year` AS `acc_year`,sum(`product_details_sub`.`qty`) AS `qty`,sum(`product_details_sub`.`total_value`) AS `net_value`,min(cast(`product_details_sub`.`delivery_due_dates` as unsigned)) AS `product_due_days` from (`po_form` join `product_details_sub` on(`po_form`.`unique_id` = `product_details_sub`.`form_main_unique_id` and `product_details_sub`.`is_delete` = '0')) where `po_form`.`is_delete` = 0 and `po_form`.`unique_id` <> '' and `po_form`.`status` <> '2' group by `po_form`.`unique_id`;

DROP VIEW IF EXISTS `view_stock_position_list_1`;
CREATE OR REPLACE ALGORITHM=UNDEFINED DEFINER=`root`@`localhost` SQL SECURITY DEFINER VIEW `view_stock_position_list_1` AS select `po_form`.`unique_id` AS `unique_id`,`po_form`.`po_unique_id` AS `po_unique_id`,`po_form`.`po_num` AS `po_num`,`po_form`.`po_date` AS `po_date`,`po_form`.`department` AS `department`,`po_form`.`executive_name` AS `executive_name`,`po_form`.`no_of_po` AS `no_of_po`,`po_form`.`no_of_consignee` AS `no_of_consignee`,`po_form`.`status` AS `status`,`po_form`.`is_delete` AS `is_delete`,sum(`product_details_sub`.`qty`) AS `qty`,sum(`product_details_sub`.`net_value`) AS `net_value` from (`po_form` join `product_details_sub` on(`po_form`.`unique_id` = `product_details_sub`.`form_main_unique_id`)) where `po_form`.`is_delete` = '0' and `po_form`.`unique_id` <> '' group by `po_form`.`unique_id`;

DROP VIEW IF EXISTS `view_stock_position_pro_sub`;
CREATE OR REPLACE ALGORITHM=UNDEFINED DEFINER=`root`@`localhost` SQL SECURITY DEFINER VIEW `view_stock_position_pro_sub` AS select `a`.`unique_id` AS `unique_id`,`a`.`po_unique_id` AS `po_unique_id`,`a`.`po_num` AS `po_num`,`a`.`po_date` AS `po_date`,`a`.`department` AS `department`,`a`.`executive_name` AS `executive_name`,`a`.`no_of_po` AS `no_of_po`,`a`.`no_of_consignee` AS `no_of_consignee`,`a`.`status` AS `status`,`b`.`stock_qty` AS `stock_qty`,`b`.`product` AS `product`,`b`.`product_unique_id` AS `product_unique_id` from (`po_form` `a` join `stock_position` `b` on(`a`.`unique_id` = `b`.`form_main_unique_id`)) where `a`.`is_delete` = 0 and `b`.`is_delete` = 0;

DROP VIEW IF EXISTS `view_stock_position_pro_sub1`;
CREATE OR REPLACE ALGORITHM=UNDEFINED DEFINER=`root`@`localhost` SQL SECURITY DEFINER VIEW `view_stock_position_pro_sub1` AS select `a`.`unique_id` AS `unique_id`,`a`.`po_num` AS `po_num`,`b`.`stock_id` AS `stock_id`,`b`.`stock_date` AS `stock_date` from (`po_form` `a` join `stock_position` `b` on(`a`.`unique_id` = `b`.`form_main_unique_id`)) where `a`.`is_delete` = 0 and `b`.`is_delete` = 0 group by `a`.`unique_id`;

DROP VIEW IF EXISTS `view_stock_position_processing`;
CREATE OR REPLACE ALGORITHM=UNDEFINED DEFINER=`root`@`localhost` SQL SECURITY DEFINER VIEW `view_stock_position_processing` AS select `a`.`unique_id` AS `unique_id`,`a`.`po_unique_id` AS `po_unique_id`,`a`.`po_num` AS `po_num`,`a`.`po_date` AS `po_date`,`a`.`department` AS `department`,`a`.`executive_name` AS `executive_name`,`a`.`no_of_po` AS `no_of_po`,`a`.`no_of_consignee` AS `no_of_consignee`,`a`.`status` AS `status`,`a`.`stock_qty` AS `stock_qty`,`a`.`product` AS `product`,`a`.`product_unique_id` AS `product_unique_id`,`b`.`stock_id` AS `stock_id`,`b`.`stock_date` AS `stock_date` from (`view_stock_position_pro_sub` `a` join `view_stock_position_pro_sub1` `b` on(`a`.`unique_id` = `b`.`unique_id`));

DROP VIEW IF EXISTS `view_stock_qty`;
CREATE OR REPLACE ALGORITHM=UNDEFINED DEFINER=`root`@`localhost` SQL SECURITY DEFINER VIEW `view_stock_qty` AS select `stock`.`acc_year` AS `acc_year`,`stock`.`form_main_unique_id` AS `form_main_unique_id`,`stock`.`stock_qty` AS `stock_qty`,`stock`.`billed_qty` AS `billed_qty`,`stock`.`sess_user_type` AS `sess_user_type`,round(sum(cast(`stock`.`stock_value` as decimal(10,2))),2) AS `stock_value` from `stock_position_main` `stock` where `stock`.`is_delete` = '0' and `stock`.`billed_qty` is null group by `stock`.`form_main_unique_id`;

DROP VIEW IF EXISTS `view_total_ld_invoice_count`;
CREATE OR REPLACE ALGORITHM=UNDEFINED DEFINER=`root`@`localhost` SQL SECURITY DEFINER VIEW `view_total_ld_invoice_count` AS select `invoice`.`po_unique_id` AS `po_count`,`invoice`.`acc_year` AS `acc_year`,count(distinct `invoice`.`unique_id`) AS `total_invoice_count` from `invoice_creation` `invoice` where `invoice`.`invoice_no` <> '' and `invoice`.`is_delete` = '0';

DROP VIEW IF EXISTS `view_vendor_approval_list`;
CREATE OR REPLACE ALGORITHM=UNDEFINED DEFINER=`root`@`localhost` SQL SECURITY DEFINER VIEW `view_vendor_approval_list` AS select `ivt`.`unique_id` AS `unique_id`,`vpd`.`main_unique_id` AS `venunique_id`,`ivt`.`invoice_no` AS `invoice_no`,`ivt`.`invoice_date` AS `invoice_date`,`ivt`.`dc_number` AS `dc_number`,`ivt`.`dc_date` AS `dc_date`,`ivt`.`po_num` AS `po_num`,`ivt`.`po_date` AS `po_date`,`ivt`.`form_main_unique_id` AS `form_main_unique_id`,`ivt`.`consignee_unique_id` AS `consignee_unique_id`,`ivt`.`ledger_name` AS `ledger_name`,`ivt`.`ledger_no` AS `ledger_no`,`ivt`.`invoice_qty` AS `invoice_qty`,`ivt`.`invoice_value` AS `invoice_value`,`ivt`.`bulk_eng_type` AS `bulk_eng_type`,`ivt`.`bulk_eng_name` AS `bulk_eng_name`,`ivt`.`vendor_payment_allocated` AS `vendor_payment_allocated`,`ivt`.`vendor_finance_approval` AS `vendor_finance_approval`,`get_outsource_engineer_name`(`ivt`.`bulk_eng_name`) AS `outsrc_eng_name`,`ivt`.`engineer_name` AS `engineer_name`,`ivt`.`bulk_total_amount` AS `bulk_total_amount`,`ivt`.`bulk_dc_total_amount` AS `bulk_dc_total_amount`,`ivt`.`vendor_bulk_rate` AS `vendor_bulk_rate`,`ivt`.`vendor_bulk_sts` AS `vendor_bulk_sts`,`ivt`.`vendor_bulk_gst` AS `vendor_bulk_gst`,`ivt`.`vendor_bulk_timeline` AS `vendor_bulk_timeline`,`ivt`.`vendor_inst_allocation_date` AS `vendor_inst_allocation_date`,`ivt`.`inv_verify_status` AS `inv_verify_status`,`ivt`.`inv_verify_approvedby` AS `inv_verify_approvedby`,`ivt`.`inv_verify_approved_date` AS `inv_verify_approved_date`,`ivt`.`vendor_inv_attach_approval` AS `vendor_inv_attach_approval`,`ivt`.`veninvstatus` AS `veninvstatus`,`ivt`.`vendor_bill_app_status` AS `vendor_bill_app_status`,`ivt`.`vendor_bill_reject_reason` AS `vendor_bill_reject_reason`,`ivt`.`vendor_bill_approval_allocated` AS `vendor_bill_approval_allocated`,`ivt`.`document_verification_status` AS `document_verification_status`,`ivt`.`dc_required` AS `dc_required`,`ivt`.`vendor_inv_attach_approval_date` AS `vendor_inv_attach_approval_date`,`ivt`.`inv_verfiy_attach` AS `inv_verfiy_attach`,`vpd`.`po_ven_filename` AS `po_ven_filename`,`vpd`.`vendor_bill_approval` AS `vendor_bill_approval`,`vpd`.`vendor_bill_approval_date` AS `vendor_bill_approval_date`,`vpd`.`veninvverifyid` AS `veninvverifyid`,`vpd`.`bill_no` AS `bill_no`,`vpd`.`bill_date` AS `bill_date`,`vpd`.`accstatus` AS `accstatus`,`vpd`.`finance_reject_reason` AS `finance_reject_reason` from (`invoice_verfication_table` `ivt` join `vendor_payment_details` `vpd` on(`ivt`.`dc_number` = `vpd`.`dc_num` and `vpd`.`is_delete` = 0)) where `ivt`.`bulk_eng_type` = 'outsource-vendor';

DROP VIEW IF EXISTS `view_vendor_billdata`;
CREATE OR REPLACE ALGORITHM=UNDEFINED DEFINER=`root`@`localhost` SQL SECURITY DEFINER VIEW `view_vendor_billdata` AS select `icm`.`unique_id` AS `unique_id`,`icm`.`form_main_unique_id` AS `form_main_unique_id`,`icm`.`po_num` AS `po_num`,`icm`.`po_date` AS `po_date`,`icm`.`dc_number` AS `dc_number`,`icm`.`dc_date` AS `dc_date`,`icm`.`invoice_no` AS `invoice_no`,`icm`.`invoice_date` AS `invoice_date`,`icm`.`ledger_name` AS `ledger_name`,`icm`.`ledger_no` AS `ledger_no`,`icm`.`invoice_auto_id` AS `invoice_auto_id`,`icm`.`consignee_unique_id` AS `consignee_unique_id`,`icm`.`invoice_qty` AS `invoice_qty`,`icm`.`invoice_value` AS `invoice_value`,`icm`.`invoice_doc_status` AS `invoice_doc_status`,`icm`.`doc_approval_sts` AS `doc_approval_sts`,`icm`.`approved_by` AS `approved_by`,`icm`.`approved_date` AS `approved_date`,`icm`.`ac_team_verifiy_status` AS `ac_team_verifiy_status`,`icm`.`ac_team_approved_by` AS `ac_team_approved_by`,`icm`.`dc_ir_dispatch_sts` AS `dc_ir_dispatch_sts`,`icm`.`dispatch_status` AS `dispatch_status`,`icm`.`installation_status` AS `installation_status`,`icm`.`material_qc` AS `material_qc`,`icm`.`material_qc_approved` AS `material_qc_approved`,`icm`.`material_qc_reject_reason` AS `material_qc_reject_reason`,`icm`.`vendor_bulk_sts` AS `vendor_bulk_sts`,`icm`.`bulk_eng_type` AS `bulk_eng_type`,`icm`.`bulk_eng_name` AS `bulk_eng_name`,`icm`.`vendor_bulk_rate` AS `vendor_bulk_rate`,`icm`.`vendor_bulk_gst` AS `vendor_bulk_gst`,`icm`.`bulk_total_amount` AS `bulk_total_amount`,`icm`.`vendor_payment_status` AS `vendor_payment_status`,(select `ids`.`document_verification_status` from `installation_details_sublist` `ids` where `ids`.`dc_number` = `icm`.`dc_number` and `ids`.`is_delete` = 0 and `ids`.`document_verification_status` = 2 limit 1) AS `document_verification_status` from `invoice_creation_main` `icm` where `icm`.`is_delete` = 0 and `icm`.`invoice_no` <> '' and `icm`.`invoice_no` is not null and exists(select 1 from `installation_details_sublist` `ids` where `ids`.`dc_number` = `icm`.`dc_number` and `ids`.`is_delete` = 0 and `ids`.`document_verification_status` = 2 limit 1);

DROP VIEW IF EXISTS `view_vendor_pending_list`;
CREATE OR REPLACE ALGORITHM=UNDEFINED DEFINER=`root`@`localhost` SQL SECURITY DEFINER VIEW `view_vendor_pending_list` AS select `inv`.`form_main_unique_id` AS `form_main_unique_id`,`inv`.`invoice_auto_id` AS `invoice_auto_id`,`inv`.`po_num` AS `po_num`,`inv`.`po_date` AS `po_date`,`inv`.`invoice_no` AS `invoice_no`,`inv`.`team_alloc_eng_type` AS `team_alloc_eng_type`,`inv`.`team_alloc_eng_name` AS `team_alloc_eng_name`,`inv`.`invoice_date` AS `invoice_date`,`inv`.`invoice_value` AS `invoice_value`,`inv`.`invoice_qty` AS `invoice_qty`,`inv`.`dc_number` AS `dc_number`,`inv`.`dc_date` AS `dc_date`,`inv`.`unique_id` AS `unique_id`,`inv`.`stock_id` AS `stock_id`,`inv`.`ac_team_approved_by` AS `ac_team_approved_by`,`inv`.`approved_by` AS `approved_by`,`inv`.`material_qc` AS `material_qc`,`inv`.`material_qc_approved` AS `material_qc_approved`,`inv`.`doc_approval_sts` AS `doc_approval_sts`,`inv`.`dispatch_status` AS `inv_dispatch_status`,`inv`.`ac_team_verifiy_status` AS `ac_team_verifiy_status`,`inv`.`consignee_unique_id` AS `consignee_unique_id`,`inv`.`is_delete` AS `is_delete`,`inv`.`ledger_name` AS `ledger_name`,`inv`.`vendor_bulk_sts` AS `vendor_bulk_sts`,`inv`.`vendor_team_sts` AS `vendor_team_sts`,`pf`.`bill_address` AS `bill_address` from ((`invoice_creation_main` `inv` left join `po_form` `pf` on(`inv`.`po_num` = `pf`.`po_num` and `pf`.`is_delete` = 0)) left join `stock_position_main` `spm` on(`inv`.`form_main_unique_id` = `spm`.`form_main_unique_id` and `spm`.`is_delete` = 0)) where `inv`.`ac_team_verifiy_status` = '1' and `inv`.`is_delete` = '0' and `pf`.`is_delete` = '0';

DROP VIEW IF EXISTS `view_verified_data`;
CREATE OR REPLACE ALGORITHM=UNDEFINED DEFINER=`root`@`localhost` SQL SECURITY DEFINER VIEW `view_verified_data` AS select `sublist`.`po_num` AS `po_num`,`sublist`.`po_date` AS `po_date`,(select `get_ledger_name`(`icm`.`ledger_no`) from `invoice_creation_main` `icm` where `icm`.`form_main_unique_id` = `sublist`.`po_form_unique_id` and `icm`.`dc_number` = `sublist`.`dc_number` and `icm`.`is_delete` = 0 and `sublist`.`is_delete` = 0 limit 1) AS `ledger_name`,(select `u`.`staff_name` from `user` `u` where `u`.`staff_id` = `sublist`.`team_mem` and `u`.`is_delete` = 0 and `sublist`.`is_delete` = 0 limit 1) AS `team_member`,(select `cds`.`con_address` from `consignee_details_sub` `cds` where `cds`.`unique_id` = `sublist`.`consignee_unique_id` and `cds`.`is_delete` = 0 and `sublist`.`is_delete` = 0 limit 1) AS `con_address`,(select `cds`.`con_state_name` from `consignee_details_sub` `cds` where `cds`.`unique_id` = `sublist`.`consignee_unique_id` and `cds`.`is_delete` = 0 and `sublist`.`is_delete` = 0 limit 1) AS `con_state_name`,(select `cds`.`con_district` from `consignee_details_sub` `cds` where `cds`.`unique_id` = `sublist`.`consignee_unique_id` and `cds`.`is_delete` = 0 and `sublist`.`is_delete` = 0 limit 1) AS `con_district`,`sublist`.`invoice_no` AS `invoice_no`,`sublist`.`invoice_date` AS `invoice_date`,`sublist`.`dc_number` AS `dc_number`,(select `icm`.`dc_date` from `invoice_creation_main` `icm` where `icm`.`dc_number` = `sublist`.`dc_number` and `icm`.`is_delete` = 0 and `sublist`.`is_delete` = 0 limit 1) AS `dc_date`,`sublist`.`dc_file` AS `dc_file`,`sublist`.`ir_file` AS `ir_file`,`sublist`.`document_verification_status` AS `document_verification_status`,`sublist`.`consignee_unique_id` AS `consignee_unique_id`,`sublist`.`po_form_unique_id` AS `po_form_unique_id`,`sublist`.`unique_id` AS `ins_unique_id`,(select `inv`.`team_mem` from `invoice_creation` `inv` where `inv`.`dc_num` = `sublist`.`dc_number` and `inv`.`is_delete` = 0 and `sublist`.`is_delete` = 0 limit 1) AS `team_mem`,`sublist`.`unique_id` AS `unique_id`,`sublist`.`is_delete` AS `is_delete` from `installation_details_sublist` `sublist` where `sublist`.`document_verification_status` = 2 and `sublist`.`is_delete` = 0;

DROP VIEW IF EXISTS `bill_submitted_payment_pending`;
CREATE OR REPLACE VIEW `bill_submitted_payment_pending` AS select cast('' as char(100)) AS `bill_form_unique_id`,cast('' as char(10)) AS `acc_year`,cast(0 as signed) AS `invoice_count`,cast(0 as decimal(15,2)) AS `invoice_value` where 1 = 0;

DROP VIEW IF EXISTS `view_sd_claim_pending`;
CREATE OR REPLACE VIEW `view_sd_claim_pending` AS select cast('' as char(100)) AS `bill_form_unique_id`,cast('' as char(10)) AS `acc_year`,cast(0 as signed) AS `invoice_count`,cast(0 as decimal(15,2)) AS `invoice_value` where 1 = 0;

DROP VIEW IF EXISTS `view_ld_value_count`;
CREATE OR REPLACE VIEW `view_ld_value_count` AS select cast('' as char(100)) AS `bill_form_unique_id`,cast('' as char(10)) AS `acc_year`,cast(0 as signed) AS `invoice_count`,cast(0 as decimal(15,2)) AS `ld_value` where 1 = 0;

SET FOREIGN_KEY_CHECKS=1;
