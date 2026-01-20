<?php
// header('Access-Control-Allow-Origin: *');
// header('Access-Control-Allow-Methods: POST, OPTIONS');
// header('Access-Control-Allow-Headers: Content-Type, Authorization');
include("../server/cors.php");
require_once '../server/connection.php';

$data = json_decode(file_get_contents("php://input"), true);

if (!isset($data['holiday_id'])) {
    echo json_encode(['success' => false, 'message' => 'Missing holiday ID']);
    exit;
}

$holidayId = $data['holiday_id'];

$stmt = $conn->prepare("DELETE FROM holidays WHERE holiday_id = ?");
$stmt->bind_param("i", $holidayId);

if ($stmt->execute()) {
    echo json_encode(['success' => true, 'message' => 'Holiday deleted successfully']);
} else {
    echo json_encode(['success' => false, 'message' => 'Failed to delete holiday']);
}

$stmt->close();
$conn->close();
?>
