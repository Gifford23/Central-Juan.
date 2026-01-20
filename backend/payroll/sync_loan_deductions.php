<?php
// sync_loan_deductions.php

include '../server/connection.php';
include("../server/cors.php");

// header("Access-Control-Allow-Origin: *");
// header("Access-Control-Allow-Methods: POST, OPTIONS");
// header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");
// header("Content-Type: application/json; charset=UTF-8");

$data = json_decode(file_get_contents("php://input"), true);
$employee_id = $data['employee_id'] ?? '';
$date_from   = $data['date_from']   ?? '';
$date_until  = $data['date_until']  ?? '';

if (!$employee_id || !$date_from || !$date_until) {
    echo json_encode(['success' => false, 'error' => 'Missing required parameters.']);
    exit;
}

// Step 0: Confirm payroll exists
$payrollCheck = $conn->prepare("
    SELECT payroll_id 
    FROM payroll 
    WHERE employee_id = ? AND date_from = ? AND date_until = ?
    LIMIT 1
");
$payrollCheck->bind_param("sss", $employee_id, $date_from, $date_until);
$payrollCheck->execute();
$payrollResult = $payrollCheck->get_result();

if ($payrollResult->num_rows === 0) {
    echo json_encode(['success' => false, 'error' => 'No matching payroll record found.']);
    exit;
}
$payroll = $payrollResult->fetch_assoc();
$payroll_id = $payroll['payroll_id'];

// Step 1: Sum journal entries
$sql = "
    SELECT COALESCE(SUM(amount), 0) AS total_deduction
    FROM loan_journal_entry
    WHERE employee_id = ?
      AND entry_type = 'credit'
      AND DATE(entry_date) BETWEEN ? AND ?
";
$stmt = $conn->prepare($sql);
$stmt->bind_param("sss", $employee_id, $date_from, $date_until);
$stmt->execute();
$result = $stmt->get_result();
$row = $result->fetch_assoc();
$total_deduction = (float)($row['total_deduction'] ?? 0);

// Step 2: Update payroll.loan_deduction_applied
$update = "
    UPDATE payroll
    SET loan_deduction_applied = ?
    WHERE payroll_id = ?
";
$updateStmt = $conn->prepare($update);
$updateStmt->bind_param("di", $total_deduction, $payroll_id);

if ($updateStmt->execute()) {
    echo json_encode([
        'success' => true,
        'employee_id' => $employee_id,
        'payroll_id' => $payroll_id,
        'loan_deduction_applied' => number_format($total_deduction, 2),
        'message' => 'Loan deduction applied successfully.'
    ]);
} else {
    echo json_encode(['success' => false, 'error' => $updateStmt->error]);
}
?>
