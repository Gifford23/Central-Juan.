<?php
// header("Access-Control-Allow-Origin: *");
// header("Access-Control-Allow-Methods: PUT, OPTIONS");
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
$time_start = $input['time_start'] ?? '';
$end_time = $input['end_time'] ?? '';
$reason = $input['reason'] ?? '';

if (!$request_id || !$time_start || !$end_time || !$reason) {
    echo json_encode(["success" => false, "message" => "Missing fields."]);
    exit;
}

$sql = "UPDATE employee_overtime_request 
SET time_start = ?, end_time = ?, reason = ?, status = 'Approved'
WHERE request_id = ?";
$stmt = $conn->prepare($sql);
$stmt->bind_param("sssi", $time_start, $end_time, $reason, $request_id);

if ($stmt->execute()) {
    echo json_encode(["success" => true, "message" => "Overtime updated successfully."]);
} else {
    echo json_encode(["success" => false, "message" => "Failed to update overtime."]);
}

$stmt->close();
$conn->close();
?>
