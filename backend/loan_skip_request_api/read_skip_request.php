<?php
include '../server/connection.php';
include("../server/cors.php");

// header("Access-Control-Allow-Origin: *");
// header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
// header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");
// header("Content-Type: application/json; charset=UTF-8");

try {
  $result = $conn->query("SELECT * FROM loan_skip_requests ORDER BY requested_at DESC");
  $requests = [];

  while ($row = $result->fetch_assoc()) {
    $requests[] = $row;
  }

  echo json_encode(["success" => true, "data" => $requests]);
} catch (Exception $e) {
  echo json_encode(["success" => false, "message" => $e->getMessage()]);
}
?>
