<?php
// allowance/summary_for_payroll.php
include("../server/cors.php");
include('../server/connection.php');

header('Content-Type: application/json');

$payroll_id = isset($_GET['payroll_id']) ? intval($_GET['payroll_id']) : null;
if (!$payroll_id) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'payroll_id required']);
    exit;
}

try {
    // load payroll to get date range
    $stmt = $conn->prepare("SELECT payroll_id, date_from, date_until FROM payroll WHERE payroll_id = ? LIMIT 1");
    $stmt->bind_param("i", $payroll_id);
    $stmt->execute();
    $res = $stmt->get_result();
    if ($res->num_rows === 0) {
        echo json_encode(['success' => false, 'message' => 'Payroll not found']);
        exit;
    }
    $pay = $res->fetch_assoc();
    $date_from = $pay['date_from'];
    $date_until = $pay['date_until'];
    $stmt->close();

    // fetch allowances joined with employees for those allowances that overlap the payroll range
    // only active allowances
    $sql = "SELECT ea.allowance_id, ea.employee_id, ea.allowance_name, ea.amount, ea.amount_type, ea.percent_of, ea.frequency, ea.prorate_if_partial,
                   e.first_name, e.last_name, e.position_id, e.department_id
            FROM employee_allowance ea
            JOIN employees e ON e.employee_id = ea.employee_id
            WHERE ea.active = 1
              AND (ea.start_date IS NULL OR ea.start_date <= ?)
              AND (ea.end_date IS NULL OR ea.end_date >= ?)
            ORDER BY ea.employee_id, ea.allowance_name";
    $stmt = $conn->prepare($sql);
    $stmt->bind_param("ss", $date_until, $date_from);
    $stmt->execute();
    $res = $stmt->get_result();
    $rows = $res->fetch_all(MYSQLI_ASSOC);
    $stmt->close();

    // Organize by employee
    $map = []; // employee_id => employee object
    foreach ($rows as $r) {
        $empId = $r['employee_id'];
        if (!isset($map[$empId])) {
            $map[$empId] = [
                'employee_id' => $empId,
                'name' => trim(($r['first_name'] ?? '') . ' ' . ($r['last_name'] ?? '')),
                'position' => $r['position_id'] ?? null,
                'department_name' => $r['department_id'] ?? null,
                'allowances' => [],
                'is_all_excepted' => false
            ];
        }
        $map[$empId]['allowances'][] = [
            'allowance_id' => intval($r['allowance_id']),
            'allowance_name' => $r['allowance_name'],
            'amount' => floatval($r['amount']),
            'amount_type' => $r['amount_type'],
            'percent_of' => $r['percent_of'],
            'frequency' => $r['frequency'],
            'prorate_if_partial' => intval($r['prorate_if_partial']),
            'is_excepted' => false,
            'exception_id' => null
        ];
    }

    // If no employees/allowances found return empty array
    if (count($map) === 0) {
        echo json_encode(['success' => true, 'data' => []]);
        exit;
    }

    // Prepare list of employee_ids and allowance_ids to check exceptions efficiently
    $employee_ids = array_keys($map);
    $placeholders = implode(',', array_fill(0, count($employee_ids), '?'));
    // Build prepared types and values for employee ids as strings
    // Because mysqli doesn't support binding an array easily across in(), we'll build a safe query using real_escape_string for employee ids
    $escaped_emp_ids = array_map(function($v) use ($conn){ return "'".$conn->real_escape_string($v)."'"; }, $employee_ids);
    $emp_list_sql = implode(',', $escaped_emp_ids);

    // Fetch any exceptions for these employees for this payroll
    $sqlEx = "SELECT exception_id, employee_id, allowance_id FROM payroll_allowance_exceptions WHERE payroll_id = ? AND employee_id IN ({$emp_list_sql})";
    $stmt = $conn->prepare($sqlEx);
    $stmt->bind_param("i", $payroll_id);
    $stmt->execute();
    $resEx = $stmt->get_result();
    $exceptions = $resEx->fetch_all(MYSQLI_ASSOC);
    $stmt->close();

    // Build quick lookup: for employee-level (allowance_id null) and allowance-level
    $empLevel = []; // employee_id => exception_id
    $allowLevel = []; // employee_id => [allowance_id => exception_id]
    foreach ($exceptions as $ex) {
        $eid = $ex['employee_id'];
        $aid = $ex['allowance_id'];
        $exid = intval($ex['exception_id']);
        if ($aid === null) {
            $empLevel[$eid] = $exid;
        } else {
            if (!isset($allowLevel[$eid])) $allowLevel[$eid] = [];
            $allowLevel[$eid][intval($aid)] = $exid;
        }
    }

    // Annotate map with is_all_excepted and per-allowance is_excepted
    foreach ($map as $empId => &$empRow) {
        if (isset($empLevel[$empId])) {
            $empRow['is_all_excepted'] = true;
            // mark all allowances as excepted with the employee-level exception_id
            foreach ($empRow['allowances'] as &$a) {
                $a['is_excepted'] = true;
                $a['exception_id'] = $empLevel[$empId];
            }
            unset($a);
        } else {
            // check allowance-level exceptions
            foreach ($empRow['allowances'] as &$a) {
                $aid = intval($a['allowance_id']);
                if (isset($allowLevel[$empId]) && isset($allowLevel[$empId][$aid])) {
                    $a['is_excepted'] = true;
                    $a['exception_id'] = $allowLevel[$empId][$aid];
                } else {
                    $a['is_excepted'] = false;
                    $a['exception_id'] = null;
                }
            }
            unset($a);
        }
    }
    unset($empRow);

    // Return as array (not keyed)
    $out = array_values($map);
    echo json_encode(['success' => true, 'data' => $out]);
    exit;

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Server error: '.$e->getMessage()]);
    exit;
}
