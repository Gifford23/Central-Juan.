<?php
// holiday_list_delete.php
// header('Access-Control-Allow-Origin: *');
// header('Access-Control-Allow-Methods: POST, OPTIONS');
// header('Access-Control-Allow-Headers: Content-Type, Authorization');
// header('Content-Type: application/json');

// if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
//     // Handle CORS preflight request
//     http_response_code(204);
//     exit;
// }

require_once '../server/connection.php';
include("../server/cors.php");


$data = json_decode(file_get_contents("php://input"));

if (!isset($data->holiday_id)) {
    http_response_code(400); // Bad Request
    echo json_encode(["success" => false, "message" => "Missing holiday_id."]);
    exit;
}

$holiday_id = intval($data->holiday_id);

$sql = "DELETE FROM holidays_list WHERE holiday_id = ?";
$stmt = $conn->prepare($sql);

if (!$stmt) {
    http_response_code(500);
    echo json_encode(["success" => false, "message" => "Failed to prepare delete statement."]);
    exit;
}

$stmt->bind_param("i", $holiday_id);

if ($stmt->execute()) {
    echo json_encode(["success" => true, "message" => "Holiday deleted successfully."]);
} else {
    http_response_code(500);
    echo json_encode(["success" => false, "message" => "Failed to delete holiday."]);
}

$stmt->close();
$conn->close();
?>
