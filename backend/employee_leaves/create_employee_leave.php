<?php
// Allow CORS for dev (restrict in prod)
// header("Access-Control-Allow-Origin: *");
// header("Access-Control-Allow-Methods: POST, OPTIONS");
// header("Access-Control-Allow-Headers: Content-Type, Authorization");
// header("Content-Type: application/json; charset=UTF-8");
include("../server/cors.php");

include_once("../server/connection.php");

// Handle preflight
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit();
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Method not allowed']);
    exit();
}

// Get JSON body
$data = json_decode(file_get_contents("php://input"), true);

// Basic validation
if (!isset($data['employee_id'], $data['leave_type_id'], $data['date_from'], $data['date_until'], $data['total_days'])) {
    http_response_code(400);
    echo json_encode(['error' => 'Missing required fields']);
    exit();
}

// Prepare SQL
$stmt = $conn->prepare("
    INSERT INTO employee_leaves (employee_id, leave_type_id, date_from, date_until, total_days, reason, status) 
    VALUES (?, ?, ?, ?, ?, ?, 'pending')
");

$stmt->bind_param(
    "sissds",
    $data['employee_id'],
    $data['leave_type_id'],
    $data['date_from'],
    $data['date_until'],
    $data['total_days'],
    $data['reason']
);

if ($stmt->execute()) {
    echo json_encode([
        'message' => 'Leave request created successfully',
        'leave_id' => $stmt->insert_id
    ]);
} else {
    http_response_code(500);
    echo json_encode(['error' => 'Failed to create leave request']);
}

$stmt->close();
$conn->close();
?>
