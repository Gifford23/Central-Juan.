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
            r.request_id,
            r.employee_id,
            r.employee_name,
            r.attendance_date,
            r.requested_time_in_morning,
            r.requested_time_out_morning,
            r.requested_time_in_afternoon,
            r.requested_time_out_afternoon,
            r.reason,
            r.status,
            r.requested_at,
            r.reviewed_at,
            r.reviewed_by,
            e.image, 
            a.time_in_morning AS current_time_in_morning,
            a.time_out_morning AS current_time_out_morning,
            a.time_in_afternoon AS current_time_in_afternoon,
            a.time_out_afternoon AS current_time_out_afternoon
        FROM late_attendance_requests r
        LEFT JOIN employees e ON r.employee_id = e.employee_id
        LEFT JOIN attendance a ON r.employee_id = a.employee_id AND r.attendance_date = a.attendance_date
        ORDER BY r.requested_at DESC";  // ✅ ensure newest requests first

// Execute the query
$result = $conn->query($sql);

if ($result && $result->num_rows > 0) {
    $attendanceData = [];

    while ($row = $result->fetch_assoc()) {
        // ✅ normalize status casing
        $row['status'] = strtolower($row['status']);
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
