-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1:3307
-- Generation Time: May 21, 2025 at 09:58 AM
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
  `create_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `overtime_request` decimal(10,2) DEFAULT 0.00
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `attendance`
--

INSERT INTO `attendance` (`attendance_id`, `employee_id`, `employee_name`, `attendance_date`, `time_in_morning`, `time_out_morning`, `time_in_afternoon`, `time_out_afternoon`, `deducted_days`, `days_credited`, `overtime_hours`, `create_at`, `overtime_request`) VALUES
(4565236, 'CJIS-2025-0001', 'Ragheil Lagat  Atacador ', '2025-04-27', '09:53:00', '08:53:00', '08:53:00', '08:53:00', 0.25, 0.75, 0.00, '2025-05-10 11:12:15', 0.00),
(4565254, 'CJIS-2025-0018', 'Delia Bacus  Lagat', '2025-04-27', '09:54:00', '09:54:00', '09:54:00', '09:54:00', 0.50, 0.50, 0.00, '2025-04-27 13:54:43', 0.00),
(4565256, 'CJIS-2025-0017', 'Gheinald Lagat Pajutining', '2025-04-28', '07:25:00', '06:44:00', '00:00:00', '06:44:00', 1.00, 0.00, 0.00, '2025-04-28 10:44:25', 0.00),
(4565262, 'CJIS-2025-0002', 'Alan Tumulak Ang', '2025-04-28', '00:00:00', '12:00:00', '14:44:00', '18:00:00', 1.00, 0.00, 0.00, '2025-05-09 09:15:04', 4.00),
(4565267, 'CJIS-2025-0022', 'Luis   Naval', '2025-04-29', '00:00:00', '00:00:00', '00:00:00', '00:00:00', 1.50, -0.50, 0.00, '2025-04-29 02:31:20', 0.00),
(4565269, 'CJIS-2025-0020', 'Ailyn May Morcilla Tongol ', '2025-04-29', '08:50:00', '12:00:00', '00:00:00', '18:00:00', 1.00, 0.00, 0.00, '2025-05-07 05:54:25', 0.00),
(4565270, 'CJIS-2025-0022', 'Louis Gio  Noval', '2025-04-29', '09:14:00', '12:00:00', '00:00:00', '18:00:00', 1.09, -0.09, 0.00, '2025-04-29 01:16:45', 0.00),
(4565273, 'CJIS-2025-0001', 'Ragheil Lagat  Atacador ', '2025-04-29', '11:29:00', '11:41:00', '11:42:00', '03:17:00', 1.00, 0.00, 0.00, '2025-05-06 14:02:40', 3.00),
(4565275, 'CJIS-2025-0001', 'Ragheil Lagat  Atacador ', '2025-05-01', '12:52:00', '01:19:00', '08:23:00', '08:23:00', 0.00, 1.00, 0.00, '2025-05-06 14:02:40', 0.00),
(4565276, 'CJIS-2025-0020', 'Ailyn May Morcilla Tongol ', '2025-04-30', '08:56:00', '00:00:00', '00:00:00', '00:00:00', 1.00, 0.00, 0.00, '2025-05-07 05:54:25', 0.00),
(4565277, 'CJIS-2025-0002', 'Alan Tumulak Ang', '2025-04-30', '08:58:00', '12:00:00', '00:00:00', '00:00:00', 1.00, 0.00, 0.00, '2025-04-30 04:00:13', 0.00),
(4565278, 'CJIS-2025-0022', 'Luis   Naval', '2025-05-01', '09:00:00', '00:00:00', '13:00:00', '18:00:00', 0.00, 1.00, 0.00, '2025-05-01 13:25:42', 0.00),
(4565279, 'CJIS-2025-0003', 'oy midddle  oy', '2025-04-30', '00:00:00', '00:00:00', '03:01:00', '00:00:00', 1.50, -0.50, 0.00, '2025-05-05 11:15:26', 0.00),
(4565280, 'CJIS-2025-0003', 'oy midddle  oy', '2025-04-30', '00:00:00', '00:00:00', '03:01:00', '06:24:00', 1.50, -0.50, 0.00, '2025-05-05 11:15:26', 0.00),
(4565282, 'CJIS-2025-0020', 'Ailyn May Morcilla Tongol ', '2025-05-01', '08:50:00', '00:00:00', '00:00:00', '06:00:00', 1.00, 0.00, 0.00, '2025-05-07 05:54:25', 0.00),
(4565284, 'CJIS-2025-0019', 'Ivan Jay  Daigdigan', '2025-05-02', '09:04:00', '00:00:00', '00:00:00', '00:00:00', 1.00, 0.00, 0.00, '2025-05-02 01:40:08', 0.00),
(4565285, 'CJIS-2025-0022', 'Louis Gio  Noval', '2025-05-02', '09:30:00', '00:00:00', '13:00:00', '06:01:00', 0.25, 0.75, 0.00, '2025-05-02 10:01:56', 0.00),
(4565286, 'CJIS-2025-0002', 'Alan Tumulak Ang', '2025-05-02', '00:00:00', '00:00:00', '00:00:00', '05:53:00', 1.50, -0.50, 0.00, '2025-05-05 11:14:05', 0.00),
(4565287, 'CJIS-2025-0003', 'oy midddle  oy', '2025-05-02', '00:00:00', '00:00:00', '00:00:00', '05:59:00', 1.50, -0.50, 0.00, '2025-05-05 11:15:26', 0.00),
(4565288, 'CJIS-2025-0001', 'Ragheil Lagat  Atacador ', '2025-05-02', '10:25:00', '10:25:00', '10:25:00', '10:25:00', 1.00, 0.00, 0.00, '2025-05-06 14:02:40', 4.43),
(4565290, 'CJIS-2025-0002', 'Alan Tumulak Ang', '2025-05-03', '09:10:00', '02:45:00', '00:00:00', '00:00:00', 1.03, -0.03, 0.00, '2025-05-03 06:45:57', 0.00),
(4565291, 'CJIS-2025-0024', 'ricardo  Rimando', '2025-05-05', '09:00:00', '12:00:00', '13:00:00', '00:00:00', 0.00, 1.00, 0.00, '2025-05-15 01:21:59', 0.00),
(4565292, 'CJIS-2025-0002', 'Alan Tumulak Ang', '2025-05-05', '00:00:00', '00:00:00', '06:48:00', '06:38:00', 1.50, -0.50, 0.00, '2025-05-05 10:48:18', 0.00),
(4565293, 'CJIS-2025-0002', 'Alan Tumulak Ang', '2025-05-05', '00:00:00', '00:00:00', '06:38:00', '06:38:00', 1.50, -0.50, 0.00, '2025-05-05 11:14:05', 0.00),
(4565295, '1000', 'y do u mean', '2025-05-05', NULL, NULL, NULL, NULL, 0.00, 1.00, 0.00, '2025-05-05 11:51:03', 0.00),
(4565296, 'CJIS-2025-0001', 'Ragheil Lagat  Atacador ', '2025-05-05', '09:20:00', '09:22:00', '00:00:00', '00:00:00', 0.75, 0.25, 0.00, '2025-05-15 01:42:52', 0.00),
(4565298, 'CJIS-2025-0020', 'Ailyn May Morcilla Tongol ', '2025-05-06', '08:52:00', '12:00:00', '13:00:00', '06:00:00', 0.00, 1.00, 0.00, '2025-05-07 05:54:25', 0.00),
(4565299, 'CJIS-2025-0019', 'Ivan Jay  Daigdigan', '2025-05-06', '08:52:00', '12:00:00', '13:00:00', '06:01:00', 0.00, 1.00, 0.00, '2025-05-06 10:01:19', 0.00),
(4565301, 'CJIS-2025-0022', 'Louis Gio  Noval', '2025-05-06', '09:26:00', '12:26:00', '13:00:00', '06:01:00', 0.25, 0.75, 0.00, '2025-05-06 10:01:43', 0.00),
(4565302, 'CJIS-2025-0019', 'Ivan Jay  Daigdigan', '2025-05-06', '00:00:00', '12:00:00', '00:00:00', '00:00:00', 2.00, -1.00, 0.00, '2025-05-06 04:00:36', 0.00),
(4565303, 'CJIS-2025-0001', 'Ragheil Lagat  Atacador ', '2025-05-06', '09:00:00', '12:00:00', '00:00:00', '00:00:00', 0.50, 0.50, 0.00, '2025-05-08 09:24:38', 0.00),
(4565304, 'CJIS-2025-0019', 'Ivan Jay  Daigdigan', '2025-05-06', '00:00:00', '12:00:00', '01:14:00', '00:00:00', 2.00, -1.00, 0.00, '2025-05-06 05:14:01', 0.00),
(4565305, 'CJIS-2025-0022', 'Luis   Naval', '2025-05-03', '09:13:00', '12:00:00', '13:00:00', '18:00:00', 0.09, 0.91, 0.00, '2025-05-06 05:24:53', 0.00),
(4565306, 'CJIS-2025-0001', 'Ragheil Lagat  Atacador ', '2025-05-03', '09:00:00', '12:00:00', '00:00:00', '00:00:00', 0.50, 0.50, 0.00, '2025-05-09 10:27:37', 0.00),
(4565309, 'CJIS-2025-0020', 'Ailyn May Morcilla Tongol ', '2025-05-07', '08:57:00', '12:11:00', '00:00:00', '00:00:00', 1.00, 0.00, 0.00, '2025-05-07 05:54:25', 0.00),
(4565310, 'CJIS-2025-0020', 'Ailyn May Morcilla Tongol ', '2025-05-07', '08:57:00', '00:00:00', '00:00:00', '00:00:00', 1.00, 0.00, 0.00, '2025-05-07 05:54:25', 0.00),
(4565311, 'CJIS-2025-0022', 'Luis   Naval', '2025-05-07', '09:22:00', '12:00:00', '13:00:00', '18:00:00', 0.25, 0.75, 0.00, '2025-05-08 05:12:49', 0.00),
(4565313, 'CJIS-2025-0019', 'Ivan Jay  Daigdigan', '2025-05-08', '08:56:00', '12:00:00', '12:32:00', '05:59:00', 0.00, 1.00, 0.00, '2025-05-08 10:00:02', 0.00),
(4565314, 'CJIS-2025-0020', 'Ailyn May Morcilla Tongol', '2025-05-08', '08:52:00', '12:00:00', '12:37:00', '00:00:00', 0.00, 1.00, 0.00, '2025-05-08 04:37:18', 0.00),
(4565315, 'CJIS-2025-0020', 'Ailyn May Morcilla Tongol', '2025-05-08', '09:01:00', '00:00:00', '00:00:00', '00:00:00', 1.00, 0.00, 0.00, '2025-05-08 01:37:20', 0.00),
(4565316, 'CJIS-2025-0022', 'Louis Gio  Noval', '2025-05-08', '00:00:00', '00:00:00', '01:07:00', '18:00:00', 0.50, 0.50, 0.00, '2025-05-08 10:00:43', 0.00),
(4565317, 'CJIS-2025-0001', 'Ragheil Lagat  Atacador ', '2025-05-07', '09:06:00', '12:00:00', '00:00:00', '00:00:00', 0.53, 0.47, 0.00, '2025-05-08 06:21:38', 0.00),
(4565318, 'CJIS-2025-0001', 'Ragheil Lagat  Atacador ', '2025-05-15', '09:00:00', '00:00:00', '00:00:00', '00:00:00', 0.50, 0.50, 0.00, '2025-05-08 06:21:13', 0.00),
(4565319, 'CJIS-2025-0020', 'Ailyn May Morcilla Tongol', '2025-05-09', '08:55:00', '00:00:00', '00:00:00', '00:00:00', 0.50, 0.50, 0.00, '2025-05-09 00:56:00', 0.00),
(4565320, 'CJIS-2025-0022', 'Louis Gio  Noval', '2025-05-10', '09:17:00', '00:00:00', '00:00:00', '00:00:00', 0.75, 0.25, 0.00, '2025-05-10 01:20:36', 0.00),
(4565321, 'CJIS-2025-0001', 'Ragheil Lagat Atacador', '2025-05-10', '09:22:17', NULL, NULL, NULL, 0.25, 0.75, 0.00, '2025-05-10 11:23:20', 0.00),
(4565323, 'CJIS-2025-0019', 'Ivan Jay  Daigdigan', '2025-05-13', '09:00:00', '00:00:00', '01:00:00', '06:00:00', 0.00, 1.00, 0.00, '2025-05-13 10:00:04', 0.00),
(4565324, 'CJIS-2025-0022', 'Luis   Naval', '2025-05-13', '09:08:00', '12:03:00', '13:00:00', '18:05:00', 0.03, 0.97, 0.08, '2025-05-14 02:59:44', 0.00),
(4565325, 'CJIS-2025-0022', 'Louis Gio  Noval', '2025-05-12', '09:39:00', '00:00:00', '00:00:00', '00:00:00', 0.75, 0.25, 0.00, '2025-05-13 01:39:58', 0.00),
(4565326, 'CJIS-2025-0003', 'oy midddle  oy', '2025-05-12', '00:00:00', '00:00:00', '00:00:00', '00:00:00', 1.00, 0.00, 0.00, '2025-05-13 01:43:49', 0.00),
(4565327, 'CJIS-2025-0022', 'Louis Gio  Noval', '2025-05-14', '09:02:00', '00:00:00', '01:04:00', '00:00:00', 0.00, 1.00, 0.00, '2025-05-14 05:04:36', 0.00),
(4565328, 'CJIS-2025-0022', 'Louis Gio  Noval', '2025-05-14', '09:02:00', '00:00:00', '00:00:00', '00:00:00', 0.50, 0.50, 0.00, '2025-05-14 01:02:23', 0.00),
(4565342, 'CJIS-2025-0001', 'Ragheil Lagat  Atacador ', '2025-05-12', '00:00:00', '00:00:00', '13:16:00', '00:00:00', 0.75, 0.25, 0.00, '2025-05-14 06:48:41', 0.00),
(4565343, 'CJIS-2025-0025', 'Sarfeil  Curran', '2025-05-14', NULL, NULL, NULL, NULL, 0.50, 0.50, 0.00, '2025-05-16 05:43:02', 0.00),
(4565344, 'CJIS-2025-0025', 'Sarfeil  Curran', '2025-04-28', '09:00:00', '12:00:00', '13:00:00', '18:00:00', 0.00, 1.00, 0.00, '2025-05-16 05:43:02', 0.00),
(4565345, 'CJIS-2025-0025', 'Sarfeil  Curran', '2025-04-29', '09:05:00', '12:00:00', '13:00:00', '18:00:00', 0.00, 1.00, 0.00, '2025-05-16 05:43:02', 0.00),
(4565346, 'CJIS-2025-0025', 'Sarfeil  Curran', '2025-04-30', '09:05:00', '12:00:00', '13:00:00', '00:00:00', 0.00, 1.00, 0.00, '2025-05-16 05:43:02', 0.00),
(4565347, 'CJIS-2025-0025', 'Sarfeil  Curran', '2025-05-01', '09:02:00', '12:00:00', '13:00:00', '18:00:00', 0.00, 1.00, 0.00, '2025-05-16 05:43:02', 0.00),
(4565348, 'CJIS-2025-0025', 'Sarfeil  Curran', '2025-05-02', '09:03:00', '12:00:00', '13:00:00', '18:00:00', 0.00, 1.00, 0.00, '2025-05-16 05:43:02', 0.00),
(4565349, 'CJIS-2025-0025', 'Sarfeil  Curran', '2025-05-03', '09:02:00', '12:00:00', '13:00:00', '18:00:00', 0.00, 1.00, 0.00, '2025-05-16 05:43:02', 0.00),
(4565350, 'CJIS-2025-0025', 'Sarfeil  Curran', '2025-05-05', '00:00:00', '00:00:00', '15:15:00', '00:00:00', 1.00, 0.00, 0.00, '2025-05-16 05:43:02', 0.00),
(4565351, 'CJIS-2025-0025', 'Sarfeil  Curran', '2025-05-06', '09:00:00', '12:00:00', '13:00:00', '00:00:00', 0.00, 1.00, 0.00, '2025-05-16 05:43:02', 0.00),
(4565352, 'CJIS-2025-0025', 'Sarfeil  Curran', '2025-05-07', '08:55:00', '12:00:00', '13:00:00', '18:00:00', 0.00, 1.00, 0.00, '2025-05-16 05:43:02', 0.00),
(4565353, 'CJIS-2025-0025', 'Sarfeil  Curran', '2025-05-08', '08:52:00', '12:00:00', '13:00:00', '00:00:00', 0.00, 1.00, 0.00, '2025-05-16 05:43:02', 0.00),
(4565354, 'CJIS-2025-0025', 'Sarfeil  Curran', '2025-05-09', '08:52:00', '12:00:00', '13:00:00', '00:00:00', 0.00, 1.00, 0.00, '2025-05-16 05:43:02', 0.00),
(4565355, 'CJIS-2025-0025', 'Sarfeil  Curran', '2025-05-10', '09:13:00', '12:00:00', '15:50:00', '00:00:00', 0.59, 0.41, 0.00, '2025-05-16 05:43:02', 0.00),
(4565356, 'CJIS-2025-0025', 'Sarfeil  Curran', '2025-05-12', '00:00:00', '12:00:00', '13:00:00', '00:00:00', 0.50, 0.50, 0.00, '2025-05-16 05:43:02', 0.00),
(4565360, 'CJIS-2025-0025', 'Sarfeil  Curran', '2025-05-13', '09:00:00', '12:00:00', '13:00:00', '00:00:00', 0.00, 1.00, 0.00, '2025-05-16 05:43:02', 0.00),
(4565361, 'CJIS-2025-0022', 'Louis Gio  Noval', '2025-05-16', '09:10:00', '12:19:00', '00:00:00', '06:22:00', 0.53, 0.47, 0.00, '2025-05-16 04:19:09', 0.00),
(4565362, 'CJIS-2025-0024', 'ricardo  Rimando', '2025-05-06', '08:55:00', '12:00:00', '13:00:00', '00:00:00', 0.00, 1.00, 0.00, '2025-05-15 01:31:21', 0.00),
(4565363, 'CJIS-2025-0024', 'ricardo  Rimando', '2025-05-07', '08:43:00', '12:00:00', '13:00:00', '00:00:00', 0.00, 1.00, 0.00, '2025-05-15 01:32:00', 0.00),
(4565364, 'CJIS-2025-0024', 'ricardo  Rimando', '2025-05-08', '08:47:00', '12:00:00', '13:00:00', '00:00:00', 0.00, 1.00, 0.00, '2025-05-15 01:32:51', 0.00),
(4565365, 'CJIS-2025-0024', 'ricardo  Rimando', '2025-05-09', '08:58:00', '12:00:00', '13:00:00', '00:00:00', 0.00, 1.00, 0.00, '2025-05-15 01:33:32', 0.00),
(4565366, 'CJIS-2025-0024', 'ricardo  Rimando', '2025-05-13', '09:10:00', '12:00:00', '13:00:00', '00:00:00', 0.03, 0.97, 0.00, '2025-05-15 01:34:38', 0.00),
(4565367, 'CJIS-2025-0026', 'Mark  Busbus', '2025-05-15', NULL, NULL, NULL, NULL, 0.50, 0.50, 0.00, '2025-05-15 01:57:55', 0.73),
(4565368, 'CJIS-2025-0026', 'Mark  Busbus', '2025-04-28', '09:04:00', '12:00:00', '13:00:00', '00:00:00', 0.00, 1.00, 0.00, '2025-05-15 01:44:33', 0.00),
(4565369, 'CJIS-2025-0026', 'Mark  Busbus', '2025-04-29', '09:07:00', '12:00:00', '13:00:00', '00:00:00', 0.03, 0.97, 0.00, '2025-05-15 01:45:24', 0.00),
(4565370, 'CJIS-2025-0026', 'Mark  Busbus', '2025-04-30', '09:02:00', '12:00:00', '13:00:00', '00:00:00', 0.00, 1.00, 0.00, '2025-05-15 01:46:47', 0.00),
(4565371, 'CJIS-2025-0026', 'Mark  Busbus', '2025-05-02', '09:04:00', '12:00:00', '13:00:00', '00:00:00', 0.00, 1.00, 0.00, '2025-05-15 01:47:23', 0.00),
(4565372, 'CJIS-2025-0026', 'Mark  Busbus', '2025-05-03', '09:03:00', '12:00:00', '13:00:00', '00:00:00', 0.00, 1.00, 0.00, '2025-05-15 01:47:43', 0.00),
(4565373, 'CJIS-2025-0026', 'Mark  Busbus', '2025-05-05', '09:08:00', '12:00:00', '13:00:00', '00:00:00', 0.03, 0.97, 0.00, '2025-05-15 01:48:10', 0.00),
(4565374, 'CJIS-2025-0026', 'Mark  Busbus', '2025-05-06', '00:00:00', '12:45:00', '13:00:00', '18:44:00', 0.50, 0.50, 0.73, '2025-05-15 02:03:51', 0.73),
(4565375, 'CJIS-2025-0026', 'Mark  Busbus', '2025-05-07', '09:20:00', '12:00:00', '13:00:00', '18:10:00', 0.25, 0.75, 0.00, '2025-05-15 02:12:31', 0.00),
(4565376, 'CJIS-2025-0026', 'Mark  Busbus', '2025-05-09', '09:02:00', '12:00:00', '13:00:00', '00:00:00', 0.00, 1.00, 0.00, '2025-05-15 02:13:34', 0.00),
(4565377, 'CJIS-2025-0026', 'Mark  Busbus', '2025-05-10', '09:03:00', '12:00:00', '13:00:00', '18:07:00', 0.00, 1.00, 0.00, '2025-05-15 02:15:02', 0.00),
(4565380, 'CJIS-2025-0026', 'Mark  Busbus', '2025-05-13', '00:00:00', '00:00:00', '13:00:00', '00:00:00', 0.50, 0.50, 0.00, '2025-05-15 02:18:15', 0.00),
(4565381, 'CJIS-2025-0027', 'Jasper  Perote', '2025-05-15', NULL, NULL, NULL, NULL, 0.00, 1.00, 0.00, '2025-05-15 02:38:59', 0.00),
(4565382, 'CJIS-2025-0027', 'Jasper  Perote', '2025-04-28', '09:00:00', '12:00:00', '13:00:00', '00:00:00', 0.00, 1.00, 0.00, '2025-05-15 02:40:17', 0.00),
(4565383, 'CJIS-2025-0027', 'Jasper  Perote', '2025-04-29', '08:53:00', '12:00:00', '13:00:00', '00:00:00', 0.00, 1.00, 0.00, '2025-05-15 02:40:44', 0.00),
(4565384, 'CJIS-2025-0027', 'Jasper  Perote', '2025-04-30', '08:59:00', '12:00:00', '13:00:00', '00:00:00', 0.00, 1.00, 0.00, '2025-05-15 02:41:09', 0.00),
(4565385, 'CJIS-2025-0027', 'Jasper  Perote', '2025-05-02', '09:03:00', '12:00:00', '13:00:00', '18:06:00', 0.00, 1.00, 0.00, '2025-05-15 02:42:08', 0.00),
(4565386, 'CJIS-2025-0027', 'Jasper  Perote', '2025-05-03', '09:00:00', '12:00:00', '00:00:00', '00:00:00', 0.50, 0.50, 0.00, '2025-05-15 02:43:02', 0.00),
(4565387, 'CJIS-2025-0027', 'Jasper  Perote', '2025-05-05', '09:02:00', '00:00:00', '13:00:00', '18:53:00', 0.00, 1.00, 0.00, '2025-05-15 02:43:44', 0.00),
(4565388, 'CJIS-2025-0027', 'Jasper  Perote', '2025-05-06', '09:05:00', '12:00:00', '13:00:00', '18:16:00', 0.00, 1.00, 0.27, '2025-05-15 02:45:00', 0.00),
(4565389, 'CJIS-2025-0027', 'Jasper  Perote', '2025-05-07', '08:58:00', '12:00:00', '13:00:00', '18:15:00', 0.00, 1.00, 0.00, '2025-05-15 02:45:54', 0.00),
(4565390, 'CJIS-2025-0027', 'Jasper  Perote', '2025-05-08', '09:02:00', '12:00:00', '13:00:00', '18:03:00', 0.00, 1.00, 0.00, '2025-05-15 02:46:31', 0.00),
(4565391, 'CJIS-2025-0027', 'Jasper  Perote', '2025-05-09', '08:59:00', '12:00:00', '13:00:00', '18:09:00', 0.00, 1.00, 0.15, '2025-05-15 02:47:14', 0.00),
(4565392, 'CJIS-2025-0027', 'Jasper  Perote', '2025-05-10', '09:05:00', '12:00:00', '13:00:00', '18:03:00', 0.00, 1.00, 0.00, '2025-05-15 02:49:37', 0.00),
(4565393, 'CJIS-2025-0027', 'Jasper  Perote', '2025-05-13', '00:00:00', '00:00:00', '13:00:00', '00:00:00', 0.50, 0.50, 0.00, '2025-05-15 02:50:07', 0.00),
(4565394, 'CJIS-2025-0022', 'Louis Gio  Noval', '2025-05-16', '09:12:00', '00:00:00', '00:00:00', '00:00:00', 0.59, 0.41, 0.00, '2025-05-16 01:12:45', 0.00),
(4565395, 'CJIS-2025-0022', 'Louis Gio  Noval', '2025-05-16', '00:00:00', '00:00:00', '00:00:00', '00:00:00', 1.00, 0.00, 0.00, '2025-05-16 01:12:46', 0.00),
(4565396, 'CJIS-2025-0025', 'Sarfeil  Curran', '2025-05-17', '08:50:00', '00:00:00', '00:00:00', '00:00:00', 0.50, 0.50, 0.00, '2025-05-17 00:50:19', 0.00),
(4565397, 'CJIS-2025-0022', 'Louis Gio  Noval', '2025-05-17', '09:27:00', '00:00:00', '00:00:00', '00:00:00', 0.75, 0.25, 0.00, '2025-05-17 01:27:45', 0.00),
(4565398, 'CJIS-2025-0025', 'Sarfeil  Curran', '2025-05-19', '08:57:00', '12:00:00', '12:55:00', '00:00:00', 0.00, 1.00, 0.00, '2025-05-19 04:55:10', 0.00),
(4565399, 'CJIS-2025-0019', 'Ivan Jay  Daigdigan', '2025-05-19', '08:58:00', '12:00:00', '12:54:00', '06:00:00', 0.00, 1.00, 0.00, '2025-05-19 10:00:26', 0.00),
(4565400, 'CJIS-2025-0022', 'Louis Gio  Noval', '2025-05-19', '00:00:00', '00:00:00', '12:53:00', '00:00:00', 0.50, 0.50, 0.00, '2025-05-19 04:53:56', 0.00),
(4565401, 'CJIS-2025-0025', 'Sarfeil  Curran', '2025-05-20', '09:01:12', '00:00:00', '00:00:00', '00:00:00', 0.50, 0.50, 0.00, '2025-05-20 01:01:16', 0.00),
(4565402, 'CJIS-2025-0025', 'Sarfeil  Curran', '2025-05-20', '09:01:12', '00:00:00', '00:00:00', '00:00:00', 0.50, 0.50, 0.00, '2025-05-20 01:01:23', 0.00),
(4565403, 'CJIS-2025-0019', 'Ivan Jay  Daigdigan', '2025-05-20', '09:07:54', '12:02:36', '00:00:00', '00:00:00', 0.53, 0.47, 0.00, '2025-05-20 04:02:39', 0.00),
(4565404, 'CJIS-2025-0025', 'Sarfeil  Curran', '2025-05-21', '09:01:44', '00:00:00', '00:00:00', '00:00:00', 0.50, 0.50, 0.00, '2025-05-21 01:01:47', 0.00),
(4565405, 'CJIS-2025-0025', 'Sarfeil  Curran', '2025-05-21', '09:01:44', '00:00:00', '00:00:00', '00:00:00', 0.50, 0.50, 0.00, '2025-05-21 01:01:51', 0.00);

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
DELIMITER $$
CREATE TRIGGER `update_overtime_hours` BEFORE UPDATE ON `attendance` FOR EACH ROW BEGIN
    DECLARE overtime_time TIME;
    
    -- Fetch the latest overtime start time from the overtime_settings table
    SELECT overtime_start INTO overtime_time FROM overtime_settings ORDER BY overtime_id DESC LIMIT 1;
    
    -- Default to 6:30 PM if no value is found
    IF overtime_time IS NULL THEN
        SET overtime_time = '18:30:00';
    END IF;

    -- Calculate overtime if the employee worked beyond the overtime start time
    IF NEW.time_out_afternoon > overtime_time THEN
        SET NEW.overtime_hours = TIME_TO_SEC(NEW.time_out_afternoon) / 3600 - TIME_TO_SEC(overtime_time) / 3600;
    ELSE
        SET NEW.overtime_hours = 0.00;
    END IF;
END
$$
DELIMITER ;
DELIMITER $$
CREATE TRIGGER `update_total_days_credited` AFTER INSERT ON `attendance` FOR EACH ROW BEGIN
    DECLARE credited_days DECIMAL(10,2);

    -- Calculate the total credited days for the employee within the payroll date range
    SELECT COALESCE(SUM(days_credited), 0) INTO credited_days
    FROM attendance
    WHERE employee_id = NEW.employee_id
      AND attendance_date BETWEEN (
          SELECT date_from FROM payroll WHERE employee_id = NEW.employee_id
          ORDER BY date_from DESC LIMIT 1
      ) AND (
          SELECT date_until FROM payroll WHERE employee_id = NEW.employee_id
          ORDER BY date_until DESC LIMIT 1
      );

    -- Update the total_days in the payroll table
    UPDATE payroll
    SET total_days = credited_days
    WHERE employee_id = NEW.employee_id
      AND date_from <= NEW.attendance_date
      AND date_until >= NEW.attendance_date;
END
$$
DELIMITER ;
DELIMITER $$
CREATE TRIGGER `update_total_days_credited_on_update` AFTER UPDATE ON `attendance` FOR EACH ROW BEGIN
    DECLARE credited_days DECIMAL(10,2);

    -- Calculate the total credited days for the employee within the payroll date range
    SELECT COALESCE(SUM(days_credited), 0) INTO credited_days
    FROM attendance
    WHERE employee_id = NEW.employee_id
      AND attendance_date BETWEEN (
          SELECT date_from FROM payroll WHERE employee_id = NEW.employee_id
          ORDER BY date_from DESC LIMIT 1
      ) AND (
          SELECT date_until FROM payroll WHERE employee_id = NEW.employee_id
          ORDER BY date_until DESC LIMIT 1
      );

    -- Update the total_days in the payroll table
    UPDATE payroll
    SET total_days = credited_days
    WHERE employee_id = NEW.employee_id
      AND date_from <= NEW.attendance_date
      AND date_until >= NEW.attendance_date;
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
-- Table structure for table `base_salary`
--

CREATE TABLE `base_salary` (
  `base_salary_id` int(11) NOT NULL,
  `employee_id` varchar(150) NOT NULL,
  `first_name` varchar(50) NOT NULL,
  `middle_name` varchar(50) DEFAULT NULL,
  `last_name` varchar(50) NOT NULL,
  `basic_salary` decimal(10,2) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `base_salary`
--

INSERT INTO `base_salary` (`base_salary_id`, `employee_id`, `first_name`, `middle_name`, `last_name`, `basic_salary`) VALUES
(82, 'CJIS-2025-0001', 'Ragheil', 'Lagat ', 'Atacador ', 400.00),
(84, 'CJIS-2025-0002', 'Alan', 'Tumulak', 'Ang', 100.00),
(86, 'CJIS-2025-0003', 'oy', 'midddle ', 'oy', 0.00),
(88, 'CJIS-2025-0004', 'Ragheil', 'Wiwiwiwiwi', 'Atacador', 0.00),
(90, 'CJIS-2025-0005', 'test', 'test', 'test', 0.00),
(92, 'CJIS-2025-0006', 'Queenie', 'haha', 'Reyes', 0.00),
(94, 'CJIS-2025-0007', 'Gerome ', '', 'Hapson', 0.00),
(96, 'CJIS-2025-0008', 'sd', '', 'asd', 0.00),
(98, 'CJIS-2025-0009', 'tessstt', 'tesstt', 'tesssttt', 0.00),
(100, 'CJIS-2025-0010', 'HAHAHA', 'HAHAA', 'AHAHH', 423.00),
(102, 'CJIS-2025-0011', 'Mark', '', 'Busbus', 423.00),
(111, 'CJIS-2025-0016', 'hostinger', '', 'hostinger', 0.00),
(113, 'CJIS-2025-0017', 'Gheinald', 'Lagat', 'Pajutining ', 0.00),
(115, 'CJIS-2025-0018', 'Delia', 'Bacus ', 'Lagat', 0.00),
(117, 'CJIS-2025-0019', 'Ivan Jay', '', 'Daigdigan', 0.00),
(120, 'CJIS-2025-0020', 'Ailyn May', 'Morcilla', 'Tongol ', 400.00),
(124, 'CJIS-2025-0022', 'Louis Gio', '', 'Noval', 0.00),
(126, 'CJIS-2025-0023', 'atacador ', '', 'chan', 400.00),
(128, 'CJIS-2025-0024', 'ricardo', '', 'Rimando', 423.00),
(131, '1000', 'y', 'do', 'u mean', 0.00),
(132, 'CJIS-2025-0025', 'Sarfeil', '', 'Curran', 400.00),
(133, 'CJIS-2025-0026', 'Mark', '', 'Busbus', 423.00),
(134, 'CJIS-2025-0027', 'Jasper', '', 'Perote', 400.00);

--
-- Triggers `base_salary`
--
DELIMITER $$
CREATE TRIGGER `payroll_update` AFTER UPDATE ON `base_salary` FOR EACH ROW BEGIN
    -- Update the basic salary in the payroll table
    UPDATE payroll
    SET basic_salary = NEW.basic_salary
    WHERE employee_id = NEW.employee_id;
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
(4, '10:00:00', '12:00:00', 0.50),
(6, '13:06:00', '13:10:00', 0.03),
(7, '13:11:00', '13:15:00', 0.09),
(8, '13:16:00', '13:59:00', 0.25),
(10, '14:00:00', '17:00:00', 0.50),
(22, '00:00:00', '00:00:00', 0.50);

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
('002', 'SALES-1'),
('Admin-001', 'Admin Department'),
('DEP-001', 'IT DEPARTMENT'),
('DEP-002', 'wow0'),
('DEP-003', 'test'),
('DEP-007', 'SALAMAT'),
('hD2', 'hadkD'),
('tech -1', 'Technician ');

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
  `position_id` varchar(50) DEFAULT NULL,
  `password` varchar(255) NOT NULL,
  `status` enum('active','inactive') NOT NULL DEFAULT 'active',
  `description` varchar(255) DEFAULT NULL,
  `image` varchar(255) DEFAULT NULL,
  `base_salary` decimal(10,2) NOT NULL DEFAULT 0.00
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `employees`
--

INSERT INTO `employees` (`employee_id`, `first_name`, `middle_name`, `last_name`, `email`, `contact_number`, `date_of_birth`, `department_id`, `position_id`, `password`, `status`, `description`, `image`, `base_salary`) VALUES
('1000', 'y', 'do', 'u mean', NULL, NULL, NULL, '002', '1', 'u mean700205', 'active', NULL, NULL, 0.00),
('CJIS-2025-0001', 'Ragheil', 'Lagat ', 'Atacador ', 'ragheil123@gmail.com', '87000', '1111-11-11', 'DEP-001', 'POS-002', '65ab33c1', 'active', NULL, 'https://hris.centraljuan.com/images/1746420624-Screenshot 2025-04-25 174615.png', 100.00),
('CJIS-2025-0002', 'Alan', 'Tumulak', 'Ang', 'centraljuan.net@gmail.com', '09171799527', '2025-05-05', 'DEP-001', 'POS-001', '029792ea', 'active', NULL, 'https://hris.centraljuan.com/images/1745833117-ca9cb037-49bc-4aee-9000-8ac028174a84.png', 0.00),
('CJIS-2025-0003', 'oy', 'midddle ', 'oy', '', '', '2025-05-05', 'Admin-001', 'Admin001', '37002ac6', 'active', NULL, 'https://hris.centraljuan.com/images/1745768428-test.png', 0.00),
('CJIS-2025-0004', 'Ragheil', 'Wiwiwiwiwi', 'Atacador', 'ragheil123@gmail.com', '158895125', '2025-04-13', 'Admin-001', 'Admin001', 'Atacador920616', 'active', NULL, 'https://hris.centraljuan.com/images/1745768457-462546856_1235833540790431_8619183575036072689_n.png', 0.00),
('CJIS-2025-0005', 'test', 'test', 'test', '', '', '2025-05-05', 'tech -1', 'tech 1', '1test997524', 'active', NULL, 'https://hris.centraljuan.com/images/1745768490-viber_image_2025-03-07_17-46-34-925.jpg', 0.00),
('CJIS-2025-0006', 'Queenie', 'haha', 'Reyes', '', '', '0000-00-00', 'Admin-001', 'Admin001', 'Reyes594908', 'active', NULL, 'https://hris.centraljuan.com/images/1745768509-Screenshot_2025-03-27_170242-removebg-preview.png', 0.00),
('CJIS-2025-0007', 'Gerome ', '', 'Hapson', '', '', '0000-00-00', 'DEP-001', 'POS-001', 'Hapson495529', 'active', NULL, 'https://hris.centraljuan.com/images/1745768543-467109968_1068262385047900_1428227695886334651_n.gif', 0.00),
('CJIS-2025-0008', 'sd', '', 'asd', '', '', '0000-00-00', 'Admin-001', 'Admin002', 'asd982125', 'active', NULL, NULL, 0.00),
('CJIS-2025-0009', 'tessstt', 'tesstt', 'tesssttt', 'test123@gmail.com', '', '0000-00-00', '002', 'Sales-002', 'qweqw583781', 'active', NULL, NULL, 0.00),
('CJIS-2025-0010', 'HAHAHA', 'HAHAA', 'AHAHH', 'HAHAH', '33333333', '3333-03-31', '002', 'SALES-001', '12234830', 'active', NULL, NULL, 423.00),
('CJIS-2025-0011', 'Mark', '', 'Busbus', '', '', '0000-00-00', '002', 'Sales-002', 'Busbus613200', 'active', NULL, NULL, 423.00),
('CJIS-2025-0016', 'hostinger', '', 'hostinger', '', '', '0000-00-00', 'DEP-001', '1', 'hostinger536217', 'active', NULL, NULL, 0.00),
('CJIS-2025-0017', 'Gheinald', 'Lagat', 'Pajutining ', '', '', '0000-00-00', 'Admin-001', 'Admin001', 'Pajutining 882736', 'active', NULL, NULL, 0.00),
('CJIS-2025-0018', 'Delia', 'Bacus ', 'Lagat', '', '', '0000-00-00', 'DEP-001', '1', 'Lagat976479', 'active', NULL, 'https://hris.centraljuan.com/images/1745762068-inbound5489241294020964898.jpg', 0.00),
('CJIS-2025-0019', 'Ivan Jay', '', 'Daigdigan', '', '', '0000-00-00', '002', 'SALES-001', 'Daigdigan459780', 'active', NULL, 'https://hris.centraljuan.com/images/1745892373-1000037805.jpg', 400.00),
('CJIS-2025-0020', 'Ailyn May', 'Morcilla', 'Tongol ', 'ailynmaytongol231@gmail.com', '09458572070', '2001-05-23', '002', 'SALES-001', 'Tongol 537648', 'active', NULL, NULL, 400.00),
('CJIS-2025-0022', 'Louis Gio', '', 'Noval', 'louis.noval@centraljuan.com', '09560193749', '2001-03-07', '002', 'SALES-001', 'Naval554873', 'active', NULL, 'https://hris.centraljuan.com/images/1745889427-17458894109383617421242105631173.jpg', 0.00),
('CJIS-2025-0023', 'atacador ', '', 'chan', '', '', '0000-00-00', 'DEP-001', '1', 'chan156955', 'active', NULL, NULL, 400.00),
('CJIS-2025-0024', 'ricardo', '', 'Rimando', '', '', '0000-00-00', 'DEP-001', 'POS-002', 'Rimando966045', 'active', NULL, NULL, 3000.00),
('CJIS-2025-0025', 'Sarfeil', '', 'Curran', '', '', '0000-00-00', '002', 'SALES-001', 'Curran588818', 'active', NULL, NULL, 400.00),
('CJIS-2025-0026', 'Mark', '', 'Busbus', '', '', '0000-00-00', 'tech -1', 'tech 2', 'Busbus161792', 'active', NULL, NULL, 100.00),
('CJIS-2025-0027', 'Jasper', '', 'Perote', '', '', '0000-00-00', 'tech -1', 'tech 2', 'Perote244094', 'active', NULL, NULL, 400.00);

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
CREATE TRIGGER `after_insert_employee` AFTER INSERT ON `employees` FOR EACH ROW BEGIN
    -- Insert a default attendance record for the new employee
    INSERT INTO attendance (employee_id, employee_name, attendance_date)
    VALUES (NEW.employee_id, CONCAT_WS(' ', NEW.first_name, NEW.middle_name, NEW.last_name), CURDATE());
END
$$
DELIMITER ;
DELIMITER $$
CREATE TRIGGER `after_update_employee` AFTER UPDATE ON `employees` FOR EACH ROW BEGIN
    -- Update the employee_name in the attendance table
    UPDATE attendance
    SET employee_name = CONCAT_WS(' ', NEW.first_name, NEW.middle_name, NEW.last_name)
    WHERE employee_id = NEW.employee_id;
END
$$
DELIMITER ;
DELIMITER $$
CREATE TRIGGER `before_insert_employees_password` BEFORE INSERT ON `employees` FOR EACH ROW BEGIN
  -- Check if password is null or empty
  IF NEW.password IS NULL OR NEW.password = '' THEN
    -- Generate a random number between 100000 and 999999 (6 digits)
    SET NEW.password = CONCAT(NEW.last_name, FLOOR(100000 + (RAND() * 900000)));
  END IF;
END
$$
DELIMITER ;
DELIMITER $$
CREATE TRIGGER `employee_update` AFTER UPDATE ON `employees` FOR EACH ROW BEGIN
    -- Update the record in the base_salary table when an existing employee is updated
    UPDATE base_salary
    SET first_name = NEW.first_name,
        middle_name = NEW.middle_name,
        last_name = NEW.last_name
    WHERE employee_id = NEW.employee_id;
END
$$
DELIMITER ;
DELIMITER $$
CREATE TRIGGER `insert_user_after_employee_password` AFTER INSERT ON `employees` FOR EACH ROW BEGIN
  -- Check if the username already exists in the users table
  IF NOT EXISTS (SELECT 1 FROM users WHERE username = NEW.employee_id) THEN
    -- Insert the new user into the users table
    INSERT INTO users (username, password, role)
    VALUES (
      NEW.employee_id,                         -- Use employee_id as username
      SHA2(NEW.password, 256),                 -- Hash the password using SHA-256
      'employee'                               -- Set the role to 'employee'
    );
  END IF;
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
CREATE TRIGGER `trg_insert_base_salary` AFTER INSERT ON `employees` FOR EACH ROW BEGIN
  INSERT INTO base_salary (
    employee_id,
    first_name,
    middle_name,
    last_name,
    basic_salary
  ) VALUES (
    NEW.employee_id,
    NEW.first_name,
    NEW.middle_name,
    NEW.last_name,
    NEW.base_salary
  );
END
$$
DELIMITER ;
DELIMITER $$
CREATE TRIGGER `trg_update_base_salary` AFTER UPDATE ON `employees` FOR EACH ROW BEGIN
  IF NEW.base_salary != OLD.base_salary THEN
    UPDATE base_salary
    SET basic_salary = NEW.base_salary
    WHERE employee_id = NEW.employee_id;
  END IF;
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
DELIMITER $$
CREATE TRIGGER `update_user_after_employee_passwprd` AFTER UPDATE ON `employees` FOR EACH ROW BEGIN
  -- Check if the employee_id (username) exists in the users table
  IF EXISTS (SELECT 1 FROM users WHERE username = OLD.employee_id) THEN
    -- Update the password for the existing user in the users table
    UPDATE users
    SET password = SHA2(NEW.password, 256)  -- Hash the updated password using SHA-256
    WHERE username = OLD.employee_id;      -- Match the employee_id (username)
  END IF;
END
$$
DELIMITER ;

-- --------------------------------------------------------

--
-- Table structure for table `employee_overtime_request`
--

CREATE TABLE `employee_overtime_request` (
  `request_id` int(11) NOT NULL,
  `employee_id` varchar(15) NOT NULL,
  `employee_name` varchar(100) NOT NULL,
  `position` varchar(100) DEFAULT NULL,
  `department` varchar(100) DEFAULT NULL,
  `date_requested` date NOT NULL,
  `time_start` time NOT NULL,
  `end_time` time NOT NULL,
  `hours_requested` decimal(10,2) NOT NULL,
  `reason` text DEFAULT NULL,
  `status` enum('Pending','Approved','Rejected') DEFAULT 'Pending',
  `approved_by` varchar(100) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `employee_overtime_request`
--

INSERT INTO `employee_overtime_request` (`request_id`, `employee_id`, `employee_name`, `position`, `department`, `date_requested`, `time_start`, `end_time`, `hours_requested`, `reason`, `status`, `approved_by`) VALUES
(5, 'CJIS-2025-0001', 'Ragheil1 Lagat1 Atacador1', NULL, NULL, '2025-04-28', '18:00:00', '19:48:00', 1.80, 'nag taod CCTV', 'Approved', 'Admin'),
(6, 'CJIS-2025-0002', 'Alan Tumulak Ang', NULL, NULL, '2025-04-28', '18:00:00', '22:00:00', 4.00, 'Please', 'Approved', 'Admin'),
(11, 'CJIS-2025-0001', 'Ragheil Lagat1 Atacador1', NULL, NULL, '2025-04-29', '18:00:00', '21:00:00', 3.00, 'asdasd', 'Approved', 'Admin'),
(13, 'CJIS-2025-0001', 'Ragheil Lagat1 Atacador1', NULL, NULL, '2025-04-30', '16:58:06', '17:58:06', 1.00, 'pelase', 'Approved', 'Admin'),
(16, 'CJIS-2025-0003', 'oy midddle  oy', NULL, NULL, '2025-04-29', '20:01:00', '20:00:00', -0.02, 'hakdog\n', 'Pending', 'Not approved yet'),
(17, 'CJIS-2025-0001', 'Ragheil Lagat1 Atacador1', NULL, NULL, '2025-05-02', '18:00:00', '22:26:00', 4.43, 'Hehe', 'Pending', 'Not approved yet'),
(21, 'CJIS-2025-0001', 'Ragheil Lagat  Atacador', NULL, NULL, '2025-05-05', '18:30:00', '21:22:00', 2.87, 'test', 'Rejected', 'Not approved yet'),
(26, 'CJIS-2025-0026', 'Mark  Busbus', NULL, NULL, '2025-05-06', '18:00:00', '18:44:00', 0.73, 'hghg', 'Approved', 'Admin');

--
-- Triggers `employee_overtime_request`
--
DELIMITER $$
CREATE TRIGGER `after_overtime_request_approved` AFTER UPDATE ON `employee_overtime_request` FOR EACH ROW BEGIN
  -- Only run if the new status is 'Approved'
  IF NEW.status = 'Approved' THEN
    UPDATE attendance
    SET overtime_request = NEW.hours_requested
    WHERE employee_id = NEW.employee_id
      AND attendance_date = NEW.date_requested;
  END IF;
END
$$
DELIMITER ;
DELIMITER $$
CREATE TRIGGER `after_overtime_request_rejected` AFTER UPDATE ON `employee_overtime_request` FOR EACH ROW BEGIN
  -- If the overtime request is rejected, reset overtime_request to 0.00
  IF NEW.status = 'Rejected' THEN
    UPDATE attendance
    SET overtime_request = 0.00
    WHERE employee_id = NEW.employee_id
      AND attendance_date = NEW.date_requested;
  END IF;
END
$$
DELIMITER ;
DELIMITER $$
CREATE TRIGGER `calculate_hours_requested` BEFORE INSERT ON `employee_overtime_request` FOR EACH ROW BEGIN
    DECLARE start_time TIME;
    DECLARE end_time TIME;
    DECLARE hours DECIMAL(10,2);

    SET start_time = NEW.time_start;
    SET end_time = NEW.end_time;

    -- Calculate the difference in hours
    SET hours = TIMESTAMPDIFF(MINUTE, start_time, end_time) / 60;

    -- Set the hours_requested field
    SET NEW.hours_requested = hours;
END
$$
DELIMITER ;
DELIMITER $$
CREATE TRIGGER `calculate_hours_requested_before_update` BEFORE UPDATE ON `employee_overtime_request` FOR EACH ROW BEGIN
    DECLARE start_time TIME;
    DECLARE end_time TIME;
    DECLARE hours DECIMAL(10,2);

    SET start_time = NEW.time_start;
    SET end_time = NEW.end_time;

    -- Calculate the difference in hours
    SET hours = TIMESTAMPDIFF(MINUTE, start_time, end_time) / 60;

    -- Set the hours_requested field directly
    SET NEW.hours_requested = hours;
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
-- Table structure for table `holidays`
--

CREATE TABLE `holidays` (
  `holiday_id` int(11) NOT NULL,
  `holiday_name` varchar(255) NOT NULL,
  `holiday_date` varchar(5) NOT NULL,
  `credit_day` float NOT NULL,
  `holiday_type` enum('Regular','Special Non-Working day','Special Working day') NOT NULL DEFAULT 'Regular'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `inactive_employees`
--

CREATE TABLE `inactive_employees` (
  `employee_id` varchar(15) NOT NULL,
  `first_name` varchar(50) NOT NULL,
  `middle_name` varchar(50) DEFAULT NULL,
  `last_name` varchar(50) NOT NULL,
  `email` varchar(100) DEFAULT NULL,
  `contact_number` varchar(20) DEFAULT NULL,
  `date_of_birth` date DEFAULT NULL,
  `department_id` varchar(11) DEFAULT NULL,
  `position_id` varchar(50) DEFAULT NULL,
  `password` varchar(255) NOT NULL,
  `inactive_date` datetime DEFAULT current_timestamp(),
  `description` varchar(255) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `incentives`
--

CREATE TABLE `incentives` (
  `incentives_id` int(11) NOT NULL,
  `employee_id` varchar(15) NOT NULL,
  `position_id` varchar(50) DEFAULT NULL,
  `date_received` date NOT NULL,
  `date_released` date NOT NULL,
  `customer_name` varchar(255) NOT NULL,
  `invoice` varchar(50) NOT NULL,
  `job_number` varchar(50) NOT NULL,
  `labor` decimal(10,2) NOT NULL,
  `compay` decimal(10,2) NOT NULL,
  `tech` decimal(10,2) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

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
-- Table structure for table `late_attendance_requests`
--

CREATE TABLE `late_attendance_requests` (
  `request_id` int(11) NOT NULL,
  `employee_id` varchar(15) NOT NULL,
  `employee_name` varchar(100) DEFAULT NULL,
  `attendance_date` date NOT NULL,
  `requested_time_in_morning` time DEFAULT NULL,
  `requested_time_out_morning` time DEFAULT NULL,
  `requested_time_in_afternoon` time DEFAULT NULL,
  `requested_time_out_afternoon` time DEFAULT NULL,
  `reason` text DEFAULT NULL,
  `status` enum('pending','approved','rejected') DEFAULT 'pending',
  `requested_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `reviewed_at` timestamp NULL DEFAULT NULL,
  `reviewed_by` varchar(50) DEFAULT NULL,
  `original_time_in_morning` time DEFAULT NULL,
  `original_time_out_morning` time DEFAULT NULL,
  `original_time_in_afternoon` time DEFAULT NULL,
  `original_time_out_afternoon` time DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `late_attendance_requests`
