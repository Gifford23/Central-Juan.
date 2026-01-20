<?php
// create_work_time.php
include '../server/connection.php';
include '../server/cors.php';

function json_die($arr) {
    header('Content-Type: application/json');
    echo json_encode($arr);
    exit;
}

function norm_time($t) {
    if ($t === '' || $t === null) return '';
    // try strtotime; returns false for invalid formats
    $ts = strtotime($t);
    if ($ts === false) return false;
    return date('H:i:s', $ts);
}

$data = json_decode(file_get_contents("php://input"), true);

$shift_name = trim($data['shift_name'] ?? '');
$start_time_raw = $data['start_time'] ?? '';
$end_time_raw = $data['end_time'] ?? '';
$valid_in_start_raw = $data['valid_in_start'] ?? '';
$valid_in_end_raw = $data['valid_in_end'] ?? '';
$valid_out_start_raw = $data['valid_out_start'] ?? '';
$valid_out_end_raw = $data['valid_out_end'] ?? '';
$is_default = isset($data['is_default']) ? (int)$data['is_default'] : 0;

// Normalize times
$start_time = norm_time($start_time_raw);
$end_time = norm_time($end_time_raw);
$valid_in_start = norm_time($valid_in_start_raw);
$valid_in_end = norm_time($valid_in_end_raw);
$valid_out_start = norm_time($valid_out_start_raw);
$valid_out_end = norm_time($valid_out_end_raw);

// Validate normalization
foreach ([
    'start_time' => $start_time,
    'end_time' => $end_time,
    'valid_in_start' => $valid_in_start,
    'valid_in_end' => $valid_in_end,
    'valid_out_start' => $valid_out_start,
    'valid_out_end' => $valid_out_end
] as $k => $v) {
    if ($v === false) json_die(["success" => false, "message" => "Invalid time format for {$k}."]);
}

// Required fields
if ($shift_name === '' || $start_time === '' || $end_time === '' || $valid_in_start === '' || $valid_in_end === '' || $valid_out_start === '' || $valid_out_end === '') {
    json_die(["success" => false, "message" => "All fields are required and must be valid."]);
}

// Ensure start < end
if (strtotime($start_time) >= strtotime($end_time)) {
    json_die(["success" => false, "message" => "Start time must be earlier than end time."]);
}

// Ensure valid ranges
if (strtotime($valid_in_start) > strtotime($valid_in_end)) {
    json_die(["success" => false, "message" => "valid_in_start must be <= valid_in_end."]);
}
if (strtotime($valid_out_start) > strtotime($valid_out_end)) {
    json_die(["success" => false, "message" => "valid_out_start must be <= valid_out_end."]);
}

// Prevent duplicate shift_name (avoid "saving the second" duplicate)
$chk = $conn->prepare("SELECT id FROM work_time WHERE shift_name = ? LIMIT 1");
if (!$chk) json_die(["success" => false, "message" => "Prepare failed: " . $conn->error]);
$chk->bind_param("s", $shift_name);
$chk->execute();
$chk->store_result();
if ($chk->num_rows > 0) {
    $chk->close();
    json_die(["success" => false, "message" => "A shift with that name already exists."]);
}
$chk->close();

// If this shift is default, unset previous defaults
if ($is_default) {
    if (!$conn->query("UPDATE work_time SET is_default = 0")) {
        // not fatal, but inform
        // continue anyway
    }
}

// Insert
$stmt = $conn->prepare("INSERT INTO work_time (shift_name, start_time, end_time, valid_in_start, valid_in_end, valid_out_start, valid_out_end, is_default) VALUES (?, ?, ?, ?, ?, ?, ?, ?)");
if (!$stmt) json_die(["success" => false, "message" => "Prepare failed: " . $conn->error]);

// types: 7 strings, 1 int
$stmt->bind_param("sssssssi", $shift_name, $start_time, $end_time, $valid_in_start, $valid_in_end, $valid_out_start, $valid_out_end, $is_default);

if ($stmt->execute()) {
    json_die(["success" => true, "id" => $stmt->insert_id]);
} else {
    json_die(["success" => false, "message" => "Failed to create shift. Error: " . $stmt->error]);
}

$stmt->close();
$conn->close();
