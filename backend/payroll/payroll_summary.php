<?php
// payroll_summary.php
// - Returns payroll rows for a cutoff, an aggregated summary, and a default journal template.
// - Paste into backend/payroll/payroll_summary.php (adjust includes).
// - Call: GET payroll_summary.php?date_from=YYYY-MM-DD&date_until=YYYY-MM-DD[&employee_id=ID]
//
// IMPORTANT: adapt ACCOUNT CODES, employer contribution rates, and any naming to your system.

include("../server/cors.php");
include('../server/connection.php');

// Helper: JSON error and exit
function json_err($msg) {
    echo json_encode(['success'=>false,'message'=>$msg]);
    exit;
}

// Input
$date_from = isset($_GET['date_from']) ? $_GET['date_from'] : null;
$date_until = isset($_GET['date_until']) ? $_GET['date_until'] : null;
$employee_id_filter = isset($_GET['employee_id']) && $_GET['employee_id'] !== '' ? $_GET['employee_id'] : null;

// Validate dates (basic)
if (!$date_from || !$date_until) {
    // We could allow empty and return latest rows, but safer to require cutoff
    json_err("date_from and date_until are required (format YYYY-MM-DD).");
}

// ------------- Build main query (explicit columns) -------------
$sql = "
SELECT
  p.payroll_id,
  p.employee_id,
  p.name,
  p.date_from,
  p.date_until,
  p.payroll_type,
  COALESCE(p.total_salary, 0) AS total_salary,
  COALESCE(p.total_basic_salary, 0) AS total_basic_salary,
  COALESCE(p.total_deductions, 0) AS total_deductions,
  p.department_id,
  p.position_id,
  pos.position_name,
  dept.department_name,
  e.employee_type,
  e.status,
  ph.is_override_enabled AS philhealth_override_enabled,
  s.is_override_enabled AS sss_override_enabled,
  pg.is_override_enabled AS pagibig_override_enabled,
  CASE WHEN ph.is_override_enabled = 1 AND ph.override_employee_share IS NOT NULL
    THEN ph.override_employee_share ELSE ph.employee_share END AS philhealth_employee_share,
  CASE WHEN s.is_override_enabled = 1 AND s.override_employee_share IS NOT NULL
    THEN s.override_employee_share ELSE s.employee_share END AS sss_employee_share,
  CASE WHEN pg.is_override_enabled = 1 AND pg.override_employee_share IS NOT NULL
    THEN pg.override_employee_share ELSE pg.employee_share END AS pagibig_employee_share,
  COALESCE(SUM(a.overtime_request), 0.00) AS total_overtime_request
FROM payroll p
LEFT JOIN employees e ON p.employee_id = e.employee_id
LEFT JOIN philhealth_contribution ph ON p.employee_id = ph.employee_id
LEFT JOIN sss_contribution s ON p.employee_id = s.employee_id
LEFT JOIN pagibig_contribution pg ON p.employee_id = pg.employee_id
LEFT JOIN positions pos ON p.position_id = pos.position_id
LEFT JOIN departments dept ON pos.department_id = dept.department_id
LEFT JOIN attendance a
  ON a.employee_id = p.employee_id
  AND a.attendance_date BETWEEN p.date_from AND p.date_until
WHERE p.date_from = ?
  AND p.date_until = ?
";

// optional employee filter appended safely using prepared param
$params = [];
$types = "ss";
$params[] = $date_from;
$params[] = $date_until;

if ($employee_id_filter) {
    $sql .= " AND p.employee_id = ? ";
    $types .= "s";
    $params[] = $employee_id_filter;
}

// group by payroll row
$sql .= " GROUP BY p.payroll_id, p.employee_id, p.date_from, p.date_until, p.position_id, p.department_id ";

$stmt = $conn->prepare($sql);
if ($stmt === false) json_err("Prepare failed: " . $conn->error);

// bind params (safe)
$bind_names[] = $types;
for ($i=0; $i<count($params); $i++) {
    $bind_name = "bind" . $i;
    $$bind_name = $params[$i];
    $bind_names[] = &$$bind_name;
}
call_user_func_array([$stmt, 'bind_param'], $bind_names);

$stmt->execute();
$res = $stmt->get_result();

$rows = [];
$employeeIds = [];
while ($r = $res->fetch_assoc()) {
    $rows[] = $r;
    $employeeIds[] = $r['employee_id'];
}
$stmt->close();

if (count($rows) === 0) {
    echo json_encode(['success'=>true,'data'=>[], 'summary'=>['total_gross'=>0,'total_employee_deductions'=>0,'total_loan_actual'=>0,'total_net_pay'=>0],'journal'=>[]]);
    $conn->close();
    exit;
}

