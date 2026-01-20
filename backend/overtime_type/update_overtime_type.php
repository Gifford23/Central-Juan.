<?php
// header("Access-Control-Allow-Origin: *");
// header("Content-Type: application/json");
include('../server/connection.php');
include("../server/cors.php");

$data = json_decode(file_get_contents("php://input"), true);

$id = $data['id'] ?? null;
$label = $data['label'] ?? '';
$multiplier = $data['multiplier'] ?? '';

if (!$id || !$label || !$multiplier) {
    echo json_encode(["success" => false, "message" => "Missing required fields."]);
    exit;
}

$stmt = $conn->prepare("UPDATE overtime_types SET label = ?, multiplier = ? WHERE id = ?");
$stmt->bind_param("sdi", $label, $multiplier, $id);

if ($stmt->execute()) {
    echo json_encode(["success" => true, "message" => "Multiplier updated successfully."]);
} else {
    echo json_encode(["success" => false, "message" => "Failed to update multiplier."]);
}

$stmt->close();
$conn->close();
?>
