<?php
header("Content-Type: application/json");

include("../server/cors.php");
include("../server/connection.php");

$payroll_id = $_POST['payroll_id'] ?? null;
$commission_based = $_POST['commission_based'] ?? null;

if (!$payroll_id || !$commission_based) {
    echo json_encode(["success" => false, "message" => "Missing data"]);
    exit;
}

$conn->begin_transaction();

/* Update payroll */
$update = $conn->prepare("
    UPDATE payroll
    SET commission_based = ?
    WHERE payroll_id = ?
");
$update->bind_param("si", $commission_based, $payroll_id);
$update->execute();

/* Fetch payroll row */
$payrollRes = $conn->query("
    SELECT employee_id, name, date_from, date_until, basic_salary, total_salary
    FROM payroll
    WHERE payroll_id = $payroll_id
");

if (!$payrollRes || $payrollRes->num_rows === 0) {
    $conn->rollback();
    echo json_encode(["success" => false, "message" => "Payroll not found"]);
    exit;
}

$payroll = $payrollRes->fetch_assoc();

/* IF YES → INSERT commission */
if ($commission_based === "yes") {
    $check = $conn->query("
        SELECT 1 FROM commission_per_employee
        WHERE employee_id = '{$payroll['employee_id']}'
          AND date_from = '{$payroll['date_from']}'
    ");

    if ($check->num_rows === 0) {
        $insert = $conn->prepare("
            INSERT INTO commission_per_employee
            (employee_id, name, date_from, date_until, basic_salary, commission, total, salary)
            VALUES (?, ?, ?, ?, ?, 0, 0, ?)
        ");
        $insert->bind_param(
            "ssssdd",
            $payroll['employee_id'],
            $payroll['name'],
            $payroll['date_from'],
            $payroll['date_until'],
            $payroll['basic_salary'],
            $payroll['total_salary']
        );
        $insert->execute();
    }
}

/* IF NO → DELETE commission */
if ($commission_based === "no") {
    $conn->query("
        DELETE FROM commission_per_employee
        WHERE employee_id = '{$payroll['employee_id']}'
          AND date_from = '{$payroll['date_from']}'
    ");
}

$conn->commit();

echo json_encode(["success" => true]);
$conn->close();
