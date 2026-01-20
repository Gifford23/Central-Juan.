<?php
include ("../../server/cors.php");
include '../../server/connection.php';


$data = json_decode(file_get_contents("php://input"), true);

if (!isset($data['work_time_id'], $data['tier_id'])) {
    echo json_encode(["success" => false, "message" => "Missing required fields"]);
    exit;
}

$work_time_id = intval($data['work_time_id']);
$tier_id = intval($data['tier_id']);

// Ensure uniqueness (1 shift → 1 tier mapping)
$stmt = $conn->prepare("SELECT id FROM work_time_late_deduction WHERE work_time_id = ?");
$stmt->bind_param("i", $work_time_id);
$stmt->execute();
$stmt->store_result();

if ($stmt->num_rows > 0) {
    echo json_encode(["success" => false, "message" => "This shift already has a tier mapping"]);
    exit;
}
$stmt->close();

$stmt = $conn->prepare("INSERT INTO work_time_late_deduction (work_time_id, tier_id) VALUES (?, ?)");
$stmt->bind_param("ii", $work_time_id, $tier_id);

if ($stmt->execute()) {
    echo json_encode(["success" => true, "id" => $stmt->insert_id, "message" => "Tier assigned successfully"]);
} else {
    echo json_encode(["success" => false, "message" => "Failed to assign tier"]);
}
$stmt->close();
$conn->close();
