<?php
include '../server/connection.php';
include '../server/cors.php';

$data = json_decode(file_get_contents("php://input"), true);

$schedule_id = $data['schedule_id'] ?? null;

if (!$schedule_id) {
    echo json_encode(["success" => false, "message" => "Schedule ID required"]);
    exit;
}

$stmt = $conn->prepare("UPDATE employee_shift_schedule SET is_active = 0 WHERE schedule_id = ?");
$stmt->bind_param("i", $schedule_id);

if ($stmt->execute()) {
    echo json_encode(["success" => true, "message" => "Schedule deactivated"]);
} else {
    echo json_encode(["success" => false, "message" => $stmt->error]);
}

$stmt->close();
$conn->close();
?>
