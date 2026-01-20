<?php
include '../server/connection.php';
include("../server/cors.php");

// header("Access-Control-Allow-Origin: *");
// header("Access-Control-Allow-Methods: POST, OPTIONS");
// header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");
// header("Content-Type: application/json; charset=UTF-8");

$data = json_decode(file_get_contents("php://input"), true);

$leave_id         = $data['leave_id'] ?? null;
$status           = $data['status'] ?? null;
$approver_id      = $data['approver_id'] ?? null;
$approval_remarks = $data['approval_remarks'] ?? null;

if (!$leave_id || !$status) {
    echo json_encode(["success" => false, "message" => "Missing required fields."]);
    exit;
}

$query = "UPDATE leave_requests 
          SET status = ?, approver_id = ?, approval_remarks = ? 
          WHERE leave_id = ?";
$stmt = $conn->prepare($query);
$stmt->bind_param("sssi", $status, $approver_id, $approval_remarks, $leave_id);

if ($stmt->execute()) {
    echo json_encode(["success" => true, "message" => "Leave request updated successfully."]);
} else {
    echo json_encode(["success" => false, "message" => "Error: " . $stmt->error]);
}

$stmt->close();
$conn->close();