// ---------------- Batch fetch attendance (safe IN using escaped values) ----------------
$attendance_map = [];
if (count($employeeIds) > 0) {
    $escaped = array_map(function($v) use ($conn){ return "'" . $conn->real_escape_string($v) . "'"; }, $employeeIds);
    $in_list = implode(',', $escaped);

    $sql_att = "SELECT employee_id, attendance_date, time_in_morning, time_out_morning, time_in_afternoon, time_out_afternoon, days_credited
                FROM attendance
                WHERE attendance_date BETWEEN ? AND ?
                AND employee_id IN ($in_list)
                ORDER BY employee_id, attendance_date ASC";
    $att_stmt = $conn->prepare($sql_att);
    if ($att_stmt) {
        $att_stmt->bind_param('ss', $date_from, $date_until);
        $att_stmt->execute();
        $att_res = $att_stmt->get_result();
        while ($a = $att_res->fetch_assoc()) {
            $eid = $a['employee_id'];
            if (!isset($attendance_map[$eid])) $attendance_map[$eid] = [];
            $attendance_map[$eid][] = $a;
        }
        $att_stmt->close();
    }
}

// ---------------- Batch fetch approved leaves for employees in cutoff ----------------
$leaves_map = [];
if (count($employeeIds) > 0) {
    $escaped = array_map(function($v) use ($conn){ return "'" . $conn->real_escape_string($v) . "'"; }, $employeeIds);
    $in_list = implode(',', $escaped);

    $sql_leave = "
        SELECT el.leave_id, el.employee_id, el.leave_type_id, el.date_from, el.date_until, el.total_days, lt.leave_name, lt.is_paid, lb.leave_limit, lb.leave_used, lb.leave_balance
        FROM employee_leaves el
        INNER JOIN leave_types lt ON el.leave_type_id = lt.leave_type_id
        INNER JOIN employee_leave_balances lb ON el.employee_id = lb.employee_id AND el.leave_type_id = lb.leave_type_id
        WHERE el.status = 'approved'
        AND (
            (el.date_from BETWEEN ? AND ?)
            OR (el.date_until BETWEEN ? AND ?)
            OR (? BETWEEN el.date_from AND el.date_until)
            OR (? BETWEEN el.date_from AND el.date_until)
        )
        AND el.employee_id IN ($in_list)
    ";
    $leave_stmt = $conn->prepare($sql_leave);
    if ($leave_stmt) {
        $leave_stmt->bind_param('ssssss', $date_from, $date_until, $date_from, $date_until, $date_from, $date_until);
        $leave_stmt->execute();
        $leave_res = $leave_stmt->get_result();
        while ($lv = $leave_res->fetch_assoc()) {
            $eid = $lv['employee_id'];
            if (!isset($leaves_map[$eid])) $leaves_map[$eid] = [];
            $leaves_map[$eid][] = $lv;
        }
        $leave_stmt->close();
    }
}

// ---------------- Batch fetch loans with positive balance ----------------
$loans_map = [];
if (count($employeeIds) > 0) {
    $escaped = array_map(function($v) use ($conn){ return "'" . $conn->real_escape_string($v) . "'"; }, $employeeIds);
    $in_list = implode(',', $escaped);

    $sql_loans = "SELECT loan_id, employee_id, balance, deduction_schedule, payable_per_term, loan_amount, loan_type, description, loan_reference_no, terms
                  FROM loans WHERE employee_id IN ($in_list) AND balance > 0";
    $loan_stmt = $conn->prepare($sql_loans);
    if ($loan_stmt) {
        $loan_stmt->execute();
        $loan_res = $loan_stmt->get_result();
        while ($ln = $loan_res->fetch_assoc()) {
            $eid = $ln['employee_id'];
            if (!isset($loans_map[$eid])) $loans_map[$eid] = [];
            $loans_map[$eid][] = $ln;
        }
        $loan_stmt->close();
    }
}

// ---------------- Helper: fetch loan journal actuals (with +7 days grace) ----------------
function fetch_loan_journal_actual($conn, $loan_id, $employee_id, $date_from, $date_until) {
    $journal_entries = [];
    $actual_deduction = 0.00;

    $journal_sql = "SELECT journal_id, amount, entry_type, entry_date FROM loan_journal_entry
                    WHERE loan_id = ? AND employee_id = ? AND entry_type = 'credit' AND DATE(entry_date) BETWEEN ? AND ? ORDER BY entry_date ASC";
    $stmt = $conn->prepare($journal_sql);
    if ($stmt) {
        $stmt->bind_param('isss', $loan_id, $employee_id, $date_from, $date_until);
        $stmt->execute();
        $res = $stmt->get_result();
        while ($j = $res->fetch_assoc()) {
            $amt = (float)$j['amount'];
            $actual_deduction += $amt;
            $journal_entries[] = $j;
        }
        $stmt->close();
    }

    if (count($journal_entries) === 0) {
        $extended_until = date('Y-m-d', strtotime($date_until . ' +7 days'));
        $stmt2 = $conn->prepare($journal_sql);
        if ($stmt2) {
            $stmt2->bind_param('isss', $loan_id, $employee_id, $date_from, $extended_until);
            $stmt2->execute();
            $res2 = $stmt2->get_result();
            while ($j2 = $res2->fetch_assoc()) {
                $amt2 = (float)$j2['amount'];
                $actual_deduction += $amt2;
                $journal_entries[] = $j2;
            }
            $stmt2->close();
        }
    }

    if ($actual_deduction <= 0 && count($journal_entries) === 0) {
        return ['actual'=>null,'journal_entries'=>[]];
    }
    return ['actual'=>$actual_deduction,'journal_entries'=>$journal_entries];
}

