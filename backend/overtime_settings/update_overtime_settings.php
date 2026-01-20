<?php
// update_overtime_settings.php
// header('Access-Control-Allow-Origin: *');
// header('Access-Control-Allow-Methods: PUT');
// header('Access-Control-Allow-Headers: Content-Type, Authorization');

require_once '../server/connection.php'; // Adjust path based on your folder structure
include("../server/cors.php");

// Get the input data
$data = json_decode(file_get_contents("php://input"), true);
$overtime_id = $data['overtime_id'];
$overtime_start = $data['overtime_start'];

// Prepare and bind
$stmt = $conn->prepare("UPDATE overtime_settings SET overtime_start = ? WHERE overtime_id = ?");
$stmt->bind_param("si", $overtime_start, $overtime_id);

if ($stmt->execute()) {
    echo json_encode(["success" => true, "message" => "Overtime setting updated successfully."]);
} else {
    echo json_encode(["success" => false, "message" => "Error updating overtime setting."]);
}

$stmt->close();
$conn->close();
?>