<?php
// payroll/reapply_allowances.php
// Self-contained: recompute allowances for a payroll and insert allowance_journal rows
// Uses your includes style
include("../server/cors.php");
include('../server/connection.php');

header('Content-Type: application/json');

$input = json_decode(file_get_contents('php://input'), true);
if (!$input) $input = $_POST;
$payroll_id = isset($input['payroll_id']) ? intval($input['payroll_id']) : null;

if (!$payroll_id) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'payroll_id required']);
    exit;
}

try {
    // Load payroll row
    $stmt = $conn->prepare("SELECT payroll_id, employee_id, date_from, date_until, payroll_type, basic_salary, total_days FROM payroll WHERE payroll_id = ? LIMIT 1");
    $stmt->bind_param('i', $payroll_id);
    $stmt->execute();
    $res = $stmt->get_result();
    if ($res->num_rows === 0) {
        http_response_code(404);
        echo json_encode(['success' => false, 'message' => 'Payroll not found']);
        exit;
    }
    $pay = $res->fetch_assoc();
    $stmt->close();

    $employee_id = $pay['employee_id'];
    $date_from = $pay['date_from'];
    $date_until = $pay['date_until'];
    $payroll_type = $pay['payroll_type']; // 'monthly' or 'semi-monthly'
    $basic_salary = floatval($pay['basic_salary'] ?? 0);
    $days_credited = floatval($pay['total_days'] ?? 0);

    // compute total_days_in_range (count days excluding Sundays) for proration denominator
    $start = new DateTime($date_from);
    $end = new DateTime($date_until);
    $end->setTime(0,0,0);
    $interval = new DateInterval('P1D');
    $period = new DatePeriod($start, $interval, $end->add($interval)); // include end
    $total_days_in_range = 0;
    foreach ($period as $dt) {
        // w: 0 (Sunday) - 6 (Saturday)
        if ($dt->format('w') == 0) continue; // skip Sunday
        $total_days_in_range++;
    }

    // Start transaction
    $conn->begin_transaction();

    // Delete existing allowance_journal records for this payroll
    $stmtDel = $conn->prepare("DELETE FROM allowance_journal WHERE payroll_id = ?");
    $stmtDel->bind_param('i', $payroll_id);
    if (!$stmtDel->execute()) {
        throw new Exception("Failed to delete existing allowance_journal: " . $stmtDel->error);
    }
    $stmtDel->close();

    // Fetch active allowances overlapping period for the employee
    $sql = "SELECT allowance_id, amount, amount_type, percent_of, frequency, prorate_if_partial
            FROM employee_allowance
            WHERE employee_id = ?
              AND active = 1
              AND (start_date IS NULL OR start_date <= ?)
              AND (end_date IS NULL OR end_date >= ?)";
    $stmt = $conn->prepare($sql);
    $stmt->bind_param('sss', $employee_id, $date_until, $date_from);
    $stmt->execute();
    $res = $stmt->get_result();
    $allowances = $res->fetch_all(MYSQLI_ASSOC);
    $stmt->close();

    // Fetch exceptions for this payroll + employee: returns list of exceptions
    $stmtEx = $conn->prepare("SELECT exception_id, allowance_id FROM payroll_allowance_exceptions WHERE payroll_id = ? AND employee_id = ?");
    $stmtEx->bind_param('is', $payroll_id, $employee_id);
    $stmtEx->execute();
    $resEx = $stmtEx->get_result();
    $exceptions = $resEx->fetch_all(MYSQLI_ASSOC);
    $stmtEx->close();

    // Build quick lookup for exceptions:
    // - if an entry has allowance_id = NULL => employee-level exception (skip all)
    // - else add allowance-level exception
    $employee_except_all = false;
    $allowance_except_map = []; // allowance_id => exception_id
    foreach ($exceptions as $ex) {
        if ($ex['allowance_id'] === null) {
            $employee_except_all = true;
        } else {
            $allowance_except_map[intval($ex['allowance_id'])] = intval($ex['exception_id']);
        }
    }

    $total_applied = 0.0;

    // If employee-level exception exists, skip applying any allowances
    if (!$employee_except_all && count($allowances) > 0) {
        // Prepare insert statement (we'll use safe escaped query to avoid bind type juggling)
        foreach ($allowances as $a) {
            $allowance_id = intval($a['allowance_id']);
            // Skip if exception exists for this allowance
            if (isset($allowance_except_map[$allowance_id])) {
                continue;
            }

            $amount = floatval($a['amount']);
            $amount_type = $a['amount_type'];
            $percent_of = $a['percent_of'] ?? 'basic_salary';
            $frequency = $a['frequency'];
            $prorate_if_partial = intval($a['prorate_if_partial']);

            // compute base applied amount
            if ($amount_type === 'percent') {
                // currently supports percent_of = basic_salary
                $appl = ($basic_salary * $amount) / 100.0;
            } else {
                $appl = $amount;
            }

            // Frequency rule
            if ($frequency === 'monthly') {
                if ($payroll_type === 'monthly') $applied_amount = $appl;
                else $applied_amount = round($appl / 2.0, 2);
            } else { // semi-monthly allowance
                if ($payroll_type === 'semi-monthly') $applied_amount = $appl;
                else $applied_amount = round($appl * 2.0, 2);
            }

            // Proration
            if ($prorate_if_partial && $total_days_in_range > 0) {
                $factor = ($days_credited > 0 ? ($days_credited / $total_days_in_range) : 0);
                $applied_amount = round($applied_amount * $factor, 2);
            } else {
                $applied_amount = round($applied_amount, 2);
            }

            if ($applied_amount <= 0) continue;

            // Insert allowance_journal row
            $emp_e = $conn->real_escape_string($employee_id);
            $from_e = $conn->real_escape_string($date_from);
            $until_e = $conn->real_escape_string($date_until);
            $note_e = $conn->real_escape_string("Auto-applied via reapply_allowances");

            $sqlIns = "INSERT INTO allowance_journal (payroll_id, allowance_id, employee_id, period_from, period_until, applied_amount, note)
                       VALUES ({$payroll_id}, {$allowance_id}, '{$emp_e}', '{$from_e}', '{$until_e}', {$applied_amount}, '{$note_e}')";
            if (!$conn->query($sqlIns)) {
                throw new Exception("Failed inserting allowance_journal: " . $conn->error);
            }

            $total_applied += $applied_amount;
        }
    }

    // update payroll.total_allowances
    $total_applied = round($total_applied, 2);
    $stmtUpd = $conn->prepare("UPDATE payroll SET total_allowances = ? WHERE payroll_id = ?");
    $stmtUpd->bind_param('di', $total_applied, $payroll_id);
    if (!$stmtUpd->execute()) {
        throw new Exception("Failed updating payroll.total_allowances: " . $stmtUpd->error);
    }
    $stmtUpd->close();

    $conn->commit();

    echo json_encode(['success' => true, 'message' => 'Allowances re-applied', 'total_allowances' => $total_applied]);
    exit;
} catch (Exception $e) {
    $conn->rollback();
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Error reapplying allowances: ' . $e->getMessage()]);
    exit;
}
