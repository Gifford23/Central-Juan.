<?php
// create-sm.php (conflict detection + return conflicting_days + same-shift days update)
include '../server/connection.php';
include("../server/cors.php");

header('Content-Type: application/json; charset=utf-8');

// Read JSON body
$data = json_decode(file_get_contents("php://input"), true);
if (!$data || !is_array($data)) {
    echo json_encode(["success" => false, "message" => "Invalid JSON payload."]);
    exit;
}

// Required fields
$employee_id = $data['employee_id'] ?? null;
$work_time_id = isset($data['work_time_id']) ? intval($data['work_time_id']) : null;
$effective_date = $data['effective_date'] ?? null;

// Optional
$end_date = array_key_exists('end_date', $data) && $data['end_date'] !== '' ? $data['end_date'] : null;
$recurrence_type = $data['recurrence_type'] ?? 'none';
$recurrence_interval = isset($data['recurrence_interval']) ? intval($data['recurrence_interval']) : 1;
$days_of_week = array_key_exists('days_of_week', $data) && $data['days_of_week'] !== '' ? $data['days_of_week'] : null;
$priority = isset($data['priority']) ? intval($data['priority']) : 1;

if (!$employee_id) {
    echo json_encode(["success" => false, "message" => "Missing employee_id."]);
    exit;
}
if (!$work_time_id) {
    echo json_encode(["success" => false, "message" => "Missing work_time_id."]);
    exit;
}
if (!$effective_date) {
    echo json_encode(["success" => false, "message" => "Missing effective_date."]);
    exit;
}

// Helper: convert "HH:MM:SS" => minutes (0..1439)
function timeToMinutes($timeStr) {
    if (!$timeStr) return 0;
    $parts = explode(':', $timeStr);
    $h = intval($parts[0] ?? 0);
    $m = intval($parts[1] ?? 0);
    return $h * 60 + $m;
}

// canonical weekdays (for wildcard handling)
$ALL_WEEKDAYS = ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"];

// helper: normalize days -> array of trimmed day tokens, empty means wildcard (all)
function daysArrayFromString($s) {
    if ($s === null || trim($s) === '') return []; // treat as wildcard (empty => all)
    $parts = array_map('trim', explode(',', $s));
    $parts = array_filter($parts, fn($x) => $x !== '');
    return array_values($parts);
}

// 1) Read new shift times from work_time
$new_shift_sql = "SELECT start_time, end_time, shift_name FROM work_time WHERE id = ? LIMIT 1";
$stmt = $conn->prepare($new_shift_sql);
if (!$stmt) {
    echo json_encode(["success" => false, "message" => "Prepare failed: " . $conn->error]);
    exit;
}
$stmt->bind_param("i", $work_time_id);
$stmt->execute();
$new_shift_res = $stmt->get_result();
if (!$new_shift_res || $new_shift_res->num_rows === 0) {
    echo json_encode(["success" => false, "message" => "Invalid work_time_id."]);
    exit;
}
$new_shift = $new_shift_res->fetch_assoc();
$new_start_min = timeToMinutes($new_shift['start_time']);
$new_end_min = timeToMinutes($new_shift['end_time']);
if ($new_end_min <= $new_start_min) $new_end_min += 24 * 60;

// Normalize date-range for query comparisons
$new_start_date = $effective_date;
$new_end_date = $end_date ?? '9999-12-31';

// 2) Query candidate existing schedules for the same employee
$conflict_sql = "
    SELECT ess.*, wt.start_time AS existing_start_time, wt.end_time AS existing_end_time, wt.shift_name
    FROM employee_shift_schedule ess
    JOIN work_time wt ON ess.work_time_id = wt.id
    WHERE ess.employee_id = ?
      AND ess.is_active = 1
      AND (
            ess.end_date IS NULL
            OR ess.end_date = '0000-00-00'
            OR ess.end_date >= ?
      )
      AND ess.effective_date <= ?
";
$stmt = $conn->prepare($conflict_sql);
if (!$stmt) {
    echo json_encode(["success" => false, "message" => "Prepare failed: " . $conn->error]);
    exit;
}
$stmt->bind_param("sss", $employee_id, $new_start_date, $new_end_date);
$stmt->execute();
$result = $stmt->get_result();

$conflicts = [];

