<?php
include '../server/connection.php';
include("../server/cors.php");

// header("Access-Control-Allow-Origin: *");
// header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
// header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");
// header("Content-Type: application/json; charset=UTF-8");

$data = json_decode(file_get_contents("php://input"), true);

if (!isset($data['journal_id'])) {
  echo json_encode(["success" => false, "message" => "Missing journal_id."]);
  exit;
}

try {
  $stmt = $conn->prepare("UPDATE loan_journal_entry SET 
    loan_id = ?, employee_id = ?, entry_type = ?, amount = ?, description = ?
    WHERE journal_id = ?");

  $stmt->bind_param(
    "issdsi",
    $data['loan_id'],
    $data['employee_id'],
    $data['entry_type'],
    $data['amount'],
    $data['description'],
    $data['journal_id']
  );

  $stmt->execute();

  echo json_encode(["success" => true, "message" => "Journal entry updated successfully."]);
} catch (Exception $e) {
  echo json_encode(["success" => false, "message" => $e->getMessage()]);
}
?>
