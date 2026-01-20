<?php
include '../server/connection.php';
include("../server/cors.php");

// header("Access-Control-Allow-Origin: *");
// header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
// header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");
// header("Content-Type: application/json; charset=UTF-8");

$data = json_decode(file_get_contents("php://input"), true);
if (!isset($data['remittance_id'])) {
  echo json_encode(["success" => false, "message" => "Missing remittance_id."]);
  exit;
}

try {
  $stmt = $conn->prepare("UPDATE loan_remittance_logs SET 
    loan_id = ?, employee_id = ?, payroll_cutoff = ?, loan_type = ?, 
    remitted = ?, remittance_date = ?, reference_file = ?, remarks = ?
    WHERE remittance_id = ?");

  $stmt->bind_param(
    "isssisssi",
    $data['loan_id'],
    $data['employee_id'],
    $data['payroll_cutoff'],
    $data['loan_type'],
    $data['remitted'],
    $data['remittance_date'],
    $data['reference_file'],
    $data['remarks'],
    $data['remittance_id']
  );

  $stmt->execute();

  echo json_encode(["success" => true, "message" => "Remittance log updated successfully."]);
} catch (Exception $e) {
  echo json_encode(["success" => false, "message" => $e->getMessage()]);
}
?>
