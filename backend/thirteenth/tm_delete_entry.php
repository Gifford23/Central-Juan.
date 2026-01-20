<?php

include("../server/cors.php");
include('../server/connection.php');
header("Content-Type: application/json");

$input = json_decode(file_get_contents('php://input'), true);
$entry_id = isset($input['entry_id']) ? (int)$input['entry_id'] : null;

if (!$entry_id) {
    http_response_code(422);
    echo json_encode(['success'=>false,'message'=>'entry_id required']);
    exit;
}

$sql = "DELETE FROM thirteenth_month_entries WHERE entry_id = ?";
$stmt = $conn->prepare($sql);
if (!$stmt) { http_response_code(500); echo json_encode(['success'=>false,'message'=>$conn->error]); exit; }
$stmt->bind_param('i', $entry_id);
$ok = $stmt->execute();
if (!$ok) { http_response_code(500); echo json_encode(['success'=>false,'message'=>$stmt->error]); $stmt->close(); exit; }
$stmt->close();

echo json_encode(['success'=>true,'message'=>'Entry deleted', 'entry_id' => $entry_id]);
