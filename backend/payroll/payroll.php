<?php
// payroll.php (full version with retro aggregation, filtered by retro.effectivity within payroll period)
// defensive, bulk-attach loans and retro adjustments

header('Content-Type: application/json');

include("../server/cors.php");
include('../server/connection.php');
include_once('reward_allowance.php');

// safety/timeouts
@set_time_limit(120);
@ini_set('memory_limit', '256M');

/* ----------------- helper: getEmployeeShift (returns selected schedule + work_time info) ----------------- */
function getEmployeeShift($conn, $employee_id, $attendance_date) {
    if (empty($employee_id) || empty($attendance_date)) return null;

    $sql = "
        SELECT ess.*, 
               wt.id AS wt_id, wt.shift_name, wt.start_time, wt.end_time, wt.total_minutes, wt.is_default,
               wt.valid_in_start, wt.valid_in_end
        FROM employee_shift_schedule ess
        JOIN work_time wt ON ess.work_time_id = wt.id
        WHERE ess.employee_id = ?
          AND ess.is_active = 1
          AND ess.effective_date <= ?
          AND (ess.end_date IS NULL OR ess.end_date = '0000-00-00' OR ess.end_date >= ?)
    ";
    $stmt = $conn->prepare($sql);
    if (!$stmt) {
        error_log("getEmployeeShift: prepare failed: " . $conn->error);
        return null;
    }
    $stmt->bind_param("sss", $employee_id, $attendance_date, $attendance_date);
    if (!$stmt->execute()) {
        error_log("getEmployeeShift: execute failed: " . $stmt->error);
        $stmt->close();
        return null;
    }
    $res = $stmt->get_result();
    if (!$res) {
        $stmt->close();
        return null;
    }

    $matches = [];
    while ($row = $res->fetch_assoc()) {
        $recurrence = $row['recurrence_type'];
        $daysOfWeek = $row['days_of_week'] ? array_map('trim', explode(',', $row['days_of_week'])) : [];
        $dayNameShort = date("D", strtotime($attendance_date));   // Mon, Tue
        $dayNameFull  = date("l", strtotime($attendance_date));   // Monday, Tuesday
        $is_match = false;

        if (!empty($daysOfWeek)) {
            if (in_array($dayNameShort, $daysOfWeek) || in_array($dayNameFull, $daysOfWeek)) $is_match = true;
        } else {
            if ($recurrence === 'none' && $row['effective_date'] === $attendance_date) $is_match = true;
            elseif ($recurrence === 'weekly') $is_match = true;
            elseif ($recurrence === 'daily') $is_match = true;
            elseif ($recurrence === 'monthly' && date("d", strtotime($row['effective_date'])) === date("d", strtotime($attendance_date))) $is_match = true;
        }

        if ($is_match) {
            $matches[] = [
                'ess' => $row,
                'wt' => [
                    'wt_id' => intval($row['wt_id']),
                    'shift_name' => $row['shift_name'],
                    'start_time' => $row['start_time'],
                    'end_time' => $row['end_time'],
                    'total_minutes' => intval($row['total_minutes']),
                    'valid_in_start' => $row['valid_in_start'],
                    'valid_in_end' => $row['valid_in_end']
                ],
                'priority' => intval($row['priority']),
                'effective_date' => $row['effective_date']
            ];
        }
    }
    $stmt->close();

    if (count($matches) === 0) {
        $default_sql = "SELECT id AS wt_id, shift_name, start_time, end_time, is_default, total_minutes, valid_in_start, valid_in_end FROM work_time WHERE is_default = 1 LIMIT 1";
        $default_result = $conn->query($default_sql);
        if ($default_result && $default_row = $default_result->fetch_assoc()) {
            return [
                'from_default' => true,
                'schedule' => null,
                'wt' => [
                    'wt_id' => intval($default_row['wt_id']),
                    'shift_name' => $default_row['shift_name'],
                    'start_time' => $default_row['start_time'],
                    'end_time' => $default_row['end_time'],
                    'total_minutes' => intval($default_row['total_minutes']),
                    'valid_in_start' => $default_row['valid_in_start'],
                    'valid_in_end' => $default_row['valid_in_end']
                ],
                'conflicts' => []
            ];
        }
        return null;
    }

    usort($matches, function($a, $b) {
        if ($a['priority'] === $b['priority']) {
            return strcmp($b['effective_date'], $a['effective_date']);
        }
        return $b['priority'] - $a['priority'];
    });

    $sel = $matches[0];
    return [
        'from_default' => false,
        'schedule' => $sel['ess'],
        'wt' => $sel['wt'],
        'conflicts' => count($matches) > 1 ? $matches : [],
        'selected_schedule_id' => isset($sel['ess']['schedule_id']) ? $sel['ess']['schedule_id'] : null,
        'selected_priority' => $sel['priority']
    ];
}

