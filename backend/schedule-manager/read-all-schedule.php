<?php
include '../server/connection.php';
include("../server/cors.php");

$sql = "SELECT ess.schedule_id, ess.employee_id, e.first_name, e.last_name,
               ess.effective_date, ess.end_date, ess.recurrence_type, ess.recurrence_interval,
               ess.days_of_week, ess.priority,
               wt.shift_name, wt.start_time, wt.end_time
        FROM employee_shift_schedule ess
        JOIN employees e ON ess.employee_id = e.employee_id
        JOIN work_time wt ON ess.work_time_id = wt.id
        WHERE ess.is_active = 1";

$result = $conn->query($sql);

$schedules = [];
while ($row = $result->fetch_assoc()) {
    $schedules[] = $row;
}

echo json_encode(["success" => true, "schedules" => $schedules]);
?>