// ---------------- Build final payload rows and compute totals ----------------
$payrollData = [];
$summary = ['total_gross'=>0.0,'total_employee_deductions'=>0.0,'total_loan_actual'=>0.0,'total_net_pay'=>0.0,'total_employer_contrib'=>0.0];

foreach ($rows as $row) {
    $eid = $row['employee_id'];
    $out = $row;

    // attach attendance
    $out['attendance_records'] = isset($attendance_map[$eid]) ? $attendance_map[$eid] : [];

    // leaves: compute usable days overlap w/cutoff, separate paid/unpaid
    $out['leaves'] = [];
    $out['total_paid_leaves'] = 0.0;
    $out['total_unpaid_leaves'] = 0.0;
    if (isset($leaves_map[$eid])) {
        foreach ($leaves_map[$eid] as $lv) {
            $leave_start = max(strtotime($lv['date_from']), strtotime($row['date_from']));
            $leave_end = min(strtotime($lv['date_until']), strtotime($row['date_until']));
            $overlap_days = ($leave_end >= $leave_start) ? ((($leave_end - $leave_start)/86400) + 1) : 0;
            $usable_days = min($overlap_days, (float)$lv['leave_balance']);
            if ((int)$lv['is_paid'] === 1) $out['total_paid_leaves'] += $usable_days;
            else $out['total_unpaid_leaves'] += $usable_days;
            $out['leaves'][] = array_merge($lv, ['leave_days_cutoff'=> $usable_days]);
        }
    }

    // loans: scheduled and actual (actual comes from loan_journal_entry, nullable)
    $out['loans'] = [];
    $loan_scheduled_total = 0.0;
    $loan_actual_total = 0.0;
    if (isset($loans_map[$eid])) {
        foreach ($loans_map[$eid] as $ln) {
            $payable_per_term = (float)$ln['payable_per_term'];
            $loan_scheduled_total += $payable_per_term;
            $fetch = fetch_loan_journal_actual($conn, (int)$ln['loan_id'], $eid, $row['date_from'], $row['date_until']);
            $actual = $fetch['actual'];
            $loan_actual_total += is_null($actual) ? 0.0 : (float)$actual;
            $out['loans'][] = [
                'loan_id' => $ln['loan_id'],
                'loan_amount' => (float)$ln['loan_amount'],
                'balance' => (float)$ln['balance'],
                'payable_per_term' => $payable_per_term,
                'deduction_schedule' => $ln['deduction_schedule'],
                'deduction_actual' => is_null($actual) ? null : number_format((float)$actual, 2, '.', ''),
                'journal_entries' => $fetch['journal_entries'],
                'loan_type' => $ln['loan_type'],
                'description' => $ln['description'],
                'loan_reference_no' => $ln['loan_reference_no'],
                'terms' => $ln['terms']
            ];
        }
    }

    $out['loan_deduction'] = number_format($loan_scheduled_total, 2, '.', '');
    $out['loan_deduction_actual'] = $loan_actual_total > 0 ? number_format($loan_actual_total, 2, '.', '') : '';

    // If non-regular, zero statutory shares
    $nonRegularTypes = ['ojt','project-based'];
    if (in_array(strtolower($out['employee_type']), $nonRegularTypes)) {
        $out['philhealth_employee_share'] = 0.00;
        $out['sss_employee_share'] = 0.00;
        $out['pagibig_employee_share'] = 0.00;
        $out['total_deductions'] = 0.00;
    }

    // numeric raw fields (use numeric types for math)
    $gross = (float)$out['total_salary'];
    $sss = isset($out['sss_employee_share']) ? (float)$out['sss_employee_share'] : 0.0;
    $ph = isset($out['philhealth_employee_share']) ? (float)$out['philhealth_employee_share'] : 0.0;
    $pg = isset($out['pagibig_employee_share']) ? (float)$out['pagibig_employee_share'] : 0.0;
    $other_deductions = isset($out['total_deductions']) ? (float)$out['total_deductions'] : 0.0;
    $loan_actual = $loan_actual_total;

    $deductions_sum = $sss + $ph + $pg + $other_deductions + $loan_actual;
    $net = $gross - $deductions_sum;

    // attach raw + formatted
    $out['total_salary_raw'] = $gross;
    $out['total_deductions_raw'] = $deductions_sum;
    $out['net_pay_raw'] = $net;

    $out['total_salary'] = number_format($gross, 2, '.', '');
    $out['total_deductions'] = number_format($deductions_sum, 2, '.', '');
    $out['net_pay'] = number_format($net, 2, '.', '');

    // accumulate summary
    $summary['total_gross'] += $gross;
    $summary['total_employee_deductions'] += $deductions_sum;
    $summary['total_loan_actual'] += $loan_actual;
    $summary['total_net_pay'] += $net;

    $payrollData[] = $out;
}

