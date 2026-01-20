<?php
// header("Access-Control-Allow-Origin: *");
// header("Access-Control-Allow-Methods: POST, OPTIONS");
// header("Access-Control-Allow-Headers: Content-Type, Authorization");
// header("Content-Type: application/json; charset=UTF-8");

// if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
//     http_response_code(200);
//     exit();
// }

include('../server/connection.php');
include("../server/cors.php");


$input = json_decode(file_get_contents("php://input"), true);

$employee_id = $input['employee_id'] ?? '';
$employee_name = $input['employee_name'] ?? '';
$date_requested = $input['date_requested'] ?? date('Y-m-d');
$time_start = $input['time_start'] ?? '';
$end_time = $input['end_time'] ?? '';
$reason = $input['reason'] ?? '';

if (!$employee_id || !$employee_name || !$time_start || !$end_time || !$reason) {
    echo json_encode(["success" => false, "message" => "Missing required fields."]);
    exit;
}

// Check if exists
$check_sql = "SELECT request_id FROM employee_overtime_request WHERE employee_id = ? AND date_requested = ?";
$check_stmt = $conn->prepare($check_sql);
$check_stmt->bind_param("ss", $employee_id, $date_requested);
$check_stmt->execute();
$check_stmt->store_result();

if ($check_stmt->num_rows > 0) {
    // Update
    $check_stmt->bind_result($request_id);
    $check_stmt->fetch();

    $update_sql = "UPDATE employee_overtime_request
                   SET time_start = ?, end_time = ?, reason = ?, status = 'Approved'
                   WHERE request_id = ?";
    $update_stmt = $conn->prepare($update_sql);
    $update_stmt->bind_param("sssi", $time_start, $end_time, $reason, $request_id);

    if ($update_stmt->execute()) {
        echo json_encode(["success" => true, "message" => "Overtime updated successfully."]);
    } else {
        echo json_encode(["success" => false, "message" => "Failed to update overtime."]);
    }

    $update_stmt->close();
} else {
    // Insert
    $insert_sql = "INSERT INTO employee_overtime_request 
                   (employee_id, employee_name, date_requested, time_start, end_time, reason, status)
                   VALUES (?, ?, ?, ?, ?, ?, 'Approved')";
    $insert_stmt = $conn->prepare($insert_sql);
    $insert_stmt->bind_param("ssssss", $employee_id, $employee_name, $date_requested, $time_start, $end_time, $reason);

    if ($insert_stmt->execute()) {
        echo json_encode(["success" => true, "message" => "Overtime added successfully."]);
    } else {
        echo json_encode(["success" => false, "message" => "Failed to add overtime."]);
    }

    $insert_stmt->close();
}

$check_stmt->close();
$conn->close();
?>
