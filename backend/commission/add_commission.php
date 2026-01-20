<?php
// add_commission.php
error_reporting(E_ALL);
ini_set('display_errors', 0);
header('Content-Type: application/json; charset=utf-8');

include("../server/cors.php");
include("../server/connection.php");

try {
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') throw new Exception('Only POST allowed');

    // Required fields
    $employee_id  = $_POST['employee_id']  ?? null;
    $date_from    = $_POST['date_from']    ?? null;
    $date_until   = $_POST['date_until']   ?? null;
    $basic_salary = isset($_POST['basic_salary']) ? $_POST['basic_salary'] : null;
    $commission   = isset($_POST['commission']) ? $_POST['commission'] : 0;

    if (!$employee_id || !$date_from || !$date_until || $basic_salary === null) {
        throw new Exception('Missing required fields: employee_id, date_from, date_until, basic_salary');
    }

    if (!is_numeric($basic_salary) || !is_numeric($commission)) {
        throw new Exception('basic_salary and commission must be numeric');
    }

    // Determine employee name if not provided
    $name = $_POST['name'] ?? null;
    if (!$name) {
        $stmt = $conn->prepare("SELECT CONCAT(first_name,' ',IFNULL(middle_name,''),' ',IFNULL(last_name,'')) AS full_name FROM employees WHERE employee_id = ? LIMIT 1");
        $stmt->bind_param('s', $employee_id);
        $stmt->execute();
        $res = $stmt->get_result();
        if ($res && $res->num_rows > 0) {
            $name = trim($res->fetch_assoc()['full_name']);
        } else {
            $name = $employee_id;
        }
    }

    // Compute totals
    $basic_salary_f = (float)$basic_salary;
    $commission_f   = (float)$commission;
    $total = $commission_f;                 // define business logic: total = commission
    $salary = $basic_salary_f + $total;     // salary = basic + total

    $stmt = $conn->prepare("
        INSERT INTO commission_per_employee
        (employee_id, name, date_from, date_until, basic_salary, commission, total, salary)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    ");
    if (!$stmt) throw new Exception($conn->error);

    $stmt->bind_param('ssssdddd',
        $employee_id,
        $name,
        $date_from,
        $date_until,
        $basic_salary_f,
        $commission_f,
        $total,
        $salary
    );

    if (!$stmt->execute()) throw new Exception($stmt->error);

    $inserted_id = $conn->insert_id; // works if commission_id is AUTO_INCREMENT

    echo json_encode(['success' => true, 'commission_id' => $inserted_id]);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
}
$conn->close();