/* --------- helper: populate_missing_attendance_rows_for_employee (defensive) --------- */
function populate_missing_attendance_rows_for_employee($conn, $employee_id, $start_date, $end_date) {
    $ensure_log = [];
    $inserted = 0;

    if (empty($employee_id) || empty($start_date) || empty($end_date)) {
        return ["success" => true, "inserted" => 0, "log" => [["reason"=>"invalid_params"]]];
    }

    $s_ts = strtotime($start_date);
    $e_ts = strtotime($end_date);
    if ($s_ts === false || $e_ts === false || $s_ts > $e_ts) {
        return ["success" => true, "inserted" => 0, "log" => [["reason"=>"invalid_date_range"]]];
    }

    $colRes = $conn->query("SHOW COLUMNS FROM `attendance` LIKE 'employee_name'");
    $has_employee_name = ($colRes && $colRes->num_rows > 0);

    $check_sql = "SELECT 1 FROM `attendance` WHERE `employee_id` = ? AND `attendance_date` = ? LIMIT 1";
    $check_stmt = $conn->prepare($check_sql);
    if ($check_stmt === false) {
        error_log("populate_missing_attendance_rows_for_employee: prepare(check_stmt) failed: " . $conn->error);
        return ["success" => false, "error" => "prepare(check_stmt) failed: " . $conn->error, "inserted" => 0, "log" => $ensure_log];
    }

    if ($has_employee_name) {
        $insert_sql = "INSERT INTO `attendance` (`employee_id`, `employee_name`, `attendance_date`, `created_at`) VALUES (?, ?, ?, NOW())";
    } else {
        $insert_sql = "INSERT INTO `attendance` (`employee_id`, `attendance_date`, `created_at`) VALUES (?, ?, NOW())";
    }

    $insert_stmt = $conn->prepare($insert_sql);
    if ($insert_stmt === false) {
        $err = $conn->error;
        error_log("populate_missing_attendance_rows_for_employee: prepare(insert_stmt) failed: " . $err);
        $check_stmt->close();
        return ["success" => false, "error" => "prepare(insert_stmt) failed: " . $err, "inserted" => 0, "log" => $ensure_log];
    }

    $emp_name = '';
    if ($has_employee_name) {
        $name_stmt = $conn->prepare("SELECT employee_fullname FROM `employees` WHERE `employee_id` = ? LIMIT 1");
        if ($name_stmt !== false) {
            $name_stmt->bind_param("s", $employee_id);
            $name_stmt->execute();
            $nres = $name_stmt->get_result();
            if ($nres && ($nr = $nres->fetch_assoc())) {
                $emp_name = $nr['employee_fullname'];
            }
            $name_stmt->close();
        } else {
            error_log("populate_missing_attendance_rows_for_employee: prepare(name_stmt) failed: " . $conn->error);
        }
    }

    $startObj = new DateTime($start_date);
    $endObj = new DateTime($end_date);
    $endObj->modify('+1 day');
    $period = new DatePeriod($startObj, new DateInterval('P1D'), $endObj);

    foreach ($period as $dt) {
        $date = $dt->format('Y-m-d');

        $check_stmt->bind_param("ss", $employee_id, $date);
        if (!$check_stmt->execute()) {
            error_log("populate_missing_attendance_rows_for_employee: check_stmt->execute() failed: " . $check_stmt->error);
            $ensure_log[] = ["date"=>$date, "action"=>"check_execute_error", "error"=>$check_stmt->error];
            continue;
        }
        $cres = (method_exists($check_stmt, 'get_result')) ? $check_stmt->get_result() : null;
        if ($cres && $cres->num_rows > 0) {
            $ensure_log[] = ["date"=>$date, "action"=>"exists"];
            continue;
        }

        $shift = getEmployeeShift($conn, $employee_id, $date);
        if (!$shift) {
            $ensure_log[] = ["date"=>$date, "action"=>"no_schedule"];
            continue;
        }

        $is_rest = false;
        $shift_name = isset($shift['wt']['shift_name']) ? $shift['wt']['shift_name'] : '';
        $total_minutes = isset($shift['wt']['total_minutes']) ? intval($shift['wt']['total_minutes']) : 0;
        $start_time = isset($shift['wt']['start_time']) ? $shift['wt']['start_time'] : null;
        $end_time = isset($shift['wt']['end_time']) ? $shift['wt']['end_time'] : null;

        if (stripos($shift_name, 'rest') !== false) $is_rest = true;
        if ($total_minutes === 0) $is_rest = true;
        if ($start_time === '00:00:00' && ($end_time === '00:00:00' || $end_time === '00:00:01')) $is_rest = true;

        if ($is_rest) {
            $ensure_log[] = ["date"=>$date, "action"=>"rest_day", "shift"=>$shift_name];
            continue;
        }

        if ($has_employee_name) {
            $insert_stmt->bind_param("sss", $employee_id, $emp_name, $date);
        } else {
            $insert_stmt->bind_param("ss", $employee_id, $date);
        }

        if ($insert_stmt->execute()) {
            $inserted++;
            $ensure_log[] = ["date"=>$date, "action"=>"inserted"];
        } else {
            error_log("populate_missing_attendance_rows_for_employee: insert_stmt->execute() failed for date {$date}: " . $insert_stmt->error);
            $ensure_log[] = ["date"=>$date, "action"=>"insert_error", "error"=>$insert_stmt->error];
        }
    }

    $check_stmt->close();
    $insert_stmt->close();

    return ["success"=>true, "inserted"=>$inserted, "log"=>$ensure_log];
}