// loop candidate schedules and check overlap
while ($row = $result->fetch_assoc()) {
    $existing_days = daysArrayFromString($row['days_of_week']);
    $new_days = daysArrayFromString($days_of_week);

    // determine day overlap and also produce the exact conflicting days
    $conflicting_days_arr = [];
    if (empty($existing_days) && empty($new_days)) {
        // both wildcard -> all days conflict
        $conflicting_days_arr = $ALL_WEEKDAYS;
    } elseif (empty($existing_days) && !empty($new_days)) {
        // existing wildcard -> conflict on the new days
        $conflicting_days_arr = $new_days;
    } elseif (!empty($existing_days) && empty($new_days)) {
        // new wildcard -> conflict on existing days
        $conflicting_days_arr = $existing_days;
    } else {
        $conflicting_days_arr = array_values(array_intersect($existing_days, $new_days));
    }

    if (count($conflicting_days_arr) === 0) continue; // no day overlap

    // time overlap? compute minutes and consider overnight
    $exist_start = timeToMinutes($row['existing_start_time']);
    $exist_end = timeToMinutes($row['existing_end_time']);
    if ($exist_end <= $exist_start) $exist_end += 24 * 60;

    // check overlap of intervals [start, end)
    $a1 = $new_start_min;
    $a2 = $new_end_min;
    $b1 = $exist_start;
    $b2 = $exist_end;

    $time_overlap = ($a1 < $b2 && $a2 > $b1);

    // if both day & time overlap, and it's a different work_time, record conflict
    if ($time_overlap && intval($row['work_time_id']) !== intval($work_time_id)) {
        // compute conflicting_days string (comma separated, preserve order from ALL_WEEKDAYS)
        $ordered_conflicts = array_values(array_intersect($ALL_WEEKDAYS, $conflicting_days_arr));
        $conflicting_days_str = implode(",", $ordered_conflicts);

        $conflicts[] = [
            "schedule_id" => intval($row['schedule_id']),
            "employee_id" => $row['employee_id'],
            "work_time_id" => intval($row['work_time_id']),
            "shift_name" => $row['shift_name'] ?? null,
            "start_time" => $row['existing_start_time'],
            "end_time" => $row['existing_end_time'],
            "days_of_week" => $row['days_of_week'],
            "conflicting_days" => $conflicting_days_str, // <-- added
            "effective_date" => $row['effective_date'],
            "end_date" => $row['end_date'],
            "recurrence_type" => $row['recurrence_type'],
            "recurrence_interval" => $row['recurrence_interval'],
            "priority" => intval($row['priority']),
        ];
    }
}

if (count($conflicts) > 0) {
    echo json_encode([
        "success" => false,
        "message" => "Conflict detected",
        "conflicts" => $conflicts
    ]);
    exit;
}

// 2.5) Check if same schedule exists (only days differ)
$existing_sql = "
    SELECT schedule_id FROM employee_shift_schedule 
    WHERE employee_id = ? 
      AND work_time_id = ? 
      AND effective_date = ? 
      AND IFNULL(end_date, '9999-12-31') = IFNULL(?, '9999-12-31')
      AND recurrence_type = ? 
      AND recurrence_interval = ? 
      AND is_active = 1
    LIMIT 1
";
$stmt = $conn->prepare($existing_sql);
if (!$stmt) {
    echo json_encode(["success" => false, "message" => "Prepare failed: " . $conn->error]);
    exit;
}
$stmt->bind_param("sisssi", 
    $employee_id, 
    $work_time_id, 
    $effective_date, 
    $end_date, 
    $recurrence_type, 
    $recurrence_interval
);
$stmt->execute();
$existRes = $stmt->get_result();

if ($existRes && $existRes->num_rows > 0) {
    $existRow = $existRes->fetch_assoc();
    $existing_id = $existRow['schedule_id'];

    $update_sql = "UPDATE employee_shift_schedule SET days_of_week = ? WHERE schedule_id = ?";
    $stmt2 = $conn->prepare($update_sql);
    if (!$stmt2) {
        echo json_encode(["success" => false, "message" => "Prepare failed (update days): " . $conn->error]);
        exit;
    }
    $bind_days = $days_of_week;
    $stmt2->bind_param("si", $bind_days, $existing_id);

    if ($stmt2->execute()) {
        echo json_encode([
            "success" => true,
            "message" => "Schedule days updated successfully",
            "schedule_id" => $existing_id
        ]);
        exit;
    } else {
        echo json_encode([
            "success" => false,
            "message" => "Failed to update schedule days: " . $stmt2->error
        ]);
        exit;
    }
}

// 3) No conflicts & no existing match -> insert schedule
$insert_sql = "INSERT INTO employee_shift_schedule 
(employee_id, work_time_id, effective_date, end_date, recurrence_type, recurrence_interval, days_of_week, is_active, priority)
VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?)";
$stmt = $conn->prepare($insert_sql);
if (!$stmt) {
    echo json_encode(["success" => false, "message" => "Prepare failed (insert): " . $conn->error]);
    exit;
}
$bind_days = $days_of_week;
if (!$stmt->bind_param("sisssisi",
    $employee_id,
    $work_time_id,
    $effective_date,
    $end_date,
    $recurrence_type,
    $recurrence_interval,
    $bind_days,
    $priority
)) {
    echo json_encode(["success" => false, "message" => "Bind failed: " . $stmt->error]);
    exit;
}

if ($stmt->execute()) {
    echo json_encode(["success" => true, "message" => "Schedule added successfully"]);
} else {
    echo json_encode(["success" => false, "message" => "Failed to add schedule: " . $stmt->error]);
}
$stmt->close();
$conn->close();
?>
