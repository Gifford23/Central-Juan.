<?php
header("Content-Type: application/json");
include("../server/cors.php");
include('../server/connection.php');

/*
 * POST JSON:
 * { employee_id, mode: 'monthly'|'semi_monthly', effective_from?: 'YYYY-MM-DD', effective_to?: 'YYYY-MM-DD' }
 * Inserts or updates the record in thirteenth_month_employee_mode
 */

$input = json_decode(file_get_contents('php://input'), true);
$employee_id = $input['employee_id'] ?? null;
$mode = $input['mode'] ?? null;
$effective_from = $input['effective_from'] ?? null;
$effective_to = $input['effective_to'] ?? null;

if (!$employee_id || !$mode) {
    http_response_code(422);
    echo json_encode(['success' => false, 'message' => 'employee_id and mode are required']);
    exit;
}

try {
    // upsert (insert or update)
    $sql = "INSERT INTO thirteenth_month_employee_mode (employee_id, mode, effective_from, effective_to)
            VALUES (?, ?, NULLIF(?, ''), NULLIF(?, ''))
            ON DUPLICATE KEY UPDATE mode = VALUES(mode), effective_from = VALUES(effective_from), effective_to = VALUES(effective_to)";
    $stmt = $conn->prepare($sql);
    $stmt->bind_param('ssss', $employee_id, $mode, $effective_from, $effective_to);
    $ok = $stmt->execute();
    $stmt->close();

    if (!$ok) throw new Exception('DB error: '.$conn->error);

    echo json_encode(['success' => true, 'message' => 'Employee mode saved']);
} catch (Exception $ex) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => $ex->getMessage()]);
}
