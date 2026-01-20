<?php
include '../server/connection.php';
include("../server/cors.php");

// header("Access-Control-Allow-Origin: *");
// header("Access-Control-Allow-Methods: POST, OPTIONS");
// header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");
// header("Content-Type: application/json; charset=UTF-8");

// if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
//     echo json_encode(["success" => false, "message" => "Invalid request method."]);
//     exit;
// }

$data = json_decode(file_get_contents("php://input"), true);

$employee_id     = $data['employee_id'] ?? '';
$leave_type_id   = $data['leave_type_id'] ?? '';
$date_from       = $data['date_from'] ?? '';
$date_until      = $data['date_until'] ?? '';
$total_days      = $data['total_days'] ?? 1.00;
$reason          = $data['reason'] ?? '';
$attachment_url  = $data['attachment_url'] ?? null;

if (!$employee_id || !$leave_type_id || !$date_from || !$date_until) {
    echo json_encode(["success" => false, "message" => "Missing required fields."]);
    exit;
}

$query = "INSERT INTO leave_requests (employee_id, leave_type_id, date_from, date_until, total_days, reason, attachment_url) 
          VALUES (?, ?, ?, ?, ?, ?, ?)";
$stmt = $conn->prepare($query);
$stmt->bind_param("sissdss", $employee_id, $leave_type_id, $date_from, $date_until, $total_days, $reason, $attachment_url);

if ($stmt->execute()) {
    echo json_encode(["success" => true, "message" => "Leave request created successfully."]);
} else {
    echo json_encode(["success" => false, "message" => "Error: " . $stmt->error]);
}

$stmt->close();
$conn->close();
