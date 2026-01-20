<?php
include("../server/cors.php");
include('../server/connection.php');

header('Content-Type: application/json');

$input = json_decode(file_get_contents('php://input'), true);
if (!$input) $input = $_POST;

$allowance_id = $input['allowance_id'] ?? null;
if (!$allowance_id) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'allowance_id required']);
    exit;
}

$allowance_name = $input['allowance_name'] ?? null;
$amount = isset($input['amount']) ? $input['amount'] : null;
$amount_type = $input['amount_type'] ?? null;
$percent_of = $input['percent_of'] ?? null;
$frequency = $input['frequency'] ?? null;
$prorate = isset($input['prorate_if_partial']) ? intval($input['prorate_if_partial']) : null;
$start_date = $input['start_date'] ?? null;
$end_date = $input['end_date'] ?? null;
$active = isset($input['active']) ? intval($input['active']) : null;

$updates = [];
if ($allowance_name !== null) $updates[] = "allowance_name = '".$conn->real_escape_string($allowance_name)."'";
if ($amount !== null) $updates[] = "amount = ".floatval($amount);
if ($amount_type !== null) $updates[] = "amount_type = '".$conn->real_escape_string($amount_type)."'";
if ($percent_of !== null) $updates[] = "percent_of = '".$conn->real_escape_string($percent_of)."'";
if ($frequency !== null) $updates[] = "frequency = '".$conn->real_escape_string($frequency)."'";
if ($prorate !== null) $updates[] = "prorate_if_partial = ".intval($prorate);
if ($start_date !== null) $updates[] = "start_date = ".($start_date ? "'".$conn->real_escape_string($start_date)."'" : "NULL");
if ($end_date !== null) $updates[] = "end_date = ".($end_date ? "'".$conn->real_escape_string($end_date)."'" : "NULL");
if ($active !== null) $updates[] = "active = ".intval($active);

if (count($updates) === 0) {
    echo json_encode(['success' => false, 'message' => 'No updates provided']);
    exit;
}

$sql = "UPDATE employee_allowance SET ".implode(", ", $updates)." WHERE allowance_id = ".intval($allowance_id);

if (!$conn->query($sql)) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Update failed: '.$conn->error]);
    exit;
}

echo json_encode(['success' => true, 'message' => 'Allowance updated']);
exit;