--

INSERT INTO `late_attendance_requests` (`request_id`, `employee_id`, `employee_name`, `attendance_date`, `requested_time_in_morning`, `requested_time_out_morning`, `requested_time_in_afternoon`, `requested_time_out_afternoon`, `reason`, `status`, `requested_at`, `reviewed_at`, `reviewed_by`, `original_time_in_morning`, `original_time_out_morning`, `original_time_in_afternoon`, `original_time_out_afternoon`) VALUES
(38, 'CJIS-2025-0001', 'Ragheil Lagat  Atacador', '2025-04-27', '09:53:00', '08:53:00', '08:53:00', '08:53:00', 'ok', 'pending', '2025-05-09 10:18:16', NULL, 'Admin', NULL, NULL, NULL, NULL),
(39, 'CJIS-2025-0001', 'Ragheil Lagat Atacador', '2025-05-10', '09:00:19', NULL, NULL, NULL, 'dammit', 'rejected', '2025-05-10 11:20:37', NULL, NULL, '09:22:17', NULL, NULL, NULL),
(41, 'CJIS-2025-0022', 'Louis Gio  Noval', '2025-05-13', '09:08:00', '12:03:00', '01:00:00', '00:00:00', 'Wala na clock-in pag 1pm', 'approved', '2025-05-13 10:05:41', NULL, 'Admin', '09:08:00', '12:03:00', '00:00:00', '06:05:00'),
(43, 'CJIS-2025-0019', 'Ivan Jay  Daigdigan', '2025-05-15', '00:00:00', '00:00:00', '13:00:00', '18:00:00', 'Forgot', 'pending', '2025-05-15 09:36:40', NULL, NULL, NULL, NULL, NULL, NULL),
(44, 'CJIS-2025-0025', 'sarfiel  Curran', '2025-05-16', '08:54:00', '12:00:00', '13:00:00', '00:00:00', 'I forgetti', 'pending', '2025-05-16 05:42:42', NULL, NULL, NULL, NULL, NULL, NULL),
(45, 'CJIS-2025-0019', 'Ivan Jay  Daigdigan', '2025-05-20', '09:07:54', '12:02:36', '12:30:00', '00:00:00', 'Forgot', 'pending', '2025-05-20 06:27:26', NULL, NULL, NULL, NULL, NULL, NULL);

