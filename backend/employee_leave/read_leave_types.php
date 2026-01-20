<?php
include '../server/connection.php';
include("../server/cors.php");


// header("Access-Control-Allow-Origin: *");
// header("Access-Control-Allow-Methods: GET, OPTIONS");
// header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");
// header("Content-Type: application/json; charset=UTF-8");

$sql = "SELECT leave_type_id, leave_name FROM leave_types";
$result = $conn->query($sql);

$leaveTypes = [];
while ($row = $result->fetch_assoc()) {
    $leaveTypes[] = $row;
}

echo json_encode($leaveTypes);
?>