/* ----------------- helper: isEligibleDailyMinimum ----------------- */
function isEligibleDailyMinimum($conn, $employee_id, $date_from, $date_until, $attendance_data, $min_hours = 8.0) {
    $attHours = [];
    foreach ($attendance_data as $a) {
        if (isset($a['attendance_date'])) {
            $attHours[$a['attendance_date']] = isset($a['total_rendered_hours']) ? (float)$a['total_rendered_hours'] : 0.0;
        }
    }

    $paidLeaveDates = [];
    $leave_sql = "
        SELECT el.date_from, el.date_until, lt.is_paid
        FROM employee_leaves el
        INNER JOIN leave_types lt ON el.leave_type_id = lt.leave_type_id
        WHERE el.employee_id = ?
          AND el.status = 'approved'
          AND (
                (el.date_from BETWEEN ? AND ?)
                OR (el.date_until BETWEEN ? AND ?)
                OR (? BETWEEN el.date_from AND el.date_until)
                OR (? BETWEEN el.date_from AND el.date_until)
              )
    ";
    $leave_stmt = $conn->prepare($leave_sql);
    if ($leave_stmt) {
        $leave_stmt->bind_param("sssssss", $employee_id, $date_from, $date_until, $date_from, $date_until, $date_from, $date_until);
        $leave_stmt->execute();
        $lr = $leave_stmt->get_result();
        while ($lv = $lr->fetch_assoc()) {
            $is_paid = isset($lv['is_paid']) ? ((int)$lv['is_paid'] === 1) : false;
            if (!$is_paid) continue;
            $start = max(strtotime($lv['date_from']), strtotime($date_from));
            $end   = min(strtotime($lv['date_until']), strtotime($date_until));
            if ($end >= $start) {
                for ($d = $start; $d <= $end; $d += 86400) {
                    $paidLeaveDates[date('Y-m-d', $d)] = true;
                }
            }
        }
        $leave_stmt->close();
    }

    $holidayDates = [];
    $hol_sql = "SELECT holiday_id, holiday_date, is_recurring FROM holidays";
    $hol_result = $conn->query($hol_sql);
    if ($hol_result) {
        $from_year = (int)date('Y', strtotime($date_from));
        $until_year = (int)date('Y', strtotime($date_until));
        while ($h = $hol_result->fetch_assoc()) {
            $base_holiday_date = $h['holiday_date'];
            $is_recurring = (int)$h['is_recurring'] === 1;
            if ($is_recurring) {
                if (!$base_holiday_date || $base_holiday_date === '0000-00-00') continue;
                $md = date('m-d', strtotime($base_holiday_date));
                for ($yr = $from_year; $yr <= $until_year; $yr++) {
                    $occurrence = date('Y-m-d', strtotime($yr . '-' . $md));
                    if ($occurrence >= $date_from && $occurrence <= $date_until) {
                        $holidayDates[$occurrence] = true;
                    }
                }
            } else {
                if ($base_holiday_date && $base_holiday_date !== '0000-00-00') {
                    if ($base_holiday_date >= $date_from && $base_holiday_date <= $date_until) {
                        $holidayDates[$base_holiday_date] = true;
                    }
                }
            }
        }
    }

    $start = new DateTime($date_from);
    $end = new DateTime($date_until);
    $end->modify('+1 day');
    $period = new DatePeriod($start, new DateInterval('P1D'), $end);

    $shiftCache = [];

    foreach ($period as $dt) {
        $date = $dt->format('Y-m-d');

        if (date('w', strtotime($date)) == 0) continue; // skip Sundays

        if (!isset($shiftCache[$date])) {
            $shiftCache[$date] = getEmployeeShift($conn, $employee_id, $date);
        }
        $sh = $shiftCache[$date];
        if ($sh === null) continue;

        $is_rest = false;
        $shift_name = isset($sh['wt']['shift_name']) ? $sh['wt']['shift_name'] : '';
        $total_minutes = isset($sh['wt']['total_minutes']) ? intval($sh['wt']['total_minutes']) : 0;
        $start_time = isset($sh['wt']['start_time']) ? $sh['wt']['start_time'] : null;
        $end_time = isset($sh['wt']['end_time']) ? $sh['wt']['end_time'] : null;
        if (stripos($shift_name, 'rest') !== false) $is_rest = true;
        if ($total_minutes === 0) $is_rest = true;
        if ($start_time === '00:00:00' && ($end_time === '00:00:00' || $end_time === '00:00:01')) $is_rest = true;
        if ($is_rest) continue;

        $hours = isset($attHours[$date]) ? (float)$attHours[$date] : 0.0;
        if ($hours >= $min_hours) continue;

        if (isset($paidLeaveDates[$date]) || isset($holidayDates[$date])) continue;

        return false;
    }

    return true;
}

