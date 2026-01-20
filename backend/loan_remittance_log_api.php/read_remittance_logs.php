<?php
include '../server/connection.php';
include("../server/cors.php");

// header("Access-Control-Allow-Origin: *");
// header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
// header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");
// header("Content-Type: application/json; charset=UTF-8");

try {
  $result = $conn->query("SELECT * FROM loan_remittance_logs ORDER BY remittance_id DESC");
  $logs = [];

  while ($row = $result->fetch_assoc()) {
    $logs[] = $row;
  }

  echo json_encode(["success" => true, "data" => $logs]);
} catch (Exception $e) {
  echo json_encode(["success" => false, "message" => $e->getMessage()]);
}
?>
