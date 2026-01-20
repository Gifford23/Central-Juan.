<?php
include '../server/connection.php';
include("../server/cors.php");

// header("Access-Control-Allow-Origin: *");
// header("Access-Control-Allow-Methods: PUT, OPTIONS");
// header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");
// header("Content-Type: application/json; charset=UTF-8");

$data = json_decode(file_get_contents("php://input"), true);

$leave_type_id = $data['leave_type_id'] ?? null;
$leave_name = $data['leave_name'] ?? '';
$is_paid = $data['is_paid'] ?? 1;
$default_days = $data['default_days'] ?? 1.00;
$description = $data['description'] ?? null;

if (!$leave_type_id || empty($leave_name)) {
    echo json_encode(['success' => false, 'message' => 'Required fields are missing.']);
    exit;
}

$query = "UPDATE leave_types SET leave_name = ?, is_paid = ?, default_days = ?, description = ? WHERE leave_type_id = ?";
$stmt = $conn->prepare($query);
$stmt->bind_param("sidsi", $leave_name, $is_paid, $default_days, $description, $leave_type_id);

if ($stmt->execute()) {
    echo json_encode(['success' => true, 'message' => 'Leave type updated successfully.']);
} else {
    echo json_encode(['success' => false, 'message' => 'Failed to update leave type.']);
}
?>
