<?php
// header("Access-Control-Allow-Origin: *");
// header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");
// header("Access-Control-Allow-Headers: Content-Type, Authorization");
// header("Content-Type: application/json; charset=UTF-8");

include('../../server/connection.php');
include("../../server/cors.php");

// --------------------
// Fetch late requests
// --------------------
$late_sql = "SELECT r.*, 
                a.time_in_morning AS current_time_in_morning,
                a.time_out_morning AS current_time_out_morning,
                a.time_in_afternoon AS current_time_in_afternoon,
                a.time_out_afternoon AS current_time_out_afternoon
             FROM late_attendance_requests r
             LEFT JOIN attendance a 
                ON r.employee_id = a.employee_id 
               AND r.attendance_date = a.attendance_date";
$late_result = $conn->query($late_sql);
$late_data = [];
while ($row = $late_result->fetch_assoc()) {
    $row['request_type'] = 'Late Attendance';
    $late_data[] = $row;
}

// --------------------
// Fetch overtime requests
// --------------------
$over_sql = "SELECT * FROM employee_overtime_request";
$over_result = $conn->query($over_sql);
$over_data = [];
while ($row = $over_result->fetch_assoc()) {
    $row['request_type'] = 'Overtime';
    $over_data[] = $row;
}

// --------------------
// Fetch leave requests
// --------------------
$leave_data = [];
if (isset($_GET['employee_id'])) {
    $employee_id = $_GET['employee_id'];

    $sql = "SELECT leave_id, employee_id, leave_type_id, date_from, date_until, total_days,
                   reason, status, approval_remarks, attachment_url, created_at, updated_at
            FROM leave_requests
            WHERE employee_id = ?
            ORDER BY created_at DESC";

    $stmt = $conn->prepare($sql);
    $stmt->bind_param("s", $employee_id);
    $stmt->execute();
    $result = $stmt->get_result();

    while ($row = $result->fetch_assoc()) {
        $row['request_type'] = 'Leave';
        $leave_data[] = $row;
    }
    $stmt->close();
}

// --------------------
// Merge + return
// --------------------
echo json_encode([
    "success" => true,
    "data" => array_merge($late_data, $over_data, $leave_data)
]);

$conn->close();
?>