// Round summary
$summary['total_gross'] = round($summary['total_gross'], 2);
$summary['total_employee_deductions'] = round($summary['total_employee_deductions'], 2);
$summary['total_loan_actual'] = round($summary['total_loan_actual'], 2);
$summary['total_net_pay'] = round($summary['total_net_pay'], 2);

// ---------------- Employer contributions (sample calculation) ----------------
// NOTE: Replace these sample rates with your actual employer rates or calculation logic.
// Example: employer_sss_rate = 0.12 (12% of basic salary) etc.
$employer_sss_rate = 0.12;    // example — adapt!
$employer_ph_rate = 0.03;     // example
$employer_pg_rate = 0.02;     // example

$total_employer_contrib = 0.0;
foreach ($payrollData as $p) {
    $basic = (float)$p['total_basic_salary'];
    $total_employer_contrib += ($basic * $employer_sss_rate) + ($basic * $employer_ph_rate) + ($basic * $employer_pg_rate);
}
$summary['total_employer_contrib'] = round($total_employer_contrib, 2);

// ---------------- Build default journal template (adapt account codes to your COA) ----------------
$journal = [];
// Debit: Salary Expense = total gross
$journal[] = ['account_code' => '6000', 'account' => 'Salaries & Wages Expense', 'debit' => $summary['total_gross'], 'credit' => 0.0];

// Credit: statutory withholding payable lines (aggregate)
$sss_total = array_reduce($payrollData, function($s,$r){ return $s + (float)($r['sss_employee_share'] ?? 0); }, 0.0);
$ph_total  = array_reduce($payrollData, function($s,$r){ return $s + (float)($r['philhealth_employee_share'] ?? 0); }, 0.0);
$pg_total  = array_reduce($payrollData, function($s,$r){ return $s + (float)($r['pagibig_employee_share'] ?? 0); }, 0.0);
$loan_total = $summary['total_loan_actual'];

if ($sss_total > 0) $journal[] = ['account_code'=>'2111','account'=>'SSS Payable (Employee)', 'debit'=>0.0, 'credit'=>round($sss_total,2)];
if ($ph_total  > 0) $journal[] = ['account_code'=>'2112','account'=>'PhilHealth Payable (Employee)', 'debit'=>0.0, 'credit'=>round($ph_total,2)];
if ($pg_total  > 0) $journal[] = ['account_code'=>'2113','account'=>'Pag-IBIG Payable (Employee)', 'debit'=>0.0, 'credit'=>round($pg_total,2)];
if ($loan_total > 0) $journal[] = ['account_code'=>'2130','account'=>'Loans Payable (Employee)', 'debit'=>0.0, 'credit'=>round($loan_total,2)];

// Credit: Cash/Bank for net pay
$journal[] = ['account_code'=>'1000','account'=>'Cash/Bank', 'debit'=>0.0, 'credit'=>round($summary['total_net_pay'],2)];

// Employer contribution expense (debit) and payable (credit)
if ($summary['total_employer_contrib'] > 0) {
    $journal[] = ['account_code'=>'6200','account'=>'Employer Payroll Contributions Expense','debit'=>round($summary['total_employer_contrib'],2),'credit'=>0.0];
    $journal[] = ['account_code'=>'2210','account'=>'Employer Contributions Payable','debit'=>0.0,'credit'=>round($summary['total_employer_contrib'],2)];
}

// Balance check (optional): compute totals
$total_debits = 0.0; $total_credits = 0.0;
foreach ($journal as $j) { $total_debits += (float)$j['debit']; $total_credits += (float)$j['credit']; }
$journal_balanced = abs($total_debits - $total_credits) < 0.01; // allow small rounding diff

// ---------------- Return payload ----------------
echo json_encode([
    'success' => true,
    'data' => $payrollData,
    'summary' => $summary,
    'journal' => $journal,
    'journal_balanced' => $journal_balanced
]);

$conn->close();
?>
