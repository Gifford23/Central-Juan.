<?php
// Set headers to allow CORS and handle HTTP methods
// header("Access-Control-Allow-Origin: *");
// header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");
// header("Access-Control-Allow-Headers: Content-Type, Authorization");

// Include database connection
include "../../server/connection.php"; 
include("../../server/cors.php");


// Get the raw POST data
$rawData = file_get_contents('php://input');

// Decode the JSON data
$data = json_decode($rawData, true);

// Log the decoded data for debugging
error_log('Decoded JSON data: ' . print_r($data, true));

/**
 * Calculates time difference (in minutes) within valid range
 */
function timeDiffWithinRange($start, $end, $range_start, $range_end) {
    $start_ts = max(strtotime($start), strtotime($range_start));
    $end_ts = min(strtotime($end), strtotime($range_end));
    $diff = $end_ts - $start_ts;
    return ($diff > 0) ? $diff / 60 : 0;
}

/**
 * Retrieves deduction based on late time-in
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

// Check required fields
if (isset($data['attendance_date']) && isset($data['employee_id']) && isset($data['employee_name'])) {
    $attendance_date = $data['attendance_date'];
    $employee_id = $data['employee_id'];
    $employee_name = $data['employee_name'];
    $time_in_morning = $data['time_in_morning'] ?? '00:00:00';
    $time_out_morning = $data['time_out_morning'] ?? '00:00:00'; 
    $time_in_afternoon = $data['time_in_afternoon'] ?? '00:00:00'; 
    $time_out_afternoon = $data['time_out_afternoon'] ?? '00:00:00'; 

    // Normalize time
    if (!empty($time_in_afternoon)) {
        $in_afternoon_ts = strtotime($time_in_afternoon);
        if ($in_afternoon_ts >= strtotime("12:30:00") && $in_afternoon_ts <= strtotime("13:05:00")) {
            $time_in_afternoon = "13:00:00";
        }
    }

    $range_start = "09:00:00";
    $range_end = "18:00:00";
    $credit_basis_minutes = 480;
    $total_minutes = 0;

    // Calculate morning credit
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

    // Calculate afternoon credit
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

    // Early out
    $early_out = 0;
    if (($time_out_morning && strtotime($time_out_morning) < strtotime("12:00:00")) ||
        ($time_out_afternoon && strtotime($time_out_afternoon) < strtotime("17:00:00"))) {
        $early_out = 1;
    }

    // Deduction
    $deduction_morning = ($time_in_morning && strtotime($time_in_morning) > strtotime("09:00:00")) ? getDeduction($conn, $time_in_morning) : 0.0;
    $deduction_afternoon = ($time_in_afternoon && strtotime($time_in_afternoon) > strtotime("13:00:00")) ? getDeduction($conn, $time_in_afternoon) : 0.0;
    $total_deduction = $deduction_morning + $deduction_afternoon;

    $adjusted_days = max(0, $base_days_credited - $total_deduction);

    // ✅ Check if it's a holiday and apply multiplier only if base is full (1.0)
    $is_holiday_attendance = 0;
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

        $multiplier = isset($holiday_row['default_multiplier']) ? floatval($holiday_row['default_multiplier']) : 1.0;
        $apply_multiplier = isset($holiday_row['apply_multiplier']) ? boolval($holiday_row['apply_multiplier']) : false;

        if ($apply_multiplier && round($adjusted_days, 2) === 1.0) {
            $adjusted_days = round($adjusted_days * $multiplier, 2);
        }
    }

    // ✅ Final credit assignment
    $days_credited = $is_holiday_attendance ? $adjusted_days : min(1.0, round($adjusted_days, 2));

    // Prepare SQL query to insert attendance record
    $sql = "INSERT INTO attendance (
                attendance_date, employee_id, employee_name,
                time_in_morning, time_out_morning,
                time_in_afternoon, time_out_afternoon,
                days_credited, early_out, is_holiday_attendance
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";

    $stmt = $conn->prepare($sql);
    $stmt->bind_param(
        "sssssssdis",
        $attendance_date, $employee_id, $employee_name,
        $time_in_morning, $time_out_morning,
        $time_in_afternoon, $time_out_afternoon,
        $days_credited, $early_out, $is_holiday_attendance
    );

    // Execute the statement and check for success
    if ($stmt->execute()) {
        echo json_encode(["success" => true]);
    } else {
        echo json_encode(["success" => false, "message" => "Failed to create record."]);
    }

    $stmt->close();
} else {
    echo json_encode(["success" => false, "message" => "Invalid input data."]);
}

// Close the database connection
$conn->close();
?>
