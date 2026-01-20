<?php
// header('Access-Control-Allow-Origin: *');
// header('Access-Control-Allow-Methods: POST');
// header('Access-Control-Allow-Headers: Content-Type');
// header('Content-Type: application/json');

require_once '../server/connection.php';
include("../server/cors.php");

$data = json_decode(file_get_contents("php://input"), true);

$leave_name = $data['leave_name'] ?? '';
$is_paid = $data['is_paid'] ?? 1;
$default_days = $data['default_days'] ?? 1.00;
$description = $data['description'] ?? null;

$sql = "INSERT INTO leave_types (leave_name, is_paid, default_days, description) 
        VALUES (?, ?, ?, ?)";
$stmt = $conn->prepare($sql);
$stmt->bind_param("sids", $leave_name, $is_paid, $default_days, $description);

if ($stmt->execute()) {
    echo json_encode(['success' => true, 'message' => 'Leave type created successfully']);
} else {
    echo json_encode(['success' => false, 'message' => 'Failed to create leave type']);
}

$stmt->close();
$conn->close();
?>
