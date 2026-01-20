<?php
include '../server/connection.php';
include("../server/cors.php");

// header("Access-Control-Allow-Origin: *");
// header("Access-Control-Allow-Methods: GET, OPTIONS");
// header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");
// header("Content-Type: application/json; charset=UTF-8");

$query = "SELECT * FROM leave_types";
$result = $conn->query($query);

$leaveTypes = [];

while ($row = $result->fetch_assoc()) {
    $leaveTypes[] = [
        'leave_type_id' => (int)$row['leave_type_id'],
        'leave_name'    => $row['leave_name'],
        'is_paid'       => (bool)$row['is_paid'],
        'leave_limit'   => (float)$row['leave_limit'],
        'default_days'  => (float)$row['default_days'],
        'description'   => $row['description']
    ];
}

echo json_encode(['data' => $leaveTypes]);
?>
