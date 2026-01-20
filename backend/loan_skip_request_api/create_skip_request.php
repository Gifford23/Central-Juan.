<?php
include '../server/connection.php';
include("../server/cors.php");

// header("Access-Control-Allow-Origin: *");
// header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
// header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");
// header("Content-Type: application/json; charset=UTF-8");

$data = json_decode(file_get_contents("php://input"), true);
if (!$data) {
  echo json_encode(["success" => false, "message" => "Invalid input."]);
  exit;
}

try {
  $stmt = $conn->prepare("INSERT INTO loan_skip_requests (
    loan_id, employee_id, payroll_cutoff, reason
  ) VALUES (?, ?, ?, ?)");

  $stmt->bind_param(
    "isss",
    $data['loan_id'],
    $data['employee_id'],
    $data['payroll_cutoff'],
    $data['reason']
  );

  $stmt->execute();

  echo json_encode(["success" => true, "message" => "Loan skip request submitted."]);
} catch (Exception $e) {
  echo json_encode(["success" => false, "message" => $e->getMessage()]);
}
?>