/* ----------------------- payroll main ----------------------- */
include_once(__DIR__ . '/payroll_backLog_healper.php'); // adjust path if helper is in different folder

$employeeFilter = payrollBacklogFilter($conn, $_GET);

$sql = "
    SELECT 
        p.*, 
        bs.basic_salary,
        p.contribution_deduction_type,
        pos.position_name, 
        dept.department_name,
        e.employee_type,
        e.status,
        e.salary_type,
        e.monthly_rate,

        ph.is_override_enabled AS philhealth_override_enabled,
        s.is_override_enabled AS sss_override_enabled,
        pg.is_override_enabled AS pagibig_override_enabled,

        CASE 
            WHEN ph.is_override_enabled = 1 AND ph.override_employee_share IS NOT NULL
            THEN ph.override_employee_share
            ELSE ph.employee_share
        END AS philhealth_employee_share,

        CASE 
            WHEN s.is_override_enabled = 1 AND s.override_employee_share IS NOT NULL
            THEN s.override_employee_share
            ELSE s.employee_share
        END AS sss_employee_share,

        CASE 
            WHEN pg.is_override_enabled = 1 AND pg.override_employee_share IS NOT NULL 
            THEN pg.override_employee_share 
            ELSE pg.employee_share 
        END AS pagibig_employee_share,

        COALESCE(
            CASE 
                WHEN ph.is_override_enabled = 1 AND ph.override_employee_share IS NOT NULL
                THEN ph.override_employee_share
                ELSE ph.employee_share
            END, 0
        ) 
        + COALESCE(
            CASE 
                WHEN s.is_override_enabled = 1 AND s.override_employee_share IS NOT NULL
                THEN s.override_employee_share
                ELSE s.employee_share
            END, 0
        )
        + COALESCE(
            CASE 
                WHEN pg.is_override_enabled = 1 AND pg.override_employee_share IS NOT NULL 
                THEN pg.override_employee_share 
                ELSE pg.employee_share 
            END, 0
        ) AS total_deductions,

        COALESCE(SUM(a.overtime_request), 0.00) AS total_overtime_request
    FROM payroll p
    LEFT JOIN employees e ON p.employee_id = e.employee_id
    LEFT JOIN philhealth_contribution ph ON p.employee_id = ph.employee_id
    LEFT JOIN sss_contribution s ON p.employee_id = s.employee_id
    LEFT JOIN pagibig_contribution pg ON p.employee_id = pg.employee_id
    LEFT JOIN positions pos ON p.position_id = pos.position_id
    LEFT JOIN departments dept ON pos.department_id = dept.department_id
    /* only join attendance when payroll has valid date_from/date_until to avoid huge/wrong joins */
    LEFT JOIN attendance a 
        ON a.employee_id = p.employee_id 
        AND p.date_from IS NOT NULL AND p.date_from <> '' 
        AND p.date_until IS NOT NULL AND p.date_until <> '' 
        AND a.attendance_date BETWEEN p.date_from AND p.date_until
    LEFT JOIN base_salary bs ON p.employee_id = bs.employee_id
    "
    . $employeeFilter .
    " GROUP BY p.employee_id, p.date_from, p.date_until, p.position_id, p.department_id, bs.basic_salary
