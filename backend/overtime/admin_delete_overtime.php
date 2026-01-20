<?php
// header("Access-Control-Allow-Origin: *");
// header("Access-Control-Allow-Methods: DELETE, OPTIONS");
// header("Access-Control-Allow-Headers: Content-Type, Authorization");
// header("Content-Type: application/json");

// if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
//     http_response_code(200);
//     exit;
// }

include('../server/connection.php');
include("../server/cors.php");


$input = json_decode(file_get_contents("php://input"), true);
$request_id = $input['request_id'] ?? '';

if (!$request_id) {
    echo json_encode(["success" => false, "message" => "Missing request_id."]);
    exit;
}

$sql = "DELETE FROM employee_overtime_request WHERE request_id = ?";
$stmt = $conn->prepare($sql);
$stmt->bind_param("i", $request_id);

if ($stmt->execute()) {
    echo json_encode(["success" => true, "message" => "Overtime deleted successfully."]);
} else {
    echo json_encode(["success" => false, "message" => "Failed to delete overtime."]);
}

$stmt->close();
$conn->close();
?>
