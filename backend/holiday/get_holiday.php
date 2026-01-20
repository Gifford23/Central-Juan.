<?php
// File: get_holiday.php
// header('Access-Control-Allow-Origin: *');
// header('Access-Control-Allow-Methods: GET, OPTIONS');
// header('Access-Control-Allow-Headers: Content-Type, Authorization');
require_once '../server/connection.php';
include("../server/cors.php");


$date = $_GET['date'] ?? null;
if ($date) {
  $stmt = $conn->prepare("SELECT holiday_id, name, holiday_date, is_recurring, default_multiplier, apply_multiplier, ot_multiplier, extended_until, holiday_type 
                          FROM holidays 
                          WHERE (holiday_date = ? OR (is_recurring = 1 AND MONTH(holiday_date) = MONTH(?) AND DAY(holiday_date) = DAY(?))) 
                          AND (extended_until IS NULL OR ? <= extended_until)");
  $stmt->bind_param("ssss", $date, $date, $date, $date);
  $stmt->execute();
  $result = $stmt->get_result();
  $data = $result->fetch_assoc();
  echo json_encode(["success" => !!$data, "data" => $data]);
  $stmt->close();
} else {
  $result = $conn->query("SELECT holiday_id, name, holiday_date, is_recurring, default_multiplier, apply_multiplier, ot_multiplier, extended_until, holiday_type FROM holidays");
  $data = [];
  while ($row = $result->fetch_assoc()) {
    $data[] = $row;
  }
  echo json_encode(["success" => true, "data" => $data]);
}
$conn->close();
