DELIMITER $$
CREATE DEFINER=`root`@`localhost` FUNCTION `check_file_name_null`(p_unique_id VARCHAR(100)) RETURNS int(11)
    DETERMINISTIC
BEGIN
    DECLARE result INT DEFAULT 0;

    IF EXISTS (
        SELECT 1
        FROM po_form
        WHERE is_delete = 0
          AND file_name IS NULL
          AND unique_id = p_unique_id
    ) THEN
        SET result = 1;
    END IF;

    RETURN result;
END$$
DELIMITER ;

DELIMITER $$
CREATE DEFINER=`root`@`localhost` FUNCTION `cns_get_contact_name`(consignee_uid VARCHAR(255)) RETURNS varchar(255) CHARSET utf8mb4 COLLATE utf8mb4_general_ci
    READS SQL DATA
    DETERMINISTIC
BEGIN
    DECLARE contact_name VARCHAR(255);

    SELECT con_contact_name
    INTO contact_name
    FROM consignee_details_sub
    WHERE unique_id = consignee_uid
      AND is_delete = 0
    LIMIT 1;

    RETURN contact_name;
END$$
DELIMITER ;

DELIMITER $$
CREATE DEFINER=`root`@`localhost` FUNCTION `cns_get_contact_number`(consignee_uid VARCHAR(255)) RETURNS varchar(50) CHARSET utf8mb4 COLLATE utf8mb4_general_ci
    READS SQL DATA
    DETERMINISTIC
BEGIN
    DECLARE contact_no VARCHAR(50);

    SELECT con_contact_number
    INTO contact_no
    FROM consignee_details_sub
    WHERE unique_id = consignee_uid
      AND is_delete = 0
    LIMIT 1;

    RETURN contact_no;
END$$
DELIMITER ;

DELIMITER $$
CREATE DEFINER=`root`@`localhost` FUNCTION `get_address`(`consignee_uid` VARCHAR(255)) RETURNS text CHARSET utf8mb4 COLLATE utf8mb4_general_ci
    READS SQL DATA
    DETERMINISTIC
BEGIN
    DECLARE address TEXT;

    SELECT con_address
    INTO address
    FROM consignee_details_sub
    WHERE unique_id = consignee_uid and is_delete=0
    LIMIT 1;

    RETURN address;
END$$
DELIMITER ;

DELIMITER $$
CREATE DEFINER=`root`@`localhost` FUNCTION `get_address_po`(`input_unique_id` VARCHAR(250)) RETURNS varchar(250) CHARSET utf8mb4 COLLATE utf8mb4_general_ci
    DETERMINISTIC
BEGIN
    DECLARE bill_address VARCHAR(250); 

    
    SELECT po_form.bill_address
    INTO bill_address
    FROM po_form
    WHERE po_form.po_unique_id = input_unique_id
    LIMIT 1;

    
    RETURN bill_address;
END$$
DELIMITER ;

DELIMITER $$
CREATE DEFINER=`root`@`localhost` FUNCTION `get_cons_billed_qty`(`stockId` VARCHAR(50)) RETURNS varchar(20) CHARSET utf8mb4 COLLATE utf8mb4_general_ci
    DETERMINISTIC
BEGIN
    DECLARE total_billed_qty INT DEFAULT 0;

    SELECT SUM(billed_qty)
    INTO total_billed_qty
    FROM stock_position_sublist
    WHERE stock_id = stockId;

    RETURN IFNULL(total_billed_qty, 0);
END$$
DELIMITER ;

DELIMITER $$
CREATE DEFINER=`root`@`localhost` FUNCTION `get_cons_verify_sts_by_consignee`(`p_unique_id` VARCHAR(255)) RETURNS varchar(255) CHARSET utf8mb4 COLLATE utf8mb4_general_ci
    DETERMINISTIC
BEGIN
    DECLARE result VARCHAR(255);

    SELECT cons_verify_sts
    INTO result
    FROM consignee_details_sub
    WHERE unique_id = p_unique_id
      AND is_delete = '0'
    LIMIT 1;

    RETURN result;
END$$
DELIMITER ;

