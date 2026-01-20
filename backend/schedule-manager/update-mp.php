<?php
// update-mp.php (robust, paste-ready)
// Accepts: schedule_id (required) and any of: effective_date, end_date, recurrence_type, recurrence_interval, days_of_week, priority, is_active
include '../server/connection.php';
include("../server/cors.php");

header('Content-Type: application/json; charset=utf-8');

$data = json_decode(file_get_contents("php://input"), true);
if (!$data || !is_array($data)) {
    echo json_encode(["success" => false, "message" => "Invalid JSON payload."]);
    exit;
}

$schedule_id = isset($data['schedule_id']) ? intval($data['schedule_id']) : null;
if (!$schedule_id) {
    echo json_encode(["success" => false, "message" => "Missing schedule_id."]);
    exit;
}

/*
 Allowed updatable fields and their mysqli bind types:
  s = string, i = integer
*/
$allowed = [
    'effective_date'    => 's',
    'end_date'          => 's',
    'recurrence_type'   => 's',
    'recurrence_interval'=> 'i',
    'days_of_week'      => 's',
    'priority'          => 'i',
    'is_active'         => 'i'
];

$sets = [];
$types = "";
$values = [];

// Build SET clauses. If caller explicitly provided null for a field, set the column to NULL.
// Otherwise add placeholder and collect value for binding.
foreach ($allowed as $col => $type) {
    if (array_key_exists($col, $data)) {
        if ($data[$col] === null) {
            $sets[] = "`$col` = NULL";
        } else {
            $sets[] = "`$col` = ?";
            $types .= $type;
            // ensure integer values are actually ints
            if ($type === 'i') {
                $values[] = intval($data[$col]);
            } else {
                // normalize string: trim and ensure no accidental array/object
                $values[] = is_scalar($data[$col]) ? trim((string)$data[$col]) : json_encode($data[$col]);
            }
        }
    }
}

if (count($sets) === 0) {
    echo json_encode(["success" => false, "message" => "No updatable fields provided."]);
    exit;
}

$sql = "UPDATE employee_shift_schedule SET " . implode(", ", $sets) . " WHERE schedule_id = ?";
$stmt = $conn->prepare($sql);
if (!$stmt) {
    echo json_encode(["success" => false, "message" => "Prepare failed: " . $conn->error, "sql" => $sql]);
    exit;
}

// Prepare bind parameters dynamically if we have placeholders
if ($types !== "") {
    // append schedule_id param
    $types_with_id = $types . "i";
    $values[] = $schedule_id;

    // mysqli::bind_param requires variables by reference
    $bind_params = [];
    $bind_params[] = $types_with_id;
    // create references
    for ($i = 0; $i < count($values); $i++) {
        $bind_params[] = &$values[$i];
    }
    // call bind_param with dynamic args
    call_user_func_array([$stmt, 'bind_param'], $bind_params);
} else {
    // No placeholders (only NULL assignments); nothing to bind
}

// execute
if ($stmt->execute()) {
    echo json_encode([
        "success" => true,
        "message" => "Schedule updated",
        "affected_rows" => $stmt->affected_rows
    ]);
} else {
    echo json_encode(["success" => false, "message" => "Execute failed: " . $stmt->error]);
}

$stmt->close();
$conn->close();
?>
