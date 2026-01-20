<?php
include '../server/connection.php';
include("../server/cors.php");

// header("Access-Control-Allow-Origin: *");
// header("Access-Control-Allow-Methods: POST, OPTIONS");
// header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");
// header("Content-Type: application/json; charset=UTF-8");

$data = json_decode(file_get_contents("php://input"), true);

$leave_id = $data['leave_id'] ?? null;

if (!$leave_id) {
    echo json_encode(["success" => false, "message" => "Missing leave_id."]);
    exit;
}

$query = "DELETE FROM leave_requests WHERE leave_id = ?";
$stmt = $conn->prepare($query);
$stmt->bind_param("i", $leave_id);

if ($stmt->execute()) {
    echo json_encode(["success" => true, "message" => "Leave request deleted successfully."]);
} else {
    echo json_encode(["success" => false, "message" => "Error: " . $stmt->error]);
}

$stmt->close();
$conn->close();
