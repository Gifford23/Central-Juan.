<?php
// add_commission_day.php
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

    $commission_id = intval($_POST['commission_id'] ?? 0);
    $date   = trim($_POST['date'] ?? '');
    $amount = trim($_POST['amount'] ?? '');

    if (!$commission_id || !$date || $amount === '') {
        throw new Exception('Missing fields');
    }

    if (!is_numeric($amount) || (float)$amount < 0) {
        throw new Exception('Invalid amount');
    }

    if (strtotime($date) === false) {
        throw new Exception('Invalid date');
    }

    $conn->begin_transaction();

    /**
     * ✅ GET BASIC SALARY FROM PAYROLL
     * payroll.basic_salary EXISTS in your schema
     */
    $salStmt = $conn->prepare(
        "SELECT p.basic_salary
         FROM commission_per_employee c
         INNER JOIN payroll p ON p.employee_id = c.employee_id
         WHERE c.commission_id = ?
         LIMIT 1"
    );
    $salStmt->bind_param("i", $commission_id);
    $salStmt->execute();
    $res = $salStmt->get_result();

    if ($res->num_rows === 0) {
        throw new Exception('Payroll record not found');
    }

    $basicSalary = (float)$res->fetch_assoc()['basic_salary'];
    $amt = (float)$amount;

    /**
     * ✅ ABOVE / BELOW BASIC LOGIC
     */
    $vs_basic = ($amt > $basicSalary) ? 'above' : 'below';

    /**
     * ✅ INSERT DAILY COMMISSION
     */
    $ins = $conn->prepare(
        "INSERT INTO commission_daily (commission_id, `date`, amount, vs_basic)
         VALUES (?, ?, ?, ?)"
    );
    $ins->bind_param("isds", $commission_id, $date, $amt, $vs_basic);

    if (!$ins->execute()) {
        throw new Exception($ins->error);
    }

    /**
     * ✅ RECOMPUTE TOTAL COMMISSION
     */
    $sumStmt = $conn->prepare(
        "SELECT COALESCE(SUM(amount),0) AS total
         FROM commission_daily
         WHERE commission_id = ?"
    );
    $sumStmt->bind_param("i", $commission_id);
    $sumStmt->execute();
    $total = (float)$sumStmt->get_result()->fetch_assoc()['total'];

    /**
     * ✅ UPDATE COMMISSION HEADER
     */
    $upd = $conn->prepare(
        "UPDATE commission_per_employee
         SET total = ?, commission = ?
         WHERE commission_id = ?"
    );
    $upd->bind_param("ddi", $total, $total, $commission_id);
    $upd->execute();

    $conn->commit();

    ob_clean();
    echo json_encode([
        "success" => true,
        "message" => "Daily commission added",
        "total" => number_format($total, 2, ".", "")
    ]);

} catch (Exception $e) {
    if (isset($conn)) @$conn->rollback();
    ob_clean();
    http_response_code(400);
    echo json_encode([
        "success" => false,
        "message" => $e->getMessage()
    ]);
}

$conn->close();
