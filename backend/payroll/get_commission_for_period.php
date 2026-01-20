<?php
// get_commission_for_period.php
header('Content-Type: application/json; charset=utf-8');

// keep errors out of JSON responses; log to PHP error log instead
ini_set('display_errors', 0);
ini_set('log_errors', 1);
error_reporting(E_ALL);

include("../server/cors.php");
include('../server/connection.php');

$raw = file_get_contents('php://input');
$input = json_decode($raw, true);
if ($input === null && !empty($_POST)) $input = $_POST;

$employee_id = trim($input['employee_id'] ?? '');
$date_from = $input['date_from'] ?? null;
$date_until = $input['date_until'] ?? null;

if ($employee_id === '' || empty($date_from) || empty($date_until)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'status' => 'error', 'message' => 'employee_id, date_from and date_until are required']);
    exit;
}

try {
    // Sum payroll.total_commission for payroll rows that are "in between" the provided dates:
    // payroll.date_from >= date_from AND payroll.date_until <= date_until
    $stmt = $conn->prepare("
        SELECT COALESCE(SUM(COALESCE(total_commission,0)),0) AS sum_comm
        FROM payroll
        WHERE employee_id = ?
          AND date_from >= ?
          AND date_until <= ?
    ");
    if (!$stmt) throw new Exception($conn->error);
    $stmt->bind_param('sss', $employee_id, $date_from, $date_until);
    if (!$stmt->execute()) throw new Exception($stmt->error);
    $res = $stmt->get_result();
    $row = $res->fetch_assoc() ?: null;
    $stmt->close();

    $sum = isset($row['sum_comm']) ? (float)$row['sum_comm'] : 0.0;

    echo json_encode(['success' => true, 'status' => 'success', 'sum' => round($sum, 2)]);
    exit;
} catch (Exception $e) {
    http_response_code(500);
    error_log("get_commission_for_period failed: " . $e->getMessage());
    echo json_encode(['success' => false, 'status' => 'error', 'message' => 'Failed to compute commission', 'error' => $e->getMessage()]);
    exit;
}
