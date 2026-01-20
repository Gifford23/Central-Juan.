<?php
// header("Access-Control-Allow-Origin: *");
// header("Access-Control-Allow-Methods: DELETE, OPTIONS");
// header("Access-Control-Allow-Headers: Content-Type, Authorization");
// header("Content-Type: application/json; charset=UTF-8");
include("../server/cors.php");

include_once("../server/connection.php");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit();
}

if ($_SERVER['REQUEST_METHOD'] !== 'DELETE') {
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

$stmt = $conn->prepare("DELETE FROM employee_leaves WHERE leave_id=?");
$stmt->bind_param("i", $data['leave_id']);

if ($stmt->execute()) {
    echo json_encode(['message' => 'Leave deleted successfully']);
} else {
    http_response_code(500);
    echo json_encode(['error' => 'Failed to delete leave']);
}

$stmt->close();
$conn->close();
?>
