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
  $stmt = $conn->prepare("INSERT INTO loan_remittance_logs (
    loan_id, employee_id, payroll_cutoff, loan_type, remitted, remittance_date,
    reference_file, remarks
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)");

  $stmt->bind_param(
    "isssisss",
    $data['loan_id'],
    $data['employee_id'],
    $data['payroll_cutoff'],
    $data['loan_type'],        // 'sss' or 'pagibig'
    $data['remitted'],
    $data['remittance_date'],
    $data['reference_file'],
    $data['remarks']
  );

  $stmt->execute();

  echo json_encode(["success" => true, "message" => "Remittance log created successfully."]);
} catch (Exception $e) {
  echo json_encode(["success" => false, "message" => $e->getMessage()]);
}
?>
