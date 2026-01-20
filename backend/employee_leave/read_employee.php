<?php
include '../server/connection.php';
include("../server/cors.php");

// header("Access-Control-Allow-Origin: *");
// header("Access-Control-Allow-Methods: GET, OPTIONS");
// header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");
// header("Content-Type: application/json; charset=UTF-8");

$sql = "SELECT employee_id, first_name, last_name FROM employees WHERE status = 'active'";
$result = $conn->query($sql);

$employees = [];
while ($row = $result->fetch_assoc()) {
    $row['full_name'] = $row['first_name'] . ' ' . $row['last_name'];
    $employees[] = $row;
}

echo json_encode($employees);
?>
