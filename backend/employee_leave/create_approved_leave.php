<?php
// header("Access-Control-Allow-Origin: *");
// header("Access-Control-Allow-Methods: POST, OPTIONS");
// header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");
// header("Content-Type: application/json; charset=UTF-8");
include("../server/cors.php");

include '../server/connection.php';

$data = json_decode(file_get_contents("php://input"), true);

$employee_id = $data['employee_id'];
$leave_type_id = $data['leave_type_id'];
$date_from = $data['date_from'];
$date_until = $data['date_until'];
$total_days = $data['total_days'];
$reason = $data['reason'];
$status = $data['status'] ?? 'pending';

$stmt = $conn->prepare("INSERT INTO employee_leaves (employee_id, leave_type_id, date_from, date_until, total_days, reason, status) VALUES (?, ?, ?, ?, ?, ?, ?)");
$stmt->bind_param("sissdss", $employee_id, $leave_type_id, $date_from, $date_until, $total_days, $reason, $status);

if ($stmt->execute()) {
    echo json_encode(["success" => true, "message" => "Leave created successfully"]);
} else {
    echo json_encode(["success" => false, "message" => $stmt->error]);
}
?>
