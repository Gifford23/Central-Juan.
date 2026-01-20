<?php
ob_start();
// update_attendance.php

// header("Access-Control-Allow-Origin: *");
// header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");
// header("Access-Control-Allow-Headers: Content-Type, Authorization");
include("../server/cors.php");
include "../server/connection.php";

/**
 * Calculates time difference (in minutes) within a specified valid range.
 */
function timeDiffWithinRange($start, $end, $range_start, $range_end) {
    $start_ts = max(strtotime($start), strtotime($range_start));
    $end_ts = min(strtotime($end), strtotime($range_end));
    $diff = $end_ts - $start_ts;
    return ($diff > 0) ? $diff / 60 : 0;
}

/**
 * Retrieves deduction based on the late time-in.
 */
function getDeduction($conn, $late_time) {
    $sql = "SELECT deduction FROM deduction_table WHERE ? BETWEEN start_time AND end_time LIMIT 1";
    $stmt = $conn->prepare($sql);
    $stmt->bind_param("s", $late_time);
    $stmt->execute();
    $result = $stmt->get_result();
    $deduction = 0.0;
    if ($row = $result->fetch_assoc()) {
        $deduction = floatval($row['deduction']);
    }
    $stmt->close();
    return $deduction;
}

// Get input
$data = json_decode(file_get_contents("php://input"), true);

if (isset($_GET['id'], $data['attendance_date'], $data['employee_id'], $data['employee_name'])) {
    $attendance_id = $_GET['id'];
    $attendance_date = $data['attendance_date'];
    $employee_id = $data['employee_id'];
    $employee_name = $data['employee_name'];
    $time_in_morning = $data['time_in_morning'] ?? '';
    $time_out_morning = $data['time_out_morning'] ?? '';
    $time_in_afternoon = $data['time_in_afternoon'] ?? '';
    $time_out_afternoon = $data['time_out_afternoon'] ?? '';

    // Normalize afternoon time-in between 12:30–13:05 to 13:00
    if (!empty($time_in_afternoon)) {
        $in_afternoon_ts = strtotime($time_in_afternoon);
        if ($in_afternoon_ts >= strtotime("12:30:00") && $in_afternoon_ts <= strtotime("13:05:00")) {
            $time_in_afternoon = "13:00:00";
        }
    }

    $credit_basis_minutes = 480;
    $range_start = "09:00:00";
    $range_end = "18:00:00";
    $total_minutes = 0;

    // ✅ Calculate holiday info
    $is_holiday_attendance = 0;
    $holiday_row = null;
    $holiday_sql = "SELECT * FROM holidays 
                    WHERE (holiday_date = ? OR (is_recurring = 1 AND DATE_FORMAT(holiday_date, '%m-%d') = DATE_FORMAT(?, '%m-%d')))
                    AND (extended_until IS NULL OR extended_until = '0000-00-00' OR extended_until >= ?) 
                    LIMIT 1";
    $holiday_stmt = $conn->prepare($holiday_sql);
    $holiday_stmt->bind_param("sss", $attendance_date, $attendance_date, $attendance_date);
    $holiday_stmt->execute();
    $holiday_result = $holiday_stmt->get_result();
    if ($holiday_result && $holiday_result->num_rows > 0) {
        $holiday_row = $holiday_result->fetch_assoc();
        $is_holiday_attendance = 1;
    }
    $holiday_stmt->close();

    // Morning time-in with fixed 1-hour rule
    if ($time_in_morning && $time_out_morning) {
        $in_ts = strtotime($time_in_morning);
        $out_ts = strtotime($time_out_morning);
        if ($in_ts >= strtotime("09:00:00") && $in_ts <= strtotime("09:59:59")) {
            $total_minutes += 60;
            if ($out_ts > strtotime("10:00:00")) {
                $total_minutes += timeDiffWithinRange("10:00:00", $time_out_morning, $range_start, $range_end);
            }
        } else {
            $total_minutes += timeDiffWithinRange($time_in_morning, $time_out_morning, $range_start, $range_end);
        }
    }

    // Afternoon time-in with fixed 1-hour rule
    if ($time_in_afternoon && $time_out_afternoon) {
        $in_ts = strtotime($time_in_afternoon);
        $out_ts = strtotime($time_out_afternoon);
        if ($in_ts >= strtotime("13:00:00") && $in_ts <= strtotime("13:59:59")) {
            $total_minutes += 60;
            if ($out_ts > strtotime("14:00:00")) {
                $total_minutes += timeDiffWithinRange("14:00:00", $time_out_afternoon, $range_start, $range_end);
            }
        } else {
            $total_minutes += timeDiffWithinRange($time_in_afternoon, $time_out_afternoon, $range_start, $range_end);
        }
    }

    $base_days_credited = $total_minutes / $credit_basis_minutes;

    // Early out flag
    $early_out = 0;
    if (($time_out_morning && strtotime($time_out_morning) < strtotime("12:00:00")) ||
        ($time_out_afternoon && strtotime($time_out_afternoon) < strtotime("17:00:00"))) {
        $early_out = 1;
    }

    // Deductions
    $deduction_morning = ($time_in_morning && strtotime($time_in_morning) > strtotime("09:00:00")) ? getDeduction($conn, $time_in_morning) : 0.0;
    $deduction_afternoon = ($time_in_afternoon && strtotime($time_in_afternoon) > strtotime("13:00:00")) ? getDeduction($conn, $time_in_afternoon) : 0.0;

    // ✅ Option 2: Add lateness + undertime deduction
    $lateness_deduction = $deduction_morning + $deduction_afternoon;
    $undertime_deduction = 1 - $base_days_credited; // missing part of the day
    $total_deduction = $lateness_deduction + $undertime_deduction;

    $adjusted_days = max(0, 1.0 - $total_deduction);

    // Apply multiplier AFTER deduction
    if ($is_holiday_attendance && $holiday_row) {
        $multiplier = floatval($holiday_row['default_multiplier'] ?? 1.0);
        if ($multiplier <= 0) $multiplier = 1.0;
        $apply_multiplier = intval($holiday_row['apply_multiplier'] ?? 1) === 1;

        // Only apply multiplier if adjusted days is exactly 1.0
        if ($apply_multiplier && round($adjusted_days, 2) === 1.0) {
            $days_credited = round($adjusted_days * $multiplier, 2);
        } else {
            $days_credited = round($adjusted_days, 2);
        }

    } else {
        $days_credited = min(1.0, round($adjusted_days, 2));
        $is_holiday_attendance = 0;
    }


    // Debug (optional)
    error_log("Credited: $days_credited | Multiplier used: " . ($multiplier ?? '1.0'));

    // ✅ Update attendance
    $sql = "UPDATE attendance SET 
                attendance_date=?, employee_id=?, employee_name=?, 
                time_in_morning=?, time_out_morning=?, 
                time_in_afternoon=?, time_out_afternoon=?, 
                days_credited=?, early_out=?, is_holiday_attendance=?
            WHERE attendance_id=?";
    $stmt = $conn->prepare($sql);
    $stmt->bind_param("sssssssdisi", 
        $attendance_date, $employee_id, $employee_name, 
        $time_in_morning, $time_out_morning, 
        $time_in_afternoon, $time_out_afternoon, 
        $days_credited, $early_out, $is_holiday_attendance, $attendance_id
    );

    echo json_encode($stmt->execute() ? 
        ["success" => true] : 
        ["success" => false, "message" => "Failed to update record."]);

    $stmt->close();
} else {
    echo json_encode(["success" => false, "message" => "Invalid input data."]);
}

$conn->close();
?>
