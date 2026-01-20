-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1
-- Generation Time: Feb 25, 2025 at 07:03 AM
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

DELIMITER $$
--
-- Procedures
--
CREATE DEFINER=`root`@`localhost` PROCEDURE `update_total_salary` (IN `emp_id` VARCHAR(15))   BEGIN
    DECLARE salary_rate DECIMAL(10,2);
    DECLARE days_credit DECIMAL(10,2);

    -- Get the employee's semi-monthly salary
    SELECT semi_monthly_salary INTO salary_rate 
    FROM salary_for_employee 
    WHERE employee_id = emp_id;

    -- Get total days from payroll
    SELECT total_days INTO days_credit 
    FROM payroll 
    WHERE employee_id = emp_id;

    -- Calculate new total salary
    UPDATE payroll 
    SET total_salary = (salary_rate / 13) * days_credit
    WHERE employee_id = emp_id;
END$$

DELIMITER ;

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
  `overtime_hours` decimal(5,2) DEFAULT 0.00
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `attendance`
--

INSERT INTO `attendance` (`attendance_id`, `employee_id`, `employee_name`, `attendance_date`, `time_in_morning`, `time_out_morning`, `time_in_afternoon`, `time_out_afternoon`, `deducted_days`, `days_credited`, `overtime_hours`) VALUES
(110, 'CJIS-2025-0001', 'ragheu jd jds', '2025-02-17', '10:20:00', '11:59:00', '13:00:00', '16:05:00', 0.41, 0.59, 0.00),
(111, 'CJIS-2025-0001', 'ragheu jd jds', '2025-02-18', '10:00:00', '12:09:00', '14:00:00', '18:00:00', 0.00, 0.77, 0.00),
(112, 'CJIS-2025-0001', 'ragheu jd jds', '2025-02-19', '11:00:00', '12:00:00', '14:00:00', '17:00:00', 0.50, 0.50, 0.00),
(113, 'CJIS-2025-0001', 'ragheu jd jds', '2025-02-19', '09:00:00', '11:00:00', '14:00:00', '18:00:00', 0.25, 0.75, 0.00),
(114, 'CJIS-2025-0002', 'MANDO MNA CARDO', '2025-02-01', '09:00:00', '12:00:00', '15:00:00', '18:00:00', 0.25, 0.75, 0.00),
(115, 'CJIS-2025-0002', 'MANDO MNA CARDO', '2025-02-03', '10:00:00', '11:00:00', '13:00:00', '22:00:00', 0.00, 1.00, 2.00),
(117, 'CJIS-2025-0002', 'MANDO MNA CARDO', '2025-02-04', '09:00:00', '12:00:00', '13:30:00', '18:00:00', 0.06, 0.94, 0.00),
(118, 'CJIS-2025-0002', 'MANDO MNA CARDO', '2025-02-05', '09:00:00', '11:30:00', '13:30:00', '17:30:00', 0.19, 0.81, 0.00);

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
CREATE TRIGGER `calculate_days_credited` BEFORE INSERT ON `attendance` FOR EACH ROW BEGIN
    DECLARE total_hours DECIMAL(5, 2);
    DECLARE morning_hours DECIMAL(5, 2);
    DECLARE afternoon_hours DECIMAL(5, 2);
    
    -- Calculate morning hours (Max 3 hours from 9:00 AM - 12:00 PM)
    SET morning_hours = 
        LEAST(3, GREATEST(0, TIMESTAMPDIFF(MINUTE, GREATEST(NEW.time_in_morning, '09:00:00'), LEAST(NEW.time_out_morning, '12:00:00')) / 60));
    
    -- Calculate afternoon hours (Max 5 hours from 1:00 PM - 6:00 PM)
    SET afternoon_hours = 
        LEAST(5, GREATEST(0, TIMESTAMPDIFF(MINUTE, GREATEST(NEW.time_in_afternoon, '13:00:00'), LEAST(NEW.time_out_afternoon, '18:00:00')) / 60));
    
    -- Calculate total working hours (Max 9 hours per day)
    SET total_hours = morning_hours + afternoon_hours;
    
    -- Calculate days credited
    IF total_hours >= 8 THEN
        SET NEW.days_credited = 1;
        SET NEW.overtime_hours = total_hours - 8;
    ELSE
        SET NEW.days_credited = total_hours / 8;
        SET NEW.overtime_hours = 0;
    END IF;
