<?php

include("../server/cors.php");
include('../server/connection.php'); // must provide $conn (mysqli)
header("Content-Type: application/json");

$input = json_decode(file_get_contents('php://input'), true);

if (!$input) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Invalid JSON body']);
    exit;
}

$employee_id   = $input['employee_id'] ?? null;
$calendar_year = isset($input['calendar_year']) ? (int)$input['calendar_year'] : null;
$mode          = $input['mode'] ?? 'semi_monthly';
$period_index  = isset($input['period_index']) ? (int)$input['period_index'] : null;
$period_start  = $input['period_start'] ?? ''; // expect 'YYYY-MM-DD' or empty
$period_end    = $input['period_end'] ?? '';
$gross_amount  = isset($input['gross_amount']) ? (float)$input['gross_amount'] : 0.00;
$notes         = $input['notes'] ?? null;
$created_by    = $input['created_by'] ?? null;

if (!$employee_id || !$calendar_year || !$period_index) {
    http_response_code(422);
    echo json_encode(['success' => false, 'message' => 'employee_id, calendar_year and period_index are required']);
    exit;
}

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
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Prepare failed: ' . $conn->error]);
    exit;
}

// types: employee_id(s), calendar_year(i), mode(s), period_index(i), period_start(s), period_end(s), gross_amount(d), notes(s), created_by(s)
$types = 'sisissdss'; // s i s i s s d s s
$stmt->bind_param($types, $employee_id, $calendar_year, $mode, $period_index, $period_start, $period_end, $gross_amount, $notes, $created_by);

$ok = $stmt->execute();
if (!$ok) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Execute failed: ' . $stmt->error]);
    $stmt->close();
    exit;
}

$entry_id = $stmt->insert_id ?: null;
$stmt->close();

echo json_encode([
    'success' => true,
    'message' => 'Entry upserted',
    'entry_id' => $entry_id,
    'employee_id' => $employee_id,
    'calendar_year' => $calendar_year,
    'period_index' => $period_index
]);
