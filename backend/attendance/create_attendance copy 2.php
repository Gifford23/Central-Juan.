<?php
// add-attendance.php  (fixed: correct late baseline, normalize '00:00:00', update days_credited)
ob_start();
include("../server/cors.php");
include "../server/connection.php";
error_reporting(E_ALL);
ini_set('display_errors', 1);
header("Content-Type: application/json; charset=UTF-8");

/* --------- helpers --------- */
function makeTimestamp($date, $time) {
    if (!$time || $time === "00:00:00" || $time === "00:00") return null;
    return strtotime("$date $time");
}
function normalizeIntervalTs($date, $start_time, $end_time) {
    $s = makeTimestamp($date, $start_time);
    $e = makeTimestamp($date, $end_time);
    if ($s === null || $e === null) return null;
    if ($e <= $s) $e += 24 * 3600;
    return [$s, $e];
}
function overlapSeconds($aStart, $aEnd, $bStart, $bEnd) {
    $s = max($aStart, $bStart);
    $e = min($aEnd, $bEnd);
    return ($e > $s) ? ($e - $s) : 0;
}
function subtractIntervalFromIntervals($intervals, $sub) {
    $out = [];
    foreach ($intervals as $it) {
        $s = $it[0]; $e = $it[1];
        $ov = overlapSeconds($s, $e, $sub[0], $sub[1]);
        if ($ov == 0) {
            $out[] = [$s, $e];
        } else {
            if ($sub[0] > $s) {
                $out[] = [$s, min($sub[0], $e)];
            }
            if ($sub[1] < $e) {
                $out[] = [max($sub[1], $s), $e];
            }
        }
    }
    return $out;
}
function normalizeTimeInput($t) {
    if (!isset($t) || $t === null) return null;
    $t = trim($t);
    if ($t === '' || $t === '00:00:00' || $t === '00:00') return null;
    return $t;
}

/* --------- DB helpers --------- */

