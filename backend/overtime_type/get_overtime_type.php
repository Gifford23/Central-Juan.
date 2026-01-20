<?php
// header("Access-Control-Allow-Origin: *");
// header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");
// header("Access-Control-Allow-Headers: Content-Type, Authorization");
// header("Content-Type: application/json; charset=UTF-8");
include('../server/connection.php');
include("../server/cors.php");

$sql = "SELECT * FROM overtime_types ORDER BY id DESC";
$result = $conn->query($sql);

$rows = [];
while ($row = $result->fetch_assoc()) {
    $row['is_enabled'] = (int)$row['is_enabled'];
    $rows[] = $row;
}


echo json_encode($rows);
$conn->close();
?>
