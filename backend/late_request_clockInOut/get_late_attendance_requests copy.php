<?php
// Allow CORS and HTTP methods
// header('Access-Control-Allow-Origin: *');
// header('Access-Control-Allow-Methods: GET, OPTIONS');
// header('Access-Control-Allow-Headers: Content-Type, Authorization');

// Include the database connection
require_once '../server/connection.php';
include("../server/cors.php");

// SQL query joins late_attendance_requests with employees + attendance
$sql = "SELECT 
            r.*, 
            e.image, 
            a.time_in_morning AS current_time_in_morning,
            a.time_out_morning AS current_time_out_morning,
            a.time_in_afternoon AS current_time_in_afternoon,
            a.time_out_afternoon AS current_time_out_afternoon
        FROM late_attendance_requests r
        LEFT JOIN employees e ON r.employee_id = e.employee_id
        LEFT JOIN attendance a ON r.employee_id = a.employee_id AND r.attendance_date = a.attendance_date";

// Execute the query
$result = $conn->query($sql);

if ($result->num_rows > 0) {
    $attendanceData = [];

    while ($row = $result->fetch_assoc()) {
        $attendanceData[] = $row;
    }

    echo json_encode([
        "success" => true,
        "data" => $attendanceData
    ]);
} else {
    echo json_encode([
        "success" => false,
        "message" => "No records found."
    ]);
}

$conn->close();
?>
