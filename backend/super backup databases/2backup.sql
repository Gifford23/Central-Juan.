-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1
-- Generation Time: Mar 14, 2025 at 10:37 AM
-- Server version: 10.4.32-MariaDB
-- PHP Version: 8.2.12

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `central_juan_hris`
--

-- --------------------------------------------------------

--
-- Table structure for table `attendance`
--

CREATE TABLE `attendance` (
  `attendance_id` int(11) NOT NULL,
  `employee_id` varchar(15) NOT NULL,
  `employee_name` varchar(100) NOT NULL,
  `attendance_date` date NOT NULL,
  `time_in_morning` time DEFAULT NULL,
  `time_out_morning` time DEFAULT NULL,
  `time_in_afternoon` time DEFAULT NULL,
  `time_out_afternoon` time DEFAULT NULL,
  `deducted_days` decimal(5,2) DEFAULT 0.00,
  `days_credited` decimal(5,2) DEFAULT 0.00,
  `overtime_hours` decimal(5,2) DEFAULT 0.00,
  `create_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `attendance`
--

INSERT INTO `attendance` (`attendance_id`, `employee_id`, `employee_name`, `attendance_date`, `time_in_morning`, `time_out_morning`, `time_in_afternoon`, `time_out_afternoon`, `deducted_days`, `days_credited`, `overtime_hours`, `create_at`) VALUES
(4564643, 'CJIS-001', 'Honey Jade  Wade', '2025-02-27', '10:09:00', '12:00:00', '13:00:00', '18:04:00', 0.50, 0.50, 0.00, '2025-03-14 06:29:41'),
(4564645, 'CJIS-2025-0001', 'Ragheil Lagat Atacador', '0123-03-12', '15:23:00', '00:31:00', '00:03:00', '12:31:00', 1.00, 0.00, 0.00, '2025-03-14 09:07:35'),
(4564646, 'CJIS-001', 'Honey Jade  Wade', '0123-03-12', '11:11:00', '14:22:00', '03:33:00', '14:22:00', 0.50, 0.50, 0.00, '2025-03-14 09:10:49'),
(4564647, 'CJIS-001', 'Honey Jade  Wade', '0123-03-12', '11:11:00', '14:22:00', '03:33:00', '14:22:00', 0.50, 0.50, 0.00, '2025-03-14 09:10:52'),
(4564648, 'CJIS-001', 'Honey Jade  Wade', '0123-03-12', '11:11:00', '14:22:00', '03:33:00', '14:22:00', 0.50, 0.50, 0.00, '2025-03-14 09:10:53'),
(4564649, 'CJIS-001', 'Honey Jade  Wade', '0123-03-12', '11:11:00', '14:22:00', '03:33:00', '14:22:00', 0.50, 0.50, 0.00, '2025-03-14 09:10:55'),
(4564653, 'CJIS-2025-0001', 'Ragheil Lagat Atacador', '2025-03-14', '09:00:00', '12:00:00', '13:00:00', '00:00:00', 0.00, 1.00, 0.00, '2025-03-14 09:28:53');

--
-- Triggers `attendance`
--
DELIMITER $$
CREATE TRIGGER `attendance_after_update` AFTER UPDATE ON `attendance` FOR EACH ROW BEGIN
    IF NEW.days_credited != OLD.days_credited THEN
        UPDATE payroll
        SET total_days = (
            SELECT COALESCE(SUM(days_credited), 0)
            FROM attendance
            WHERE 
                employee_id = NEW.employee_id
                AND attendance_date BETWEEN payroll.date_from AND payroll.date_until
        )
        WHERE 
            employee_id = NEW.employee_id
            AND NEW.attendance_date BETWEEN date_from AND date_until;
    END IF;
END
$$
DELIMITER ;
DELIMITER $$
CREATE TRIGGER `before_insert_attendance` BEFORE INSERT ON `attendance` FOR EACH ROW BEGIN
    DECLARE morning_deduction DECIMAL(10,2) DEFAULT 0.00;
    DECLARE afternoon_deduction DECIMAL(10,2) DEFAULT 0.00;
    DECLARE total_deduction DECIMAL(10,2) DEFAULT 0.00;

    -- Get the deduction for morning late time-in
    SELECT COALESCE(deduction, 0.00)
    INTO morning_deduction
    FROM deduction_table
    WHERE NEW.time_in_morning BETWEEN start_time AND end_time
    ORDER BY start_time DESC
    LIMIT 1;

    -- Get the deduction for afternoon late time-in
    SELECT COALESCE(deduction, 0.00)
    INTO afternoon_deduction
    FROM deduction_table
    WHERE NEW.time_in_afternoon BETWEEN start_time AND end_time
    ORDER BY start_time DESC
    LIMIT 1;

    -- Calculate total deduction
    SET total_deduction = morning_deduction + afternoon_deduction;

    -- Ensure credited days and deducted days match
    SET NEW.deducted_days = total_deduction;
    SET NEW.days_credited = 1 - total_deduction;
END
$$
DELIMITER ;
DELIMITER $$
CREATE TRIGGER `before_update_attendance` BEFORE UPDATE ON `attendance` FOR EACH ROW BEGIN
    DECLARE morning_deduction DECIMAL(10,2) DEFAULT 0.00;
    DECLARE afternoon_deduction DECIMAL(10,2) DEFAULT 0.00;
    DECLARE total_deduction DECIMAL(10,2) DEFAULT 0.00;

    -- If both time_in_morning and time_out_morning are NULL or '00:00:00', assign 0.50 deduction
    IF (NEW.time_in_morning IS NULL OR NEW.time_in_morning = '00:00:00') 
    AND (NEW.time_out_morning IS NULL OR NEW.time_out_morning = '00:00:00') THEN
        SET morning_deduction = 0.50;
    ELSE
        -- If morning time-in exists, get deduction from deduction_table
        SELECT COALESCE(deduction, 0.00)
        INTO morning_deduction
        FROM deduction_table
        WHERE NEW.time_in_morning BETWEEN start_time AND end_time
        ORDER BY start_time DESC
        LIMIT 1;
    END IF;

    -- Get deduction for afternoon late time-in (if employee is late)
    IF NEW.time_in_afternoon IS NOT NULL THEN
        SELECT COALESCE(deduction, 0.00)
        INTO afternoon_deduction
        FROM deduction_table
        WHERE NEW.time_in_afternoon BETWEEN start_time AND end_time
        ORDER BY start_time DESC
        LIMIT 1;
    END IF;

    -- Calculate total deduction
    SET total_deduction = morning_deduction + afternoon_deduction;

    -- Ensure credited days and deducted days match
    SET NEW.deducted_days = total_deduction;
    SET NEW.days_credited = 1 - total_deduction;
END
$$
DELIMITER ;

-- --------------------------------------------------------

--
-- Table structure for table `attendance_test`
--

CREATE TABLE `attendance_test` (
  `id` int(11) NOT NULL,
  `employee_id` int(11) NOT NULL,
  `date` date NOT NULL,
  `time_in_morning` time DEFAULT NULL,
  `time_out_morning` time DEFAULT NULL,
  `time_in_afternoon` time DEFAULT NULL,
  `time_out_afternoon` time DEFAULT NULL,
  `late_minutes` int(11) DEFAULT 0,
  `early_out_minutes` int(11) DEFAULT 0,
  `late_decimal_value` decimal(5,2) DEFAULT 0.00,
  `early_out_decimal_value` decimal(5,2) DEFAULT 0.00,
  `total_decimal_value` decimal(5,2) DEFAULT 0.00
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `attendance_test`
--

INSERT INTO `attendance_test` (`id`, `employee_id`, `date`, `time_in_morning`, `time_out_morning`, `time_in_afternoon`, `time_out_afternoon`, `late_minutes`, `early_out_minutes`, `late_decimal_value`, `early_out_decimal_value`, `total_decimal_value`) VALUES
(1, 1, '2023-10-01', '09:10:00', '12:00:00', '13:00:00', '18:11:00', NULL, 0, NULL, 0.00, NULL),
(234, 234, '2025-03-12', '14:04:47', '14:04:47', '14:04:47', '14:04:47', NULL, NULL, NULL, NULL, NULL),
(9234, 23674, '2025-03-12', '14:04:47', '14:04:47', '14:04:47', '14:04:47', 67, NULL, NULL, NULL, NULL);

-- --------------------------------------------------------

--
-- Table structure for table `deduction`
--

CREATE TABLE `deduction` (
  `deduction_id` int(11) NOT NULL,
  `employee_id` varchar(15) NOT NULL,
  `attendance_date` date NOT NULL,
  `minutes_late` int(11) NOT NULL DEFAULT 0,
  `deduction_rate` decimal(10,2) NOT NULL DEFAULT 0.00,
  `description` varchar(255) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `deduction_table`
--

CREATE TABLE `deduction_table` (
  `id` int(11) NOT NULL,
  `start_time` time NOT NULL,
  `end_time` time NOT NULL,
  `deduction` decimal(10,2) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `deduction_table`
--

INSERT INTO `deduction_table` (`id`, `start_time`, `end_time`, `deduction`) VALUES
(1, '09:06:00', '09:10:00', 0.03),
(2, '09:11:00', '09:15:00', 0.09),
(3, '09:16:00', '09:59:00', 0.25),
(4, '10:00:00', '10:30:00', 0.50),
(5, '10:31:00', '12:00:00', 0.50),
(6, '13:06:00', '13:10:00', 0.03),
(7, '13:11:00', '13:15:00', 0.09),
(8, '13:16:00', '13:59:00', 0.25),
(9, '14:00:00', '14:30:00', 0.50),
(10, '14:31:00', '17:00:00', 1.00);

-- --------------------------------------------------------

--
-- Table structure for table `departments`
--

CREATE TABLE `departments` (
  `department_id` varchar(11) NOT NULL,
  `department_name` varchar(100) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `departments`
--

INSERT INTO `departments` (`department_id`, `department_name`) VALUES
('002', 'SALES'),
('Admin-001', 'Admin Department'),
('DEP-001', 'IT DEPARTMENT');

--
-- Triggers `departments`
--
DELIMITER $$
CREATE TRIGGER `update_salary_department_name` AFTER UPDATE ON `departments` FOR EACH ROW BEGIN
    UPDATE salary_for_employee
    SET department_name = NEW.department_name
    WHERE department_name = OLD.department_name;
END
$$
DELIMITER ;

-- --------------------------------------------------------

--
-- Table structure for table `employees`
--

CREATE TABLE `employees` (
  `employee_id` varchar(15) NOT NULL,
  `first_name` varchar(50) NOT NULL,
  `middle_name` varchar(50) DEFAULT NULL,
  `last_name` varchar(50) NOT NULL,
  `email` varchar(100) DEFAULT NULL,
  `contact_number` varchar(20) DEFAULT NULL,
  `date_of_birth` date DEFAULT NULL,
  `department_id` varchar(11) DEFAULT NULL,
  `position_id` varchar(50) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `employees`
--

INSERT INTO `employees` (`employee_id`, `first_name`, `middle_name`, `last_name`, `email`, `contact_number`, `date_of_birth`, `department_id`, `position_id`) VALUES
('CJIS-001', 'Honey Jade', '', 'Wade', 'centraljuan.net@gmail.com', '09171799527', '2021-06-14', '002', 'SALES-001'),
('CJIS-2025-0001', 'Ragheil', 'Lagat', 'Atacador', 'ragheil123@gmail.com', '09491193137', '2025-07-18', 'DEP-001', 'POS-002');

--
-- Triggers `employees`
--
DELIMITER $$
CREATE TRIGGER `after_employee_insert` AFTER INSERT ON `employees` FOR EACH ROW BEGIN
    DECLARE full_name VARCHAR(150);
    DECLARE dept_name VARCHAR(100);
    DECLARE pos_name VARCHAR(100);

    -- Merge first_name, middle_name, and last_name into full_name
    SET full_name = CONCAT(
        NEW.first_name, 
        IF(NEW.middle_name IS NOT NULL AND NEW.middle_name != '', CONCAT(' ', NEW.middle_name), ''), 
        ' ', 
        NEW.last_name
    );

    -- Get department name from departments table
    SELECT department_name INTO dept_name 
    FROM departments 
    WHERE department_id = NEW.department_id;

    -- Get position name from positions table using the position_id from employees table
    SELECT position_name INTO pos_name 
    FROM positions 
    WHERE position_id = NEW.position_id;

    -- Insert the data into salary_for_employee with default values for position_level and step
    INSERT INTO salary_for_employee (
        employee_id, 
        employee_name, 
        department_name, 
        position_name, 
        position_level, 
        step
    ) VALUES (
        NEW.employee_id, 
        full_name, 
        IFNULL(dept_name, 'Unknown'), 
        IFNULL(pos_name, 'Unknown'),  -- Use the fetched position name or 'Unknown' if not found
        1, -- Default Position Level
        1  -- Default Step
    );
END
$$
DELIMITER ;
DELIMITER $$
CREATE TRIGGER `after_employee_name_update` AFTER UPDATE ON `employees` FOR EACH ROW BEGIN
    DECLARE full_name VARCHAR(150);

    -- Merge first_name, middle_name, and last_name into full_name
    SET full_name = CONCAT(
        NEW.first_name, 
        IF(NEW.middle_name IS NOT NULL AND NEW.middle_name != '', CONCAT(' ', NEW.middle_name), ''), 
        ' ', 
        NEW.last_name
    );

    -- Update the employee_name in salary_for_employee table
    UPDATE salary_for_employee 
    SET employee_name = full_name
    WHERE employee_id = NEW.employee_id;

END
$$
DELIMITER ;
DELIMITER $$
CREATE TRIGGER `new_after_employee_insert` AFTER INSERT ON `employees` FOR EACH ROW BEGIN
    INSERT INTO payroll (employee_id, name)
    VALUES (NEW.employee_id, CONCAT(NEW.first_name, ' ', COALESCE(NEW.middle_name, ''), ' ', NEW.last_name));
END
$$
DELIMITER ;
DELIMITER $$
CREATE TRIGGER `new_employee_payroll_update` AFTER UPDATE ON `employees` FOR EACH ROW BEGIN
    -- Ensure it updates the existing record instead of inserting a new one
    UPDATE payroll
    SET name = CONCAT(NEW.first_name, ' ', COALESCE(NEW.middle_name, ''), ' ', NEW.last_name)
    WHERE employee_id = NEW.employee_id;
END
$$
DELIMITER ;
DELIMITER $$
CREATE TRIGGER `update_department_name` AFTER UPDATE ON `employees` FOR EACH ROW BEGIN
    DECLARE dept_name VARCHAR(100);
    
    -- Fetch the new department name based on the new department_id
    SELECT department_name INTO dept_name FROM departments WHERE department_id = NEW.department_id;

    -- Update the salary_for_employee table with the new department name
    UPDATE salary_for_employee
    SET department_name = dept_name
    WHERE employee_id = NEW.employee_id;
END
$$
DELIMITER ;
DELIMITER $$
CREATE TRIGGER `update_employee_name` AFTER UPDATE ON `employees` FOR EACH ROW BEGIN
    UPDATE attendance
    SET employee_name = CONCAT(NEW.first_name, ' ', COALESCE(NEW.middle_name, ''), ' ', NEW.last_name)
    WHERE employee_id = NEW.employee_id;
END
$$
DELIMITER ;
DELIMITER $$
CREATE TRIGGER `update_position_name` AFTER UPDATE ON `employees` FOR EACH ROW BEGIN
    DECLARE pos_name VARCHAR(100);
    
    -- Fetch the new position name based on the new position_id
    SELECT position_name INTO pos_name FROM positions WHERE position_id = NEW.position_id;

    -- Update the salary_for_employee table with the new position name
    UPDATE salary_for_employee
    SET position_name = pos_name
    WHERE employee_id = NEW.employee_id;
END
$$
DELIMITER ;
DELIMITER $$
CREATE TRIGGER `update_salary_when_employee_updates` AFTER UPDATE ON `employees` FOR EACH ROW BEGIN
    UPDATE salary_for_employee sfe
    JOIN salary_grades sg ON sfe.position_level = sg.GradeID
    SET sfe.salary = CASE sfe.step
        WHEN 1 THEN sg.Step1
        WHEN 2 THEN sg.Step2
        WHEN 3 THEN sg.Step3
        ELSE sfe.salary
    END
    WHERE sfe.employee_id = NEW.employee_id;
END
$$
DELIMITER ;

-- --------------------------------------------------------

--
-- Table structure for table `fetch_log`
--

CREATE TABLE `fetch_log` (
  `id` int(11) NOT NULL,
  `last_fetch_date` date NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `fetch_log`
--

INSERT INTO `fetch_log` (`id`, `last_fetch_date`) VALUES
(1, '2025-03-10');

-- --------------------------------------------------------

--
-- Table structure for table `lateness_rules`
--

CREATE TABLE `lateness_rules` (
  `id` int(11) NOT NULL,
  `session_name` varchar(20) NOT NULL,
  `start_time` time NOT NULL,
  `grace_period` time NOT NULL,
  `required_end_time` time NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `lateness_rules`
--

INSERT INTO `lateness_rules` (`id`, `session_name`, `start_time`, `grace_period`, `required_end_time`) VALUES
(1, 'Morning', '09:00:00', '09:05:00', '12:00:00'),
(2, 'Afternoon', '13:00:00', '13:05:00', '18:00:00');

-- --------------------------------------------------------

--
-- Table structure for table `pagibig_contribution`
--

CREATE TABLE `pagibig_contribution` (
  `pagibig_contribution_id` int(11) NOT NULL,
  `employee_id` varchar(15) DEFAULT NULL,
  `employee_name` varchar(150) NOT NULL,
  `pagibig_ID` varchar(20) NOT NULL,
  `employee_share` decimal(10,2) NOT NULL,
  `employer_share` decimal(10,2) NOT NULL,
  `salary` decimal(10,2) NOT NULL,
  `semi_monthly_salary` decimal(10,2) NOT NULL,
  `total_contribution` decimal(10,2) NOT NULL,
  `total_salary` decimal(10,2) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `pagibig_contribution`
--

INSERT INTO `pagibig_contribution` (`pagibig_contribution_id`, `employee_id`, `employee_name`, `pagibig_ID`, `employee_share`, `employer_share`, `salary`, `semi_monthly_salary`, `total_contribution`, `total_salary`) VALUES
(45, 'CJIS-2025-0001', 'Ragheil Lagat Atacador', '', 239.72, 239.72, 11986.00, 5993.00, 479.44, 11746.28),
(46, 'CJIS-001', 'Honey Jade Wade', '', 239.72, 239.72, 11986.00, 5993.00, 479.44, 11746.28);

--
-- Triggers `pagibig_contribution`
--
DELIMITER $$
CREATE TRIGGER `before_insert_pagibig_contribution` BEFORE INSERT ON `pagibig_contribution` FOR EACH ROW BEGIN
    -- Set employee and employer share to 2% of monthly salary
    SET NEW.employee_share = NEW.salary * 0.02;
    SET NEW.employer_share = NEW.salary * 0.02;

    -- Calculate total contribution (employee + employer share)
    SET NEW.total_contribution = NEW.employee_share + NEW.employer_share;

    -- Calculate total salary after employee contribution is deducted
    SET NEW.total_salary = NEW.salary - NEW.employee_share;
END
$$
DELIMITER ;
DELIMITER $$
CREATE TRIGGER `before_update_pagibig_contribution` BEFORE UPDATE ON `pagibig_contribution` FOR EACH ROW BEGIN
    -- Ensure employee and employer share remain at 2%
    SET NEW.employee_share = NEW.salary * 0.02;
    SET NEW.employer_share = NEW.salary * 0.02;

    -- Recalculate total contribution when monthly_salary changes
    SET NEW.total_contribution = NEW.employee_share + NEW.employer_share;

    -- Recalculate total salary after employee contribution is deducted
    SET NEW.total_salary = NEW.salary - NEW.employee_share;
END
$$
DELIMITER ;

-- --------------------------------------------------------

--
-- Table structure for table `pagibig_contributions_2025`
--

CREATE TABLE `pagibig_contributions_2025` (
  `id` int(11) NOT NULL,
  `salary_range_min` decimal(10,2) NOT NULL,
  `salary_range_max` decimal(10,2) NOT NULL,
  `employee_share` decimal(10,2) NOT NULL,
  `employer_share` decimal(10,2) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `pagibig_contributions_2025`
--

INSERT INTO `pagibig_contributions_2025` (`id`, `salary_range_min`, `salary_range_max`, `employee_share`, `employer_share`) VALUES
(1, 0.00, 1499.99, 50.00, 50.00),
(2, 1500.00, 999999.99, 100.00, 100.00);

-- --------------------------------------------------------

--
-- Table structure for table `payroll`
--

CREATE TABLE `payroll` (
  `payroll_id` int(11) NOT NULL,
  `employee_id` varchar(15) NOT NULL,
  `name` varchar(150) NOT NULL,
  `department_id` varchar(11) DEFAULT NULL,
  `position_id` varchar(50) DEFAULT NULL,
  `date_from` date NOT NULL,
  `date_until` date DEFAULT NULL,
  `total_days` decimal(10,2) DEFAULT NULL,
  `total_salary` decimal(10,2) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `payroll`
--

INSERT INTO `payroll` (`payroll_id`, `employee_id`, `name`, `department_id`, `position_id`, `date_from`, `date_until`, `total_days`, `total_salary`) VALUES
(116, 'CJIS-2025-0001', 'Ragheil Lagat Atacador', 'DEP-001', 'POS-002', '2025-02-01', '2025-03-29', 0.75, 91.73),
(117, 'CJIS-001', 'Honey Jade  Wade', '002', 'SALES-001', '2025-02-01', '2025-03-14', 0.50, 83.24);

--
-- Triggers `payroll`
--
DELIMITER $$
CREATE TRIGGER `before_payroll_insert` BEFORE INSERT ON `payroll` FOR EACH ROW BEGIN
  DECLARE emp_department_id VARCHAR(11);
  DECLARE emp_position_id VARCHAR(50);

  -- Fetch department_id and position_id from employees table
  SELECT department_id, position_id INTO emp_department_id, emp_position_id 
  FROM employees WHERE employee_id = NEW.employee_id;

  -- Assign values to the new row
  SET NEW.department_id = emp_department_id;
  SET NEW.position_id = emp_position_id;
END
$$
DELIMITER ;
DELIMITER $$
CREATE TRIGGER `before_payroll_update` BEFORE UPDATE ON `payroll` FOR EACH ROW BEGIN
  DECLARE emp_department_id VARCHAR(11);
  DECLARE emp_position_id VARCHAR(50);

  -- Fetch latest department_id and position_id from employees table
  SELECT department_id, position_id INTO emp_department_id, emp_position_id 
  FROM employees WHERE employee_id = NEW.employee_id;

  -- Update payroll data
  SET NEW.department_id = emp_department_id;
  SET NEW.position_id = emp_position_id;
END
$$
DELIMITER ;
DELIMITER $$
CREATE TRIGGER `before_update_total_salary` BEFORE UPDATE ON `payroll` FOR EACH ROW BEGIN
    DECLARE emp_salary DECIMAL(10,2);

    -- Get the employee's semi-monthly salary from salary_for_employee
    SELECT semi_monthly_salary 
    INTO emp_salary
    FROM salary_for_employee 
    WHERE employee_id = NEW.employee_id;

    -- Calculate the new total salary before updating the row
    IF emp_salary IS NOT NULL THEN
        SET NEW.total_salary = ROUND((emp_salary / 13) * NEW.total_days, 2);
    END IF;
END
$$
DELIMITER ;
DELIMITER $$
CREATE TRIGGER `payroll_before_update` BEFORE UPDATE ON `payroll` FOR EACH ROW BEGIN
    DECLARE total_days_in_range INT;
    DECLARE total_days_credited DECIMAL(10,2);
    DECLARE emp_salary DECIMAL(10,2);

    -- Calculate total days in the range excluding Sundays
    SET total_days_in_range = (
        SELECT COUNT(*)
        FROM (
            SELECT DATE_ADD(NEW.date_from, INTERVAL n DAY) AS date
            FROM (
                SELECT @rownum := @rownum + 1 AS n
                FROM (SELECT 0 UNION ALL SELECT 1 UNION ALL SELECT 2 UNION ALL SELECT 3 UNION ALL SELECT 4 UNION ALL SELECT 5 UNION ALL SELECT 6 UNION ALL SELECT 7 UNION ALL SELECT 8 UNION ALL SELECT 9) t1,
                     (SELECT 0 UNION ALL SELECT 1 UNION ALL SELECT 2 UNION ALL SELECT 3 UNION ALL SELECT 4 UNION ALL SELECT 5 UNION ALL SELECT 6 UNION ALL SELECT 7 UNION ALL SELECT 8 UNION ALL SELECT 9) t2,
                     (SELECT @rownum := -1) r
            ) numbers
            WHERE DATE_ADD(NEW.date_from, INTERVAL n DAY) <= NEW.date_until
        ) AS date_range
        WHERE DAYOFWEEK(date) != 1  -- Exclude Sundays (1 = Sunday)
    );

    -- Calculate total days credited based on attendance
    SET total_days_credited = (
        SELECT COALESCE(SUM(days_credited), 0)
        FROM attendance
        WHERE 
            employee_id = NEW.employee_id
            AND attendance_date BETWEEN NEW.date_from AND NEW.date_until
    );

    -- Update total_days in payroll
    SET NEW.total_days = total_days_credited;

    -- Get the employee's semi-monthly salary
    SELECT semi_monthly_salary INTO emp_salary
    FROM salary_for_employee 
    WHERE employee_id = NEW.employee_id;

    -- Calculate total salary based on the semi-monthly salary and days credited
    IF emp_salary IS NOT NULL AND total_days_in_range > 0 THEN
        SET NEW.total_salary = ROUND((emp_salary / total_days_in_range) * total_days_credited, 2);
    ELSE
        SET NEW.total_salary = 0; -- Handle case where there are no valid days
    END IF;
END
$$
DELIMITER ;

-- --------------------------------------------------------

--
-- Table structure for table `philhealth_contribution`
--

CREATE TABLE `philhealth_contribution` (
  `PH_contribution_id` int(11) NOT NULL,
  `employee_id` varchar(15) DEFAULT NULL,
  `employee_name` varchar(100) NOT NULL,
  `ph_id` varchar(20) NOT NULL,
  `salary` decimal(10,2) NOT NULL,
  `semi_monthly_salary` decimal(10,2) NOT NULL,
  `premium_rate` decimal(5,4) NOT NULL,
  `employee_share` decimal(10,2) NOT NULL,
  `employer_share` decimal(10,2) NOT NULL,
  `total_contribution` decimal(10,2) NOT NULL DEFAULT 0.00,
  `total_salary` decimal(10,2) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `philhealth_contribution`
--

INSERT INTO `philhealth_contribution` (`PH_contribution_id`, `employee_id`, `employee_name`, `ph_id`, `salary`, `semi_monthly_salary`, `premium_rate`, `employee_share`, `employer_share`, `total_contribution`, `total_salary`) VALUES
(45, 'CJIS-2025-0001', 'Ragheil Lagat Atacador', '', 11986.00, 5993.00, 0.0000, 299.65, 299.65, 599.30, 11686.35),
(46, 'CJIS-001', 'Honey Jade Wade', '', 11986.00, 5993.00, 0.0000, 299.65, 299.65, 599.30, 11686.35);

--
-- Triggers `philhealth_contribution`
--
DELIMITER $$
CREATE TRIGGER `calculate_shares` BEFORE INSERT ON `philhealth_contribution` FOR EACH ROW BEGIN
    -- Calculate total contribution based on monthly salary and premium rate
    DECLARE total_contribution DECIMAL(10,2);
    
    SET total_contribution = ROUND((NEW.salary * 0.05), 2); -- Assuming premium_rate is 0.05 (5%)
    
    -- Calculate employee and employer shares
    SET NEW.employee_share = ROUND((total_contribution / 2), 2);
    SET NEW.employer_share = ROUND((total_contribution / 2), 2);
    
    -- Update total contribution
    SET NEW.total_contribution = ROUND((NEW.employee_share + NEW.employer_share), 2);
    
    -- Deduct only employee share from the monthly salary to get the total salary
    SET NEW.total_salary = ROUND((NEW.salary - NEW.employee_share), 2);
END
$$
DELIMITER ;
DELIMITER $$
CREATE TRIGGER `calculate_shares_on_update` BEFORE UPDATE ON `philhealth_contribution` FOR EACH ROW BEGIN
    -- Calculate total contribution based on monthly salary and premium rate
    DECLARE total_contribution DECIMAL(10,2);
    
    SET total_contribution = ROUND((NEW.salary * 0.05), 2); -- Assuming premium_rate is 0.05 (5%)
    
    -- Calculate employee and employer shares
    SET NEW.employee_share = ROUND((total_contribution / 2), 2);
    SET NEW.employer_share = ROUND((total_contribution / 2), 2);
    
    -- Update total contribution
    SET NEW.total_contribution = ROUND((NEW.employee_share + NEW.employer_share), 2);
    
    -- Deduct only employee share from the monthly salary to get the total salary
    SET NEW.total_salary = ROUND((NEW.salary - NEW.employee_share), 2);
END
$$
DELIMITER ;

-- --------------------------------------------------------

--
-- Table structure for table `philhealth_contributions_2025`
--

CREATE TABLE `philhealth_contributions_2025` (
  `id` int(11) NOT NULL,
  `salary_range_min` decimal(10,2) NOT NULL,
  `salary_range_max` decimal(10,2) NOT NULL,
  `premium_rate` decimal(5,4) NOT NULL,
  `employee_share` decimal(10,2) NOT NULL,
  `employer_share` decimal(10,2) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `philhealth_contributions_2025`
--

INSERT INTO `philhealth_contributions_2025` (`id`, `salary_range_min`, `salary_range_max`, `premium_rate`, `employee_share`, `employer_share`) VALUES
(1, 0.00, 9999.99, 0.0350, 175.00, 175.00),
(2, 10000.00, 79999.99, 0.0350, 175.00, 175.00),
(3, 80000.00, 999999.99, 0.0350, 1400.00, 1400.00);

-- --------------------------------------------------------

--
-- Table structure for table `positions`
--

CREATE TABLE `positions` (
  `position_id` varchar(50) NOT NULL,
  `position_name` varchar(255) NOT NULL,
  `department_id` varchar(11) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `positions`
--

INSERT INTO `positions` (`position_id`, `position_name`, `department_id`) VALUES
('Admin001', 'Admin Staff', 'Admin-001'),
('Admin002', 'Store Manager', 'Admin-001'),
('POS-001', 'Manager', 'DEP-001'),
('POS-002', 'Programmer', 'DEP-001'),
('SALES-001', 'Corporate Sales Professional', '002'),
('Sales-002', 'Sales Staff', '002');

-- --------------------------------------------------------

--
-- Table structure for table `salary_for_employee`
--

CREATE TABLE `salary_for_employee` (
  `salary_id` int(11) NOT NULL,
  `employee_id` varchar(15) NOT NULL,
  `employee_name` varchar(150) NOT NULL,
  `department_name` varchar(100) NOT NULL,
  `position_name` varchar(100) NOT NULL,
  `position_level` int(11) NOT NULL,
  `step` int(11) NOT NULL,
  `salary` decimal(10,2) DEFAULT NULL,
  `semi_monthly_salary` decimal(10,2) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `salary_for_employee`
--

INSERT INTO `salary_for_employee` (`salary_id`, `employee_id`, `employee_name`, `department_name`, `position_name`, `position_level`, `step`, `salary`, `semi_monthly_salary`) VALUES
(70, 'CJIS-2025-0001', 'Ragheil Lagat Atacador', 'IT DEPARTMENT', 'Programmer', 1, 1, 11986.00, 5993.00),
(71, 'CJIS-001', 'Honey Jade Wade', 'SALES', 'Corporate Sales Professional', 1, 1, 11986.00, 5993.00);

--
-- Triggers `salary_for_employee`
--
DELIMITER $$
CREATE TRIGGER `after_salary_insert` AFTER INSERT ON `salary_for_employee` FOR EACH ROW BEGIN
    -- Insert into SSS Contribution table


    -- Insert into PhilHealth Contribution table
    INSERT INTO philhealth_contribution (employee_id, employee_name, salary, semi_monthly_salary)
    VALUES (NEW.employee_id, NEW.employee_name, NEW.salary, NEW.semi_monthly_salary);

    -- Insert into Pag-IBIG Contribution table
    INSERT INTO pagibig_contribution (employee_id, employee_name, salary, semi_monthly_salary)
    VALUES (NEW.employee_id, NEW.employee_name, NEW.salary, NEW.semi_monthly_salary);
END
$$
DELIMITER ;
DELIMITER $$
CREATE TRIGGER `after_salary_update` AFTER UPDATE ON `salary_for_employee` FOR EACH ROW BEGIN
    -- Update SSS Contribution table
    UPDATE sss_contribution 
    SET employee_name = NEW.employee_name, 
        salary = NEW.salary, 
        semi_monthly_salary = NEW.semi_monthly_salary
    WHERE employee_id = NEW.employee_id;

    -- Update PhilHealth Contribution table
    UPDATE philhealth_contribution 
    SET employee_name = NEW.employee_name, 
        salary = NEW.salary, 
        semi_monthly_salary = NEW.semi_monthly_salary
    WHERE employee_id = NEW.employee_id;

    -- Update Pag-IBIG Contribution table
    UPDATE pagibig_contribution 
    SET employee_name = NEW.employee_name, 
        salary = NEW.salary, 
        semi_monthly_salary = NEW.semi_monthly_salary
    WHERE employee_id = NEW.employee_id;
END
$$
DELIMITER ;
DELIMITER $$
CREATE TRIGGER `apply_sss_contribution` AFTER INSERT ON `salary_for_employee` FOR EACH ROW BEGIN
    DECLARE emp_employer_share DECIMAL(10,2);
    DECLARE emp_employee_share DECIMAL(10,2);
    
    -- Find the employer and employee share based on the salary
    SELECT employer_share, employee_share INTO emp_employer_share, emp_employee_share
    FROM sss_contribution_table
    WHERE NEW.salary BETWEEN salary_from AND salary_to
    LIMIT 1; -- Assuming there is only one applicable range

    -- If a valid share is found, insert or update the SSS contribution
    IF emp_employer_share IS NOT NULL AND emp_employee_share IS NOT NULL THEN
        INSERT INTO sss_contribution (employee_id, employee_name, salary, semi_monthly_salary, employer_share, employee_share)
        VALUES (NEW.employee_id, NEW.employee_name, NEW.salary, NEW.semi_monthly_salary, emp_employer_share, emp_employee_share)
        ON DUPLICATE KEY UPDATE
            employer_share = emp_employer_share,
            employee_share = emp_employee_share,
            salary = NEW.salary,
            semi_monthly_salary = NEW.semi_monthly_salary;
    END IF;
END
$$
DELIMITER ;
DELIMITER $$
CREATE TRIGGER `apply_sss_contribution_update` AFTER UPDATE ON `salary_for_employee` FOR EACH ROW BEGIN
    DECLARE emp_employer_share DECIMAL(10,2);
    DECLARE emp_employee_share DECIMAL(10,2);
    
    -- Find the employer and employee share based on the updated salary
    SELECT employer_share, employee_share INTO emp_employer_share, emp_employee_share
    FROM sss_contribution_table
    WHERE NEW.salary BETWEEN salary_from AND salary_to
    LIMIT 1; -- Assuming there is only one applicable range

    -- If a valid share is found, update the SSS contribution
    IF emp_employer_share IS NOT NULL AND emp_employee_share IS NOT NULL THEN
        UPDATE sss_contribution
        SET employer_share = emp_employer_share,
            employee_share = emp_employee_share,
            salary = NEW.salary,
            semi_monthly_salary = NEW.semi_monthly_salary
        WHERE employee_id = NEW.employee_id;
    END IF;
END
$$
DELIMITER ;
DELIMITER $$
CREATE TRIGGER `set_salary_before_insert` BEFORE INSERT ON `salary_for_employee` FOR EACH ROW BEGIN
    DECLARE monthly_salary DECIMAL(10,2);
    DECLARE semi_monthly_salary DECIMAL(10,2);

    -- Get salary based on position level and step
    SELECT 
        CASE NEW.step
            WHEN 1 THEN sg.Step1
            WHEN 2 THEN sg.Step2
            WHEN 3 THEN sg.Step3
            ELSE NULL
        END 
    INTO monthly_salary
    FROM salary_grades sg
    WHERE sg.GradeID = NEW.position_level;

    -- If salary exists, calculate semi-monthly salary
    IF monthly_salary IS NOT NULL THEN
        SET semi_monthly_salary = (monthly_salary / 26) * 13;
        SET NEW.salary = monthly_salary;
        SET NEW.semi_monthly_salary = semi_monthly_salary;
    END IF;
END
$$
DELIMITER ;
DELIMITER $$
CREATE TRIGGER `update_salary_before_update` BEFORE UPDATE ON `salary_for_employee` FOR EACH ROW BEGIN
    DECLARE new_monthly_salary DECIMAL(10,2);
    DECLARE new_semi_monthly_salary DECIMAL(10,2);

    -- Get the correct salary based on position_level and step
    SELECT 
        CASE NEW.step
            WHEN 1 THEN sg.Step1
            WHEN 2 THEN sg.Step2
            WHEN 3 THEN sg.Step3
            ELSE NULL
        END 
    INTO new_monthly_salary
    FROM salary_grades sg
    WHERE sg.GradeID = NEW.position_level;

    -- Ensure salary exists
    IF new_monthly_salary IS NOT NULL THEN
        SET new_semi_monthly_salary = ROUND((new_monthly_salary / 26) * 13, 2);
        SET NEW.salary = new_monthly_salary;
        SET NEW.semi_monthly_salary = new_semi_monthly_salary;
    END IF;
END
$$
DELIMITER ;
DELIMITER $$
CREATE TRIGGER `update_total_salary_after_salary_change` AFTER UPDATE ON `salary_for_employee` FOR EACH ROW BEGIN
    UPDATE payroll 
    SET total_salary = ROUND((NEW.semi_monthly_salary / 13) * total_days, 2)
    WHERE employee_id = NEW.employee_id;
END
$$
DELIMITER ;

-- --------------------------------------------------------

--
-- Table structure for table `salary_grades`
--

CREATE TABLE `salary_grades` (
  `GradeID` int(11) NOT NULL,
  `PositionLevel` varchar(50) DEFAULT NULL,
  `Step1` decimal(10,2) DEFAULT NULL,
  `Step2` decimal(10,2) DEFAULT NULL,
  `Step3` decimal(10,2) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `salary_grades`
--

INSERT INTO `salary_grades` (`GradeID`, `PositionLevel`, `Step1`, `Step2`, `Step3`) VALUES
(1, 'Entry- Level', 11986.00, 11500.00, 12000.00),
(2, 'Junior-Level', 12500.00, 13000.00, 13500.00),
(3, 'Senior Staff\n', 14000.00, 14500.00, 15000.00),
(4, 'Supervisor\n', 15500.00, 16000.00, 16500.00),
(5, 'Assistant Manager\n', 17000.00, 17500.00, 18000.00),
(6, 'Manager\n', 18500.00, 19000.00, 19500.00);

-- --------------------------------------------------------

--
-- Table structure for table `sss_contribution`
--

CREATE TABLE `sss_contribution` (
  `SSS_Contribution_id` int(11) NOT NULL,
  `employee_id` varchar(15) DEFAULT NULL,
  `employee_name` varchar(150) NOT NULL,
  `sss_number` varchar(10) NOT NULL,
  `employer_share` decimal(10,2) NOT NULL,
  `employee_share` decimal(10,2) NOT NULL,
  `salary` decimal(10,2) NOT NULL,
  `semi_monthly_salary` decimal(10,2) NOT NULL,
  `total_contribution` decimal(10,2) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `sss_contribution`
--

INSERT INTO `sss_contribution` (`SSS_Contribution_id`, `employee_id`, `employee_name`, `sss_number`, `employer_share`, `employee_share`, `salary`, `semi_monthly_salary`, `total_contribution`) VALUES
(47, 'CJIS-2025-0001', 'Ragheil Lagat Atacador', '', 1210.00, 600.00, 11986.00, 5993.00, 1810.00),
(48, 'CJIS-001', 'Honey Jade Wade', '', 1210.00, 600.00, 11986.00, 5993.00, 1810.00);

--
-- Triggers `sss_contribution`
--
DELIMITER $$
CREATE TRIGGER `before_insert_sss_contribution` BEFORE INSERT ON `sss_contribution` FOR EACH ROW BEGIN
    -- Calculate total contribution as the sum of employer_share and employee_share
    SET NEW.total_contribution = NEW.employer_share + NEW.employee_share;
END
$$
DELIMITER ;
DELIMITER $$
CREATE TRIGGER `before_update_sss_contribution` BEFORE UPDATE ON `sss_contribution` FOR EACH ROW BEGIN
    -- Calculate total contribution as the sum of employer_share and employee_share
    SET NEW.total_contribution = NEW.employer_share + NEW.employee_share;
END
$$
DELIMITER ;

-- --------------------------------------------------------

--
-- Table structure for table `sss_contributions_2025`
--

CREATE TABLE `sss_contributions_2025` (
  `id` int(11) NOT NULL,
  `salary_range_min` decimal(10,2) NOT NULL,
  `salary_range_max` decimal(10,2) NOT NULL,
  `monthly_salary_credit` decimal(10,2) NOT NULL,
  `employee_share` decimal(10,2) NOT NULL,
  `employer_share` decimal(10,2) NOT NULL,
  `total_contribution` decimal(10,2) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `sss_contributions_2025`
--

INSERT INTO `sss_contributions_2025` (`id`, `salary_range_min`, `salary_range_max`, `monthly_salary_credit`, `employee_share`, `employer_share`, `total_contribution`) VALUES
(1, 0.00, 5250.00, 5000.00, 250.00, 260.00, 510.00),
(2, 5250.00, 5749.99, 5500.00, 275.00, 560.00, 835.00),
(3, 5750.00, 6249.99, 6000.00, 300.00, 610.00, 910.00),
(4, 6250.00, 6749.99, 6500.00, 325.00, 660.00, 985.00),
(5, 6750.00, 7249.99, 7000.00, 350.00, 710.00, 1060.00),
(6, 7250.00, 7749.99, 7500.00, 375.00, 760.00, 1135.00),
(7, 7750.00, 8249.99, 8000.00, 400.00, 810.00, 1210.00),
(8, 8250.00, 8749.99, 8500.00, 425.00, 860.00, 1285.00),
(9, 8750.00, 9249.99, 9000.00, 450.00, 910.00, 1360.00),
(10, 9250.00, 9749.99, 9500.00, 475.00, 960.00, 1435.00),
(11, 9750.00, 10249.99, 10000.00, 500.00, 1010.00, 1510.00),
(12, 10250.00, 10749.99, 10500.00, 525.00, 1060.00, 1585.00),
(13, 10750.00, 11249.99, 11000.00, 550.00, 1110.00, 1660.00),
(14, 11250.00, 11749.99, 11500.00, 575.00, 1160.00, 1735.00),
(15, 11750.00, 12249.99, 12000.00, 600.00, 1210.00, 1810.00),
(16, 12250.00, 12749.99, 12500.00, 625.00, 1260.00, 1885.00),
(17, 12750.00, 13249.99, 13000.00, 650.00, 1310.00, 1960.00),
(18, 13250.00, 13749.99, 13500.00, 675.00, 1360.00, 2035.00),
(19, 13750.00, 14249.99, 14000.00, 700.00, 1410.00, 2110.00),
(20, 14250.00, 14749.99, 14500.00, 725.00, 1460.00, 2185.00),
(21, 14750.00, 15249.99, 15000.00, 750.00, 1510.00, 2260.00),
(22, 15250.00, 15749.99, 15500.00, 775.00, 1560.00, 2335.00),
(23, 15750.00, 16249.99, 16000.00, 800.00, 1610.00, 2410.00),
(24, 16250.00, 16749.99, 16500.00, 825.00, 1660.00, 2485.00),
(25, 16750.00, 17249.99, 17000.00, 850.00, 1710.00, 2560.00),
(26, 17250.00, 17749.99, 17500.00, 875.00, 1760.00, 2635.00),
(27, 17750.00, 18249.99, 18000.00, 900.00, 1810.00, 2710.00),
(28, 18250.00, 18749.99, 18500.00, 925.00, 1860.00, 2785.00),
(29, 18750.00, 19249.99, 19000.00, 950.00, 1910.00, 2860.00),
(30, 19250.00, 19749.99, 19500.00, 975.00, 1960.00, 2935.00),
(31, 19750.00, 20249.99, 20000.00, 1000.00, 2010.00, 3010.00),
(32, 20250.00, 20749.99, 20500.00, 1025.00, 2060.00, 3085.00),
(33, 20750.00, 21249.99, 21000.00, 1050.00, 2110.00, 3160.00),
(34, 21250.00, 21749.99, 21500.00, 1075.00, 2160.00, 3235.00),
(35, 21750.00, 22249.99, 22000.00, 1100.00, 2210.00, 3310.00),
(36, 22250.00, 22749.99, 22500.00, 1125.00, 2260.00, 3385.00),
(37, 22750.00, 23249.99, 23000.00, 1150.00, 2310.00, 3460.00),
(38, 23250.00, 23749.99, 23500.00, 1175.00, 2360.00, 3535.00),
(39, 23750.00, 24249.99, 24000.00, 1200.00, 2410.00, 3610.00),
(40, 24250.00, 24749.99, 24500.00, 1225.00, 2460.00, 3685.00),
(41, 24750.00, 25249.99, 25000.00, 1250.00, 2510.00, 3760.00),
(42, 25250.00, 25749.99, 25500.00, 1275.00, 2560.00, 3835.00),
(43, 25750.00, 26249.99, 26000.00, 1300.00, 2610.00, 3910.00),
(44, 26250.00, 26749.99, 26500.00, 1325.00, 2660.00, 3985.00),
(45, 26750.00, 27249.99, 27000.00, 1350.00, 2710.00, 4060.00),
(46, 27250.00, 27749.99, 27500.00, 1375.00, 2760.00, 4135.00);

--
-- Triggers `sss_contributions_2025`
--
DELIMITER $$
CREATE TRIGGER `trg_before_insert_sss_total_contribution` BEFORE INSERT ON `sss_contributions_2025` FOR EACH ROW BEGIN
    SET NEW.total_contribution = NEW.employer_share + NEW.employee_share;
END
$$
DELIMITER ;
DELIMITER $$
CREATE TRIGGER `trg_before_update_sss_total_contribution` BEFORE UPDATE ON `sss_contributions_2025` FOR EACH ROW BEGIN
    SET NEW.total_contribution = NEW.employer_share + NEW.employee_share;
END
$$
DELIMITER ;

-- --------------------------------------------------------

--
-- Table structure for table `sss_contribution_table`
--

CREATE TABLE `sss_contribution_table` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `salary_from` decimal(10,2) DEFAULT NULL,
  `salary_to` decimal(10,2) DEFAULT NULL,
  `employer_share` decimal(10,2) DEFAULT NULL,
  `employee_share` decimal(10,2) DEFAULT NULL,
  `mpf_ee` decimal(10,2) DEFAULT NULL,
  `total_employee_share` decimal(10,2) DEFAULT NULL,
  `total_contribution` decimal(10,2) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `sss_contribution_table`
--

INSERT INTO `sss_contribution_table` (`id`, `salary_from`, `salary_to`, `employer_share`, `employee_share`, `mpf_ee`, `total_employee_share`, `total_contribution`) VALUES
(1, NULL, 5250.00, 510.00, 250.00, 0.00, 250.00, 760.00),
(2, 5250.00, 5749.99, 560.00, 275.00, 0.00, 275.00, 835.00),
(3, 5750.00, 6249.99, 610.00, 300.00, 0.00, 300.00, 910.00),
(4, 6250.00, 6749.99, 660.00, 325.00, 0.00, 325.00, 985.00),
(5, 6750.00, 7249.99, 710.00, 350.00, 0.00, 350.00, 1060.00),
(6, 7250.00, 7749.99, 760.00, 375.00, 0.00, 375.00, 1135.00),
(7, 7750.00, 8249.99, 810.00, 400.00, 0.00, 400.00, 1210.00),
(8, 8250.00, 8749.99, 860.00, 425.00, 0.00, 425.00, 1285.00),
(9, 8750.00, 9249.99, 910.00, 450.00, 0.00, 450.00, 1360.00),
(10, 9250.00, 9749.99, 960.00, 475.00, 0.00, 475.00, 1435.00),
(11, 9750.00, 10249.99, 1010.00, 500.00, 0.00, 500.00, 1510.00),
(12, 10250.00, 10749.99, 1060.00, 525.00, 0.00, 525.00, 1585.00),
(13, 10750.00, 11249.99, 1110.00, 550.00, 0.00, 550.00, 1660.00),
(14, 11250.00, 11749.99, 1160.00, 575.00, 0.00, 575.00, 1735.00),
(15, 11750.00, 12249.99, 1210.00, 600.00, 0.00, 600.00, 1810.00),
(16, 12250.00, 12749.99, 1260.00, 625.00, 0.00, 625.00, 1885.00),
(17, 12750.00, 13249.99, 1310.00, 650.00, 0.00, 650.00, 1960.00),
(18, 13250.00, 13749.99, 1360.00, 675.00, 0.00, 675.00, 2035.00),
(19, 13750.00, 14249.99, 1410.00, 700.00, 0.00, 700.00, 2110.00),
(20, 14250.00, 14749.99, 1460.00, 725.00, 0.00, 725.00, 2185.00),
(21, 14750.00, 15249.99, 1530.00, 750.00, 0.00, 750.00, 2280.00),
(22, 15250.00, 15749.99, 1580.00, 775.00, 0.00, 775.00, 2355.00),
(23, 15750.00, 16249.99, 1630.00, 800.00, 0.00, 800.00, 2430.00),
(24, 16250.00, 16749.99, 1680.00, 825.00, 0.00, 825.00, 2505.00),
(25, 16750.00, 17249.99, 1730.00, 850.00, 0.00, 850.00, 2580.00),
(26, 17250.00, 17749.99, 1780.00, 875.00, 0.00, 875.00, 2655.00),
(27, 17750.00, 18249.99, 1830.00, 900.00, 0.00, 900.00, 2730.00),
(28, 18250.00, 18749.99, 1880.00, 925.00, 0.00, 925.00, 2805.00),
(29, 18750.00, 19249.99, 1930.00, 950.00, 0.00, 950.00, 2880.00),
(30, 19250.00, 19749.99, 1980.00, 975.00, 0.00, 975.00, 2955.00),
(31, 19750.00, 20249.99, 2030.00, 1000.00, 0.00, 1000.00, 3030.00),
(32, 20250.00, 20749.99, 2080.00, 1000.00, 25.00, 1025.00, 3105.00),
(33, 20750.00, 21249.99, 2130.00, 1000.00, 50.00, 1050.00, 3180.00),
(34, 21250.00, 21749.99, 2180.00, 1000.00, 75.00, 1075.00, 3255.00),
(35, 21750.00, 22249.99, 2230.00, 1000.00, 100.00, 1100.00, 3330.00),
(36, 22250.00, 22749.99, 2280.00, 1000.00, 125.00, 1125.00, 3405.00),
(37, 22750.00, 23249.99, 2330.00, 1000.00, 150.00, 1150.00, 3480.00),
(38, 23250.00, 23749.99, 2380.00, 1000.00, 175.00, 1175.00, 3555.00),
(39, 23750.00, 24249.99, 2430.00, 1000.00, 200.00, 1200.00, 3630.00),
(40, 24250.00, 24749.99, 2480.00, 1000.00, 225.00, 1225.00, 3705.00),
(41, 24750.00, 25249.99, 2530.00, 1000.00, 250.00, 1250.00, 3780.00),
(42, 25250.00, 25749.99, 2580.00, 1000.00, 275.00, 1275.00, 3855.00),
(43, 25750.00, 26249.99, 2630.00, 1000.00, 300.00, 1300.00, 3930.00),
(44, 26250.00, 26749.99, 2680.00, 1000.00, 325.00, 1325.00, 4005.00),
(45, 26750.00, 27249.99, 2730.00, 1000.00, 350.00, 1350.00, 4080.00),
(46, 27250.00, 27749.99, 2780.00, 1000.00, 375.00, 1375.00, 4155.00),
(47, 27750.00, 28249.99, 2830.00, 1000.00, 400.00, 1400.00, 4230.00),
(48, 28250.00, 28749.99, 2880.00, 1000.00, 425.00, 1425.00, 4305.00),
(49, 28750.00, 29249.99, 2930.00, 1000.00, 450.00, 1450.00, 4380.00),
(50, 29250.00, 29749.99, 2980.00, 1000.00, 475.00, 1475.00, 4455.00),
(51, 29750.00, 30249.99, 3030.00, 1000.00, 500.00, 1500.00, 4530.00),
(52, 30250.00, 30749.99, 3080.00, 1000.00, 525.00, 1525.00, 4605.00),
(53, 30750.00, 31249.99, 3130.00, 1000.00, 550.00, 1550.00, 4680.00),
(54, 31250.00, 31749.99, 3180.00, 1000.00, 575.00, 1575.00, 4755.00),
(55, 31750.00, 32249.99, 3230.00, 1000.00, 600.00, 1600.00, 4830.00),
(56, 32250.00, 32749.99, 3280.00, 1000.00, 625.00, 1625.00, 4905.00),
(57, 32750.00, 33249.99, 3330.00, 1000.00, 650.00, 1650.00, 4980.00),
(58, 33250.00, 33749.99, 3380.00, 1000.00, 675.00, 1675.00, 5055.00),
(59, 33750.00, 34249.99, 3430.00, 1000.00, 700.00, 1700.00, 5130.00),
(60, 34250.00, 34749.99, 3480.00, 1000.00, 725.00, 1725.00, 5205.00),
(61, 34750.00, NULL, 3530.00, 1000.00, 750.00, 1750.00, 5280.00);

-- --------------------------------------------------------

--
-- Table structure for table `thirteenth_month_pays`
--

CREATE TABLE `thirteenth_month_pays` (
  `id` int(11) NOT NULL,
  `employee_name` varchar(150) NOT NULL,
  `employee_id` varchar(15) NOT NULL,
  `year` int(11) NOT NULL,
  `total_basic_salary` decimal(10,2) NOT NULL,
  `thirteenth_month_pay` decimal(10,2) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `users`
--

CREATE TABLE `users` (
  `user_id` int(11) NOT NULL,
  `username` varchar(50) NOT NULL,
  `password` varchar(255) NOT NULL,
  `role` varchar(50) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `users`
--

INSERT INTO `users` (`user_id`, `username`, `password`, `role`) VALUES
(1, 'admin', '21232f297a57a5a743894a0e4a801fc3', 'ADMIN'),
(2, 'hr', 'adab7b701f23bb82014c8506d3dc784e', 'hr'),
(3, 'kidor', '3d9f8ea8b6ee2c2b87bca306b125bcfa', 'kidor'),
(4, 'emp', 'ac8be4aee61f5f6e21b8c5afffb52939', 'employee');

--
-- Indexes for dumped tables
--

--
-- Indexes for table `attendance`
--
ALTER TABLE `attendance`
  ADD PRIMARY KEY (`attendance_id`),
  ADD KEY `employee_id` (`employee_id`);

--
-- Indexes for table `attendance_test`
--
ALTER TABLE `attendance_test`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `deduction`
--
ALTER TABLE `deduction`
  ADD PRIMARY KEY (`deduction_id`),
  ADD KEY `employee_id` (`employee_id`);

--
-- Indexes for table `deduction_table`
--
ALTER TABLE `deduction_table`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `departments`
--
ALTER TABLE `departments`
  ADD PRIMARY KEY (`department_id`);

--
-- Indexes for table `employees`
--
ALTER TABLE `employees`
  ADD PRIMARY KEY (`employee_id`),
  ADD KEY `department_id` (`department_id`),
  ADD KEY `fk_position` (`position_id`);

--
-- Indexes for table `fetch_log`
--
ALTER TABLE `fetch_log`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `lateness_rules`
--
ALTER TABLE `lateness_rules`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `pagibig_contribution`
--
ALTER TABLE `pagibig_contribution`
  ADD PRIMARY KEY (`pagibig_contribution_id`),
  ADD KEY `fk_pagibig_employee` (`employee_id`);

--
-- Indexes for table `pagibig_contributions_2025`
--
ALTER TABLE `pagibig_contributions_2025`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `payroll`
--
ALTER TABLE `payroll`
  ADD PRIMARY KEY (`payroll_id`),
  ADD KEY `employee_id` (`employee_id`);

--
-- Indexes for table `philhealth_contribution`
--
ALTER TABLE `philhealth_contribution`
  ADD PRIMARY KEY (`PH_contribution_id`),
  ADD KEY `fk_philhealth_employee` (`employee_id`);

--
-- Indexes for table `philhealth_contributions_2025`
--
ALTER TABLE `philhealth_contributions_2025`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `positions`
--
ALTER TABLE `positions`
  ADD PRIMARY KEY (`position_id`),
  ADD KEY `fk_department` (`department_id`);

--
-- Indexes for table `salary_for_employee`
--
ALTER TABLE `salary_for_employee`
  ADD PRIMARY KEY (`salary_id`),
  ADD KEY `employee_id` (`employee_id`),
  ADD KEY `position_level` (`position_level`);

--
-- Indexes for table `salary_grades`
--
ALTER TABLE `salary_grades`
  ADD PRIMARY KEY (`GradeID`),
  ADD KEY `idx_position_level` (`PositionLevel`);

--
-- Indexes for table `sss_contribution`
--
ALTER TABLE `sss_contribution`
  ADD PRIMARY KEY (`SSS_Contribution_id`),
  ADD KEY `fk_sss_employee` (`employee_id`);

--
-- Indexes for table `sss_contributions_2025`
--
ALTER TABLE `sss_contributions_2025`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `sss_contribution_table`
--
ALTER TABLE `sss_contribution_table`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `thirteenth_month_pays`
--
ALTER TABLE `thirteenth_month_pays`
  ADD PRIMARY KEY (`id`),
  ADD KEY `employee_id` (`employee_id`);

--
-- Indexes for table `users`
--
ALTER TABLE `users`
  ADD PRIMARY KEY (`user_id`),
  ADD UNIQUE KEY `username` (`username`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `attendance`
--
ALTER TABLE `attendance`
  MODIFY `attendance_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4564654;

--
-- AUTO_INCREMENT for table `attendance_test`
--
ALTER TABLE `attendance_test`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=9235;

--
-- AUTO_INCREMENT for table `deduction`
--
ALTER TABLE `deduction`
  MODIFY `deduction_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT for table `deduction_table`
--
ALTER TABLE `deduction_table`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=11;

--
-- AUTO_INCREMENT for table `fetch_log`
--
ALTER TABLE `fetch_log`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT for table `lateness_rules`
--
ALTER TABLE `lateness_rules`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT for table `pagibig_contribution`
--
ALTER TABLE `pagibig_contribution`
  MODIFY `pagibig_contribution_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=47;

--
-- AUTO_INCREMENT for table `pagibig_contributions_2025`
--
ALTER TABLE `pagibig_contributions_2025`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT for table `payroll`
--
ALTER TABLE `payroll`
  MODIFY `payroll_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=118;

--
-- AUTO_INCREMENT for table `philhealth_contribution`
--
ALTER TABLE `philhealth_contribution`
  MODIFY `PH_contribution_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=47;

--
-- AUTO_INCREMENT for table `philhealth_contributions_2025`
--
ALTER TABLE `philhealth_contributions_2025`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- AUTO_INCREMENT for table `salary_for_employee`
--
ALTER TABLE `salary_for_employee`
  MODIFY `salary_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=72;

--
-- AUTO_INCREMENT for table `sss_contribution`
--
ALTER TABLE `sss_contribution`
  MODIFY `SSS_Contribution_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=49;

--
-- AUTO_INCREMENT for table `sss_contributions_2025`
--
ALTER TABLE `sss_contributions_2025`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=50;

--
-- AUTO_INCREMENT for table `sss_contribution_table`
--
ALTER TABLE `sss_contribution_table`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=62;

--
-- AUTO_INCREMENT for table `thirteenth_month_pays`
--
ALTER TABLE `thirteenth_month_pays`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `users`
--
ALTER TABLE `users`
  MODIFY `user_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=5;

--
-- Constraints for dumped tables
--

--
-- Constraints for table `attendance`
--
ALTER TABLE `attendance`
  ADD CONSTRAINT `attendance_ibfk_1` FOREIGN KEY (`employee_id`) REFERENCES `employees` (`employee_id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `deduction`
--
ALTER TABLE `deduction`
  ADD CONSTRAINT `deduction_ibfk_1` FOREIGN KEY (`employee_id`) REFERENCES `employees` (`employee_id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `employees`
--
ALTER TABLE `employees`
  ADD CONSTRAINT `employees_ibfk_1` FOREIGN KEY (`department_id`) REFERENCES `departments` (`department_id`),
  ADD CONSTRAINT `fk_position` FOREIGN KEY (`position_id`) REFERENCES `positions` (`position_id`);

--
-- Constraints for table `pagibig_contribution`
--
ALTER TABLE `pagibig_contribution`
  ADD CONSTRAINT `fk_pagibig_employee` FOREIGN KEY (`employee_id`) REFERENCES `salary_for_employee` (`employee_id`) ON DELETE CASCADE;

--
-- Constraints for table `payroll`
--
ALTER TABLE `payroll`
  ADD CONSTRAINT `payroll_ibfk_1` FOREIGN KEY (`employee_id`) REFERENCES `employees` (`employee_id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `philhealth_contribution`
--
ALTER TABLE `philhealth_contribution`
  ADD CONSTRAINT `fk_philhealth_employee` FOREIGN KEY (`employee_id`) REFERENCES `salary_for_employee` (`employee_id`) ON DELETE CASCADE;

--
-- Constraints for table `positions`
--
ALTER TABLE `positions`
  ADD CONSTRAINT `fk_department` FOREIGN KEY (`department_id`) REFERENCES `departments` (`department_id`);

--
-- Constraints for table `salary_for_employee`
--
ALTER TABLE `salary_for_employee`
  ADD CONSTRAINT `salary_for_employee_ibfk_1` FOREIGN KEY (`employee_id`) REFERENCES `employees` (`employee_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `salary_for_employee_ibfk_2` FOREIGN KEY (`position_level`) REFERENCES `salary_grades` (`GradeID`) ON UPDATE CASCADE;

--
-- Constraints for table `sss_contribution`
--
ALTER TABLE `sss_contribution`
  ADD CONSTRAINT `fk_sss_contribution_employee` FOREIGN KEY (`employee_id`) REFERENCES `employees` (`employee_id`) ON DELETE CASCADE;

--
-- Constraints for table `thirteenth_month_pays`
--
ALTER TABLE `thirteenth_month_pays`
  ADD CONSTRAINT `thirteenth_month_pays_ibfk_1` FOREIGN KEY (`employee_id`) REFERENCES `employees` (`employee_id`) ON DELETE CASCADE ON UPDATE CASCADE;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