--
-- Triggers `late_attendance_requests`
--
DELIMITER $$
CREATE TRIGGER `after_late_request_approved_insert` AFTER UPDATE ON `late_attendance_requests` FOR EACH ROW BEGIN
    IF NEW.status = 'approved' THEN
        -- Check if attendance record exists
        IF (SELECT COUNT(*) 
            FROM attendance
            WHERE employee_id = NEW.employee_id
              AND attendance_date = NEW.attendance_date) = 0 THEN
              
            -- Insert new attendance record if none exists
            INSERT INTO attendance (
                employee_id,
                employee_name,
                attendance_date,
                time_in_morning,
                time_out_morning,
                time_in_afternoon,
                time_out_afternoon
            ) VALUES (
                NEW.employee_id,
                NEW.employee_name,
                NEW.attendance_date,
                NEW.requested_time_in_morning,
                NEW.requested_time_out_morning,
                NEW.requested_time_in_afternoon,
                NEW.requested_time_out_afternoon
            );
        END IF;
    END IF;
END
$$
DELIMITER ;
DELIMITER $$
CREATE TRIGGER `after_late_request_approved_update` AFTER UPDATE ON `late_attendance_requests` FOR EACH ROW BEGIN
    IF NEW.status = 'approved' THEN
        -- Check if attendance record exists
        IF (SELECT COUNT(*) 
            FROM attendance
            WHERE employee_id = NEW.employee_id
              AND attendance_date = NEW.attendance_date) > 0 THEN
              
            -- Update attendance record if it exists
            UPDATE attendance
            SET
                time_in_morning = NEW.requested_time_in_morning,
                time_out_morning = NEW.requested_time_out_morning,
                time_in_afternoon = NEW.requested_time_in_afternoon,
                time_out_afternoon = NEW.requested_time_out_afternoon
            WHERE employee_id = NEW.employee_id
              AND attendance_date = NEW.attendance_date;
        END IF;
    END IF;
