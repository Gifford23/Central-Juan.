<?php
// payroll/get_allowances_for_payrolls.php
include("../server/cors.php");
include('../server/connection.php');

header('Content-Type: application/json');

// Read input
$input = json_decode(file_get_contents('php://input'), true);
if (!$input) $input = $_POST;

$raw = $input['payroll_ids'] ?? ($input['ids'] ?? null);
if (!$raw) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'payroll_ids required']);
    exit;
}

// Normalize payroll ids to ints
$ids = [];
if (is_array($raw)) {
    foreach ($raw as $v) {
        $ids[] = intval($v);
    }
} else {
    $parts = array_filter(array_map('trim', explode(',', $raw)));
    foreach ($parts as $p) $ids[] = intval($p);
}
$ids = array_values(array_unique($ids));
if (count($ids) === 0) {
    echo json_encode(['success' => true, 'data' => []]);
    exit;
}

try {
    // 1) Fetch payroll meta (employee_id, dates, payroll_type, basic_salary)
    $in = implode(',', array_map('intval', $ids));
    $sql = "SELECT payroll_id, employee_id, date_from, date_until, payroll_type, basic_salary
            FROM payroll WHERE payroll_id IN ({$in})";
    $res = $conn->query($sql);
    $payrolls = [];
    while ($r = $res->fetch_assoc()) {
        $pid = intval($r['payroll_id']);
        $payrolls[$pid] = [
            'payroll_id' => $pid,
            'employee_id' => $r['employee_id'],
            'date_from' => $r['date_from'],
            'date_until' => $r['date_until'],
            'payroll_type' => $r['payroll_type'],
            'basic_salary' => isset($r['basic_salary']) ? floatval($r['basic_salary']) : null
        ];
    }
    $res->free();

    // 2) Try fetching allowance_journal rows for these payrolls
    $sql2 = "SELECT aj.journal_id, aj.payroll_id, aj.allowance_id, aj.employee_id, aj.period_from, aj.period_until, aj.applied_amount, aj.note,
                    ea.allowance_name, ea.amount AS configured_amount, ea.amount_type, ea.frequency
             FROM allowance_journal aj
             LEFT JOIN employee_allowance ea ON aj.allowance_id = ea.allowance_id
             WHERE aj.payroll_id IN ({$in})
             ORDER BY aj.payroll_id, aj.journal_id";
    $res2 = $conn->query($sql2);
    $grouped = [];
    if ($res2) {
        while ($row = $res2->fetch_assoc()) {
            $pid = intval($row['payroll_id']);
            if (!isset($grouped[$pid])) $grouped[$pid] = [];
            $grouped[$pid][] = [
                'journal_id' => intval($row['journal_id']),
                'payroll_id' => $pid,
                'allowance_id' => $row['allowance_id'] !== null ? intval($row['allowance_id']) : null,
                'employee_id' => $row['employee_id'],
                'allowance_name' => $row['allowance_name'],
                'applied_amount' => isset($row['applied_amount']) ? floatval($row['applied_amount']) : 0.0,
                'note' => $row['note'] ?? null,
                'source' => 'journal'
            ];
        }
        $res2->free();
    }

    // 3) For payrolls with no journal rows, compute allowances from employee_allowance
    foreach ($payrolls as $pid => $pay) {
        if (isset($grouped[$pid]) && count($grouped[$pid]) > 0) continue; // already have journal rows

        $emp = $conn->real_escape_string($pay['employee_id']);
        $date_from = $conn->real_escape_string($pay['date_from']);
        $date_until = $conn->real_escape_string($pay['date_until']);

        // find active allowances for the employee that overlap payroll date range
        $sqlA = "SELECT allowance_id, allowance_name, amount, amount_type, percent_of, frequency, prorate_if_partial, start_date, end_date
                 FROM employee_allowance
                 WHERE employee_id = '{$emp}'
                   AND active = 1
                   AND (start_date IS NULL OR start_date <= '{$date_until}')
                   AND (end_date IS NULL OR end_date >= '{$date_from}')
                 ORDER BY allowance_name";
        $resA = $conn->query($sqlA);
        $computed = [];
        if ($resA) {
            while ($a = $resA->fetch_assoc()) {
                $allowance_id = intval($a['allowance_id']);
                $allowance_name = $a['allowance_name'];
                $amount = floatval($a['amount']);
                $amount_type = $a['amount_type'];
                $frequency = $a['frequency']; // monthly / semi-monthly
                // Determine base for percent calculations
                $basic_salary = $pay['basic_salary'];
                if ($basic_salary === null || $basic_salary == 0) {
                    // attempt to fetch from employees table
                    $empq = $conn->prepare("SELECT base_salary FROM employees WHERE employee_id = ? LIMIT 1");
                    $empq->bind_param("s", $pay['employee_id']);
                    $empq->execute();
                    $resEmp = $empq->get_result();
                    if ($rowEmp = $resEmp->fetch_assoc()) {
                        $basic_salary = floatval($rowEmp['base_salary'] ?? 0);
                    }
                    $empq->close();
                }

                // compute applied amount
                $applied = 0.0;
                if ($amount_type === 'fixed') {
                    $applied = $amount;
                } else { // percent
                    $applied = ($basic_salary * ($amount / 100.0));
                }

                // apply frequency / payroll_type rules:
                // - if allowance frequency is 'monthly' but payroll is 'semi-monthly' -> half it
                $payroll_type = $pay['payroll_type'] ?? null;
                if ($frequency === 'monthly' && $payroll_type === 'semi-monthly') {
                    // prefer prorate_if_partial behavior? we will divide by 2
                    $applied = round($applied / 2.0, 2);
                } else {
                    // if frequency is 'semi-monthly' and payroll is semi-monthly -> applied as-is
                    // if frequency monthly and payroll monthly -> applied as-is
                }

                // round to 2 decimals
                $applied = round($applied, 2);

                $computed[] = [
                    'journal_id' => null,
                    'payroll_id' => $pid,
                    'allowance_id' => $allowance_id,
                    'employee_id' => $pay['employee_id'],
                    'allowance_name' => $allowance_name,
                    'applied_amount' => $applied,
                    'source' => 'computed'
                ];
            }
            $resA->free();
        }

        // attach computed (may be empty)
        $grouped[$pid] = $computed;
    }

    // Ensure all requested payroll ids exist in grouped (even as empty array)
    foreach ($ids as $reqId) {
        $reqId = intval($reqId);
        if (!isset($grouped[$reqId])) $grouped[$reqId] = [];
    }

    echo json_encode(['success' => true, 'data' => $grouped]);
    exit;

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Server error: ' . $e->getMessage()]);
    exit;
}