";

$result = $conn->query($sql);

if ($result === false) {
    error_log("payroll main query failed: " . $conn->error);
    echo json_encode(["success" => false, "error" => "main query failed: " . $conn->error]);
    $conn->close();
    exit;
}

if ($result && $result->num_rows > 0) {
    $payrollData = [];
    while ($row = $result->fetch_assoc()) {

        $employee_id = $row['employee_id'];
        $date_from = isset($row['date_from']) ? $row['date_from'] : null;
        $date_until = isset($row['date_until']) ? $row['date_until'] : null;

        // ensure attendance rows exist for this employee & date range
        if (empty($employee_id) || empty($date_from) || empty($date_until) || strtotime($date_from) === false || strtotime($date_until) === false) {
            $row['ensure_info'] = ['skipped' => 'invalid_or_blank_date_range'];
        } else {
            try {
                $ensure_result = populate_missing_attendance_rows_for_employee($conn, $employee_id, $date_from, $date_until);
                $row['ensure_info'] = [
                    'inserted' => isset($ensure_result['inserted']) ? $ensure_result['inserted'] : 0,
                    'log_sample' => isset($ensure_result['log']) ? array_slice($ensure_result['log'], 0, 10) : []
                ];
            } catch (Exception $e) {
                $row['ensure_info'] = ['error' => $e->getMessage()];
            }
        }

        // fetch attendance rows (only when date range valid)
        $attendance_data = [];
        if (!empty($employee_id) && !empty($date_from) && !empty($date_until) && strtotime($date_from) !== false && strtotime($date_until) !== false) {
            $attendance_sql = "
                SELECT attendance_date, time_in_morning, time_out_morning, time_in_afternoon, time_out_afternoon,
                       days_credited, total_rendered_hours, net_work_minutes, actual_rendered_minutes, overtime_hours, overtime_request
                FROM attendance 
                WHERE employee_id = ? AND attendance_date BETWEEN ? AND ? 
                ORDER BY attendance_date ASC
            ";
            $attendance_stmt = $conn->prepare($attendance_sql);
            if ($attendance_stmt !== false) {
                $attendance_stmt->bind_param("sss", $employee_id, $date_from, $date_until);
                $attendance_stmt->execute();
                $attendance_result = (method_exists($attendance_stmt, 'get_result')) ? $attendance_stmt->get_result() : null;

                if ($attendance_result) {
                    while ($att_row = $attendance_result->fetch_assoc()) {
                        $sched = getEmployeeShift($conn, $employee_id, $att_row['attendance_date']);
                        if ($sched === null) {
                            $att_row['schedule'] = null;
                        } else {
                            $schedule_obj = [
                                'from_default' => isset($sched['from_default']) ? (bool)$sched['from_default'] : false,
                                'selected_schedule_id' => isset($sched['selected_schedule_id']) ? $sched['selected_schedule_id'] : (isset($sched['schedule']['schedule_id']) ? $sched['schedule']['schedule_id'] : null),
                                'selected_priority' => isset($sched['selected_priority']) ? $sched['selected_priority'] : (isset($sched['schedule']['priority']) ? intval($sched['schedule']['priority']) : null),
                                'schedule_fields' => isset($sched['schedule']) ? $sched['schedule'] : null,
                                'shift_name' => isset($sched['wt']['shift_name']) ? $sched['wt']['shift_name'] : null,
                                'start_time' => isset($sched['wt']['start_time']) ? $sched['wt']['start_time'] : null,
                                'end_time' => isset($sched['wt']['end_time']) ? $sched['wt']['end_time'] : null,
                                'total_minutes' => isset($sched['wt']['total_minutes']) ? intval($sched['wt']['total_minutes']) : null
                            ];
                            $att_row['schedule'] = $schedule_obj;
                        }

                        $attendance_data[] = $att_row;
                    }
                }
                $attendance_stmt->close();
            } else {
                error_log("Failed to prepare attendance_stmt for employee {$employee_id}: " . $conn->error);
            }
        }

        $total_rendered_hours = 0;
        foreach ($attendance_data as $att) {
            $total_rendered_hours += isset($att['total_rendered_hours']) ? (float)$att['total_rendered_hours'] : 0;
        }
        $row['total_rendered_hours'] = number_format($total_rendered_hours, 2, '.', '');
        $row['attendance_records'] = $attendance_data;

        // ---------- LATE SALARY CALCULATION ----------
        $total_late_minutes = 0.0;
        foreach ($attendance_data as $att) {
            $net_mins = isset($att['net_work_minutes']) ? (float)$att['net_work_minutes'] : 0.0;
            $actual_mins = isset($att['actual_rendered_minutes']) ? (float)$att['actual_rendered_minutes'] : 0.0;
            $late_mins = $net_mins - $actual_mins;
            if ($late_mins > 0) $total_late_minutes += $late_mins;
        }

        $total_late_hours = $total_late_minutes / 60.0;

        $salary_type = isset($row['salary_type']) ? strtolower($row['salary_type']) : '';
        $monthly_rate = isset($row['monthly_rate']) ? (float)$row['monthly_rate'] : 0.0;
        $basic_salary_val = isset($row['basic_salary']) ? (float)$row['basic_salary'] : 0.0;

        if ($monthly_rate > 0 && $salary_type === 'monthly') {
            $annual_salary = $monthly_rate * 12.0;
            $daily_rate_for_late = $annual_salary / 365.0;
        } else {
            $daily_rate_for_late = $basic_salary_val;
        }

        $hourly_rate_for_late = ($daily_rate_for_late > 0) ? ($daily_rate_for_late / 8.0) : 0.0;
        $late_deduction = $hourly_rate_for_late * $total_late_hours;

        if ($monthly_rate > 0 && $salary_type === 'monthly') {
            $half_month_salary = $monthly_rate / 2.0;
        } else {
            if (isset($row['total_salary']) && (float)$row['total_salary'] > 0) {
                $half_month_salary = (float)$row['total_salary'];
            } else {
                $half_month_salary = $basic_salary_val * (float)$row['total_days'];
            }
        }

        $total_salary_after_late = max($half_month_salary - $late_deduction, 0.0);

        $row['total_late_minutes'] = number_format($total_late_minutes, 2, '.', '');
        $row['total_late_hours'] = number_format($total_late_hours, 2, '.', '');
        $row['late_deduction'] = number_format($late_deduction, 2, '.', '');
        $row['half_month_salary'] = number_format($half_month_salary, 2, '.', '');
        $row['total_salary_after_late'] = number_format($total_salary_after_late, 2, '.', '');
        // ---------- end late calculation ----------

        // append processed row to payrollData; later we'll attach loans and retro in bulk
        $payrollData[] = $row;
    }

    // ------------------ Attach loans in bulk for employees returned ------------------
    $employeeIds = [];
    $payrollIds = [];
    foreach ($payrollData as $r) {
        if (!empty($r['employee_id'])) $employeeIds[$r['employee_id']] = true;
        if (!empty($r['payroll_id'])) $payrollIds[$r['payroll_id']] = true;
    }
    $employeeIds = array_keys($employeeIds);
    $payrollIds = array_keys($payrollIds);

    if (count($employeeIds) > 0) {
        $escaped = array_map(function($v) use ($conn) {
            return $conn->real_escape_string($v);
        }, $employeeIds);
        $inList = "'" . implode("','", $escaped) . "'";

        $loanSql = "
            SELECT 
              loan_id,
              employee_id,
              employee_name,
              loan_amount,
              date_start,
              date_end,
              balance,
              loan_type,
              liability_type,
              reference_no,
              status,
              is_installment,
              quantity,
              unit_cost,
              total_cost,
              monthly_interest_generated,
              total_interest,
              last_interest_date,
              deduction_schedule,
              interest_type,
              interest_rate,
              terms,
              payable_per_term,
              final_loan_deduction,
              loan_reference_no,
              description
            FROM loans
            WHERE employee_id IN ($inList)
              AND balance IS NOT NULL AND balance > 0
              AND status IN ('active', 'approved')
            ORDER BY employee_id, loan_id ASC
        ";
        $loanResult = $conn->query($loanSql);
        $loansByEmployee = [];
        if ($loanResult) {
            while ($lr = $loanResult->fetch_assoc()) {
                $emp = $lr['employee_id'];
                $lr['loan_amount'] = $lr['loan_amount'] !== null ? (float)$lr['loan_amount'] : 0.0;
                $lr['balance'] = $lr['balance'] !== null ? (float)$lr['balance'] : 0.0;
                $lr['payable_per_term'] = $lr['payable_per_term'] !== null ? (float)$lr['payable_per_term'] : 0.0;
                $lr['interest_rate'] = $lr['interest_rate'] !== null ? (float)$lr['interest_rate'] : 0.0;
                $lr['monthly_interest_generated'] = $lr['monthly_interest_generated'] !== null ? (float)$lr['monthly_interest_generated'] : 0.0;
                $lr['total_interest'] = $lr['total_interest'] !== null ? (float)$lr['total_interest'] : 0.0;
                $loansByEmployee[$emp][] = $lr;
            }
            $loanResult->close();
        }
        foreach ($payrollData as $i => $row) {
            $eid = $row['employee_id'] ?? null;
            if ($eid !== null && isset($loansByEmployee[$eid])) {
                $payrollData[$i]['loans'] = $loansByEmployee[$eid];
            } else {
                $payrollData[$i]['loans'] = [];
            }
        }
    } else {
        foreach ($payrollData as $i => $row) {
            $payrollData[$i]['loans'] = [];
        }
    }

    // ------------------ Attach retro aggregates + retro rows in bulk (filtered by effective_date within payroll range) ------------------
    $retroTotals = [];
    $retroRowsByPayroll = [];

    if (count($payrollIds) > 0) {
        // prepare payroll date ranges map: payroll_id => ['from_ts'=>..., 'until_ts'=>..., 'from_raw'=>..., 'until_raw'=>...]
        $payrollRanges = [];
        foreach ($payrollData as $r) {
            $pid = isset($r['payroll_id']) ? intval($r['payroll_id']) : null;
            if ($pid === null) continue;
            $from_raw = isset($r['date_from']) ? $r['date_from'] : null;
            $until_raw = isset($r['date_until']) ? $r['date_until'] : null;
            $from_ts = ($from_raw && strtotime($from_raw) !== false) ? strtotime($from_raw) : null;
            $until_ts = ($until_raw && strtotime($until_raw) !== false) ? strtotime($until_raw) : null;
            // normalize end-of-day to include full date
            if ($until_ts !== null) $until_ts = strtotime(date('Y-m-d 23:59:59', $until_ts));
            $payrollRanges[$pid] = [
                'from_raw' => $from_raw,
                'until_raw' => $until_raw,
                'from_ts' => $from_ts,
                'until_ts' => $until_ts
            ];
        }

        // sanitize ints for IN clause
        $pids = array_map('intval', $payrollIds);
        $in = implode(',', $pids);

        // fetch candidate retro rows that are applied to these payrolls (we'll filter by effective_date in PHP)
        $rowsSql = "
            SELECT retro_id, employee_id, amount, description, effective_date, created_by, created_at, status, applied_in_payroll_id, applied_at, tax_in_current_payroll, supporting_doc
            FROM retro_adjustments
            WHERE status = 'applied' AND applied_in_payroll_id IN ($in)
            ORDER BY applied_in_payroll_id ASC, applied_at ASC, retro_id ASC
        ";
        $rowsRes = $conn->query($rowsSql);
        if ($rowsRes) {
            while ($rr = $rowsRes->fetch_assoc()) {
                $pid = isset($rr['applied_in_payroll_id']) ? intval($rr['applied_in_payroll_id']) : null;
                if ($pid === null) continue;

                // normalize numeric
                $amt = isset($rr['amount']) ? (float)$rr['amount'] : 0.0;
                $eff_raw = isset($rr['effective_date']) ? $rr['effective_date'] : null;
                if ($eff_raw === null || $eff_raw === '' || strtotime($eff_raw) === false) {
                    // skip retro rows without a valid effective_date — they don't meet the "effectivity within payroll period" requirement
                    continue;
                }
                $eff_ts = strtotime($eff_raw);

                // check that payroll has valid range for this payroll id
                if (!isset($payrollRanges[$pid])) continue;
                $pr = $payrollRanges[$pid];
                if ($pr['from_ts'] === null || $pr['until_ts'] === null) {
                    // payroll has invalid or blank date_from/date_until -> skip filtering (policy: do not attach)
                    continue;
                }

                // include only if effective_date falls within payroll date range (inclusive)
                if ($eff_ts < $pr['from_ts'] || $eff_ts > $pr['until_ts']) {
                    continue;
                }

                // passed filters -> attach
                if (!isset($retroRowsByPayroll[$pid])) $retroRowsByPayroll[$pid] = [];
                $rr['amount'] = $amt;
                $retroRowsByPayroll[$pid][] = $rr;

                if (!isset($retroTotals[$pid])) $retroTotals[$pid] = 0.0;
                $retroTotals[$pid] += $amt;
            }
            $rowsRes->close();
        }
    }

    // attach totals and rows to payrollData (only those with effectivity inside payroll range included)
    foreach ($payrollData as $i => $row) {
        $pid = isset($row['payroll_id']) ? intval($row['payroll_id']) : null;
        $totalRetro = ($pid !== null && isset($retroTotals[$pid])) ? $retroTotals[$pid] : 0.0;
        $rows = ($pid !== null && isset($retroRowsByPayroll[$pid])) ? $retroRowsByPayroll[$pid] : [];

        // prefer aggregated value; string-format to two decimals (frontend expects this name)
        $payrollData[$i]['total_retro_applied'] = number_format($totalRetro, 2, '.', '');
        $payrollData[$i]['retro_adjustments'] = $rows;
    }

    echo json_encode(["success" => true, "data" => $payrollData]);
} else {
    echo json_encode(["success" => true, "data" => []]);
}

$conn->close();
exit;
?>
