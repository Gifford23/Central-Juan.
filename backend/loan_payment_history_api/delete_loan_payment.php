<?php
include '../server/connection.php';
include("../server/cors.php");

// header("Access-Control-Allow-Origin: *");
// header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
// header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");
// header("Content-Type: application/json; charset=UTF-8");

$data = json_decode(file_get_contents("php://input"), true);

if (!isset($data['loan_payment_history_id'])) {
  echo json_encode(["success" => false, "message" => "Missing payment ID."]);
  exit;
}

try {
  $stmt = $conn->prepare("DELETE FROM loan_payment_history WHERE loan_payment_history_id = ?");
  $stmt->bind_param("i", $data['loan_payment_history_id']);
  $stmt->execute();

  echo json_encode(["success" => true, "message" => "Loan payment deleted successfully."]);
} catch (Exception $e) {
  echo json_encode(["success" => false, "message" => $e->getMessage()]);
}
?>
