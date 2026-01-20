<?php
//create_loan
include '../server/connection.php';
include("../server/cors.php");

// Full CORS Headers
// header("Access-Control-Allow-Origin: *");
// header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
// header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");
// header("Content-Type: application/json; charset=UTF-8");

$data = json_decode(file_get_contents("php://input"), true);

if (!$data) {
  echo json_encode(["success" => false, "message" => "Invalid JSON input."]);
  exit;
}

try {
  // 🔢 Compute terms and payable_per_term
  $loan_amount = isset($data['loan_amount']) ? (float)$data['loan_amount'] : 0.00;
  $terms = isset($data['terms']) && (int)$data['terms'] > 0 ? (int)$data['terms'] : 1;
  $deduction_schedule = isset($data['deduction_schedule']) ? $data['deduction_schedule'] : 'monthly';
  $multiplier = ($deduction_schedule === 'semi-monthly') ? 2 : 1;
  $payable_per_term = $terms > 0 ? round($loan_amount / ($terms * $multiplier), 2) : 0.00;

  // ⬇️ Original logic unchanged, but updated INSERT to include new fields
  $stmt = $conn->prepare("INSERT INTO loans (
    employee_id, employee_name, loan_amount, date_start, description, loan_type,
    loan_reference_no, reason, deduction_schedule, interest_type, interest_rate,
    terms, payable_per_term
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");

  $stmt->bind_param(
    "ssdsssssssidd",
    $data['employee_id'],
    $data['employee_name'],
    $loan_amount,
    $data['date_start'],
    $data['description'],
    $data['loan_type'],
    $data['loan_reference_no'],
    $data['reason'],
    $deduction_schedule,
    $data['interest_type'],
    $data['interest_rate'],
    $terms,
    $payable_per_term
  );

  $stmt->execute();

  echo json_encode(["success" => true, "message" => "Loan created successfully."]);
} catch (Exception $e) {
  echo json_encode(["success" => false, "message" => $e->getMessage()]);
}
?>
