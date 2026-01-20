<?php
include '../server/connection.php';

header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");
header("Content-Type: application/json; charset=UTF-8");

$data = json_decode(file_get_contents("php://input"), true);

$work_time_id = $data['work_time_id'] ?? null;
$break_name = $data['break_name'] ?? null;
$break_start = $data['break_start'] ?? null;
$break_end = $data['break_end'] ?? null;
$valid_in_start = $data['valid_break_in_start'] ?? null;
$valid_in_end = $data['valid_break_in_end'] ?? null;
$valid_out_start = $data['valid_break_out_start'] ?? null;
$valid_out_end = $data['valid_break_out_end'] ?? null;

try {
    // Basic validation
    if (!$break_name || !$break_start || !$break_end || !$valid_in_start || !$valid_in_end || !$valid_out_start || !$valid_out_end) {
        throw new Exception("All required fields must be provided.");
    }

    if ($break_start >= $break_end) throw new Exception("break_start must be earlier than break_end");
    if ($valid_in_start > $valid_in_end) throw new Exception("valid_break_in_start must be <= valid_break_in_end");
    if ($valid_out_start > $valid_out_end) throw new Exception("valid_break_out_start must be <= valid_break_out_end");

    // Optional: validate break does not exceed shift duration
    if ($work_time_id) {
        $stmt = $conn->prepare("SELECT total_minutes FROM work_time WHERE id = ?");
        $stmt->bind_param("i", $work_time_id);
        $stmt->execute();
        $shift = $stmt->get_result()->fetch_assoc();
        if (!$shift) throw new Exception("Invalid work_time_id");
        $break_minutes = (strtotime($break_end) - strtotime($break_start)) / 60;
        if ($break_minutes > $shift['total_minutes']) throw new Exception("Break exceeds shift duration");
    }

    // Insert into break_time
    $stmt = $conn->prepare("INSERT INTO break_time (work_time_id, break_name, break_start, break_end, valid_break_in_start, valid_break_in_end, valid_break_out_start, valid_break_out_end) VALUES (?, ?, ?, ?, ?, ?, ?, ?)");
    $stmt->bind_param("isssssss", $work_time_id, $break_name, $break_start, $break_end, $valid_in_start, $valid_in_end, $valid_out_start, $valid_out_end);
    $stmt->execute();

    $break_id = $stmt->insert_id;

    // Auto map to work_time_break if tied to shift
    if ($work_time_id) {
        $stmt = $conn->prepare("INSERT INTO work_time_break (work_time_id, break_id) VALUES (?, ?)");
        $stmt->bind_param("ii", $work_time_id, $break_id);
        $stmt->execute();
    }

    echo json_encode(["success" => true, "message" => "Break created successfully", "break_id" => $break_id]);
} catch (Exception $e) {
    echo json_encode(["success" => false, "message" => $e->getMessage()]);
}
