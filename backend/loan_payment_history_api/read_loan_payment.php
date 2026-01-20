<?php
include '../server/connection.php';
include("../server/cors.php");

// header("Access-Control-Allow-Origin: *");
// header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
// header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");
// header("Content-Type: application/json; charset=UTF-8");

try {
  $query = "SELECT * FROM loan_payment_history ORDER BY loan_payment_history_id DESC";
  $result = $conn->query($query);
  $payments = [];

  while ($row = $result->fetch_assoc()) {
    $payments[] = $row;
  }

  echo json_encode(["success" => true, "data" => $payments]);
} catch (Exception $e) {
  echo json_encode(["success" => false, "message" => $e->getMessage()]);
}
?>
