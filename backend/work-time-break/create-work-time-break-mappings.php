<?php
include '../server/connection.php';

include("../server/cors.php");

// Get POST data
$data = json_decode(file_get_contents("php://input"), true);
$work_time_id = intval($data['work_time_id'] ?? 0);
$break_id = intval($data['break_id'] ?? 0);

if (!$work_time_id || !$break_id) {
    echo json_encode(["success" => false, "message" => "work_time_id and break_id are required"]);
    exit;
}

// Check for duplicate
$stmt = $conn->prepare("SELECT 1 FROM work_time_break WHERE work_time_id = ? AND break_id = ?");
$stmt->bind_param("ii", $work_time_id, $break_id);
$stmt->execute();
$stmt->store_result();

if ($stmt->num_rows > 0) {
    echo json_encode(["success" => false, "message" => "This break is already assigned to the shift"]);
    exit;
}

// Insert mapping
$stmt = $conn->prepare("INSERT INTO work_time_break (work_time_id, break_id) VALUES (?, ?)");
$stmt->bind_param("ii", $work_time_id, $break_id);
if ($stmt->execute()) {
    echo json_encode(["success" => true, "message" => "Break assigned to shift successfully", "id" => $stmt->insert_id]);
} else {
    echo json_encode(["success" => false, "message" => "Failed to assign break"]);
}
?>