END
$$
DELIMITER ;
DELIMITER $$
CREATE TRIGGER `update_days_credited` BEFORE UPDATE ON `attendance` FOR EACH ROW BEGIN
    DECLARE total_hours DECIMAL(5,2);
    DECLARE morning_hours DECIMAL(5,2);
    DECLARE afternoon_hours DECIMAL(5,2);
    DECLARE overtime_hours DECIMAL(5,2);

    -- Calculate morning hours
    IF NEW.time_in_morning IS NOT NULL AND NEW.time_out_morning IS NOT NULL THEN
        SET morning_hours = TIMESTAMPDIFF(MINUTE, NEW.time_in_morning, NEW.time_out_morning) / 60;
    ELSE
        SET morning_hours = 0;
    END IF;

    -- Calculate afternoon hours
    IF NEW.time_in_afternoon IS NOT NULL AND NEW.time_out_afternoon IS NOT NULL THEN
        SET afternoon_hours = TIMESTAMPDIFF(MINUTE, NEW.time_in_afternoon, NEW.time_out_afternoon) / 60;
    ELSE
        SET afternoon_hours = 0;
    END IF;

    -- Calculate total working hours
    SET total_hours = morning_hours + afternoon_hours;

    -- Ensure overtime doesn't affect days credited
    IF total_hours >= 8 THEN
        SET NEW.days_credited = 1;
        SET overtime_hours = (total_hours - 8) / 8;
    ELSE
        SET NEW.days_credited = total_hours / 8;
        SET overtime_hours = 0;
    END IF;

    -- Calculate deducted days (1 full workday minus credited work)
    SET NEW.deducted_days = 1 - NEW.days_credited;

    -- Store overtime days separately
    SET NEW.overtime_hours = overtime_hours;

END
$$
DELIMITER ;
DELIMITER $$
CREATE TRIGGER `update_deducted_days` BEFORE INSERT ON `attendance` FOR EACH ROW BEGIN
    SET NEW.deducted_days = 1 - NEW.days_credited;
END
$$
DELIMITER ;
DELIMITER $$
CREATE TRIGGER `update_deducted_days_on_update` BEFORE UPDATE ON `attendance` FOR EACH ROW BEGIN
    SET NEW.deducted_days = 1 - NEW.days_credited;
END
$$
DELIMITER ;

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

--
-- Dumping data for table `deduction`
--

INSERT INTO `deduction` (`deduction_id`, `employee_id`, `attendance_date`, `minutes_late`, `deduction_rate`, `description`) VALUES
(1, 'CJIS-2025-0001', '2025-02-22', 12, 0.00, NULL);

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
('DEP-001', 'IT Deboto'),
('DEP-002', 'Sales'),
('DEP-003', 'TARANTADO'),
('TEST', 'TEST'),
('test dept', 'test dep dept'),
('TEST2', 'TEST2'),
('test3', 'test3');

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
('1231T7283612312', 'JQKRHEIQHHERQW', 'werwerwerjlkwjelrjwer', 'werwherjgwqjgrjkgq', 'qwehI@jjqwjeb.com', '102380918231', '2025-02-25', 'DEP-003', 'POS-004'),
('CJIS-2025-0001', 'ragheu', 'jd', 'jds', 'dk@sd.h', '32234432243', '2025-02-22', 'DEP-001', 'POS-001'),
('CJIS-2025-0002', 'MANDO', 'MNA', 'CARDO', 'SDAF@D.D', '2343324', '4344-03-31', 'test dept', '1'),
('CJIS-2025-0003', 'gadiel', 'asd', 'asd', 'asd@sdf.g', '34545', '1111-11-11', 'DEP-001', 'asdasdasd'),
('CJIS-2025-0004', 'test', 'test', 'tes', 'tset@gmssd.sd', '23424234', '2345-06-05', 'DEP-001', 'POS-001');

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
CREATE TRIGGER `after_employee_insert_update` AFTER INSERT ON `employees` FOR EACH ROW BEGIN
    INSERT INTO payroll (employee_id, date_from, date_until, total_days, total_salary)
    VALUES (NEW.employee_id, CURDATE(), CURDATE(), 0, 0.00)
    ON DUPLICATE KEY UPDATE date_until = CURDATE();
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
-- Table structure for table `payroll`
--

