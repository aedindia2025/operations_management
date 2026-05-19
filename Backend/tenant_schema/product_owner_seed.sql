INSERT INTO `tenant_company` (
  `unique_id`, `company_code`, `company_name`, `legal_name`, `contact_name`,
  `contact_email`, `contact_no`, `gst_no`, `pan_no`, `address`, `db_name`,
  `db_host`, `db_port`, `db_user`, `db_password`, `subscription_plan`,
  `subscription_status`, `is_active`, `is_delete`
) VALUES (
  'tenant_otm', 'OTM', 'OTM', 'OTM', 'Owner',
  'owner@example.com', '9999999999', '', '', '', 'otm_otm',
  '127.0.0.1', '3306', 'root', 'qK]11lm.@tEvEE!b', 'standard',
  'active', 1, 0
) ON DUPLICATE KEY UPDATE
  `company_name` = VALUES(`company_name`),
  `db_name` = VALUES(`db_name`),
  `db_host` = VALUES(`db_host`),
  `db_port` = VALUES(`db_port`),
  `db_user` = VALUES(`db_user`),
  `db_password` = VALUES(`db_password`),
  `is_active` = 1,
  `is_delete` = 0;

INSERT INTO `tenant_branch` (
  `unique_id`, `company_id`, `branch_code`, `branch_name`, `contact_no`,
  `address`, `is_default`, `is_active`, `is_delete`
) VALUES (
  'branch_otm_main', 'tenant_otm', 'MAIN', 'Main Branch', '9999999999',
  '', 1, 1, 0
) ON DUPLICATE KEY UPDATE
  `company_id` = VALUES(`company_id`),
  `branch_name` = VALUES(`branch_name`),
  `is_default` = 1,
  `is_active` = 1,
  `is_delete` = 0;

INSERT INTO `user_type` (
  `unique_id`, `user_type`, `under_user_type`, `is_active`, `is_delete`,
  `sess_company_id`, `sess_branch_id`
) VALUES (
  'product_owner', 'product_owner', '', 1, 0, 'tenant_otm', 'branch_otm_main'
) ON DUPLICATE KEY UPDATE
  `user_type` = VALUES(`user_type`),
  `is_active` = 1,
  `is_delete` = 0,
  `sess_company_id` = VALUES(`sess_company_id`),
  `sess_branch_id` = VALUES(`sess_branch_id`);

INSERT INTO `user` (
  `unique_id`, `staff_name`, `staff_id`, `user_type_unique_id`, `mobile_no`,
  `email_id`, `user_name`, `address`, `password`, `en_password`,
  `sess_company_id`, `sess_branch_id`, `is_active`, `is_delete`
) VALUES (
  'owner_admin', 'Owner', 'OWNER001', 'product_owner', '9999999999',
  'owner@example.com', 'owner', '', 'owner@123', 'owner@123',
  'tenant_otm', 'branch_otm_main', 1, 0
) ON DUPLICATE KEY UPDATE
  `staff_name` = VALUES(`staff_name`),
  `user_type_unique_id` = VALUES(`user_type_unique_id`),
  `user_name` = VALUES(`user_name`),
  `password` = VALUES(`password`),
  `en_password` = VALUES(`en_password`),
  `sess_company_id` = VALUES(`sess_company_id`),
  `sess_branch_id` = VALUES(`sess_branch_id`),
  `is_active` = 1,
  `is_delete` = 0;
