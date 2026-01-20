<?php
include "../../server/cors.php";
include '../../server/connection.php';



$data = json_decode(file_get_contents("php://input"), true);

if (!isset($data['id'], $data['tier_id'])) {
    echo json_encode(["success" => false, "message" => "Missing required fields"]);
    exit;
}

$id = intval($data['id']);
$tier_id = intval($data['tier_id']);

$stmt = $conn->prepare("UPDATE work_time_late_deduction SET tier_id = ? WHERE id = ?");
$stmt->bind_param("ii", $tier_id, $id);

if ($stmt->execute()) {
    echo json_encode(["success" => true, "message" => "Mapping updated successfully"]);
} else {
    echo json_encode(["success" => false, "message" => "Failed to update mapping"]);
}

$stmt->close();
$conn->close();
