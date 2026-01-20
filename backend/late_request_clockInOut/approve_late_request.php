<?php
// header("Access-Control-Allow-Origin: *");
// header("Access-Control-Allow-Methods: POST, OPTIONS");
// header("Access-Control-Allow-Headers: Content-Type, Authorization");

// if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
//     http_response_code(200);
//     exit();
// }

require_once '../server/connection.php';
include("../server/cors.php");

function timeDiffWithinRange($start, $end, $range_start, $range_end) {
    $start_ts = max(strtotime($start), strtotime($range_start));
    $end_ts = min(strtotime($end), strtotime($range_end));
    $diff = $end_ts - $start_ts;
    return ($diff > 0) ? $diff / 60 : 0;
}

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

$data = json_decode(file_get_contents("php://input"));

if (
    isset($data->employee_id) &&
    isset($data->attendance_date) &&
    isset($data->requested_time_in_morning) &&
    isset($data->requested_time_out_morning) &&
    isset($data->requested_time_in_afternoon) &&
    isset($data->requested_time_out_afternoon)
) {
    $employee_id = $data->employee_id;
    $attendance_date = $data->attendance_date;
    $time_in_morning = $data->requested_time_in_morning;
    $time_out_morning = $data->requested_time_out_morning;
    $time_in_afternoon = $data->requested_time_in_afternoon;
    $time_out_afternoon = $data->requested_time_out_afternoon;

    // Normalize afternoon time-in
    if (!empty($time_in_afternoon)) {
        $in_afternoon_ts = strtotime($time_in_afternoon);
        if ($in_afternoon_ts >= strtotime("12:30:00") && $in_afternoon_ts <= strtotime("13:05:00")) {
            $time_in_afternoon = "13:00:00";
        }
    }

    // Remove seconds
    $time_in_morning = date("H:i", strtotime($time_in_morning));
    $time_out_morning = date("H:i", strtotime($time_out_morning));
    $time_in_afternoon = date("H:i", strtotime($time_in_afternoon));
    $time_out_afternoon = date("H:i", strtotime($time_out_afternoon));

    $range_start = "09:00:00";
    $range_end = "18:00:00";
    $credit_basis_minutes = 480;
    $total_minutes = 0;

    // Morning logic
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

    // Afternoon logic
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

    $days_credited = $total_minutes / $credit_basis_minutes;

    $early_out = 0;
    if (($time_out_morning && strtotime($time_out_morning) < strtotime("12:00:00")) ||
        ($time_out_afternoon && strtotime($time_out_afternoon) < strtotime("17:00:00"))) {
        $early_out = 1;
    }

    $deduction = 0.0;
    if (!empty($time_in_morning) && strtotime($time_in_morning) > strtotime("09:00:00")) {
        $deduction += getDeduction($conn, $time_in_morning);
    }
    if (!empty($time_in_afternoon) && strtotime($time_in_afternoon) > strtotime("13:00:00")) {
        $deduction += getDeduction($conn, $time_in_afternoon);
    }

    $days_credited -= $deduction;
    $days_credited = max(0, min(1.0, round($days_credited + 1e-6, 2)));

    // ✅ Fetch exact attendance_id first
    $checkSql = "SELECT attendance_id FROM attendance WHERE employee_id = ? AND attendance_date = ? LIMIT 1";
    $checkStmt = $conn->prepare($checkSql);
    $checkStmt->bind_param("ss", $employee_id, $attendance_date);
    $checkStmt->execute();
    $checkStmt->bind_result($attendance_id);
    $found = $checkStmt->fetch();
    $checkStmt->close();

    if ($found) {
        // ✅ Update specific attendance_id
        $sql = "UPDATE attendance 
                SET time_in_morning = ?, 
                    time_out_morning = ?, 
                    time_in_afternoon = ?, 
                    time_out_afternoon = ?, 
                    days_credited = ?, 
                    early_out = ?
                WHERE attendance_id = ?";

        $stmt = $conn->prepare($sql);
        $stmt->bind_param(
            "ssssdis",
            $time_in_morning,
            $time_out_morning,
            $time_in_afternoon,
            $time_out_afternoon,
            $days_credited,
            $early_out,
            $attendance_id
        );
    } else {
        // ✅ Insert new attendance
        $sql = "INSERT INTO attendance 
                (employee_id, employee_name, attendance_date, time_in_morning, time_out_morning, time_in_afternoon, time_out_afternoon, days_credited, early_out) 
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)";

        $stmt = $conn->prepare($sql);
        $stmt->bind_param(
            "sssssssd",
            $employee_id,
            $data->employee_name,
            $attendance_date,
            $time_in_morning,
            $time_out_morning,
            $time_in_afternoon,
            $time_out_afternoon,
            $days_credited,
            $early_out
        );
    }

    if ($stmt->execute()) {
        echo json_encode([
            "success" => true,
            "message" => "Attendance approved. Minutes: $total_minutes, Credited: $days_credited, Deduction: $deduction"
        ]);
    } else {
        echo json_encode(["success" => false, "message" => "Failed to save attendance."]);
    }

    $stmt->close();
} else {
    echo json_encode(["success" => false, "message" => "Missing required fields."]);
}

$conn->close();
?>
