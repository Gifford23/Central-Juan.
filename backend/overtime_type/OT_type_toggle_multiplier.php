<?php
// header("Access-Control-Allow-Origin: *");
// header("Access-Control-Allow-Methods: PUT");
// header("Access-Control-Allow-Headers: Content-Type");
// header("Content-Type: application/json");

include('../server/connection.php');
include("../server/cors.php");

// Read JSON input from frontend
$data = json_decode(file_get_contents("php://input"), true);

$id = $data['id'] ?? null;
$is_enabled = $data['is_enabled'] ?? null;

if (!isset($id) || !isset($is_enabled)) {
    echo json_encode(["success" => false, "message" => "Missing id or is_enabled."]);
    exit;
}

// Update only the is_enabled column
$stmt = $conn->prepare("UPDATE overtime_types SET is_enabled = ? WHERE id = ?");
$stmt->bind_param("ii", $is_enabled, $id);

if ($stmt->execute()) {
    echo json_encode(["success" => true, "message" => "Status updated."]);
} else {
    echo json_encode(["success" => false, "message" => "Failed to update status."]);
}

$stmt->close();
$conn->close();
?>
