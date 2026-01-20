<?php
include '../server/connection.php';

include("../server/cors.php");
$data = json_decode(file_get_contents("php://input"), true);
$mapping_id = intval($data['id'] ?? 0);

if (!$mapping_id) {
    echo json_encode(["success" => false, "message" => "Mapping ID is required"]);
    exit;
}

// Delete mapping
$stmt = $conn->prepare("DELETE FROM work_time_break WHERE id = ?");
$stmt->bind_param("i", $mapping_id);
if ($stmt->execute()) {
    echo json_encode(["success" => true, "message" => "Break mapping removed successfully"]);
} else {
    echo json_encode(["success" => false, "message" => "Failed to remove break mapping"]);
}
?>