DELIMITER $$
CREATE DEFINER=`root`@`localhost` FUNCTION `get_consignee_contact_name`(p_unique_id VARCHAR(50)) RETURNS varchar(255) CHARSET utf8mb4 COLLATE utf8mb4_general_ci
    DETERMINISTIC
BEGIN
    DECLARE v_contact_name VARCHAR(255);

    SELECT con_contact_name
    INTO v_contact_name
    FROM consignee_details_sub
    WHERE unique_id = p_unique_id
    LIMIT 1;

    RETURN v_contact_name;
END$$
DELIMITER ;

DELIMITER $$
CREATE DEFINER=`root`@`localhost` FUNCTION `get_consignee_contact_no`(`input_unique_id` VARCHAR(250)) RETURNS varchar(250) CHARSET utf8mb4 COLLATE utf8mb4_general_ci
    DETERMINISTIC
BEGIN
    DECLARE con_contact_number VARCHAR(250); 

    SELECT consignee_details_sub.con_contact_number
    INTO con_contact_number
    FROM consignee_details_sub
    WHERE consignee_details_sub.unique_id = input_unique_id
    LIMIT 1;

    RETURN con_contact_number;
END$$
DELIMITER ;

DELIMITER $$
CREATE DEFINER=`root`@`localhost` FUNCTION `get_consignee_district`(`input_unique_id` VARCHAR(250)) RETURNS varchar(250) CHARSET utf8mb4 COLLATE utf8mb4_general_ci
    DETERMINISTIC
BEGIN
    DECLARE consignee_district VARCHAR(250); 

    SELECT consignee_details_sub.con_district
    INTO consignee_district
    FROM consignee_details_sub
    WHERE consignee_details_sub.unique_id = input_unique_id
    LIMIT 1;

    RETURN consignee_district;
END$$
DELIMITER ;

DELIMITER $$
CREATE DEFINER=`root`@`localhost` FUNCTION `get_consignee_state`(input_unique_id VARCHAR(250)) RETURNS varchar(250) CHARSET utf8mb4 COLLATE utf8mb4_general_ci
    DETERMINISTIC
BEGIN
    DECLARE consignee_state VARCHAR(250); 

    SELECT con_state_name
    INTO consignee_state
    FROM consignee_details_sub
    WHERE unique_id = input_unique_id
    LIMIT 1;

    RETURN consignee_state;
END$$
DELIMITER ;

DELIMITER $$
CREATE DEFINER=`root`@`localhost` FUNCTION `get_contact_email_po`(`input_unique_id` VARCHAR(250)) RETURNS varchar(250) CHARSET utf8mb4 COLLATE utf8mb4_general_ci
    DETERMINISTIC
BEGIN
    DECLARE email VARCHAR(250); 

    
    SELECT po_form.email
    INTO email
    FROM po_form
    WHERE po_form.po_unique_id = input_unique_id
    LIMIT 1;

    
    RETURN email;
END$$
DELIMITER ;

DELIMITER $$
CREATE DEFINER=`root`@`localhost` FUNCTION `get_contact_no_po`(`input_unique_id` VARCHAR(250)) RETURNS varchar(250) CHARSET utf8mb4 COLLATE utf8mb4_general_ci
    DETERMINISTIC
BEGIN
    DECLARE contact_number VARCHAR(250); 

    
    SELECT po_form.contact_number
    INTO contact_number
    FROM po_form
    WHERE po_form.po_unique_id = input_unique_id
    LIMIT 1;

    
    RETURN contact_number;
END$$
DELIMITER ;

DELIMITER $$
CREATE DEFINER=`root`@`localhost` FUNCTION `get_department_by_form_id`(`p_form_main_unique_id` VARCHAR(255)) RETURNS varchar(255) CHARSET utf8mb4 COLLATE utf8mb4_general_ci
    DETERMINISTIC
BEGIN
    DECLARE dept VARCHAR(255);

    SELECT department
    INTO dept
    FROM stock_position_main
    WHERE form_main_unique_id = p_form_main_unique_id
    LIMIT 1;

    RETURN dept;
END$$
DELIMITER ;

