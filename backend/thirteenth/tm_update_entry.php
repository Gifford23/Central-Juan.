<?php

include("../server/cors.php");
include('../server/connection.php');
header("Content-Type: application/json");

$input = json_decode(file_get_contents('php://input'), true);
if (!$input) { http_response_code(400); echo json_encode(['success'=>false,'message'=>'Invalid JSON']); exit; }

$entry_id = isset($input['entry_id']) ? (int)$input['entry_id'] : null;
if (!$entry_id) { http_response_code(422); echo json_encode(['success'=>false,'message'=>'entry_id required']); exit; }

// Allowed fields to update:
$allowed = ['mode','period_index','period_start','period_end','gross_amount','notes','updated_by'];
$sets = [];
$params = [];

foreach ($allowed as $field) {
    if (isset($input[$field])) {
        if (in_array($field, ['period_start','period_end'])) {
            // use NULLIF to allow empty -> NULL
            $sets[] = "$field = NULLIF(?, '')";
            $params[] = $input[$field];
        } else {
            $sets[] = "$field = ?";
            $params[] = $input[$field];
        }
    }
}

if (!count($sets)) {
    echo json_encode(['success'=>false,'message'=>'No updatable fields supplied']);
    exit;
}

$sql = "UPDATE thirteenth_month_entries SET " . implode(', ', $sets) . ", updated_at = NOW() WHERE entry_id = ?";
$params[] = $entry_id;

$stmt = $conn->prepare($sql);
if (!$stmt) { http_response_code(500); echo json_encode(['success'=>false,'message'=>$conn->error]); exit; }

// build types
$types = '';
foreach ($params as $p) {
    if (is_int($p)) { $types .= 'i'; }
    else if (is_float($p) || is_double($p)) { $types .= 'd'; }
    else { $types .= 's'; }
}

$refs = [];
$refs[] = & $types;
for ($i=0;$i<count($params);$i++) { $refs[] = & $params[$i]; }
call_user_func_array([$stmt, 'bind_param'], $refs);

$ok = $stmt->execute();
if (!$ok) { http_response_code(500); echo json_encode(['success'=>false,'message'=>$stmt->error]); $stmt->close(); exit; }

$stmt->close();
echo json_encode(['success'=>true,'message'=>'Entry updated', 'affected_rows' => $conn->affected_rows]);
