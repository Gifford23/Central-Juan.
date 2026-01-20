<?php
include '../server/connection.php';
include("../server/cors.php");

$employee_id = $_GET['employee_id'] ?? NULL;

$sql = "SELECT ess.*, wt.shift_name, wt.start_time, wt.end_time 
        FROM employee_shift_schedule ess
        JOIN work_time wt ON ess.work_time_id = wt.id";

if($employee_id){
    $sql .= " WHERE ess.employee_id = '$employee_id'";
}

$result = $conn->query($sql);
$schedules = [];
while($row = $result->fetch_assoc()){
    $schedules[] = $row;
}
echo json_encode($schedules);
?>