DELIMITER $$
CREATE DEFINER=`root`@`localhost` FUNCTION `get_department_name`(`input_unique_id` VARCHAR(250)) RETURNS varchar(250) CHARSET utf8mb4 COLLATE utf8mb4_general_ci
    DETERMINISTIC
BEGIN
    DECLARE department_name VARCHAR(250); 

    
    SELECT department_creation.department 
    INTO department_name
    FROM department_creation
    WHERE department_creation.unique_id = input_unique_id
    LIMIT 1;

    
    RETURN department_name;
END$$
DELIMITER ;

DELIMITER $$
CREATE DEFINER=`root`@`localhost` FUNCTION `get_district_name`(`input_unique_id` VARCHAR(250)) RETURNS varchar(250) CHARSET utf8mb4 COLLATE utf8mb4_general_ci
    DETERMINISTIC
BEGIN
    DECLARE district_name VARCHAR(250); 

    
    SELECT district_creation.district_name 
    INTO district_name
    FROM district_creation
    WHERE district_creation.unique_id = input_unique_id
    LIMIT 1;

    
    RETURN district_name;
END$$
DELIMITER ;

DELIMITER $$
CREATE DEFINER=`root`@`localhost` FUNCTION `get_district_name_po`(`input_unique_id` VARCHAR(250)) RETURNS varchar(250) CHARSET utf8mb4 COLLATE utf8mb4_general_ci
    DETERMINISTIC
BEGIN
    DECLARE district VARCHAR(250); 

    
    SELECT po_form.district
    INTO district
    FROM po_form
    WHERE po_form.po_unique_id = input_unique_id
    LIMIT 1;

    
    RETURN district;
END$$
DELIMITER ;

DELIMITER $$
CREATE DEFINER=`root`@`localhost` FUNCTION `get_executive_name`(`input_unique_id` VARCHAR(250)) RETURNS varchar(250) CHARSET utf8mb4 COLLATE utf8mb4_general_ci
    DETERMINISTIC
BEGIN
    DECLARE executive_name VARCHAR(250); 

    
    SELECT executive_name.executive_name 
    INTO executive_name
    FROM executive_name
    WHERE executive_name.unique_id = input_unique_id
    LIMIT 1;

    
    RETURN executive_name;
END$$
DELIMITER ;

DELIMITER $$
CREATE DEFINER=`root`@`localhost` FUNCTION `get_invoice_qty`(`in_form_main_unique_id` VARCHAR(100), `in_con_unique_id` VARCHAR(100)) RETURNS decimal(10,2)
    DETERMINISTIC
BEGIN
    DECLARE result DECIMAL(10,2);

    SELECT IFNULL(SUM(invoice_qty), 0)
    INTO result
    FROM invoice_creation
    WHERE is_delete = 0
      AND po_unique_id = in_form_main_unique_id;

    RETURN result;
END$$
DELIMITER ;

DELIMITER $$
CREATE DEFINER=`root`@`localhost` FUNCTION `get_invoice_value`(`in_form_main_unique_id` VARCHAR(100), `in_con_unique_id` VARCHAR(100)) RETURNS decimal(10,2)
    DETERMINISTIC
BEGIN
    DECLARE result DECIMAL(10,2);

    SELECT IFNULL(SUM(invoice_qty_value), 0)
    INTO result
    FROM invoice_creation
    WHERE is_delete = 0
      AND po_unique_id = in_form_main_unique_id;

    RETURN result;
END$$
DELIMITER ;

DELIMITER $$
CREATE DEFINER=`root`@`localhost` FUNCTION `get_item_name`(`p_code` VARCHAR(50)) RETURNS varchar(255) CHARSET utf8mb4 COLLATE utf8mb4_general_ci
    DETERMINISTIC
BEGIN
    DECLARE item_name VARCHAR(255);
    SELECT item_code INTO item_name 
    FROM item_creation_sub 
    WHERE unique_id= p_code 
    LIMIT 1;
    RETURN item_name;
END$$
DELIMITER ;

DELIMITER $$
CREATE DEFINER=`root`@`localhost` FUNCTION `get_ledger_name`(`input_unique_id` VARCHAR(250)) RETURNS varchar(250) CHARSET utf8mb4 COLLATE utf8mb4_general_ci
    DETERMINISTIC
