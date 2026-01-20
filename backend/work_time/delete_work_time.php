<?php
include '../server/connection.php';
include '../server/cors.php';

$data = json_decode(file_get_contents("php://input"), true);
$id = $data['id'] ?? 0;

if (!$id) {
    echo json_encode(["success" => false, "message" => "Shift ID is required."]);
    exit;
}

// Delete shift (triggers handle cascading deletes)
$stmt = $conn->prepare("DELETE FROM work_time WHERE id=?");
$stmt->bind_param("i", $id);

if ($stmt->execute()) {
    echo json_encode(["success" => true]);
} else {
    echo json_encode(["success" => false, "message" => "Failed to delete shift."]);
}

$stmt->close();
$conn->close();
?>
