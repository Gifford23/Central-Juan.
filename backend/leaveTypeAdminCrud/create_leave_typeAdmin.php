<?php
include '../server/connection.php';
include("../server/cors.php");

// CORS and JSON headers
// header("Access-Control-Allow-Origin: *");
// header("Access-Control-Allow-Methods: POST, OPTIONS");
// header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");
// header("Content-Type: application/json; charset=UTF-8");

$data = json_decode(file_get_contents("php://input"), true);

$leave_name   = $data['leave_name'] ?? '';
$is_paid      = isset($data['is_paid']) ? (int)$data['is_paid'] : 1;
$default_days = isset($data['default_days']) ? (float)$data['default_days'] : 1.00;
$leave_limit  = isset($data['leave_limit']) ? (float)$data['leave_limit'] : 0.00;
$description  = $data['description'] ?? null;

if (empty($leave_name)) {
    echo json_encode(['success' => false, 'message' => 'Leave name is required.']);
    exit;
}

$query = "INSERT INTO leave_types (leave_name, is_paid, default_days, leave_limit, description) 
          VALUES (?, ?, ?, ?, ?)";
$stmt = $conn->prepare($query);

if (!$stmt) {
    echo json_encode(['success' => false, 'message' => 'Prepare failed: ' . $conn->error]);
    exit;
}

$stmt->bind_param("sidds", $leave_name, $is_paid, $default_days, $leave_limit, $description);

if ($stmt->execute()) {
    echo json_encode(['success' => true, 'message' => 'Leave type created successfully.']);
} else {
    echo json_encode(['success' => false, 'message' => 'Database error: ' . $stmt->error]);
}
