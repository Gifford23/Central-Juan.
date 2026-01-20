<?php
include("../server/cors.php");
include('../server/connection.php');

header('Content-Type: application/json');

$input = json_decode(file_get_contents('php://input'), true);
if (!$input) $input = $_POST;

$allowance_id = $input['allowance_id'] ?? null;
if (!$allowance_id) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'allowance_id required']);
    exit;
}

$sql = "UPDATE employee_allowance SET active = 0 WHERE allowance_id = ".intval($allowance_id);

if (!$conn->query($sql)) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Delete (soft) failed: '.$conn->error]);
    exit;
}

echo json_encode(['success' => true, 'message' => 'Allowance removed (soft-delete)']);
exit;
