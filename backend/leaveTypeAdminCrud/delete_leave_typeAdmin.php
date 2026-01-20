<?php
include '../server/connection.php';
include("../server/cors.php");

// header("Access-Control-Allow-Origin: *");
// header("Access-Control-Allow-Methods: POST, OPTIONS");
// header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");
// header("Content-Type: application/json; charset=UTF-8");

$data = json_decode(file_get_contents("php://input"), true);
$leave_type_id = $data['leave_type_id'] ?? null;

if (!$leave_type_id) {
    echo json_encode(['success' => false, 'message' => 'Leave type ID is required.']);
    exit;
}

$query = "DELETE FROM leave_types WHERE leave_type_id = ?";
$stmt = $conn->prepare($query);
$stmt->bind_param("i", $leave_type_id);

if ($stmt->execute()) {
    echo json_encode(['success' => true, 'message' => 'Leave type deleted successfully.']);
} else {
    echo json_encode(['success' => false, 'message' => 'Failed to delete leave type.']);
}
?>
