<?php
// reward_allowance.php
// Reusable helper for reward rule evaluation & journal fetch

define('REWARD_MIN_HOURS_THRESHOLD', 8.0); // hours required to be eligible

function fetch_active_reward_rules($conn) {
    $rules = [];
    $sql = "SELECT * FROM reward_rules WHERE is_active = 1 ORDER BY priority ASC, reward_rule_id ASC";
    $res = $conn->query($sql);
    if ($res && $res->num_rows) {
        while ($r = $res->fetch_assoc()) {
            // normalize numeric fields
            $r['min_total_hours'] = isset($r['min_total_hours']) ? (float)$r['min_total_hours'] : null;
            $r['min_days_credited'] = isset($r['min_days_credited']) ? (float)$r['min_days_credited'] : null;
            $r['payout_value'] = isset($r['payout_value']) ? (float)$r['payout_value'] : 0.00;
            $rules[] = $r;
        }
    }
    return $rules;
}

// Fetch any reward_journal entries for employee in the payroll date range (authoritative if present)
function fetch_reward_journal_entries($conn, $employee_id, $date_from, $date_until) {
    $entries = [];
    $sql = "SELECT * FROM reward_journal_entry WHERE employee_id = ? AND COALESCE(payroll_cutoff, DATE(entry_date)) BETWEEN ? AND ? ORDER BY entry_date ASC";
    $stmt = $conn->prepare($sql);
    $stmt->bind_param("sss", $employee_id, $date_from, $date_until);
    $stmt->execute();
    $res = $stmt->get_result();
    while ($row = $res->fetch_assoc()) {
        $row['amount'] = (float)$row['amount'];
        $entries[] = $row;
    }
    $stmt->close();
    return $entries;
}

// get employee type fallback from employees table (used if payroll_row doesn't include it)
function fetch_employee_type($conn, $employee_id) {
    $type = null;
    $sql = "SELECT employee_type FROM employees WHERE employee_id = ? LIMIT 1";
    $stmt = $conn->prepare($sql);
    if ($stmt) {
        $stmt->bind_param("s", $employee_id);
        $stmt->execute();
        $res = $stmt->get_result();
        if ($row = $res->fetch_assoc()) {
            $type = $row['employee_type'];
        }
        $stmt->close();
    }
    return $type;
}

// Calculate reward amount using rules and employee payroll context.
// Priority: if reward_journal_entries exist -> use them (sum). Else evaluate rules.
// Only applies rules for Regular employees who rendered at least REWARD_MIN_HOURS_THRESHOLD hours.
function calculate_rewards_for_payroll($conn, $employee_id, $date_from, $date_until, $payroll_row = null, $attendance_summary = null) {
    // $payroll_row is optional array with basic_salary, total_days, employee_type, etc.
    // $attendance_summary optional — if provided contains total_rendered_hours and total_days_credited
    // returns array: ['total_rewards' => float, 'details' => [ ... ]]
    $result = ['total_rewards' => 0.00, 'details' => []];

    // 1) Check journal entries (authoritative)
    $journals = fetch_reward_journal_entries($conn, $employee_id, $date_from, $date_until);
    if (count($journals) > 0) {
        $sum = 0.00;
        foreach ($journals as $j) {
            $amt = (float)$j['amount'];
            $sum += $amt;
            $result['details'][] = [
                'source' => 'journal',
                'journal_id' => $j['journal_id'] ?? null,
                'amount' => number_format($amt, 2, '.', ''),
                'description' => $j['description'] ?? null,
                'entry_date' => $j['entry_date'] ?? null,
                'origin' => $j['origin'] ?? null
            ];
        }
        $result['total_rewards'] = round($sum, 2);
        return $result;
    }

    // 2) Evaluate rules (only if eligible by type & hours)
    $rules = fetch_active_reward_rules($conn);

    // ensure we have attendance summary
    if (is_null($attendance_summary)) {
        // try to derive from $payroll_row
        $attendance_summary = [
            'total_rendered_hours' => isset($payroll_row['total_rendered_hours']) ? (float)$payroll_row['total_rendered_hours'] : 0.00,
            'total_days'           => isset($payroll_row['total_days']) ? (float)$payroll_row['total_days'] : 0.00
        ];
    }

    // determine employee type (prefer payroll_row value, else query fallback)
    $employee_type = null;
    if (is_array($payroll_row) && isset($payroll_row['employee_type'])) {
        $employee_type = $payroll_row['employee_type'];
    } else {
        $employee_type = fetch_employee_type($conn, $employee_id);
    }
    $employee_type = is_null($employee_type) ? null : trim(strtolower((string)$employee_type));

    // Eligibility: must be Regular and have >= threshold hours
    $is_regular = ($employee_type === 'regular' || $employee_type === 'regular' /* allow case-insensitivity */);
    $rendered_hours = (float)($attendance_summary['total_rendered_hours'] ?? 0.0);

    if (! $is_regular) {
        // not eligible by employee type; return zero with empty details (no journal either)
        $result['total_rewards'] = 0.00;
        return $result;
    }

    if ($rendered_hours < REWARD_MIN_HOURS_THRESHOLD) {
        // not eligible by rendered hours
        $result['total_rewards'] = 0.00;
        return $result;
    }

    $total_rewards = 0.00;

    foreach ($rules as $r) {
        $ok = true;
        if (!is_null($r['min_total_hours']) && ($attendance_summary['total_rendered_hours'] < $r['min_total_hours'])) {
            $ok = false;
        }
        if (!is_null($r['min_days_credited']) && ($attendance_summary['total_days'] < $r['min_days_credited'])) {
            $ok = false;
        }
        // additional filtering by employee_type if rule has it (optional field)
        if (!empty($r['applicable_employee_type'])) {
            // rule may contain comma-separated types; compare case-insensitive
            $types = array_map('trim', explode(',', strtolower($r['applicable_employee_type'])));
            if (!in_array(strtolower($employee_type), $types, true)) {
                $ok = false;
            }
        }
        if ($ok) {
            $payout = 0.00;
            if ($r['payout_type'] === 'fixed') {
                $payout = $r['payout_value'];
            } elseif ($r['payout_type'] === 'per_hour') {
                $payout = $r['payout_value'] * $attendance_summary['total_rendered_hours'];
            } elseif ($r['payout_type'] === 'percentage') {
                $basic = isset($payroll_row['basic_salary']) ? (float)$payroll_row['basic_salary'] : 0.00;
                $payout = ($r['payout_value'] / 100.0) * $basic;
            }
            $payout = round($payout, 2);
            if ($payout > 0) {
                $total_rewards += $payout;
                $result['details'][] = [
                    'source' => 'rule',
                    'reward_rule_id' => $r['reward_rule_id'],
                    'name' => $r['name'],
                    'amount' => number_format($payout, 2, '.', ''),
                    'rule' => $r
                ];
            }
            // If you want only the highest priority matched rule to apply, uncomment break:
            // break;
        }
    }

    $result['total_rewards'] = round($total_rewards, 2);
    return $result;
}
?>
