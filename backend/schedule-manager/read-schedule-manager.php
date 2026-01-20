<?php
include("../server/cors.php");

include '../server/connection.php';

$employee_id = isset($_GET['employee_id']) ? $_GET['employee_id'] : null;

/**
 * 🔎 Query notes:
 * - Joins employees with their schedules.
 * - Keeps default work_time as fallback if no schedules exist.
 * - Supports multiple schedules per employee.
 */
$query = "
    SELECT 
        e.employee_id,
        CONCAT(e.first_name, ' ', e.last_name) AS employee_name,
        
        s.schedule_id,
        s.work_time_id,
        s.effective_date,
        s.end_date,
        s.recurrence_type,
        s.recurrence_interval,
        s.days_of_week,
        s.occurrence_limit,
        s.is_active,

        wt.shift_name,
        wt.start_time,
        wt.end_time

    FROM employees e
    LEFT JOIN employee_shift_schedule s 
        ON e.employee_id = s.employee_id AND s.is_active = 1
    LEFT JOIN work_time wt 
        ON wt.id = s.work_time_id
    WHERE e.status = 'active'
    ORDER BY e.employee_id
";


if ($employee_id) {
    $query .= " AND e.employee_id = ?";
    $stmt = $conn->prepare($query);
    $stmt->bind_param("s", $employee_id);
} else {
    $stmt = $conn->prepare($query);
}

$stmt->execute();
$result = $stmt->get_result();

$schedules = [];
while ($row = $result->fetch_assoc()) {
    $empId = $row['employee_id'];

    if (!isset($schedules[$empId])) {
        $schedules[$empId] = [
            "employee_id" => $row['employee_id'],
            "employee_name" => $row['employee_name'],
            "shifts" => []
        ];
    }

    // Push multiple shifts per employee
    $schedules[$empId]["shifts"][] = [
        "schedule_id" => $row["schedule_id"],
        "work_time_id" => $row["work_time_id"],
        "effective_date" => $row["effective_date"],
        "end_date" => $row["end_date"],
        "recurrence_type" => $row["recurrence_type"],
        "recurrence_interval" => $row["recurrence_interval"],
        "days_of_week" => $row["days_of_week"],
        "occurrence_limit" => $row["occurrence_limit"],
        "is_active" => $row["is_active"],
        "shift_name" => $row["shift_name"],
        "start_time" => $row["start_time"],
        "end_time" => $row["end_time"]
    ];
}

$stmt->close();
$conn->close();

echo json_encode([
    "success" => true,
    "data" => array_values($schedules) // reset keys for FE
]);