BEGIN
    DECLARE ledger_name VARCHAR(250); 

    
    SELECT department_creation_sublist.ledger_name 
    INTO ledger_name
    FROM department_creation_sublist
    WHERE department_creation_sublist.unique_id = input_unique_id and is_delete=0
    LIMIT 1;

    
    RETURN ledger_name;
END$$
DELIMITER ;

DELIMITER $$
CREATE DEFINER=`root`@`localhost` FUNCTION `get_ledger_no`(input_unique_id VARCHAR(250)) RETURNS varchar(250) CHARSET utf8mb4 COLLATE utf8mb4_general_ci
    DETERMINISTIC
BEGIN
    DECLARE ledger_no VARCHAR(250); 

    SELECT department_creation_sublist.ledger_no
    INTO ledger_no
    FROM department_creation_sublist
    WHERE department_creation_sublist.unique_id = input_unique_id
    LIMIT 1;

    RETURN ledger_no;
END$$
DELIMITER ;

DELIMITER $$
CREATE DEFINER=`root`@`localhost` FUNCTION `get_name_stock`(`input_unique_id` VARCHAR(250)) RETURNS varchar(250) CHARSET utf8mb4 COLLATE utf8mb4_general_ci
    DETERMINISTIC
BEGIN
    DECLARE con_contact_name VARCHAR(250); 

    
    SELECT consignee_details_sub.con_contact_name
    INTO con_contact_name
    FROM consignee_details_sub
    WHERE consignee_details_sub.unique_id = input_unique_id
    LIMIT 1;

    
    RETURN con_contact_name;
END$$
DELIMITER ;

DELIMITER $$
CREATE DEFINER=`root`@`localhost` FUNCTION `get_outsource_engineer_name`(input_unique_id VARCHAR(250)) RETURNS varchar(250) CHARSET utf8mb4 COLLATE utf8mb4_unicode_ci
    DETERMINISTIC
BEGIN
    DECLARE engineer_name VARCHAR(250);

    SELECT name
    INTO engineer_name
    FROM vendor_creation
    WHERE unique_id = input_unique_id
    LIMIT 1;

    RETURN engineer_name;
END$$
DELIMITER ;

DELIMITER $$
CREATE DEFINER=`root`@`localhost` FUNCTION `get_part_no`(p_product_unique_id VARCHAR(100)) RETURNS varchar(100) CHARSET utf8mb4 COLLATE utf8mb4_general_ci
    READS SQL DATA
    DETERMINISTIC
BEGIN
    DECLARE result_part_no VARCHAR(100);

    SELECT part_no 
    INTO result_part_no
    FROM stock_position 
    WHERE product_unique_id = p_product_unique_id
    LIMIT 1;

    RETURN result_part_no;
END$$
DELIMITER ;

DELIMITER $$
CREATE DEFINER=`root`@`localhost` FUNCTION `get_pincode`(consignee_uid VARCHAR(255)) RETURNS varchar(20) CHARSET utf8mb4 COLLATE utf8mb4_general_ci
    READS SQL DATA
    DETERMINISTIC
BEGIN
    DECLARE pincode VARCHAR(20);

    SELECT con_pincode
    INTO pincode
    FROM consignee_details_sub
    WHERE unique_id = consignee_uid
    LIMIT 1;

    RETURN pincode;
END$$
DELIMITER ;

DELIMITER $$
CREATE DEFINER=`root`@`localhost` FUNCTION `get_po_date`(p_po_unique_id VARCHAR(100)) RETURNS varchar(100) CHARSET utf8mb4 COLLATE utf8mb4_general_ci
    DETERMINISTIC
BEGIN
    DECLARE result VARCHAR(100);

    SELECT po_date
      INTO result
    FROM po_form
    WHERE unique_id = p_po_unique_id
    LIMIT 1;

    RETURN result;
END$$
DELIMITER ;

DELIMITER $$
CREATE DEFINER=`root`@`localhost` FUNCTION `get_po_date_stock`(`input_unique_id` VARCHAR(250)) RETURNS varchar(250) CHARSET utf8mb4 COLLATE utf8mb4_general_ci
    DETERMINISTIC
