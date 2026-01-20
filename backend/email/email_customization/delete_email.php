<?php
include("../../server/cors.php");
include("../../server/connection.php");

$data = json_decode(file_get_contents("php://input"), true);

$id = $data['id'] ?? null;

if (!$id) {
    echo json_encode(["success" => false, "message" => "ID is required."]);
    exit;
}

$stmt = $conn->prepare("DELETE FROM email_settings WHERE id=?");
$stmt->bind_param("i", $id);

if ($stmt->execute()) {
    echo json_encode(["success" => true, "message" => "Email deleted successfully"]);
} else {
    echo json_encode(["success" => false, "message" => "Failed to delete email"]);
}

$stmt->close();
$conn->close();
?>
