<?php
// header('Access-Control-Allow-Origin: *');
// header('Access-Control-Allow-Methods: PUT, OPTIONS');
// header('Access-Control-Allow-Headers: Content-Type, Authorization');
require_once '../server/connection.php';
include("../server/cors.php");

$id = $_POST['id'];
$status = strtolower($_POST['status']); // ✅ force lowercase
$reviewed_by = $_POST['reviewed_by'];

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

// Step 1: Update the request status
$sql = "UPDATE late_attendance_requests 
        SET status = ?, reviewed_by = ?, reviewed_at = NOW() 
        WHERE request_id = ?";
$stmt = $conn->prepare($sql);
$stmt->bind_param('ssi', $status, $reviewed_by, $id);

if ($stmt->execute()) {
    if ($status === 'approved') {
        // Fetch late request
        $fetchSql = "SELECT * FROM late_attendance_requests WHERE request_id = ?";
        $fetchStmt = $conn->prepare($fetchSql);
        $fetchStmt->bind_param('i', $id);
        $fetchStmt->execute();
        $result = $fetchStmt->get_result();
        $request = $result->fetch_assoc();
        $fetchStmt->close();

        if ($request) {
            $employee_id = $request['employee_id'];
            $employee_name = $request['employee_name'];
            $attendance_date = $request['attendance_date'];
            $in_morning = $request['requested_time_in_morning'];
            $out_morning = $request['requested_time_out_morning'];
            $in_afternoon = $request['requested_time_in_afternoon'];
            $out_afternoon = $request['requested_time_out_afternoon'];

            $total_minutes = 0;
            $credit_basis_minutes = 480;
            $range_start = "09:00:00";
            $range_end = "18:00:00";

            // Compute minutes
            if ($in_morning && $out_morning) {
                $in_ts = strtotime($in_morning);
                if ($in_ts >= strtotime("09:00:00") && $in_ts <= strtotime("09:59:59")) {
                    $total_minutes += 60;
                    if (strtotime($out_morning) > strtotime("10:00:00")) {
                        $total_minutes += timeDiffWithinRange("10:00:00", $out_morning, $range_start, $range_end);
                    }
                } else {
                    $total_minutes += timeDiffWithinRange($in_morning, $out_morning, $range_start, $range_end);
                }
            }

            if ($in_afternoon && $out_afternoon) {
                $in_ts = strtotime($in_afternoon);
                if ($in_ts >= strtotime("13:00:00") && $in_ts <= strtotime("13:59:59")) {
                    $total_minutes += 60;
                    if (strtotime($out_afternoon) > strtotime("14:00:00")) {
                        $total_minutes += timeDiffWithinRange("14:00:00", $out_afternoon, $range_start, $range_end);
                    }
                } else {
                    $total_minutes += timeDiffWithinRange($in_afternoon, $out_afternoon, $range_start, $range_end);
                }
            }

            $days_credited = $total_minutes / $credit_basis_minutes;

            // Deduction
            $deduction = 0.0;
            if ($in_morning && strtotime($in_morning) > strtotime("09:00:00")) {
                $deduction += getDeduction($conn, $in_morning);
            }
            if ($in_afternoon && strtotime($in_afternoon) > strtotime("13:00:00")) {
                $deduction += getDeduction($conn, $in_afternoon);
            }

            $days_credited -= $deduction;
            $days_credited = max(0, min(1.0, round($days_credited + 1e-6, 2)));

            $early_out = 0;
            if (($out_morning && strtotime($out_morning) < strtotime("12:00:00")) ||
                ($out_afternoon && strtotime($out_afternoon) < strtotime("17:00:00"))) {
                $early_out = 1;
            }

            // Check if specific attendance exists
            $checkSql = "SELECT attendance_id FROM attendance WHERE employee_id = ? AND attendance_date = ?";
            $checkStmt = $conn->prepare($checkSql);
            $checkStmt->bind_param('ss', $employee_id, $attendance_date);
            $checkStmt->execute();
            $checkStmt->bind_result($attendance_id);
            $found = $checkStmt->fetch();
            $checkStmt->close();

            if ($found) {
                // Update specific attendance
                $updateSql = "UPDATE attendance SET 
                                time_in_morning = ?, 
                                time_out_morning = ?, 
                                time_in_afternoon = ?, 
                                time_out_afternoon = ?, 
                                days_credited = ?, 
                                early_out = ?
                              WHERE attendance_id = ?";
                $updateStmt = $conn->prepare($updateSql);
                $updateStmt->bind_param(
                    "ssssdii", // ✅ fixed types
                    $in_morning,
                    $out_morning,
                    $in_afternoon,
                    $out_afternoon,
                    $days_credited,
                    $early_out,
                    $attendance_id
                );
                $updateStmt->execute();
                $updateStmt->close();
            } else {
                // Insert new attendance
                $insertSql = "INSERT INTO attendance 
                            (employee_id, employee_name, attendance_date, time_in_morning, time_out_morning, time_in_afternoon, time_out_afternoon, days_credited, early_out) 
                            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)";
                $insertStmt = $conn->prepare($insertSql);
                $insertStmt->bind_param(
                    "sssssssd",
                    $employee_id,
                    $employee_name,
                    $attendance_date,
                    $in_morning,
                    $out_morning,
                    $in_afternoon,
                    $out_afternoon,
                    $days_credited,
                    $early_out
                );
                $insertStmt->execute();
                $insertStmt->close();
            }
        }
    }

    echo json_encode(["success" => true]);
} else {
    echo json_encode(["success" => false, "message" => "Failed to update request status"]);
}

$stmt->close();
$conn->close();
?>
