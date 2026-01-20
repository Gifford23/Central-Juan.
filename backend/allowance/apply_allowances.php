<?php
include("../server/cors.php");
include('../server/connection.php');

header('Content-Type: application/json');

$input = json_decode(file_get_contents('php://input'), true);
if (!$input) $input = $_POST;
$payroll_id = $input['payroll_id'] ?? null;

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
    $end->setTime(0,0);
    $interval = new DateInterval('P1D');
    $period = new DatePeriod($start, $interval, $end->add($interval)); // include end
    $total_days_in_range = 0;
    foreach ($period as $dt) {
        // DAYOFWEEK: Sunday = 0 in PHP? we simply check day name
        if ($dt->format('w') == 0) { // 0 = Sunday
            continue;
        }
        $total_days_in_range++;
    }

    // begin transaction
    $conn->begin_transaction();

    // delete existing allowance_journal for this payroll (we'll re-insert)
    $stmt = $conn->prepare("DELETE FROM allowance_journal WHERE payroll_id = ?");
    $stmt->bind_param('i', $payroll_id);
    $stmt->execute();
    $stmt->close();

    // fetch active allowances for employee where start/end overlap payroll period
    $sql = "SELECT allowance_id, amount, amount_type, percent_of, frequency, prorate_if_partial, start_date, end_date
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

    $total_applied = 0.0;
    // helper prepared statements
    $insert_stmt = $conn->prepare("INSERT INTO allowance_journal (payroll_id, allowance_id, employee_id, period_from, period_until, applied_amount, note) VALUES (?, ?, ?, ?, ?, ?, ?)");
    $check_exc_stmt = $conn->prepare("SELECT 1 FROM payroll_allowance_exceptions WHERE payroll_id = ? AND employee_id = ? AND (allowance_id IS NULL OR allowance_id = ?) LIMIT 1");

    foreach ($allowances as $a) {
        $allowance_id = intval($a['allowance_id']);
        $amount = floatval($a['amount']);
        $amount_type = $a['amount_type'];
        $percent_of = $a['percent_of'] ?? 'basic_salary';
        $frequency = $a['frequency'];
        $prorate_if_partial = intval($a['prorate_if_partial']);

        // check exception
        $check_exc_stmt->bind_param('isi', $payroll_id, $employee_id, $allowance_id);
        $check_exc_stmt->execute();
        $resEx = $check_exc_stmt->get_result();
        $isExcepted = ($resEx->num_rows > 0);
        $resEx->free_result();
        if ($isExcepted) {
            continue; // skip this allowance
        }

        // compute base amount
        $appl = 0.0;
        if ($amount_type === 'percent') {
            // percent_of: default basic_salary
            if ($percent_of === 'basic_salary' || !$percent_of) {
                $appl = ($basic_salary * $amount) / 100.0;
            } else {
                // fallback: percent of basic_salary
                $appl = ($basic_salary * $amount) / 100.0;
            }
        } else {
            // fixed amount stored in amount
            $appl = $amount;
        }

        // frequency rules:
        // monthly allowances: full on monthly payroll, half on semi-monthly
        // semi-monthly allowances: full on semi-monthly payroll, double on monthly payroll (cover both halves)
        if ($frequency === 'monthly') {
            if ($payroll_type === 'monthly') {
                // full
                $applied_amount = $appl;
            } else { // semi-monthly
                $applied_amount = round($appl / 2.0, 2);
            }
        } else { // semi-monthly allowance
            if ($payroll_type === 'semi-monthly') {
                $applied_amount = $appl;
            } else { // monthly payroll -> sum of both halves
                $applied_amount = round($appl * 2.0, 2);
            }
        }

        // proration
        if ($prorate_if_partial && $total_days_in_range > 0) {
            // proration factor = days_credited / total_days_in_range
            $factor = ($days_credited > 0 ? ($days_credited / $total_days_in_range) : 0);
            $applied_amount = round($applied_amount * $factor, 2);
        } else {
            $applied_amount = round($applied_amount, 2);
        }

        if ($applied_amount <= 0) continue;

        $note = "Auto-applied via apply_allowances";
        $insert_stmt->bind_param('iissdss', $payroll_id, $allowance_id, $employee_id, $date_from, $date_until, $applied_amount, $note);
        // Types: i (payroll_id), i (allowance_id), s (employee_id), s (period_from), s(period_until), d (applied_amount), s(note)
        // but bind_param string must match; we'll use 'iissd s' -> 'iisdss' adjust:
        // To avoid binding confusion, we will format insert with real_escape_string and then execute via query
        $pfl = $conn->real_escape_string($date_from);
        $ptl = $conn->real_escape_string($date_until);
        $emp_e = $conn->real_escape_string($employee_id);
        $note_e = $conn->real_escape_string($note);
        $sqlIns = "INSERT INTO allowance_journal (payroll_id, allowance_id, employee_id, period_from, period_until, applied_amount, note) 
                   VALUES ({$payroll_id}, {$allowance_id}, '{$emp_e}', '{$pfl}', '{$ptl}', {$applied_amount}, '{$note_e}')";
        if (!$conn->query($sqlIns)) {
            throw new Exception("Failed inserting allowance_journal: " . $conn->error);
        }

        $total_applied += $applied_amount;
    }

    // update payroll.total_allowances
    $total_applied = round($total_applied, 2);
    $stmt = $conn->prepare("UPDATE payroll SET total_allowances = ? WHERE payroll_id = ?");
    $stmt->bind_param('di', $total_applied, $payroll_id);
    $stmt->execute();
    $stmt->close();

    $conn->commit();

    echo json_encode(['success' => true, 'message' => 'Allowances applied', 'total_allowances' => $total_applied]);
    exit;
} catch (Exception $e) {
    $conn->rollback();
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Error applying allowances: ' . $e->getMessage()]);
    exit;
}