function getEmployeeShift($conn, $employee_id, $attendance_date) {
    $sql = "
        SELECT ess.schedule_id, ess.employee_id, ess.work_time_id AS schedule_work_time_id,
               ess.effective_date, ess.end_date, ess.recurrence_type, ess.days_of_week, ess.priority,
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
    if (!$stmt) return null;
    $stmt->bind_param("sss", $employee_id, $attendance_date, $attendance_date);
    $stmt->execute();
    $res = $stmt->get_result();
    $matches = [];
    while ($row = $res->fetch_assoc()) {
        $recurrence = $row['recurrence_type'];
        $daysOfWeek = $row['days_of_week'] ? array_map('trim', explode(',', $row['days_of_week'])) : [];
        $dayName = date("D", strtotime($attendance_date)); // 'Mon','Tue',...
        $is_match = false;

        if (!empty($daysOfWeek)) {
            if (in_array($dayName, $daysOfWeek)) $is_match = true;
        } else {
            if ($recurrence === 'none' && $row['effective_date'] === $attendance_date) $is_match = true;
            elseif ($recurrence === 'weekly') $is_match = true;
            elseif ($recurrence === 'daily') $is_match = true;
            elseif ($recurrence === 'monthly' && date("d", strtotime($row['effective_date'])) === date("d", strtotime($attendance_date))) $is_match = true;
        }

        if ($is_match) {
            $matches[] = [
                'schedule_id' => $row['schedule_id'],
                'work_time_id' => intval($row['schedule_work_time_id']),
                'effective_date' => $row['effective_date'],
                'end_date' => $row['end_date'],
                'recurrence_type' => $row['recurrence_type'],
                'days_of_week' => $row['days_of_week'],
                'priority' => intval($row['priority']),
                'wt' => [
                    'wt_id' => intval($row['wt_id']),
                    'shift_name' => $row['shift_name'],
                    'start_time' => $row['start_time'],
                    'end_time' => $row['end_time'],
                    'total_minutes' => intval($row['total_minutes']),
                    'valid_in_start' => $row['valid_in_start'],
                    'valid_in_end' => $row['valid_in_end']
                ]
            ];
        }
    }
    $stmt->close();

    if (count($matches) === 0) {
        $default_sql = "SELECT id AS wt_id, shift_name, start_time, end_time, is_default, total_minutes, valid_in_start, valid_in_end FROM work_time WHERE is_default = 1 LIMIT 1";
        $default_result = $conn->query($default_sql);
        if ($default_result && $default_row = $default_result->fetch_assoc()) {
            $default_row['from_default'] = true;
            $default_row['conflicts'] = [];
            $default_row['selected_schedule_id'] = null;
            return $default_row;
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
        'wt_id' => $sel['wt']['wt_id'],
        'shift_name' => $sel['wt']['shift_name'],
        'start_time' => $sel['wt']['start_time'],
        'end_time' => $sel['wt']['end_time'],
        'total_minutes' => $sel['wt']['total_minutes'],
        'valid_in_start' => $sel['wt']['valid_in_start'],
        'valid_in_end' => $sel['wt']['valid_in_end'],
        'from_default' => false,
        'conflicts' => count($matches) > 1 ? $matches : [],
        'selected_schedule_id' => $sel['schedule_id'],
        'selected_priority' => $sel['priority']
    ];
}

function getShiftBreaks($conn, $work_time_id) {
    $sql = "
        SELECT bt.id, bt.break_name, bt.break_start, bt.break_end,
               (TIME_TO_SEC(TIMEDIFF(bt.break_end, bt.break_start)) / 60) AS break_minutes
        FROM break_time bt
        JOIN work_time_break wtb ON bt.id = wtb.break_id
        WHERE wtb.work_time_id = ?
        ORDER BY bt.break_start
    ";
    $stmt = $conn->prepare($sql);
    if (!$stmt) return [];
    $stmt->bind_param("i", $work_time_id);
    $stmt->execute();
    $res = $stmt->get_result();
    $arr = [];
    while ($r = $res->fetch_assoc()) {
        $r['break_minutes'] = floatval($r['break_minutes']);
        $arr[] = $r;
    }
    $stmt->close();
    return $arr;
}

function getLateTierForWorkTime($conn, $work_time_id) {
    $sql = "SELECT tier_id FROM work_time_late_deduction WHERE work_time_id = ? LIMIT 1";
    $stmt = $conn->prepare($sql);
    if (!$stmt) return null;
    $stmt->bind_param("i", $work_time_id);
    $stmt->execute();
    $res = $stmt->get_result();
    $tier_id = null;
    if ($row = $res->fetch_assoc()) $tier_id = $row['tier_id'];
    $stmt->close();
    return $tier_id;
}

/**
 * Try exact range match first; if not found, fallback to rule with largest min_minutes <= late (best-effort).
 */
function getMatchingLateRule($conn, $tier_id, $late_minutes) {
    if (!$tier_id) return null;
    $sql = "
        SELECT id, tier_id, min_minutes, max_minutes, deduction_type, deduction_value, description
        FROM late_deduction
        WHERE tier_id = ?
          AND deduction_type = 'credit'
          AND min_minutes <= ?
          AND (max_minutes IS NULL OR max_minutes >= ?)
        ORDER BY min_minutes DESC
        LIMIT 1
    ";
    $stmt = $conn->prepare($sql);
    if ($stmt) {
        $stmt->bind_param("iii", $tier_id, $late_minutes, $late_minutes);
        $stmt->execute();
        $res = $stmt->get_result();
        $rule = $res->fetch_assoc() ?: null;
        $stmt->close();
        if ($rule) return $rule;
    }
    // fallback: largest min_minutes <= late_minutes (allow applying nearest lower bucket)
    $sql2 = "
        SELECT id, tier_id, min_minutes, max_minutes, deduction_type, deduction_value, description
        FROM late_deduction
        WHERE tier_id = ?
          AND deduction_type = 'credit'
          AND min_minutes <= ?
        ORDER BY min_minutes DESC
        LIMIT 1
    ";
    $st2 = $conn->prepare($sql2);
    if ($st2) {
        $st2->bind_param("ii", $tier_id, $late_minutes);
        $st2->execute();
        $res2 = $st2->get_result();
        $rule2 = $res2->fetch_assoc() ?: null;
        $st2->close();
        return $rule2;
    }
    return null;
}

/* --------- main --------- */
$data = json_decode(file_get_contents("php://input"), true);
if (!$data) { echo json_encode(["success"=>false,"message"=>"Invalid JSON"]); exit; }

if (!isset($data['attendance_date'], $data['employee_id'], $data['employee_name'])) {
    echo json_encode(["success"=>false,"message"=>"Missing required fields."]); exit;
}

$attendance_date   = $data['attendance_date'];
$employee_id       = $data['employee_id'];
$employee_name     = $data['employee_name'];
$time_in_morning   = normalizeTimeInput($data['time_in_morning'] ?? null);
$time_out_morning  = normalizeTimeInput($data['time_out_morning'] ?? null);
$time_in_afternoon = normalizeTimeInput($data['time_in_afternoon'] ?? null);
$time_out_afternoon= normalizeTimeInput($data['time_out_afternoon'] ?? null);

// fetch shift (robust matching)
$shift = getEmployeeShift($conn, $employee_id, $attendance_date);
if (!$shift) { echo json_encode(["success"=>false,"message"=>"No shift found"]); exit; }

$shift_wt_id = intval($shift['wt_id'] ?? 0);
$shift_start = $shift['start_time'];
$shift_end   = $shift['end_time'];
$shift_total_minutes = floatval($shift['total_minutes'] ?? 0);
$shift_valid_in_start = $shift['valid_in_start'] ?? null;
$shift_valid_in_end = $shift['valid_in_end'] ?? null;

// fetch breaks mapped to that work_time
$breaks = getShiftBreaks($conn, $shift_wt_id);

// normalize shift interval
$shiftInterval = normalizeIntervalTs($attendance_date, $shift_start, $shift_end);
if (!$shiftInterval) { echo json_encode(["success"=>false,"message"=>"Invalid shift times"]); exit; }

// build break intervals clipped to shift and compute mapped break minutes
$breakIntervals = [];
$total_mapped_break_minutes = 0;
foreach ($breaks as $br) {
    $bi = normalizeIntervalTs($attendance_date, $br['break_start'], $br['break_end']);
    if (!$bi) continue;
    $ov = overlapSeconds($shiftInterval[0], $shiftInterval[1], $bi[0], $bi[1]);
    if ($ov > 0) {
        $start_clip = max($shiftInterval[0], $bi[0]);
        $end_clip = min($shiftInterval[1], $bi[1]);
        $breakIntervals[] = [$start_clip, $end_clip];
        $total_mapped_break_minutes += intval(round($ov / 60));
    }
}

// compute working intervals = shift minus break intervals
$workingIntervals = [$shiftInterval];
foreach ($breakIntervals as $sub) {
    $new = [];
    foreach ($workingIntervals as $it) {
        $res = subtractIntervalFromIntervals([$it], $sub);
        $new = array_merge($new, $res);
    }
    $workingIntervals = $new;
}

// credit basis minutes = sum length of workingIntervals
$credit_basis_minutes = 0;
foreach ($workingIntervals as $it) {
    $credit_basis_minutes += intval(round(($it[1] - $it[0]) / 60));
}
if ($credit_basis_minutes < 1) $credit_basis_minutes = 1;

// build worked intervals from punches
$workedIntervals = [];
if ($time_in_morning && $time_out_morning) {
    $mi = normalizeIntervalTs($attendance_date, $time_in_morning, $time_out_morning);
    if ($mi) $workedIntervals[] = $mi;
}
if ($time_in_afternoon && $time_out_afternoon) {
    $ai = normalizeIntervalTs($attendance_date, $time_in_afternoon, $time_out_afternoon);
    if ($ai) $workedIntervals[] = $ai;
}

// compute actual worked minutes as overlap of workedIntervals with workingIntervals
$actual_worked_seconds = 0;
foreach ($workedIntervals as $w) {
    foreach ($workingIntervals as $wk) {
        $ov = overlapSeconds($w[0], $w[1], $wk[0], $wk[1]);
        if ($ov > 0) $actual_worked_seconds += $ov;
    }
}
$actual_rendered_minutes = intval(round($actual_worked_seconds / 60));

// compute days credited (fraction capped at 1) BEFORE late deduction
$adjusted_days = 0.0;
if ($actual_rendered_minutes > 0 && $credit_basis_minutes > 0) {
    $adjusted_days = $actual_rendered_minutes / $credit_basis_minutes;
}
$adjusted_days = max(0, min(1.0, round($adjusted_days, 2)));

// insert attendance (store applied_break_minutes, net_work_minutes for transparency)
$applied_break_minutes = intval($total_mapped_break_minutes);
$net_work_minutes = intval($credit_basis_minutes);
$early_out = 0;
$is_holiday_attendance = 0;

$sql = "INSERT INTO attendance (
            attendance_date, employee_id, employee_name,
            work_time_id, time_in_morning, time_out_morning,
            time_in_afternoon, time_out_afternoon,
            applied_break_minutes, net_work_minutes, actual_rendered_minutes,
            days_credited, early_out, is_holiday_attendance
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";
$stmt = $conn->prepare($sql);
if (!$stmt) { echo json_encode(["success"=>false,"message"=>"Prepare failed: ".$conn->error]); exit; }

$stmt->bind_param(
    "sssissssiiidii",
    $attendance_date,
    $employee_id,
    $employee_name,
    $shift_wt_id,
    $time_in_morning,
    $time_out_morning,
    $time_in_afternoon,
    $time_out_afternoon,
    $applied_break_minutes,
    $net_work_minutes,
    $actual_rendered_minutes,
    $adjusted_days,
    $early_out,
    $is_holiday_attendance
);

$ok = $stmt->execute();
$insert_id = $ok ? $conn->insert_id : null;

// optional: clear DB-trigger deductions (keeps deterministic)
if ($insert_id) {
    $clear_sql = "UPDATE attendance SET late_deduction_id = NULL, late_deduction_value = 0.0000 WHERE attendance_id = ?";
    $cst = $conn->prepare($clear_sql);
    if ($cst) { $cst->bind_param("i", $insert_id); $cst->execute(); $cst->close(); }
}

/* --------- LATE DEDUCTION CALC (NEW & FIXED) --------- */
$late_debug = [
    'applied' => false,
    'reason' => null,
    'late_minutes' => 0,
    'tier_id' => null,
    'rule' => null,
    'deduction_value' => 0.0,
    'final_days_credited' => $adjusted_days
];

if ($insert_id) {
    // choose the earliest real clock-in among available punches
    $candidates = [];
    if ($time_in_morning) $candidates[] = $time_in_morning;
    if ($time_in_afternoon) $candidates[] = $time_in_afternoon;

    // pick the earliest by timestamp (handle nulls via makeTimestamp)
    $first_in_time = null;
    $first_in_ts = null;
    foreach ($candidates as $ct) {
        $ts = makeTimestamp($attendance_date, $ct);
        if ($ts === null) continue;
        if ($first_in_ts === null || $ts < $first_in_ts) {
            $first_in_ts = $ts;
            $first_in_time = $ct;
        }
    }

    if ($first_in_ts === null) {
        $late_debug['reason'] = 'no_valid_clock_in';
    } else {
        // scheduled start ts and valid_in_end baseline
        $scheduled_start_ts = $shiftInterval[0];

        // compute valid_in_end ts (if present). default to scheduled_start + 5 minutes if missing
        if (!empty($shift_valid_in_end)) {
            $valid_in_end_ts = makeTimestamp($attendance_date, $shift_valid_in_end);
            if ($valid_in_end_ts !== null && $valid_in_end_ts < $scheduled_start_ts && ($scheduled_start_ts - $valid_in_end_ts) > (12 * 3600)) {
                $valid_in_end_ts += 24 * 3600; // handle overnight stored times
            }
        } else {
            $valid_in_end_ts = $scheduled_start_ts + (5 * 60);
        }

        // If clock-in is on next-day (e.g., shift 23:00 -> 00:10), adjust similarly
        if ($first_in_ts < $scheduled_start_ts && ($scheduled_start_ts - $first_in_ts) > (12 * 3600)) {
            $first_in_ts += 24 * 3600;
        }

        if ($first_in_ts <= $valid_in_end_ts) {
            $late_debug['reason'] = 'within_grace';
            $late_debug['late_minutes'] = 0;
            // keep days_credited as inserted ($adjusted_days)
        } else {
            // compute late minutes AFTER valid_in_end (CORRECT baseline)
            $late_minutes = intval(ceil(($first_in_ts - $valid_in_end_ts) / 60.0));
            $late_debug['late_minutes'] = $late_minutes;

            // find tier for this work_time
            $tier_id = getLateTierForWorkTime($conn, $shift_wt_id);
            $late_debug['tier_id'] = $tier_id;
            if (!$tier_id) {
                $late_debug['reason'] = 'no_tier_mapped';
            } else {
                // find matching credit rule (with fallback)
                $rule = getMatchingLateRule($conn, $tier_id, $late_minutes);
                $late_debug['rule'] = $rule;
                if (!$rule) {
                    $late_debug['reason'] = 'no_rule_match';
                } else {
                    // deduction_value is fraction-of-shift (0..1)
                    $raw_deduction = floatval($rule['deduction_value']);
                    if ($raw_deduction < 0) $raw_deduction = abs($raw_deduction);
                    if ($raw_deduction > 1) $raw_deduction = 1.0;

                    $final_days_credited = max(0.0, round($adjusted_days - $raw_deduction, 2));

                    // update attendance: update days_credited and set trace fields (late_deduction columns)
                    $update_with_rule_sql = "UPDATE attendance SET days_credited = ?, late_deduction_id = ?, late_deduction_value = ? WHERE attendance_id = ?";
                    $ut = $conn->prepare($update_with_rule_sql);
                    if ($ut) {
                        $rid = intval($rule['id']);
                        $ut->bind_param("didi", $final_days_credited, $rid, $raw_deduction, $insert_id);
                        $ut->execute();
                        $ut->close();
                    } else {
                        // fallback: update only days_credited
                        $update_only_days = $conn->prepare("UPDATE attendance SET days_credited = ? WHERE attendance_id = ?");
                        if ($update_only_days) {
                            $update_only_days->bind_param("di", $final_days_credited, $insert_id);
                            $update_only_days->execute();
                            $update_only_days->close();
                        }
                    }

                    $late_debug['applied'] = true;
                    $late_debug['reason'] = 'applied_rule';
                    $late_debug['deduction_value'] = $raw_deduction;
                    $late_debug['final_days_credited'] = $final_days_credited;
                }
            }
        }
    }
}

/* --------- response --------- */
if ($ok) {
    $resp = [
        "success" => true,
        "attendance_id" => $insert_id,
        "original_days_credited" => round($adjusted_days, 2),
        "late_debug" => $late_debug
    ];
    echo json_encode($resp);
} else {
    echo json_encode(["success" => false, "message" => $stmt->error]);
}

$stmt->close();
$conn->close();
