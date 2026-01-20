<?php

include("../server/cors.php");
include('../server/connection.php');
header("Content-Type: application/json");

$entry_id = isset($_GET['entry_id']) ? (int)$_GET['entry_id'] : null;
if (!$entry_id) {
    http_response_code(422);
    echo json_encode(['success'=>false,'message'=>'entry_id required']);
    exit;
}

$sql = "SELECT * FROM thirteenth_month_entries WHERE entry_id = ? LIMIT 1";
$stmt = $conn->prepare($sql);
if (!$stmt) { http_response_code(500); echo json_encode(['success'=>false,'message'=>$conn->error]); exit; }
$stmt->bind_param('i', $entry_id);
$stmt->execute();
$res = $stmt->get_result();
$row = $res->fetch_assoc();
$stmt->close();

if (!$row) {
    http_response_code(404);
    echo json_encode(['success'=>false,'message'=>'Entry not found']);
    exit;
}

echo json_encode(['success'=>true,'data'=>$row]);