CREATE TABLE `payroll` (
  `payroll_id` int(11) NOT NULL,
  `employee_id` varchar(15) NOT NULL,
  `date_from` date NOT NULL,
  `date_until` date DEFAULT NULL,
  `total_days` decimal(10,2) DEFAULT NULL,
  `total_salary` decimal(10,2) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `payroll`
--

INSERT INTO `payroll` (`payroll_id`, `employee_id`, `date_from`, `date_until`, `total_days`, `total_salary`) VALUES
(48, 'CJIS-2025-0001', '2025-01-31', '2025-02-27', 2.61, 1305.00),
(49, 'CJIS-2025-0002', '2025-01-31', '2025-02-27', 5.50, 15615.38),
(52, '1231T7283612312', '2025-01-31', '2025-02-27', 0.00, 0.00);

--
-- Triggers `payroll`
--
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
CREATE TRIGGER `payroll_before_insert` BEFORE INSERT ON `payroll` FOR EACH ROW BEGIN
    SET NEW.total_days = (
        SELECT COALESCE(SUM(days_credited + overtime_hours), 0)
        FROM attendance
        WHERE 
            employee_id = NEW.employee_id
            AND attendance_date BETWEEN NEW.date_from AND NEW.date_until
    );
END
$$
DELIMITER ;
DELIMITER $$
CREATE TRIGGER `payroll_before_update` BEFORE UPDATE ON `payroll` FOR EACH ROW BEGIN
    IF 
        OLD.employee_id != NEW.employee_id 
        OR OLD.date_from != NEW.date_from 
        OR OLD.date_until != NEW.date_until 
    THEN
        SET NEW.total_days = (
            SELECT COALESCE(SUM(days_credited + overtime_hours), 0)
            FROM attendance
            WHERE 
                employee_id = NEW.employee_id
                AND attendance_date BETWEEN NEW.date_from AND NEW.date_until
        );
    END IF;
END
$$
DELIMITER ;

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
('1', 'dept -1', 'test dept'),
('2', 'dept-2', 'test dept'),
('3', 'depts-3', 'test dept'),
('asd', 'takilid', 'DEP-001'),
('asdasd', 'asdasdasd', 'TEST2'),
('asdasdasd', 'sayooooo', 'DEP-001'),
('POS-001', 'Manager', 'DEP-001'),
('POS-002', 'Accountant', 'DEP-002'),
('POS-003', 'Sales Man', 'DEP-002'),
('POS-004', 'Programmer', 'DEP-003'),
('sasdasd', 'asdasdasdasd', 'DEP-001'),
('TEST', 'TEST', 'TEST'),
('TEST2', 'TEST2', 'TEST'),
('wqeqwe', 'qweqweq', 'test3');

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
(7, 'CJIS-2025-0001', 'ragheu jd jds', 'IT Deboto', 'Manager', 2, 2, 13000.00, 6500.00),
(8, 'CJIS-2025-0002', 'MANDO MNA CARDO', 'test dep dept', 'dept -1', 2, 0, 14500.00, 7250.00),
(9, 'CJIS-2025-0003', 'gadiel asd asd', 'IT Deboto', 'asdasdasdasx', 1, 2, 11500.00, 5750.00),
(10, 'CJIS-2025-0004', 'test test tes', 'IT Deboto', 'Manager', 3, 3, 999.99, 499.99),
(12, '1231T7283612312', 'JQKRHEIQHHERQW werwerwerjlkwjelrjwer werwherjgwqjgrjkgq', 'TARANTADO', 'Programmer', 1, 1, 11000.00, 5500.00);

--
-- Triggers `salary_for_employee`
--
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
(1, 'Entry-Level\n', 11000.00, 11500.00, 12000.00),
(2, 'Junior Staff\n', 12500.00, 13000.00, 13500.00),
(3, 'Senior Staff\n', 14000.00, 14500.00, 15000.00),
(4, 'Supervisor\n', 15500.00, 16000.00, 16500.00),
(5, 'Assistant Manager\n', 17000.00, 17500.00, 18000.00),
(6, 'Manager\n', 18500.00, 19000.00, 19500.00),
(7, 'test1\n', 20000.00, 20500.00, 21000.00),
(8, 'Part Timer', 34234.00, 23423.00, 1569.99);

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
(3, 'kidor', '3d9f8ea8b6ee2c2b87bca306b125bcfa', 'kidor');

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
-- Indexes for table `deduction`
--
ALTER TABLE `deduction`
  ADD PRIMARY KEY (`deduction_id`),
  ADD KEY `employee_id` (`employee_id`);

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
-- Indexes for table `payroll`
--
ALTER TABLE `payroll`
  ADD PRIMARY KEY (`payroll_id`),
  ADD KEY `employee_id` (`employee_id`);

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
  MODIFY `attendance_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=119;

--
-- AUTO_INCREMENT for table `deduction`
--
ALTER TABLE `deduction`
  MODIFY `deduction_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT for table `payroll`
--
ALTER TABLE `payroll`
  MODIFY `payroll_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=53;

--
-- AUTO_INCREMENT for table `salary_for_employee`
--
ALTER TABLE `salary_for_employee`
  MODIFY `salary_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=13;

--
-- AUTO_INCREMENT for table `thirteenth_month_pays`
--
ALTER TABLE `thirteenth_month_pays`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `users`
--
ALTER TABLE `users`
  MODIFY `user_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

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
-- Constraints for table `payroll`
--
ALTER TABLE `payroll`
  ADD CONSTRAINT `payroll_ibfk_1` FOREIGN KEY (`employee_id`) REFERENCES `employees` (`employee_id`) ON DELETE CASCADE ON UPDATE CASCADE;

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
-- Constraints for table `thirteenth_month_pays`
--
ALTER TABLE `thirteenth_month_pays`
  ADD CONSTRAINT `thirteenth_month_pays_ibfk_1` FOREIGN KEY (`employee_id`) REFERENCES `employees` (`employee_id`) ON DELETE CASCADE ON UPDATE CASCADE;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
