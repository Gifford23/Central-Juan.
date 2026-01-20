<?php
include('../server/connection.php');
include('../server/cors.php');

header('Content-Type: application/json');

$result = $conn->query("SELECT * FROM schedule_submissions");
$rows = [];
while ($row = $result->fetch_assoc()) {
  $rows[] = $row;
}
echo json_encode($rows);
$conn->close();
?>