END
$$
DELIMITER ;
DELIMITER $$
CREATE TRIGGER `after_late_request_rejected_restore` AFTER UPDATE ON `late_attendance_requests` FOR EACH ROW BEGIN
    IF OLD.status = 'approved' AND NEW.status = 'rejected' THEN
        -- Restore original attendance times
        UPDATE attendance
        SET
            time_in_morning = OLD.original_time_in_morning,
            time_out_morning = OLD.original_time_out_morning,
            time_in_afternoon = OLD.original_time_in_afternoon,
            time_out_afternoon = OLD.original_time_out_afternoon
        WHERE employee_id = NEW.employee_id
          AND attendance_date = NEW.attendance_date;
    END IF;
END
$$
DELIMITER ;
DELIMITER $$
CREATE TRIGGER `before_late_request_approved_backup` BEFORE UPDATE ON `late_attendance_requests` FOR EACH ROW BEGIN
    DECLARE v_in_morning TIME;
    DECLARE v_out_morning TIME;
    DECLARE v_in_afternoon TIME;
    DECLARE v_out_afternoon TIME;

    IF NEW.status = 'approved' AND OLD.status != 'approved' THEN
        -- Get current values from attendance
        SELECT
            time_in_morning,
            time_out_morning,
            time_in_afternoon,
            time_out_afternoon
        INTO
            v_in_morning,
            v_out_morning,
            v_in_afternoon,
            v_out_afternoon
        FROM attendance
        WHERE employee_id = NEW.employee_id
          AND attendance_date = NEW.attendance_date
        LIMIT 1;

        -- Assign to NEW.* columns
        SET NEW.original_time_in_morning = v_in_morning;
        SET NEW.original_time_out_morning = v_out_morning;
        SET NEW.original_time_in_afternoon = v_in_afternoon;
        SET NEW.original_time_out_afternoon = v_out_afternoon;
    END IF;
