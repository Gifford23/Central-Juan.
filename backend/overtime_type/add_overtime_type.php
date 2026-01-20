<?php
// header("Access-Control-Allow-Origin: *");
// header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");
// header("Access-Control-Allow-Headers: Content-Type, Authorization");
// header("Content-Type: application/json; charset=UTF-8");

include('../server/connection.php');
include("../server/cors.php");

$data = json_decode(file_get_contents("php://input"), true);

$label = $data['label'] ?? '';
$multiplier = $data['multiplier'] ?? '';

if (!$label || !$multiplier) {
    echo json_encode(["success" => false, "message" => "Missing required fields."]);
    exit;
}

$stmt = $conn->prepare("INSERT INTO overtime_types (label, multiplier) VALUES (?, ?)");
$stmt->bind_param("sd", $label, $multiplier);

if ($stmt->execute()) {
    echo json_encode(["success" => true, "message" => "Multiplier added successfully."]);
} else {
    echo json_encode(["success" => false, "message" => "Failed to add multiplier."]);
}

$stmt->close();
$conn->close();
?>
