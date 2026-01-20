<?php
include("../server/cors.php");
include('../server/connection.php');
header('Content-Type: application/json');

$input = json_decode(file_get_contents('php://input'), true);
$deduction_id = intval($input['deduction_id'] ?? 0);
if (!$deduction_id) { echo json_encode(['success'=>false,'message'=>'Missing id']); exit; }

$stmt = $conn->prepare("DELETE FROM thirteenth_deductions WHERE deduction_id = ?");
$stmt->bind_param("i", $deduction_id);
if ($stmt->execute()) echo json_encode(['success'=>true]);
else echo json_encode(['success'=>false,'error'=>$stmt->error]);
$stmt->close();
$conn->close();