BEGIN
    DECLARE po_date VARCHAR(250); 

    SELECT DATE_FORMAT(po_form.po_date, '%d-%m-%Y') 
    INTO po_date
    FROM po_form
    WHERE po_form.po_unique_id = input_unique_id
    LIMIT 1;

    RETURN po_date;
END$$
DELIMITER ;

DELIMITER $$
CREATE DEFINER=`root`@`localhost` FUNCTION `get_po_num_by_po_unique_id`(p_po_unique_id VARCHAR(100)) RETURNS varchar(100) CHARSET utf8mb4 COLLATE utf8mb4_general_ci
    READS SQL DATA
    DETERMINISTIC
BEGIN
    DECLARE result VARCHAR(100);

    SELECT po_num INTO result
    FROM po_form
    WHERE po_unique_id = p_po_unique_id
    LIMIT 1;

    RETURN result;
END$$
DELIMITER ;

DELIMITER $$
CREATE DEFINER=`root`@`localhost` FUNCTION `get_po_number`(`p_po_unique_id` VARCHAR(255)) RETURNS varchar(100) CHARSET utf8mb4 COLLATE utf8mb4_general_ci
    READS SQL DATA
    DETERMINISTIC
BEGIN
    DECLARE result VARCHAR(255);

    SELECT po_num
      INTO result
    FROM po_form
    WHERE unique_id = p_po_unique_id AND is_delete = 0
    ;

    RETURN result;
END$$
DELIMITER ;

DELIMITER $$
CREATE DEFINER=`root`@`localhost` FUNCTION `get_remaining_stock_qty`(`stockId` VARCHAR(50)) RETURNS varchar(20) CHARSET utf8mb4 COLLATE utf8mb4_general_ci
    DETERMINISTIC
BEGIN
    DECLARE total_rem_qty INT DEFAULT 0;

    SELECT SUM(remqty)
    INTO total_rem_qty
    FROM stock_position_sublist
    WHERE stock_id = stockId and is_delete = 0;

    RETURN CAST(IFNULL(total_rem_qty, 0) AS CHAR);
END$$
DELIMITER ;

DELIMITER $$
CREATE DEFINER=`root`@`localhost` FUNCTION `get_sector_name`(`input_unique_id` VARCHAR(250)) RETURNS varchar(250) CHARSET utf8mb4 COLLATE utf8mb4_general_ci
    DETERMINISTIC
BEGIN
    DECLARE sector_name VARCHAR(250);

    
    SELECT account_sector.sector_name 
    INTO sector_name
    FROM account_sector
    WHERE account_sector.unique_id = input_unique_id
    LIMIT 1;

    RETURN sector_name;
END$$
DELIMITER ;

DELIMITER $$
CREATE DEFINER=`root`@`localhost` FUNCTION `get_service_engineer_name`(`input_unique_id` VARCHAR(255)) RETURNS varchar(250) CHARSET utf8mb4 COLLATE utf8mb4_general_ci
    DETERMINISTIC
BEGIN
    DECLARE engineer_name VARCHAR(250);

    
    SELECT staff_name
    INTO engineer_name
    FROM user
    WHERE unique_id = input_unique_id
    LIMIT 1;

    
    RETURN engineer_name;
END$$
DELIMITER ;

DELIMITER $$
CREATE DEFINER=`root`@`localhost` FUNCTION `get_staff_name`(p_unique_id VARCHAR(50)) RETURNS varchar(255) CHARSET utf8mb4 COLLATE utf8mb4_general_ci
    DETERMINISTIC
BEGIN
    DECLARE v_staff_name VARCHAR(255);

    SELECT u.staff_name
      INTO v_staff_name
      FROM user AS u
     WHERE u.unique_id = p_unique_id     -- match the person
       AND u.is_delete = 0               -- only active users
     LIMIT 1;

    RETURN v_staff_name;
END$$
DELIMITER ;

DELIMITER $$
CREATE DEFINER=`root`@`localhost` FUNCTION `get_staff_name_by_id`(input_unique_id INT) RETURNS varchar(250) CHARSET utf8mb4 COLLATE utf8mb4_general_ci
    DETERMINISTIC