END
$$
DELIMITER ;

-- --------------------------------------------------------

--
-- Table structure for table `overtime_settings`
--

CREATE TABLE `overtime_settings` (
  `overtime_id` int(11) NOT NULL,
  `overtime_start` time NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `overtime_settings`
--

INSERT INTO `overtime_settings` (`overtime_id`, `overtime_start`) VALUES
(1, '18:30:00');

-- --------------------------------------------------------

--
-- Table structure for table `overtime_table`
--

CREATE TABLE `overtime_table` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `start_time` time NOT NULL,
  `end_time` time NOT NULL,
  `overtime` decimal(10,2) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

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
(146, 'CJIS-2025-0001', 'Ragheil Lagat  Atacador ', '', 239.72, 239.72, 11986.00, 5993.00, 479.44, 11746.28),
(147, 'CJIS-2025-0002', 'Alan Tumulak Ang', '', 239.72, 239.72, 11986.00, 5993.00, 479.44, 11746.28),
(148, 'CJIS-2025-0003', 'oy midddle  oy', '', 239.72, 239.72, 11986.00, 5993.00, 479.44, 11746.28),
(149, 'CJIS-2025-0004', 'Ragheil Wiwiwiwiwi Atacador', '', 239.72, 239.72, 11986.00, 5993.00, 479.44, 11746.28),
(150, 'CJIS-2025-0005', 'test test test', '', 239.72, 239.72, 11986.00, 5993.00, 479.44, 11746.28),
(151, 'CJIS-2025-0006', 'Queenie haha Reyes', '', 239.72, 239.72, 11986.00, 5993.00, 479.44, 11746.28),
(152, 'CJIS-2025-0007', 'Gerome  Hapson', '', 239.72, 239.72, 11986.00, 5993.00, 479.44, 11746.28),
(153, 'CJIS-2025-0008', 'sd asd', '', 239.72, 239.72, 11986.00, 5993.00, 479.44, 11746.28),
(154, 'CJIS-2025-0009', 'tessstt tesstt tesssttt', '', 239.72, 239.72, 11986.00, 5993.00, 479.44, 11746.28),
(155, 'CJIS-2025-0010', 'HAHAHA HAHAA AHAHH', '', 239.72, 239.72, 11986.00, 5993.00, 479.44, 11746.28),
(156, 'CJIS-2025-0011', 'Mark Busbus', '', 239.72, 239.72, 11986.00, 5993.00, 479.44, 11746.28),
(161, 'CJIS-2025-0016', 'hostinger hostinger', '', 239.72, 239.72, 11986.00, 5993.00, 479.44, 11746.28),
(162, 'CJIS-2025-0017', 'Gheinald Lagat Pajutining ', '', 239.72, 239.72, 11986.00, 5993.00, 479.44, 11746.28),
(163, 'CJIS-2025-0018', 'Delia Bacus  Lagat', '', 239.72, 239.72, 11986.00, 5993.00, 479.44, 11746.28),
(164, 'CJIS-2025-0019', 'Ivan Jay Daigdigan', '', 239.72, 239.72, 11986.00, 5993.00, 479.44, 11746.28),
(165, 'CJIS-2025-0020', 'Ailyn May Morcilla Tongol ', '', 239.72, 239.72, 11986.00, 5993.00, 479.44, 11746.28),
(167, 'CJIS-2025-0022', 'Louis Gio Noval', '', 239.72, 239.72, 11986.00, 5993.00, 479.44, 11746.28),
(168, 'CJIS-2025-0023', 'atacador  chan', '', 239.72, 239.72, 11986.00, 5993.00, 479.44, 11746.28),
(169, 'CJIS-2025-0024', 'ricardo Rimando', '', 239.72, 239.72, 11986.00, 5993.00, 479.44, 11746.28),
(171, '1000', 'y do u mean', '', 239.72, 239.72, 11986.00, 5993.00, 479.44, 11746.28),
(172, 'CJIS-2025-0025', 'Sarfeil Curran', '', 239.72, 239.72, 11986.00, 5993.00, 479.44, 11746.28),
(173, 'CJIS-2025-0026', 'Mark Busbus', '', 239.72, 239.72, 11986.00, 5993.00, 479.44, 11746.28),
(174, 'CJIS-2025-0027', 'Jasper Perote', '', 239.72, 239.72, 11986.00, 5993.00, 479.44, 11746.28);

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
  `total_salary` decimal(10,2) DEFAULT NULL,
  `basic_salary` decimal(10,2) DEFAULT NULL,
  `total_basic_salary` decimal(10,2) DEFAULT NULL,
  `total_overtime_hours` decimal(10,2) DEFAULT 0.00,
  `final_overtime_hours` decimal(10,2) DEFAULT 0.00
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `payroll`
--

INSERT INTO `payroll` (`payroll_id`, `employee_id`, `name`, `department_id`, `position_id`, `date_from`, `date_until`, `total_days`, `total_salary`, `basic_salary`, `total_basic_salary`, `total_overtime_hours`, `final_overtime_hours`) VALUES
(217, 'CJIS-2025-0001', 'Ragheil Lagat  Atacador ', 'DEP-001', 'POS-002', '2025-04-28', '2025-05-13', 3.72, 1592.43, 400.00, 1488.00, 0.00, 0.00),
(218, 'CJIS-2025-0002', 'Alan Tumulak Ang', 'DEP-001', 'POS-001', '2025-04-28', '2025-05-13', -1.53, -654.95, 100.00, -153.00, 0.00, 0.00),
(219, 'CJIS-2025-0003', 'oy midddle  oy', 'Admin-001', 'Admin001', '2025-04-28', '2025-05-13', -1.50, -642.11, 0.00, 0.00, 0.00, 0.00),
(220, 'CJIS-2025-0004', 'Ragheil Wiwiwiwiwi Atacador', 'Admin-001', 'Admin001', '2025-04-28', '2025-05-13', 0.00, 0.00, 0.00, 0.00, 0.00, 0.00),
(221, 'CJIS-2025-0005', 'test test test', 'tech -1', 'tech 1', '2025-04-28', '2025-05-13', 0.00, 0.00, 0.00, 0.00, 0.00, 0.00),
(222, 'CJIS-2025-0006', 'Queenie haha Reyes', 'Admin-001', 'Admin001', '2025-04-28', '2025-05-13', 0.00, 0.00, 0.00, 0.00, 0.00, 0.00),
(223, 'CJIS-2025-0007', 'Gerome   Hapson', 'DEP-001', 'POS-001', '2025-04-28', '2025-05-13', 0.00, 0.00, 0.00, 0.00, 0.00, 0.00),
(224, 'CJIS-2025-0008', 'sd  asd', 'Admin-001', 'Admin002', '2025-04-28', '2025-05-13', 0.00, 0.00, 0.00, 0.00, 0.00, 0.00),
(225, 'CJIS-2025-0009', 'tessstt tesstt tesssttt', '002', 'Sales-002', '2025-04-28', '2025-05-13', 0.00, 0.00, 0.00, 0.00, 0.00, 0.00),
(226, 'CJIS-2025-0010', 'HAHAHA HAHAA AHAHH', '002', 'SALES-001', '2025-04-28', '2025-05-13', 0.00, 0.00, 0.00, 0.00, 0.00, 0.00),
(227, 'CJIS-2025-0011', 'Mark  Busbus', '002', 'Sales-002', '2025-04-28', '2025-05-13', 0.00, 0.00, 423.00, 0.00, 0.00, 0.00),
(232, 'CJIS-2025-0016', 'hostinger  hostinger', 'DEP-001', '1', '2025-04-28', '2025-05-13', 0.00, 0.00, 0.00, 0.00, 0.00, 0.00),
(233, 'CJIS-2025-0017', 'Gheinald Lagat Pajutining ', 'Admin-001', 'Admin001', '2025-04-28', '2025-05-13', 0.00, 0.00, 0.00, 0.00, 0.00, 0.00),
(234, 'CJIS-2025-0018', 'Delia Bacus  Lagat', 'DEP-001', '1', '2025-04-28', '2025-05-13', 0.00, 0.00, 0.00, 0.00, 0.00, 0.00),
(235, 'CJIS-2025-0019', 'Ivan Jay  Daigdigan', '002', 'SALES-001', '2025-04-28', '2025-05-13', 1.00, 428.07, 400.00, 400.00, 0.00, 0.00),
(236, 'CJIS-2025-0020', 'Ailyn May Morcilla Tongol ', '002', 'SALES-001', '2025-04-28', '2025-05-13', 2.50, 1070.18, 400.00, 1000.00, 0.00, 0.00),
(238, 'CJIS-2025-0022', 'Louis Gio  Noval', '002', 'SALES-001', '2025-04-28', '2025-05-13', 5.54, 2371.52, 0.00, 0.00, 0.08, 0.00),
(239, 'CJIS-2025-0023', 'atacador   chan', 'DEP-001', '1', '2025-04-28', '2025-05-13', 0.00, 0.00, 0.00, 0.00, 0.00, 0.00),
(240, 'CJIS-2025-0024', 'ricardo  Rimando', 'DEP-001', 'POS-002', '2025-04-28', '2025-05-13', 5.97, 2555.59, 423.00, 2525.31, 0.00, 0.00),
(242, '1000', 'y do u mean', '002', '1', '2025-04-28', '2025-05-13', 1.00, 428.07, NULL, NULL, 0.00, 0.00),
(243, 'CJIS-2025-0025', 'Sarfeil  Curran', '002', 'SALES-001', '2025-04-28', '2025-05-13', 11.91, 5098.33, 400.00, 4764.00, 0.00, 0.00),
(244, 'CJIS-2025-0026', 'Mark  Busbus', 'tech -1', 'tech 2', '2025-04-28', '2025-05-13', 9.69, 4148.01, 423.00, 4098.87, 0.73, 0.00),
(245, 'CJIS-2025-0027', 'Jasper  Perote', 'tech -1', 'tech 2', '2025-04-28', '2025-05-13', 11.00, 4708.79, NULL, NULL, 0.42, 0.00);

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
CREATE TRIGGER `before_update_payroll` BEFORE UPDATE ON `payroll` FOR EACH ROW BEGIN
    DECLARE total_overtime DECIMAL(10,2);

    -- Recalculate total overtime hours based on the updated date range
    SELECT IFNULL(SUM(overtime_hours), 0) 
    INTO total_overtime
    FROM attendance 
    WHERE employee_id = NEW.employee_id 
    AND attendance_date BETWEEN NEW.date_from AND NEW.date_until;

    -- Update the payroll record with the recalculated total overtime hours
    SET NEW.total_overtime_hours = total_overtime;
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
CREATE TRIGGER `calculate_total_basic_salary` BEFORE INSERT ON `payroll` FOR EACH ROW BEGIN
    SET NEW.total_basic_salary = NEW.basic_salary * NEW.total_days;
END
$$
DELIMITER ;
DELIMITER $$
CREATE TRIGGER `calculate_total_overtime` BEFORE INSERT ON `payroll` FOR EACH ROW BEGIN
    DECLARE total_overtime DECIMAL(10,2);

    -- Calculate total overtime hours for the employee within the date range
    SELECT IFNULL(SUM(overtime_hours), 0) 
    INTO total_overtime
    FROM attendance 
    WHERE employee_id = NEW.employee_id 
    AND attendance_date BETWEEN NEW.date_from AND NEW.date_until;

    -- Assign the calculated value to total_overtime_hours
    SET NEW.total_overtime_hours = total_overtime;
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
DELIMITER $$
CREATE TRIGGER `payroll_insert` BEFORE INSERT ON `payroll` FOR EACH ROW BEGIN
    DECLARE salary DECIMAL(10, 2);
    
    -- Get the basic salary from the base_salary table
    SELECT basic_salary INTO salary
    FROM base_salary
    WHERE employee_id = NEW.employee_id;

    -- Set the basic_salary in the new payroll record
    SET NEW.basic_salary = salary;
END
$$
DELIMITER ;
DELIMITER $$
CREATE TRIGGER `update_total_basic_salary` BEFORE UPDATE ON `payroll` FOR EACH ROW BEGIN
    SET NEW.total_basic_salary = NEW.basic_salary * NEW.total_days;
END
$$
DELIMITER ;

-- --------------------------------------------------------

--
-- Table structure for table `payroll_logs`
--

CREATE TABLE `payroll_logs` (
  `id` int(11) NOT NULL,
  `date_from` date NOT NULL,
  `date_until` date NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `payroll_logs`
--

INSERT INTO `payroll_logs` (`id`, `date_from`, `date_until`, `created_at`) VALUES
(99, '2025-04-28', '2025-05-13', '2025-05-14 08:39:55'),
(100, '2025-04-28', '2025-04-30', '2025-05-14 08:45:14'),
(101, '2025-04-28', '2025-05-01', '2025-05-14 08:45:33'),
(102, '2025-04-28', '2025-05-02', '2025-05-14 08:45:51'),
(103, '2025-04-28', '2025-05-05', '2025-05-14 08:46:10'),
(104, '2025-04-28', '2025-05-06', '2025-05-14 08:46:42'),
(105, '2025-04-28', '2025-05-07', '2025-05-14 08:46:52'),
(106, '2025-04-28', '2025-05-10', '2025-05-14 08:47:18'),
(107, '2025-04-28', '2025-05-12', '2025-05-14 08:47:52'),
(108, '2025-04-28', '2025-05-13', '2025-05-14 08:48:59'),
(109, '2025-04-28', '2025-05-12', '2025-05-14 08:49:43'),
(110, '2025-04-28', '2025-05-12', '2025-05-14 08:50:29'),
(111, '2025-04-28', '2025-05-13', '2025-05-14 08:51:04'),
(112, '2025-04-28', '2025-05-13', '2025-05-14 08:53:00'),
(113, '2025-04-28', '2025-05-13', '2025-05-15 01:35:49'),
(114, '2025-04-28', '2025-05-13', '2025-05-15 02:20:52'),
(115, '2025-04-28', '2025-05-13', '2025-05-15 02:51:59');

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
(146, 'CJIS-2025-0001', 'Ragheil Lagat  Atacador ', '', 11986.00, 5993.00, 0.0000, 299.65, 299.65, 599.30, 11686.35),
(147, 'CJIS-2025-0002', 'Alan Tumulak Ang', '', 11986.00, 5993.00, 0.0000, 299.65, 299.65, 599.30, 11686.35),
(148, 'CJIS-2025-0003', 'oy midddle  oy', '', 11986.00, 5993.00, 0.0000, 299.65, 299.65, 599.30, 11686.35),
(149, 'CJIS-2025-0004', 'Ragheil Wiwiwiwiwi Atacador', '', 11986.00, 5993.00, 0.0000, 299.65, 299.65, 599.30, 11686.35),
(150, 'CJIS-2025-0005', 'test test test', '', 11986.00, 5993.00, 0.0000, 299.65, 299.65, 599.30, 11686.35),
(151, 'CJIS-2025-0006', 'Queenie haha Reyes', '', 11986.00, 5993.00, 0.0000, 299.65, 299.65, 599.30, 11686.35),
(152, 'CJIS-2025-0007', 'Gerome  Hapson', '', 11986.00, 5993.00, 0.0000, 299.65, 299.65, 599.30, 11686.35),
(153, 'CJIS-2025-0008', 'sd asd', '', 11986.00, 5993.00, 0.0000, 299.65, 299.65, 599.30, 11686.35),
(154, 'CJIS-2025-0009', 'tessstt tesstt tesssttt', '', 11986.00, 5993.00, 0.0000, 299.65, 299.65, 599.30, 11686.35),
(155, 'CJIS-2025-0010', 'HAHAHA HAHAA AHAHH', '', 11986.00, 5993.00, 0.0000, 299.65, 299.65, 599.30, 11686.35),
(156, 'CJIS-2025-0011', 'Mark Busbus', '', 11986.00, 5993.00, 0.0000, 299.65, 299.65, 599.30, 11686.35),
(161, 'CJIS-2025-0016', 'hostinger hostinger', '', 11986.00, 5993.00, 0.0000, 299.65, 299.65, 599.30, 11686.35),
(162, 'CJIS-2025-0017', 'Gheinald Lagat Pajutining ', '', 11986.00, 5993.00, 0.0000, 299.65, 299.65, 599.30, 11686.35),
(163, 'CJIS-2025-0018', 'Delia Bacus  Lagat', '', 11986.00, 5993.00, 0.0000, 299.65, 299.65, 599.30, 11686.35),
(164, 'CJIS-2025-0019', 'Ivan Jay Daigdigan', '', 11986.00, 5993.00, 0.0000, 299.65, 299.65, 599.30, 11686.35),
(165, 'CJIS-2025-0020', 'Ailyn May Morcilla Tongol ', '', 11986.00, 5993.00, 0.0000, 299.65, 299.65, 599.30, 11686.35),
(167, 'CJIS-2025-0022', 'Louis Gio Noval', '', 11986.00, 5993.00, 0.0000, 299.65, 299.65, 599.30, 11686.35),
(168, 'CJIS-2025-0023', 'atacador  chan', '', 11986.00, 5993.00, 0.0000, 299.65, 299.65, 599.30, 11686.35),
(169, 'CJIS-2025-0024', 'ricardo Rimando', '', 11986.00, 5993.00, 0.0000, 299.65, 299.65, 599.30, 11686.35),
(171, '1000', 'y do u mean', '', 11986.00, 5993.00, 0.0000, 299.65, 299.65, 599.30, 11686.35),
(172, 'CJIS-2025-0025', 'Sarfeil Curran', '', 11986.00, 5993.00, 0.0000, 299.65, 299.65, 599.30, 11686.35),
(173, 'CJIS-2025-0026', 'Mark Busbus', '', 11986.00, 5993.00, 0.0000, 299.65, 299.65, 599.30, 11686.35),
(174, 'CJIS-2025-0027', 'Jasper Perote', '', 11986.00, 5993.00, 0.0000, 299.65, 299.65, 599.30, 11686.35);

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
-- Table structure for table `philippine_holidays`
--

CREATE TABLE `philippine_holidays` (
  `id` int(11) NOT NULL,
  `holiday_name` varchar(255) NOT NULL,
  `holiday_date` date NOT NULL,
  `credited_days` int(11) DEFAULT 1,
  `holiday_type` enum('Regular','Special Non-Working','Special Working') DEFAULT 'Regular',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `philippine_holidays`
--

INSERT INTO `philippine_holidays` (`id`, `holiday_name`, `holiday_date`, `credited_days`, `holiday_type`, `created_at`) VALUES
(1, 'Bagong Taon', '2025-01-01', 1, 'Regular', '2025-04-21 08:40:47'),
(2, 'Maundy Thursday', '2025-04-17', 1, 'Regular', '2025-04-21 08:40:47'),
(3, 'Good Friday', '2025-04-18', 1, 'Regular', '2025-04-21 08:40:47'),
(4, 'Araw ng Kagitingan', '2025-04-09', 1, 'Regular', '2025-04-21 08:40:47'),
(5, 'Labor Day', '2025-05-01', 1, 'Regular', '2025-04-21 08:40:47'),
(6, 'Independence Day', '2025-06-12', 1, 'Regular', '2025-04-21 08:40:47'),
(7, 'National Heroes Day', '2025-08-25', 1, 'Regular', '2025-04-21 08:40:47'),
(8, 'Bonifacio Day', '2025-11-30', 1, 'Regular', '2025-04-21 08:40:47'),
(9, 'Christmas Day', '2025-12-25', 1, 'Regular', '2025-04-21 08:40:47'),
(10, 'Rizal Day', '2025-12-30', 1, 'Regular', '2025-04-21 08:40:47'),
(11, 'Ninoy Aquino Day', '2025-08-21', 1, 'Special Non-Working', '2025-04-21 08:40:47'),
(12, 'All Saints’ Day', '2025-11-01', 1, 'Special Non-Working', '2025-04-21 08:40:47'),
(13, 'Chinese New Year', '2025-01-29', 1, 'Special Non-Working', '2025-04-21 08:40:47'),
(15, 'test hostinger', '2025-04-22', 1, 'Regular', '2025-04-22 02:16:18');

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
('1', 'OJT', 'DEP-001'),
('1230', 'trse', 'hD2'),
('213', 'weqwe', 'hD2'),
('23', 'dfs', 'hD2'),
('Admin001', 'Admin Staff', 'Admin-001'),
('Admin002', 'Store Manager', 'Admin-001'),
('asd2312', 'weq', 'hD2'),
('ha2', 'hakdog', 'Admin-001'),
('has', 'hasdo', 'hD2'),
('POS-001', 'Manager', 'DEP-001'),
('POS-002', 'Programmer', 'DEP-001'),
('ps', 'Hak', 'hD2'),
('qw12', 'qwea', 'hD2'),
('qwe99', 'sdasd', 'hD2'),
('SALES-001', 'Corporate Sales Professionall', '002'),
('Sales-002', 'Sales Staff', '002'),
('tech 1', 'Main Technician', 'tech -1'),
('tech 2', 'Greatest Technician Ever Live', 'tech -1'),
('TY1', 'DOC', 'DEP-007');

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
(171, 'CJIS-2025-0001', 'Ragheil Lagat  Atacador ', 'IT DEPARTMENT', 'Programmer', 1, 1, 11986.00, 5993.00),
(172, 'CJIS-2025-0002', 'Alan Tumulak Ang', 'IT DEPARTMENT', 'Manager', 1, 1, 11986.00, 5993.00),
(173, 'CJIS-2025-0003', 'oy midddle  oy', 'Admin Department', 'Admin Staff', 1, 1, 11986.00, 5993.00),
(174, 'CJIS-2025-0004', 'Ragheil Wiwiwiwiwi Atacador', 'Admin Department', 'Admin Staff', 1, 1, 11986.00, 5993.00),
(175, 'CJIS-2025-0005', 'test test test', 'Technician ', 'Main Technician', 1, 1, 11986.00, 5993.00),
(176, 'CJIS-2025-0006', 'Queenie haha Reyes', 'Admin Department', 'Admin Staff', 1, 1, 11986.00, 5993.00),
(177, 'CJIS-2025-0007', 'Gerome  Hapson', 'IT DEPARTMENT', 'Manager', 1, 1, 11986.00, 5993.00),
(178, 'CJIS-2025-0008', 'sd asd', 'Admin Department', 'Store Manager', 1, 1, 11986.00, 5993.00),
(179, 'CJIS-2025-0009', 'tessstt tesstt tesssttt', 'SALES-1', 'Sales Staff', 1, 1, 11986.00, 5993.00),
(180, 'CJIS-2025-0010', 'HAHAHA HAHAA AHAHH', 'SALES-1', 'Corporate Sales Professionall', 1, 1, 11986.00, 5993.00),
(181, 'CJIS-2025-0011', 'Mark Busbus', 'SALES-1', 'Sales Staff', 1, 1, 11986.00, 5993.00),
(186, 'CJIS-2025-0016', 'hostinger hostinger', 'IT DEPARTMENT', 'OJT', 1, 1, 11986.00, 5993.00),
(187, 'CJIS-2025-0017', 'Gheinald Lagat Pajutining ', 'Admin Department', 'Admin Staff', 1, 1, 11986.00, 5993.00),
(188, 'CJIS-2025-0018', 'Delia Bacus  Lagat', 'IT DEPARTMENT', 'OJT', 1, 1, 11986.00, 5993.00),
(189, 'CJIS-2025-0019', 'Ivan Jay Daigdigan', 'SALES-1', 'Corporate Sales Professionall', 1, 1, 11986.00, 5993.00),
(190, 'CJIS-2025-0020', 'Ailyn May Morcilla Tongol ', 'SALES-1', 'Corporate Sales Professionall', 1, 1, 11986.00, 5993.00),
(192, 'CJIS-2025-0022', 'Louis Gio Noval', 'SALES-1', 'Corporate Sales Professionall', 1, 1, 11986.00, 5993.00),
(193, 'CJIS-2025-0023', 'atacador  chan', 'IT DEPARTMENT', 'OJT', 1, 1, 11986.00, 5993.00),
(194, 'CJIS-2025-0024', 'ricardo Rimando', 'IT DEPARTMENT', 'Programmer', 1, 1, 11986.00, 5993.00),
(196, '1000', 'y do u mean', 'SALES-1', 'OJT', 1, 1, 11986.00, 5993.00),
(197, 'CJIS-2025-0025', 'Sarfeil Curran', 'SALES-1', 'Corporate Sales Professionall', 1, 1, 11986.00, 5993.00),
(198, 'CJIS-2025-0026', 'Mark Busbus', 'Technician ', 'Greatest Technician Ever Live', 1, 1, 11986.00, 5993.00),
(199, 'CJIS-2025-0027', 'Jasper Perote', 'Technician ', 'Greatest Technician Ever Live', 1, 1, 11986.00, 5993.00);

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
(148, 'CJIS-2025-0001', 'Ragheil Lagat  Atacador ', '', 1210.00, 600.00, 11986.00, 5993.00, 1810.00),
(149, 'CJIS-2025-0002', 'Alan Tumulak Ang', '', 1210.00, 600.00, 11986.00, 5993.00, 1810.00),
(150, 'CJIS-2025-0003', 'oy midddle  oy', '', 1210.00, 600.00, 11986.00, 5993.00, 1810.00),
(151, 'CJIS-2025-0004', 'Ragheil Wiwiwiwiwi Atacador', '', 1210.00, 600.00, 11986.00, 5993.00, 1810.00),
(152, 'CJIS-2025-0005', 'test test test', '', 1210.00, 600.00, 11986.00, 5993.00, 1810.00),
(153, 'CJIS-2025-0006', 'Queenie haha Reyes', '', 1210.00, 600.00, 11986.00, 5993.00, 1810.00),
(154, 'CJIS-2025-0007', 'Gerome  Hapson', '', 1210.00, 600.00, 11986.00, 5993.00, 1810.00),
(155, 'CJIS-2025-0008', 'sd asd', '', 1210.00, 600.00, 11986.00, 5993.00, 1810.00),
(156, 'CJIS-2025-0009', 'tessstt tesstt tesssttt', '', 1210.00, 600.00, 11986.00, 5993.00, 1810.00),
(157, 'CJIS-2025-0010', 'HAHAHA HAHAA AHAHH', '', 1210.00, 600.00, 11986.00, 5993.00, 1810.00),
(158, 'CJIS-2025-0011', 'Mark Busbus', '', 1210.00, 600.00, 11986.00, 5993.00, 1810.00),
(163, 'CJIS-2025-0016', 'hostinger hostinger', '', 1210.00, 600.00, 11986.00, 5993.00, 1810.00),
(164, 'CJIS-2025-0017', 'Gheinald Lagat Pajutining ', '', 1210.00, 600.00, 11986.00, 5993.00, 1810.00),
(165, 'CJIS-2025-0018', 'Delia Bacus  Lagat', '', 1210.00, 600.00, 11986.00, 5993.00, 1810.00),
(166, 'CJIS-2025-0019', 'Ivan Jay Daigdigan', '', 1210.00, 600.00, 11986.00, 5993.00, 1810.00),
(167, 'CJIS-2025-0020', 'Ailyn May Morcilla Tongol ', '', 1210.00, 600.00, 11986.00, 5993.00, 1810.00),
(169, 'CJIS-2025-0022', 'Louis Gio Noval', '', 1210.00, 600.00, 11986.00, 5993.00, 1810.00),
(170, 'CJIS-2025-0023', 'atacador  chan', '', 1210.00, 600.00, 11986.00, 5993.00, 1810.00),
(171, 'CJIS-2025-0024', 'ricardo Rimando', '', 1210.00, 600.00, 11986.00, 5993.00, 1810.00),
(173, '1000', 'y do u mean', '', 1210.00, 600.00, 11986.00, 5993.00, 1810.00),
(174, 'CJIS-2025-0025', 'Sarfeil Curran', '', 1210.00, 600.00, 11986.00, 5993.00, 1810.00),
(175, 'CJIS-2025-0026', 'Mark Busbus', '', 1210.00, 600.00, 11986.00, 5993.00, 1810.00),
(176, 'CJIS-2025-0027', 'Jasper Perote', '', 1210.00, 600.00, 11986.00, 5993.00, 1810.00);

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
(1, 'admin', '8c6976e5b5410415bde908bd4dee15dfb167a9c873fc4bb8a81f6f2ab448a918', 'ADMIN'),
(2, 'hr', '1b52f3a2e15148731314bf167145c54565ed2385a862b5eb7771eaf719e4f82e', 'hr'),
(105, 'CJIS-2025-0001', 'f66fd8a2bf18fce43eab449b0dc44833713039360b799992a3d5de9d3dae402b', 'employee'),
(106, 'CJIS-2025-0002', '3c874a82179644ed61ed207dadaa60c64c53b9d1da3bfd7d1358d3f3edd92c4c', 'employee'),
(107, 'CJIS-2025-0003', '3e621b3c572020ea69676bffd0bad0b0340399ba05dfa057271a3f48a0f9888f', 'employee'),
(108, 'CJIS-2025-0004', 'e7edf28cc7366b3aa15644a744981da1c3f061c3bb6ab87d57adc7c8480f6d32', 'employee'),
(109, 'CJIS-2025-0005', 'b8ee60b38577e156f05f0e18817eaaa02fffe43fbdb4b287ce0a27e6b7911375', 'employee'),
(110, 'CJIS-2025-0006', 'b49ab2d86739f9bf49f6f656c36a0de16ac27b2e849c9575068ad2705f020bd6', 'employee'),
(111, 'CJIS-2025-0007', '050488836ca1d4343073b3a248c7b2856ff1c62cc441f58dadc6f29f4cfc3518', 'employee'),
(112, 'CJIS-2025-0008', '98ba19abe8d144bbdd6171fadea4ffcf3e4eaad922e6ec7eee2e312ac391fd54', 'employee'),
(113, 'CJIS-2025-0009', 'c2a8202234df0efec12916faa9d4a4e2692ba86ff5c4d10f304f49157d18cc94', 'employee'),
(114, 'CJIS-2025-0010', '689cb4e7bfbaa53f0b5eb53d4b9dd3cbf970495aa65a7879013d341dae3b2b78', 'employee'),
(115, 'CJIS-2025-0011', 'dfc063ed014a2308aaaa64c0b6f70a9056f8261c841155bc2bb20a79e6e50e12', 'employee'),
(116, 'CJIS-2025-0012', '3ac1c0fe802837780a834ab85483c7c63ebd0e676be1866e3175bec13cabb5a4', 'employee'),
(117, 'CJIS-2025-0013', 'f837f141174d0c2f3bb7ca4b6e9e05ab4c20ed716b3ea2b2d5630d7ea658859d', 'employee'),
(118, 'CJIS-2025-0014', '06732a5980a2204be15b31c5273ae42b54dbd63fd4081ec4b8244317354ffb3e', 'employee'),
(119, 'CJIS-2025-0015', '5494fae0126ec53b8c5a5706bde4b41212fbea1ae1d2d14a44550f8c6edfaa72', 'employee'),
(120, 'CJIS-2025-0016', '5747782b13b1a58fe587ff5f6c39218696027bb09dc6cfcadea7f4e5c602553a', 'employee'),
(121, 'CJIS-2025-0017', '2353a6c2730ba50a25e422b197cd41b2eb5233da1432819fd5ae9d0a4cd32eea', 'employee'),
(122, 'CJIS-2025-0018', '29a636311b6d75309ca9a4a35bb9d600a5ec7db80295941d4ae906034aa46aae', 'employee'),
(123, 'CJIS-2025-0019', '52dfb3e79b9ba00c96bba8a1cf3e60138b9e950f9c0233fb195bf5227b930b58', 'employee'),
(124, 'CJIS-2025-0020', 'a674581c2393ec7fc8398e083d191f8eed4dd688a77b6f4fc94da27e275e5c56', 'employee'),
(125, 'CJIS-2025-0021', '87023f94ed483d89e19d9e9f57e657af0a996ed7efe016fbba55f7980f5c98d6', 'employee'),
(126, 'CJIS-2025-0022', 'd5af4bc63bda044056bac2752fe5b4365f6e0b5df9fcd295bee809ce8591c325', 'employee'),
(127, 'CJIS-2025-0023', '626846811449ea48b8ccd22b3da4db404ca09fdc7a8357bceaf1f18a5e4cc697', 'employee'),
(128, 'CJIS-2025-0024', '60f7195af0219c52f21502102cc48b3b723f6b8b132a495241d89287d49951dd', 'employee'),
(129, '1000', 'bd6c00066c4c2dcb72ebd1d2add47983f1ed54c99f8621e4a955df0bf285360e', 'employee'),
(130, 'CJIS-2025-0025', '4128f6b76241a17abf53f12e8e07119a89587f9ee073abeccad63010da5720ce', 'employee'),
(131, 'CJIS-2025-0026', '21c63989333baa4ac7c371544801b02af08aa2fd05d9cf8323d63d3494b8c84e', 'employee'),
(132, 'CJIS-2025-0027', '3106a62b33bd05cb2fafd15afc3d859475acbb47b5e548d5d5bad7c41828a2d5', 'employee');

--
-- Indexes for dumped tables
--

--
-- Indexes for table `attendance`
--
ALTER TABLE `attendance`
  ADD PRIMARY KEY (`attendance_id`),
  ADD KEY `fk_employee` (`employee_id`);

--
-- Indexes for table `attendance_test`
--
ALTER TABLE `attendance_test`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `base_salary`
--
ALTER TABLE `base_salary`
  ADD PRIMARY KEY (`base_salary_id`),
  ADD KEY `fk_employee_id` (`employee_id`);

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
-- Indexes for table `employee_overtime_request`
--
ALTER TABLE `employee_overtime_request`
  ADD PRIMARY KEY (`request_id`),
  ADD KEY `fk_overtime_employee_id` (`employee_id`);

--
-- Indexes for table `fetch_log`
--
ALTER TABLE `fetch_log`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `holidays`
--
ALTER TABLE `holidays`
  ADD PRIMARY KEY (`holiday_id`);

--
-- Indexes for table `inactive_employees`
--
ALTER TABLE `inactive_employees`
  ADD PRIMARY KEY (`employee_id`);

--
-- Indexes for table `incentives`
--
ALTER TABLE `incentives`
  ADD PRIMARY KEY (`incentives_id`),
  ADD KEY `employee_id` (`employee_id`),
  ADD KEY `position_id` (`position_id`);

--
-- Indexes for table `lateness_rules`
--
ALTER TABLE `lateness_rules`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `late_attendance_requests`
--
ALTER TABLE `late_attendance_requests`
  ADD PRIMARY KEY (`request_id`),
  ADD KEY `employee_id` (`employee_id`),
  ADD KEY `reviewed_by` (`reviewed_by`);

--
-- Indexes for table `overtime_settings`
--
ALTER TABLE `overtime_settings`
  ADD PRIMARY KEY (`overtime_id`);

--
-- Indexes for table `overtime_table`
--
ALTER TABLE `overtime_table`
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
-- Indexes for table `payroll_logs`
--
ALTER TABLE `payroll_logs`
  ADD PRIMARY KEY (`id`);

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
-- Indexes for table `philippine_holidays`
--
ALTER TABLE `philippine_holidays`
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
  MODIFY `attendance_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4565406;

--
-- AUTO_INCREMENT for table `attendance_test`
--
ALTER TABLE `attendance_test`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=9235;

--
-- AUTO_INCREMENT for table `base_salary`
--
ALTER TABLE `base_salary`
  MODIFY `base_salary_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=135;

--
-- AUTO_INCREMENT for table `deduction`
--
ALTER TABLE `deduction`
  MODIFY `deduction_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT for table `deduction_table`
--
ALTER TABLE `deduction_table`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=24;

--
-- AUTO_INCREMENT for table `employee_overtime_request`
--
ALTER TABLE `employee_overtime_request`
  MODIFY `request_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=27;

--
-- AUTO_INCREMENT for table `fetch_log`
--
ALTER TABLE `fetch_log`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT for table `holidays`
--
ALTER TABLE `holidays`
  MODIFY `holiday_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT for table `incentives`
--
ALTER TABLE `incentives`
  MODIFY `incentives_id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `lateness_rules`
--
ALTER TABLE `lateness_rules`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT for table `late_attendance_requests`
--
ALTER TABLE `late_attendance_requests`
  MODIFY `request_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=46;

--
-- AUTO_INCREMENT for table `overtime_settings`
--
ALTER TABLE `overtime_settings`
  MODIFY `overtime_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT for table `overtime_table`
--
ALTER TABLE `overtime_table`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `pagibig_contribution`
--
ALTER TABLE `pagibig_contribution`
  MODIFY `pagibig_contribution_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=175;

--
-- AUTO_INCREMENT for table `pagibig_contributions_2025`
--
ALTER TABLE `pagibig_contributions_2025`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT for table `payroll`
--
ALTER TABLE `payroll`
  MODIFY `payroll_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=246;

--
-- AUTO_INCREMENT for table `payroll_logs`
--
ALTER TABLE `payroll_logs`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=116;

--
-- AUTO_INCREMENT for table `philhealth_contribution`
--
ALTER TABLE `philhealth_contribution`
  MODIFY `PH_contribution_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=175;

--
-- AUTO_INCREMENT for table `philhealth_contributions_2025`
--
ALTER TABLE `philhealth_contributions_2025`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- AUTO_INCREMENT for table `philippine_holidays`
--
ALTER TABLE `philippine_holidays`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=17;

--
-- AUTO_INCREMENT for table `salary_for_employee`
--
ALTER TABLE `salary_for_employee`
  MODIFY `salary_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=200;

--
-- AUTO_INCREMENT for table `sss_contribution`
--
ALTER TABLE `sss_contribution`
  MODIFY `SSS_Contribution_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=177;

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
  MODIFY `user_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=133;

--
-- Constraints for dumped tables
--

--
-- Constraints for table `attendance`
--
ALTER TABLE `attendance`
  ADD CONSTRAINT `attendance_ibfk_1` FOREIGN KEY (`employee_id`) REFERENCES `employees` (`employee_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_employee` FOREIGN KEY (`employee_id`) REFERENCES `employees` (`employee_id`) ON DELETE CASCADE;

--
-- Constraints for table `base_salary`
--
ALTER TABLE `base_salary`
  ADD CONSTRAINT `fk_employee_id` FOREIGN KEY (`employee_id`) REFERENCES `employees` (`employee_id`) ON DELETE CASCADE;

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
-- Constraints for table `employee_overtime_request`
--
ALTER TABLE `employee_overtime_request`
  ADD CONSTRAINT `fk_overtime_employee_id` FOREIGN KEY (`employee_id`) REFERENCES `employees` (`employee_id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `incentives`
--
ALTER TABLE `incentives`
  ADD CONSTRAINT `incentives_ibfk_1` FOREIGN KEY (`employee_id`) REFERENCES `employees` (`employee_id`),
  ADD CONSTRAINT `incentives_ibfk_2` FOREIGN KEY (`position_id`) REFERENCES `employees` (`position_id`);

--
-- Constraints for table `late_attendance_requests`
--
ALTER TABLE `late_attendance_requests`
  ADD CONSTRAINT `late_attendance_requests_ibfk_1` FOREIGN KEY (`employee_id`) REFERENCES `employees` (`employee_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `late_attendance_requests_ibfk_2` FOREIGN KEY (`reviewed_by`) REFERENCES `users` (`username`) ON DELETE SET NULL ON UPDATE CASCADE;

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
