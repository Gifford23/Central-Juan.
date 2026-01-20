<?php
// header("Access-Control-Allow-Origin: *");
// header("Access-Control-Allow-Methods: PUT, OPTIONS");
// header("Access-Control-Allow-Headers: Content-Type, Authorization");
// header("Content-Type: application/json; charset=UTF-8");
include("../server/cors.php");

include_once("../server/connection.php");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit();
}

if ($_SERVER['REQUEST_METHOD'] !== 'PUT') {
    http_response_code(405);
    echo json_encode(['error' => 'Method not allowed']);
    exit();
}

$data = json_decode(file_get_contents("php://input"), true);

if (!isset($data['leave_id'])) {
    http_response_code(400);
    echo json_encode(['error' => 'leave_id is required']);
    exit();
}

// Only allow updates for certain fields
$stmt = $conn->prepare("
    UPDATE employee_leaves 
    SET date_from=?, date_until=?, total_days=?, reason=?, status=? 
    WHERE leave_id=?
");

$stmt->bind_param(
    "ssdssi",
    $data['date_from'],
    $data['date_until'],
    $data['total_days'],
    $data['reason'],
    $data['status'],
    $data['leave_id']
);

if ($stmt->execute()) {
    echo json_encode(['message' => 'Leave updated successfully']);
} else {
    http_response_code(500);
    echo json_encode(['error' => 'Failed to update leave']);
}

$stmt->close();
$conn->close();
?>
