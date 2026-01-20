<?php
// update-days.php
// Removes specified days from an existing schedule's days_of_week (server-side computed).
// Accepts JSON: { schedule_id: int, remove_days: ["Mon","Tue", ...] }

include '../server/connection.php';
include("../server/cors.php");

header('Content-Type: application/json; charset=utf-8');

$raw = json_decode(file_get_contents("php://input"), true);
if (!$raw || !is_array($raw)) {
    echo json_encode(["success" => false, "message" => "Invalid JSON payload."]);
    exit;
}

$schedule_id = isset($raw['schedule_id']) ? intval($raw['schedule_id']) : 0;
$remove_days = isset($raw['remove_days']) ? $raw['remove_days'] : null;

if (!$schedule_id) {
    echo json_encode(["success" => false, "message" => "Missing schedule_id."]);
    exit;
}
if (!is_array($remove_days)) {
    echo json_encode(["success" => false, "message" => "remove_days must be an array."]);
    exit;
}

// canonical weekdays
$ALL_WEEKDAYS = ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"];

// normalize remove_days, keep only valid tokens in canonical order
$remove_days = array_values(array_filter(array_map('trim', $remove_days), function($d) use ($ALL_WEEKDAYS) {
    return in_array($d, $ALL_WEEKDAYS);
}));

// fetch existing schedule row (current days_of_week and is_active)
$sql = "SELECT days_of_week, is_active FROM employee_shift_schedule WHERE schedule_id = ? LIMIT 1";
$stmt = $conn->prepare($sql);
if (!$stmt) {
    echo json_encode(["success" => false, "message" => "Prepare failed: " . $conn->error]);
    exit;
}
$stmt->bind_param("i", $schedule_id);
$stmt->execute();
$res = $stmt->get_result();
if (!$res || $res->num_rows === 0) {
    echo json_encode(["success" => false, "message" => "Schedule not found."]);
    exit;
}
$row = $res->fetch_assoc();
$current_days_raw = $row['days_of_week']; // may be NULL
$current_is_active = intval($row['is_active'] ?? 0);

function daysArrayFromString($s) {
    if ($s === null || trim($s) === '') return []; // treat as wildcard -> caller can interpret if needed
    $parts = array_map('trim', explode(',', $s));
    return array_values(array_filter($parts, fn($x) => $x !== ''));
}

// build current days array; if NULL/empty treat as ALL_WEEKDAYS
$current_days = daysArrayFromString($current_days_raw);
if (count($current_days) === 0) {
    $current_days = $ALL_WEEKDAYS;
}

// remove requested days
$new_days_arr = array_values(array_diff($current_days, $remove_days));

// determine update action
if (count($new_days_arr) === 0) {
    // No days left -> deactivate schedule and set days_of_week NULL
    $update_sql = "UPDATE employee_shift_schedule SET days_of_week = NULL, is_active = 0 WHERE schedule_id = ?";
    $stmt2 = $conn->prepare($update_sql);
    if (!$stmt2) {
        echo json_encode(["success" => false, "message" => "Prepare failed (deactivate): " . $conn->error]);
        exit;
    }
    $stmt2->bind_param("i", $schedule_id);
    if ($stmt2->execute()) {
        echo json_encode([
            "success" => true,
            "message" => "Schedule deactivated (no days left).",
            "new_days_of_week" => null,
            "is_active" => 0
        ]);
        exit;
    } else {
        echo json_encode(["success" => false, "message" => "Failed to deactivate schedule: " . $stmt2->error]);
        exit;
    }
} else {
    // Keep schedule active and set new days_of_week string (ordered by ALL_WEEKDAYS)
    $ordered_new = array_values(array_intersect($ALL_WEEKDAYS, $new_days_arr));
    $new_days_str = implode(",", $ordered_new);

    $update_sql = "UPDATE employee_shift_schedule SET days_of_week = ?, is_active = 1 WHERE schedule_id = ?";
    $stmt2 = $conn->prepare($update_sql);
    if (!$stmt2) {
        echo json_encode(["success" => false, "message" => "Prepare failed (update): " . $conn->error]);
        exit;
    }
    $stmt2->bind_param("si", $new_days_str, $schedule_id);
    if ($stmt2->execute()) {
        echo json_encode([
            "success" => true,
            "message" => "Schedule days updated.",
            "new_days_of_week" => $new_days_str,
            "is_active" => 1
        ]);
        exit;
    } else {
        echo json_encode(["success" => false, "message" => "Failed to update schedule: " . $stmt2->error]);
        exit;
    }
}

$stmt->close();
$conn->close();
?>
