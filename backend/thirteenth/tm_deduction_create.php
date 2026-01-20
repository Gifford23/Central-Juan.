<?php
include("../server/cors.php");
include('../server/connection.php');
header('Content-Type: application/json');

$input = json_decode(file_get_contents('php://input'), true);
if (!$input) { echo json_encode(['success'=>false,'message'=>'Invalid input']); exit; }

$employee_id = $input['employee_id'] ?? '';
$calendar_year = intval($input['calendar_year'] ?? date('Y'));
$description = $input['description'] ?? '';
$type = in_array($input['type'] ?? '', ['fixed','percent']) ? $input['type'] : 'fixed';
$amount = floatval($input['amount'] ?? 0);
$created_by = $input['created_by'] ?? null;

if (!$employee_id || !$description) {
  echo json_encode(['success'=>false,'message'=>'Missing required fields']); exit;
}

$sql = "INSERT INTO thirteenth_deductions (employee_id, calendar_year, description, type, amount, created_by) VALUES (?, ?, ?, ?, ?, ?)";
$stmt = $conn->prepare($sql);
$stmt->bind_param("sissds", $employee_id, $calendar_year, $description, $type, $amount, $created_by);
if ($stmt->execute()) {
  echo json_encode(['success'=>true,'deduction_id'=>$stmt->insert_id]);
} else {
  echo json_encode(['success'=>false,'error'=>$stmt->error]);
}
$stmt->close();
$conn->close();
