<?php
// update_commission_day.php
error_reporting(E_ALL);
ini_set('display_errors', 0);
header('Content-Type: application/json; charset=utf-8');

include("../server/cors.php");
include("../server/connection.php");

ob_start();
try {
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        throw new Exception('Only POST allowed');
    }

    $day_id = isset($_POST['day_id']) ? intval($_POST['day_id']) : 0;
    $date   = isset($_POST['date']) ? trim($_POST['date']) : null;
    $amount = isset($_POST['amount']) ? trim($_POST['amount']) : null;

    if (!$day_id || !$date || $amount === null) {
        throw new Exception('Missing fields');
    }

    if (!is_numeric($amount) || (float)$amount < 0) {
        throw new Exception('Invalid amount');
    }

    if (strtotime($date) === false) {
        throw new Exception('Invalid date');
    }

    // find commission_id for the day
    $find = $conn->prepare("SELECT commission_id FROM commission_daily WHERE id = ? LIMIT 1");
    $find->bind_param('i', $day_id);
    $find->execute();
    $res = $find->get_result();
    if ($res->num_rows === 0) {
        throw new Exception('Day not found');
    }
    $commission_id = intval($res->fetch_assoc()['commission_id']);

    $conn->begin_transaction();

    // fetch basic salary from payroll via commission_per_employee -> payroll
    $salStmt = $conn->prepare(
        "SELECT COALESCE(p.basic_salary, 0) AS basic_salary
         FROM commission_per_employee c
         INNER JOIN payroll p ON p.employee_id = c.employee_id
         WHERE c.commission_id = ?
         LIMIT 1"
    );
    $salStmt->bind_param('i', $commission_id);
    $salStmt->execute();
    $salRes = $salStmt->get_result();
    if ($salRes->num_rows === 0) {
        throw new Exception('Payroll record not found');
    }
    $baseSalary = (float)$salRes->fetch_assoc()['basic_salary'];

    $amt = (float)$amount;
    $vs_basic = ($amt > $baseSalary) ? 'above' : 'below';

    // update the daily row + vs_basic
    $updDay = $conn->prepare(
        "UPDATE commission_daily
         SET `date` = ?, amount = ?, vs_basic = ?
         WHERE id = ?"
    );
    $updDay->bind_param('sdsi', $date, $amt, $vs_basic, $day_id);

    if (!$updDay->execute()) {
        throw new Exception($updDay->error);
    }

    // recompute total
    $sumStmt = $conn->prepare(
        "SELECT COALESCE(SUM(amount),0) AS total FROM commission_daily WHERE commission_id = ?"
    );
    $sumStmt->bind_param('i', $commission_id);
    $sumStmt->execute();
    $sum = (float)$sumStmt->get_result()->fetch_assoc()['total'];

    // update header totals
    $upd = $conn->prepare(
        "UPDATE commission_per_employee
         SET total = ?, commission = ?
         WHERE commission_id = ?"
    );
    $upd->bind_param('ddi', $sum, $sum, $commission_id);

    if (!$upd->execute()) {
        throw new Exception($upd->error);
    }

    $conn->commit();

    ob_clean();
    echo json_encode([
        'success' => true,
        'message' => 'Daily commission updated',
        'total'   => number_format($sum, 2, '.', '')
    ]);

} catch (Exception $e) {
    if (isset($conn)) {
        @$conn->rollback();
    }
    ob_clean();
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'message' => $e->getMessage()
    ]);
}

$conn->close();