BEGIN
    DECLARE staff_name_val VARCHAR(250);

    SELECT staff_name
    INTO staff_name_val
    FROM user
    WHERE staff_id = input_unique_id;

    RETURN staff_name_val;
END$$
DELIMITER ;

DELIMITER $$
CREATE DEFINER=`root`@`localhost` FUNCTION `get_staff_name_unique_id`(`input_unique_id` VARCHAR(100)) RETURNS varchar(250) CHARSET utf8mb4 COLLATE utf8mb4_general_ci
    READS SQL DATA
    DETERMINISTIC
BEGIN
    DECLARE staff_name VARCHAR(250);

    SELECT staff_name
    INTO staff_name
    FROM `user`
    WHERE unique_id = input_unique_id
    LIMIT 1;

    RETURN staff_name;
END$$
DELIMITER ;

DELIMITER $$
CREATE DEFINER=`root`@`localhost` FUNCTION `get_staff_name_with_staff_id`(`staff_id_input` VARCHAR(50)) RETURNS varchar(255) CHARSET utf8mb4 COLLATE utf8mb4_general_ci
    DETERMINISTIC
BEGIN
    DECLARE name VARCHAR(255);

    SELECT staff_name
    INTO name
    FROM user
    WHERE staff_id = staff_id_input
      AND is_delete = '0'
    LIMIT 1;

    RETURN name;
END$$
DELIMITER ;

DELIMITER $$
CREATE DEFINER=`root`@`localhost` FUNCTION `get_state_name`(`input_unique_id` VARCHAR(250)) RETURNS varchar(250) CHARSET utf8mb4 COLLATE utf8mb4_general_ci
    DETERMINISTIC
BEGIN
    DECLARE state_name VARCHAR(250);

    
    SELECT state_creation.state_name
    INTO state_name
    FROM state_creation
    WHERE state_creation.unique_id = input_unique_id
    LIMIT 1;

    
    RETURN state_name;
END$$
DELIMITER ;

DELIMITER $$
CREATE DEFINER=`root`@`localhost` FUNCTION `get_state_name_po`(`input_unique_id` VARCHAR(250)) RETURNS varchar(250) CHARSET utf8mb4 COLLATE utf8mb4_general_ci
    DETERMINISTIC
BEGIN
    DECLARE state_name VARCHAR(250); 

    
    SELECT po_form.state_name
    INTO state_name
    FROM po_form
    WHERE po_form.po_unique_id = input_unique_id
    LIMIT 1;

    
    RETURN state_name;
END$$
DELIMITER ;

DELIMITER $$
CREATE DEFINER=`root`@`localhost` FUNCTION `get_total_stock_qty`(`form_id` VARCHAR(50)) RETURNS int(11)
    READS SQL DATA
    DETERMINISTIC
BEGIN
    DECLARE total_qty INT;

    SELECT SUM(stock_qty)
    INTO total_qty
    FROM stock_position
    WHERE form_main_unique_id = form_id and is_delete = 0;

    RETURN IFNULL(total_qty, 0);
END$$
DELIMITER ;

DELIMITER $$
CREATE DEFINER=`root`@`localhost` FUNCTION `get_unique_id_by_tender`(tenderCode VARCHAR(100)) RETURNS varchar(100) CHARSET utf8mb4 COLLATE utf8mb4_general_ci
    DETERMINISTIC
BEGIN
    DECLARE uniqueId VARCHAR(100);

    SELECT unique_id INTO uniqueId
    FROM item_creation
    WHERE tender_code = tenderCode AND is_delete = 0
    LIMIT 1;

    RETURN uniqueId;
END$$
DELIMITER ;

DELIMITER $$
CREATE DEFINER=`root`@`localhost` FUNCTION `get_user_name`(`input_unique_id` VARCHAR(50)) RETURNS varchar(250) CHARSET utf8mb4 COLLATE utf8mb4_general_ci
    DETERMINISTIC
