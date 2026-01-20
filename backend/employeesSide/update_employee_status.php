<?php
include('../server/connection.php');
include("../server/cors.php");

// CORS headers
// header("Access-Control-Allow-Origin: *");
// header("Access-Control-Allow-Methods: POST, OPTIONS");
// header("Access-Control-Allow-Headers: Content-Type, Authorization");
// header("Content-Type: application/json; charset=UTF-8");

// if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
//     http_response_code(204);
//     exit();
// }

// Decode JSON input
$data = json_decode(file_get_contents("php://input"), true);
$employee_id = $data['employee_id'] ?? '';
$status = $data['status'] ?? '';

// Validate inputs
if (!$employee_id || !in_array($status, ['active', 'inactive'])) {
    echo json_encode(["success" => false, "message" => "Invalid input"]);
    exit();
}

// Prepare and execute update
$sql = "UPDATE employees SET status = ? WHERE employee_id = ?";
$stmt = $conn->prepare($sql);
$stmt->bind_param("ss", $status, $employee_id);

if ($stmt->execute()) {
    echo json_encode(["success" => true, "message" => "Status updated"]);
} else {
    echo json_encode(["success" => false, "message" => "Database update failed"]);
}

$stmt->close();
$conn->close();
?>
