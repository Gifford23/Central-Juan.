<?php

include("../server/cors.php");
include('../server/connection.php');
header("Content-Type: application/json");

$input = json_decode(file_get_contents('php://input'), true);
if (!$input || !isset($input['entries']) || !is_array($input['entries'])) {
    http_response_code(400);
    echo json_encode(['success'=>false,'message'=>'Provide entries array in JSON body']);
    exit;
}

$entries = $input['entries'];

$conn->begin_transaction();

$sql = "INSERT INTO thirteenth_month_entries
  (employee_id, calendar_year, mode, period_index, period_start, period_end, gross_amount, notes, created_by)
  VALUES (?, ?, ?, ?, NULLIF(?,''), NULLIF(?,''), ?, ?, ?)
  ON DUPLICATE KEY UPDATE
    mode = VALUES(mode),
    period_start = VALUES(period_start),
    period_end = VALUES(period_end),
    gross_amount = VALUES(gross_amount),
    notes = VALUES(notes),
    updated_at = NOW()";

$stmt = $conn->prepare($sql);
if (!$stmt) {
    $conn->rollback();
    http_response_code(500);
    echo json_encode(['success'=>false,'message'=>'Prepare failed: '.$conn->error]);
    exit;
}

$okCount = 0;
$err = [];

foreach ($entries as $idx => $e) {
    $employee_id   = $e['employee_id'] ?? null;
    $calendar_year = isset($e['calendar_year']) ? (int)$e['calendar_year'] : null;
    $mode          = $e['mode'] ?? 'semi_monthly';
    $period_index  = isset($e['period_index']) ? (int)$e['period_index'] : null;
    $period_start  = $e['period_start'] ?? '';
    $period_end    = $e['period_end'] ?? '';
    $gross_amount  = isset($e['gross_amount']) ? (float)$e['gross_amount'] : 0.00;
    $notes         = $e['notes'] ?? null;
    $created_by    = $e['created_by'] ?? null;

    if (!$employee_id || !$calendar_year || !$period_index) {
        $err[] = ['index'=>$idx,'message'=>'employee_id, calendar_year and period_index are required'];
        continue;
    }

    // types: s i s i s s d s s => 'sisissdss' (same as create)
    $types = 'sisissdss';
    $stmt->bind_param($types, $employee_id, $calendar_year, $mode, $period_index, $period_start, $period_end, $gross_amount, $notes, $created_by);

    if (!$stmt->execute()) {
        $err[] = ['index'=>$idx,'message'=>$stmt->error];
    } else {
        $okCount++;
    }
}

if (count($err) > 0) {
    // optional: still commit, but better rollback to keep consistent
    $conn->rollback();
    echo json_encode(['success'=>false,'message'=>'Errors occurred','inserted'=> $okCount, 'errors'=>$err]);
} else {
    $conn->commit();
    echo json_encode(['success'=>true,'message'=>'All entries upserted','inserted'=>$okCount]);
}

$stmt->close();
