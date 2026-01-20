<?php
include("../server/cors.php");
include('../server/connection.php');
header('Content-Type: application/json');

$input = json_decode(file_get_contents('php://input'), true);
$deduction_id = intval($input['deduction_id'] ?? 0);
if (!$deduction_id) { echo json_encode(['success'=>false,'message'=>'Missing id']); exit; }

$description = $input['description'] ?? null;
$type = isset($input['type']) && in_array($input['type'], ['fixed','percent']) ? $input['type'] : null;
$amount = isset($input['amount']) ? floatval($input['amount']) : null;

$sets = [];
$params = [];
$types = '';
if ($description !== null) { $sets[] = "description=?"; $params[] = $description; $types .= 's'; }
if ($type !== null) { $sets[] = "type=?"; $params[] = $type; $types .= 's'; }
if ($amount !== null) { $sets[] = "amount=?"; $params[] = $amount; $types .= 'd'; }
if (count($sets) === 0) { echo json_encode(['success'=>false,'message'=>'Nothing to update']); exit; }

$sql = "UPDATE thirteenth_deductions SET " . implode(", ", $sets) . ", updated_at = NOW() WHERE deduction_id = ?";
$params[] = $deduction_id; $types .= 'i';
$stmt = $conn->prepare($sql);
$stmt->bind_param($types, ...$params);
if ($stmt->execute()) echo json_encode(['success'=>true]);
else echo json_encode(['success'=>false,'error'=>$stmt->error]);
$stmt->close();
$conn->close();
