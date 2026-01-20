<?php
// add_overtime_settings.php
// header('Access-Control-Allow-Origin: *');
// header('Access-Control-Allow-Methods: POST');
// header('Access-Control-Allow-Headers: Content-Type, Authorization');

require_once '../server/connection.php'; // Adjust path based on your folder structure
include("../server/cors.php");

// Get the input data
$data = json_decode(file_get_contents("php://input"), true);
$overtime_start = $data['overtime_start'];

// Prepare and bind
$stmt = $conn->prepare("INSERT INTO overtime_settings (overtime_start) VALUES (?)");
$stmt->bind_param("s", $overtime_start);

if ($stmt->execute()) {
    echo json_encode(["success" => true, "message" => "Overtime setting added successfully."]);
} else {
    echo json_encode(["success" => false, "message" => "Error adding overtime setting."]);
}

$stmt->close();
$conn->close();
?>