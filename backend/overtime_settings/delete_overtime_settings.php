<?php
// delete_overtime_settings.php
// header('Access-Control-Allow-Origin: *');
// header('Access-Control-Allow-Methods: DELETE');
// header('Access-Control-Allow-Headers: Content-Type, Authorization');

require_once '../server/connection.php'; // Adjust path based on your folder structure
include("../server/cors.php");

// Get the ID from the request
$data = json_decode(file_get_contents("php://input"), true);
$overtime_id = $data['overtime_id'];

$stmt = $conn->prepare("DELETE FROM overtime_settings WHERE overtime_id = ?");
$stmt->bind_param("i", $overtime_id);

if ($stmt->execute()) {
    echo json_encode(["success" => true, "message" => "Overtime setting deleted successfully."]);
} else {
    echo json_encode(["success" => false, "message" => "Error deleting overtime setting."]);
}

$stmt->close();
$conn->close();
?>