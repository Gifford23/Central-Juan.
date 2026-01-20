<?php
include '../server/connection.php';
include("../server/cors.php");


// header("Access-Control-Allow-Origin: *");
// header("Access-Control-Allow-Methods: PUT, OPTIONS");
// header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");
// header("Content-Type: application/json; charset=UTF-8");

$data = json_decode(file_get_contents("php://input"), true);

$leave_id = $data['leave_id'];
$leave_type_id = $data['leave_type_id'];
$date_from = $data['date_from'];
$date_until = $data['date_until'];
$total_days = $data['total_days'];
$reason = $data['reason'];
$status = $data['status'];

$stmt = $conn->prepare("UPDATE employee_leaves SET leave_type_id=?, date_from=?, date_until=?, total_days=?, reason=?, status=? WHERE leave_id=?");
$stmt->bind_param("issdssi", $leave_type_id, $date_from, $date_until, $total_days, $reason, $status, $leave_id);

if ($stmt->execute()) {
    echo json_encode(["success" => true, "message" => "Leave updated successfully"]);
} else {
    echo json_encode(["success" => false, "message" => $stmt->error]);
}
?>
