<?php

// Allow CORS
// header("Access-Control-Allow-Origin: *");
// header("Access-Control-Allow-Methods: DELETE, OPTIONS");
// header("Access-Control-Allow-Headers: Content-Type, Authorization");
// header("Content-Type: application/json; charset=UTF-8");

// // If it's an OPTIONS request, just return immediately
// if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
//     http_response_code(200);
//     exit();
// }

// Include database connection
include('../server/connection.php'); 
include("../server/cors.php");

// Collect DELETE values
parse_str(file_get_contents("php://input"), $delete_vars);
$request_id = $delete_vars['request_id'] ?? '';

if (!$request_id) {
    echo json_encode(["success" => false, "message" => "Missing required fields."]);
    exit;
}

// Prepare SQL statement to delete the overtime request
$sql = "DELETE FROM employee_overtime_request WHERE request_id = ?";
$stmt = $conn->prepare($sql);
$stmt->bind_param("s", $request_id);

if ($stmt->execute()) {
    if ($stmt->affected_rows > 0) {
        echo json_encode(["success" => true, "message" => "Overtime request deleted successfully."]);
    } else {
        echo json_encode(["success" => false, "message" => "No overtime request found with the provided ID."]);
    }
} else {
    echo json_encode(["success" => false, "message" => "Failed to delete overtime request."]);
}

$stmt->close();
$conn->close();
?>