BEGIN
    DECLARE staff_name_result VARCHAR(250);

    SELECT staff_name
    INTO staff_name_result
    FROM user
    WHERE staff_id = input_unique_id
    LIMIT 1;

    RETURN staff_name_result;
END$$
DELIMITER ;

DELIMITER $$
CREATE DEFINER=`root`@`localhost` FUNCTION `get_user_name_by_id`(`input_unique_id` VARCHAR(50)) RETURNS varchar(250) CHARSET utf8mb4 COLLATE utf8mb4_general_ci
    DETERMINISTIC
BEGIN
    DECLARE staff_name VARCHAR(250);

    SELECT staff_name
    INTO staff_name
    FROM user
    WHERE staff_id = input_unique_id
    LIMIT 1;

    RETURN staff_name;
END$$
DELIMITER ;

DELIMITER $$
CREATE DEFINER=`root`@`localhost` FUNCTION `get_user_type`(`input_unique_id` VARCHAR(250)) RETURNS varchar(250) CHARSET utf8mb4 COLLATE utf8mb4_general_ci
    DETERMINISTIC
BEGIN
    DECLARE user_type_name VARCHAR(250);

    
    SELECT user_type
    INTO user_type_name
    FROM user_type  
    WHERE unique_id = input_unique_id
    LIMIT 1;

    
    RETURN user_type_name;
END$$
DELIMITER ;

DELIMITER $$
CREATE DEFINER=`root`@`localhost` FUNCTION `get_vendor_address`(vendor_id VARCHAR(100)) RETURNS varchar(255) CHARSET utf8mb4 COLLATE utf8mb4_general_ci
    READS SQL DATA
    DETERMINISTIC
BEGIN
    DECLARE vendor_address VARCHAR(255);

    SELECT address INTO vendor_address
    FROM vendor_creation
    WHERE unique_id = vendor_id
    LIMIT 1;

    RETURN vendor_address;
END$$
DELIMITER ;

DELIMITER $$
CREATE DEFINER=`root`@`localhost` FUNCTION `get_vendor_company_name`(`input_unique_id` VARCHAR(255)) RETURNS varchar(255) CHARSET utf8mb4 COLLATE utf8mb4_general_ci
    DETERMINISTIC
BEGIN
    DECLARE company_name_result VARCHAR(255);

    SELECT company_name
    INTO company_name_result
    FROM vendor_creation
    WHERE unique_id = input_unique_id
    LIMIT 1;

    RETURN company_name_result;
END$$
DELIMITER ;

DELIMITER $$
CREATE DEFINER=`root`@`localhost` FUNCTION `get_vendor_contact`(vendor_uid VARCHAR(100)) RETURNS varchar(50) CHARSET utf8mb4 COLLATE utf8mb4_general_ci
    READS SQL DATA
    DETERMINISTIC
BEGIN
    DECLARE result VARCHAR(50);

    SELECT contact_no INTO result
    FROM vendor_creation
    WHERE unique_id = vendor_uid
    LIMIT 1;

    RETURN result;
END$$
DELIMITER ;

DELIMITER $$
CREATE DEFINER=`root`@`localhost` FUNCTION `get_vendor_id`(input_vendor_id VARCHAR(100)) RETURNS varchar(255) CHARSET utf8mb4 COLLATE utf8mb4_general_ci
    READS SQL DATA
    DETERMINISTIC
BEGIN
    DECLARE result_vendor_id VARCHAR(255); 

    SELECT vendor_id INTO result_vendor_id 
    FROM vendor_creation
    WHERE unique_id = input_vendor_id
    LIMIT 1;

    RETURN result_vendor_id; 
END$$
DELIMITER ;

DELIMITER $$
CREATE DEFINER=`root`@`localhost` FUNCTION `get_vendor_mail`(vendor_uid VARCHAR(100)) RETURNS varchar(100) CHARSET utf8mb4 COLLATE utf8mb4_general_ci
    READS SQL DATA
    DETERMINISTIC
BEGIN
    DECLARE result VARCHAR(100);

    SELECT mail_id INTO result
    FROM vendor_creation
    WHERE unique_id = vendor_uid
    LIMIT 1;

    RETURN result;
END$$
DELIMITER ;
