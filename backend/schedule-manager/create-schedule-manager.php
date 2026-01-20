<?php
include '../server/connection.php';
include '../server/cors.php';

// Decode incoming JSON
$data = json_decode(file_get_contents("php://input"), true);

if (!$data) {
    echo json_encode(["success" => false, "message" => "Invalid input"]);
    exit;
}

// Extract inputs
$employee_id = $data['employee_id'] ?? null;
$work_time_ids = $data['work_time_id'] ?? null; // can be single ID or array
$effective_date = $data['effective_date'] ?? null;
$end_date = $data['end_date'] ?? null;
$recurrence_type = $data['recurrence_type'] ?? 'none';
$recurrence_interval = $data['recurrence_interval'] ?? 1;
$days_of_week = $data['days_of_week'] ?? null; // JSON string or CSV for storage
$occurrence_limit = $data['occurrence_limit'] ?? null;

if (!$employee_id || !$work_time_ids || !$effective_date) {
    echo json_encode(["success" => false, "message" => "Required fields missing"]);
    exit;
}

// Normalize work_time_ids into an array
$work_time_ids = is_array($work_time_ids) ? $work_time_ids : [$work_time_ids];

// Prepare insert statement (reused for all schedules)
$stmt = $conn->prepare("
    INSERT INTO employee_shift_schedule 
        (employee_id, work_time_id, effective_date, end_date, recurrence_type, recurrence_interval, days_of_week, occurrence_limit) 
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
");

// Loop through multiple work_time_ids (schedules)
foreach ($work_time_ids as $work_time_id) {
    // 🔎 Fetch new shift's time window
    $shiftQuery = $conn->prepare("SELECT start_time, end_time FROM work_time WHERE id = ?");
    $shiftQuery->bind_param("i", $work_time_id);
    $shiftQuery->execute();
    $newShift = $shiftQuery->get_result()->fetch_assoc();
    $shiftQuery->close();

    if (!$newShift) {
        echo json_encode(["success" => false, "message" => "Invalid work_time_id: $work_time_id"]);
        exit;
    }

    $newStart = $newShift['start_time'];
    $newEnd = $newShift['end_time'];

    // 🔎 Check if employee already has overlapping schedule (date + time)
    $check = $conn->prepare("
        SELECT e.schedule_id, w.shift_name, w.start_time, w.end_time
        FROM employee_shift_schedule e
        JOIN work_time w ON e.work_time_id = w.id
        WHERE e.employee_id = ?
          AND e.is_active = 1
          AND (
                (e.effective_date <= ? AND (e.end_date IS NULL OR e.end_date >= ?))
              )
          AND (
                (w.start_time < ? AND w.end_time > ?) -- overlap check
                OR (w.start_time >= ? AND w.start_time < ?)
                OR (w.end_time > ? AND w.end_time <= ?)
              )
    ");
    $check->bind_param(
        "sssssssss",
        $employee_id,
        $end_date,
        $effective_date,
        $newEnd,   // existing start < new end
        $newStart, // existing end > new start
        $newStart, // existing start inside new window
        $newEnd,
        $newStart, // existing end inside new window
        $newEnd
    );
    $check->execute();
    $conflicts = $check->get_result();
    $check->close();

    if ($conflicts->num_rows > 0) {
        $conflict = $conflicts->fetch_assoc();
        echo json_encode([
            "success" => false,
            "message" => "Conflict: Overlapping with existing shift '{$conflict['shift_name']}' ({$conflict['start_time']} - {$conflict['end_time']})"
        ]);
        exit;
    }

    // ✅ Insert new shift
    $stmt->bind_param(
        "sisssisi",
        $employee_id,
        $work_time_id,
        $effective_date,
        $end_date,
        $recurrence_type,
        $recurrence_interval,
        $days_of_week,
        $occurrence_limit
    );
    $stmt->execute();
}

$stmt->close();
$conn->close();

echo json_encode(["success" => true, "message" => "Schedule(s) created"]);
