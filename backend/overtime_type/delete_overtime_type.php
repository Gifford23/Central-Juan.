<?php
// header("Access-Control-Allow-Origin: *");
// header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");
// header("Access-Control-Allow-Headers: Content-Type, Authorization");
// header("Content-Type: application/json; charset=UTF-8");
include('../server/connection.php');
include("../server/cors.php");

$data = json_decode(file_get_contents("php://input"), true);
$id = $data['id'] ?? null;

if (!$id) {
    echo json_encode(["success" => false, "message" => "Missing multiplier ID."]);
    exit;
}

$stmt = $conn->prepare("DELETE FROM overtime_types WHERE id = ?");
$stmt->bind_param("i", $id);

if ($stmt->execute()) {
    echo json_encode(["success" => true, "message" => "Multiplier deleted successfully."]);
} else {
    echo json_encode(["success" => false, "message" => "Failed to delete multiplier."]);
}

$stmt->close();
$conn->close();
?>
