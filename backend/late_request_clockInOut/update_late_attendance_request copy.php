<?php
// update_late_attendance_request.php
// Endpoint-authoritative handling for late_attendance_requests
//10/7/2025
ob_start();
require_once '../server/connection.php';
include("../server/cors.php");
error_reporting(E_ALL);
ini_set('display_errors', 1);
header("Content-Type: application/json; charset=UTF-8");

/* ---------- helpers (from admin logic) ---------- */
define('DEFAULT_BLOCK_GRACE_SECONDS', 5 * 60);

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
    if (preg_match('/^\d{2}:\d{2}$/', $t)) $t .= ':00';
    return $t;
}

/* ---------- DB helpers ---------- */
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
        $dayName = date("D", strtotime($attendance_date));
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
               bt.valid_break_in_start, bt.valid_break_in_end, bt.valid_break_out_start, bt.valid_break_out_end,
               (TIME_TO_SEC(TIMEDIFF(bt.break_end, bt.break_start)) / 60) AS break_minutes,
               COALESCE(bt.is_shift_split, 0) AS is_shift_split
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
        $r['is_shift_split'] = intval($r['is_shift_split']);
        $arr[] = $r;
    }
    $stmt->close();
    return $arr;
}

function getLateTierForWorkTimeBlock($conn, $work_time_id, $block_index = null) {
    if ($block_index !== null) {
        $sql = "SELECT tier_id FROM work_time_late_deduction WHERE work_time_id = ? AND block_index = ? LIMIT 1";
        $st = $conn->prepare($sql);
        if ($st) {
            $st->bind_param("ii", $work_time_id, $block_index);
            $st->execute();
            $res = $st->get_result();
            if ($row = $res->fetch_assoc()) {
                $tid = $row['tier_id'];
                $st->close();
                return $tid;
            }
            $st->close();
        }
    }
    $sql2 = "SELECT tier_id FROM work_time_late_deduction WHERE work_time_id = ? AND (block_index IS NULL OR block_index = 0) LIMIT 1";
    $st2 = $conn->prepare($sql2);
    if ($st2) {
        $st2->bind_param("i", $work_time_id);
        $st2->execute();
        $res2 = $st2->get_result();
        if ($row2 = $res2->fetch_assoc()) {
            $tid2 = $row2['tier_id'];
            $st2->close();
            return $tid2;
        }
        $st2->close();
    }
    return null;
}

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
    // fallback nearest lower bucket
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

function fetchWorkTimeById($conn, $wt_id) {
    $sql = "SELECT id AS wt_id, shift_name, start_time, end_time, total_minutes, valid_in_start, valid_in_end FROM work_time WHERE id = ? LIMIT 1";
    $st = $conn->prepare($sql);
    if (!$st) return null;
    $st->bind_param("i", $wt_id);
    $st->execute();
    $res = $st->get_result();
    $r = $res->fetch_assoc() ?: null;
    $st->close();
    return $r;
}

/* ---------- block-aware attendance processing ---------- */
/**
 * See earlier admin logic; returns array with success and debug
 * Accepts optional $override_work_time_id to force using the work_time row stored in request.
 */
function process_block_aware_attendance($conn, $employee_id, $employee_name, $attendance_date, $time_in_morning, $time_out_morning, $time_in_afternoon, $time_out_afternoon, $override_work_time_id = null) {
    $resp = [
        'success' => false,
        'attendance_id' => null,
        'original_days_credited' => 0.0,
        'late_debug' => null,
        'message' => null
    ];

    // normalize inputs
    $time_in_morning   = normalizeTimeInput($time_in_morning);
    $time_out_morning  = normalizeTimeInput($time_out_morning);
    $time_in_afternoon = normalizeTimeInput($time_in_afternoon);
    $time_out_afternoon= normalizeTimeInput($time_out_afternoon);

    // mobile normalization
    if (!empty($time_in_afternoon)) {
        $in_afternoon_ts = strtotime($time_in_afternoon);
        if ($in_afternoon_ts >= strtotime("12:30:00") && $in_afternoon_ts <= strtotime("13:05:00")) {
            $time_in_afternoon = "13:00:00";
        }
    }
    if (!empty($time_out_morning)) {
        $out_morning_ts = strtotime($time_out_morning);
        if ($out_morning_ts >= strtotime("12:00:00") && $out_morning_ts <= strtotime("12:30:00")) {
            $time_out_morning = "12:00:00";
        }
    }

    // choose shift: prefer override then fallback to schedule search then default work_time
    $shift = null;
    if ($override_work_time_id) {
        $wt = fetchWorkTimeById($conn, intval($override_work_time_id));
        if ($wt) {
            $shift = [
                'wt_id' => intval($wt['wt_id']),
                'shift_name' => $wt['shift_name'],
                'start_time' => $wt['start_time'],
                'end_time' => $wt['end_time'],
                'total_minutes' => intval($wt['total_minutes']),
                'valid_in_start' => $wt['valid_in_start'],
                'valid_in_end' => $wt['valid_in_end'],
                'from_default' => false,
                'conflicts' => [],
                'selected_schedule_id' => null
            ];
        }
    }

    if (!$shift) {
        $shift = getEmployeeShift($conn, $employee_id, $attendance_date);
    }

    if (!$shift) {
        $resp['message'] = "No shift found";
        return $resp;
    }

    $shift_wt_id = intval($shift['wt_id'] ?? 0);
    $shift_start = $shift['start_time'];
    $shift_end   = $shift['end_time'];
    $shift_valid_in_start = $shift['valid_in_start'] ?? null;
    $shift_valid_in_end = $shift['valid_in_end'] ?? null;

    // breaks
    $breaks = getShiftBreaks($conn, $shift_wt_id);

    // normalize shift interval
    $shiftInterval = normalizeIntervalTs($attendance_date, $shift_start, $shift_end);
    if (!$shiftInterval) {
        $resp['message'] = "Invalid shift times";
        return $resp;
    }

    // build break intervals clipped to shift
    $breakIntervals = [];
    $total_mapped_break_minutes = 0;
    foreach ($breaks as $br) {
        $bi = normalizeIntervalTs($attendance_date, $br['break_start'], $br['break_end']);
        if (!$bi) continue;
        $ov = overlapSeconds($shiftInterval[0], $shiftInterval[1], $bi[0], $bi[1]);
        if ($ov > 0) {
            $start_clip = max($shiftInterval[0], $bi[0]);
            $end_clip = min($shiftInterval[1], $bi[1]);
            $breakIntervals[] = [
                'range' => [$start_clip, $end_clip],
                'is_shift_split' => intval($br['is_shift_split']),
                'raw_break_start_ts' => $bi[0],
                'raw_break_end_ts' => $bi[1],
                'clipped_break_start_ts' => $start_clip,
                'clipped_break_end_ts' => $end_clip,
                'break_start_str' => $br['break_start'],
                'break_end_str' => $br['break_end'],
                'valid_break_in_start_str' => $br['valid_break_in_start'],
                'valid_break_in_end_str'   => $br['valid_break_in_end'],
                'valid_break_out_start_str'=> $br['valid_break_out_start'],
                'valid_break_out_end_str'  => $br['valid_break_out_end'],
                'break_name' => $br['break_name']
            ];
            $total_mapped_break_minutes += intval(round($ov / 60));
        }
    }

    // compute working intervals = shift minus break intervals
    $workingIntervals = [$shiftInterval];
    foreach ($breakIntervals as $subMeta) {
        $sub = $subMeta['range'];
        $new = [];
        foreach ($workingIntervals as $it) {
            $res = subtractIntervalFromIntervals([$it], $sub);
            $new = array_merge($new, $res);
        }
        $workingIntervals = $new;
    }

    // credit basis minutes
    $credit_basis_minutes = 0;
    foreach ($workingIntervals as $it) {
        $credit_basis_minutes += intval(round(($it[1] - $it[0]) / 60));
    }
    if ($credit_basis_minutes < 1) $credit_basis_minutes = 1;

    // build worked intervals
    $workedIntervals = [];
    if ($time_in_morning && $time_out_morning) {
        $mi = normalizeIntervalTs($attendance_date, $time_in_morning, $time_out_morning);
        if ($mi) $workedIntervals[] = $mi;
    }
    if ($time_in_afternoon && $time_out_afternoon) {
        $ai = normalizeIntervalTs($attendance_date, $time_in_afternoon, $time_out_afternoon);
        if ($ai) $workedIntervals[] = $ai;
    }

    // compute actual worked minutes
    $actual_worked_seconds = 0;
    foreach ($workedIntervals as $w) {
        foreach ($workingIntervals as $wk) {
            $ov = overlapSeconds($w[0], $w[1], $wk[0], $wk[1]);
            if ($ov > 0) $actual_worked_seconds += $ov;
        }
    }
    $actual_rendered_minutes = intval(round($actual_worked_seconds / 60));

    // adjusted days
    $adjusted_days = 0.0;
    if ($actual_rendered_minutes > 0 && $credit_basis_minutes > 0) {
        $adjusted_days = $actual_rendered_minutes / $credit_basis_minutes;
    }
    $adjusted_days = max(0, min(1.0, round($adjusted_days, 2)));

    // holiday detection
    $is_holiday_attendance = 0;
    $holiday_sql = "SELECT * FROM holidays 
                    WHERE (holiday_date = ? OR (is_recurring = 1 AND DATE_FORMAT(holiday_date, '%m-%d') = DATE_FORMAT(?, '%m-%d')))
                    AND (extended_until IS NULL OR extended_until = '0000-00-00' OR extended_until >= ?)
                    LIMIT 1";
    $holiday_stmt = $conn->prepare($holiday_sql);
    if ($holiday_stmt) {
        $holiday_stmt->bind_param("sss", $attendance_date, $attendance_date, $attendance_date);
        $holiday_stmt->execute();
        $holiday_result = $holiday_stmt->get_result();
        if ($holiday_result && $holiday_result->num_rows > 0) {
            $holiday_row = $holiday_result->fetch_assoc();
            $is_holiday_attendance = 1;
            $multiplier = isset($holiday_row['default_multiplier']) ? floatval($holiday_row['default_multiplier']) : 1.0;
            $apply_multiplier = isset($holiday_row['apply_multiplier']) ? boolval($holiday_row['apply_multiplier']) : false;
            if ($apply_multiplier && round($adjusted_days, 2) === 1.0) {
                $adjusted_days = round($adjusted_days * $multiplier, 2);
            }
        }
        $holiday_stmt->close();
    }

    // early out detection
    $early_out = 0;
    if (($time_out_morning && strtotime($time_out_morning) < strtotime("12:00:00")) ||
        ($time_out_afternoon && strtotime($time_out_afternoon) < strtotime("17:00:00"))) {
        $early_out = 1;
    }

    // initial insert/update of attendance (store many columns)
    $applied_break_minutes = intval($total_mapped_break_minutes);
    $net_work_minutes = intval($credit_basis_minutes);

    // fetch attendance_id (if exists)
    $chk_sql = "SELECT attendance_id FROM attendance WHERE employee_id = ? AND attendance_date = ? LIMIT 1";
    $chk_st = $conn->prepare($chk_sql);
    if (!$chk_st) {
        $resp['message'] = "prepare failed: ".$conn->error;
        return $resp;
    }
    $existing_attendance_id = null;
    $chk_st->bind_param("ss", $employee_id, $attendance_date);
    $chk_st->execute();
    $chk_st->bind_result($existing_attendance_id);
    $found = $chk_st->fetch() ? true : false;
    $chk_st->close();

    if ($found && $existing_attendance_id) {
        // update
        $sql = "UPDATE attendance SET
                    work_time_id = ?,
                    time_in_morning = ?,
                    time_out_morning = ?,
                    time_in_afternoon = ?,
                    time_out_afternoon = ?,
                    applied_break_minutes = ?,
                    net_work_minutes = ?,
                    actual_rendered_minutes = ?,
                    days_credited = ?,
                    early_out = ?,
                    is_holiday_attendance = ?
                WHERE attendance_id = ?";
        $st = $conn->prepare($sql);
        if (!$st) {
            $resp['message'] = "prepare failed: ".$conn->error;
            return $resp;
        }
        $st->bind_param(
            "issssiiidiii",
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
            $is_holiday_attendance,
            $existing_attendance_id
        );
        $ok = $st->execute();
        $st->close();
        $attendance_id = $existing_attendance_id;
    } else {
        // insert
        $sql = "INSERT INTO attendance (
                    attendance_date, employee_id, employee_name,
                    work_time_id, time_in_morning, time_out_morning,
                    time_in_afternoon, time_out_afternoon,
                    applied_break_minutes, net_work_minutes, actual_rendered_minutes,
                    days_credited, early_out, is_holiday_attendance
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";
        $st = $conn->prepare($sql);
        if (!$st) {
            $resp['message'] = "prepare failed: ".$conn->error;
            return $resp;
        }
        $st->bind_param(
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
        $ok = $st->execute();
        $attendance_id = $ok ? $conn->insert_id : null;
        $st->close();
    }

    if (!$ok) {
        $resp['message'] = "Failed to write attendance";
        return $resp;
    }

    // clear existing late deduction fields
    $clear_sql = "UPDATE attendance SET late_deduction_id = NULL, late_deduction_value = 0.0000, deducted_days = 0.00 WHERE attendance_id = ?";
    $cst = $conn->prepare($clear_sql);
    if ($cst) { $cst->bind_param("i", $attendance_id); $cst->execute(); $cst->close(); }

    // LATE deduction (block-aware)
    $late_debug = [
        'applied' => false,
        'reason' => null,
        'late_minutes' => 0,
        'tier_id' => null,
        'rule' => null,
        'deduction_value' => 0.0,
        'final_days_credited' => $adjusted_days,
        'checks' => []
    ];

    // build blocks
    $blocks = [];
    foreach ($workingIntervals as $i => $it) {
        $secs = max(0, $it[1] - $it[0]);
        $blocks[] = [
            'index' => $i + 1,
            'start' => $it[0],
            'end' => $it[1],
            'seconds' => $secs,
            'worked_seconds' => 0,
            'coverage' => 0.0
        ];
    }
    // coverage
    foreach ($blocks as &$b) {
        foreach ($workedIntervals as $w) {
            $b['worked_seconds'] += overlapSeconds($b['start'], $b['end'], $w[0], $w[1]);
        }
        $b['coverage'] = ($b['seconds'] > 0) ? ($b['worked_seconds'] / $b['seconds']) : 0;
    }
    unset($b);

    $total_deduction_fraction = 0.0;
    $applied_rules = [];
    $last_rule_id = null;

    foreach ($blocks as $b) {
        $block_in = null;
        foreach ($workedIntervals as $w) {
            if ($w[0] >= $b['start'] && $w[0] <= $b['end']) {
                $block_in = $w[0];
                break;
            }
            if ($w[0] < $b['start'] && ($b['start'] - $w[0]) < 30*60 && $w[1] > $b['start']) {
                $block_in = $w[0];
                break;
            }
        }
        if (!$block_in) continue;

        $used_baseline = 'default';
        if ($b['index'] == 1 && !empty($shift_valid_in_end)) {
            $block_valid_in_end_ts = makeTimestamp($attendance_date, $shift_valid_in_end);
            if ($block_valid_in_end_ts !== null && $block_valid_in_end_ts < $b['start'] && ($b['start'] - $block_valid_in_end_ts) > (12*3600)) {
                $block_valid_in_end_ts += 24*3600;
            }
            $used_baseline = 'shift_valid_in_end';
        } else {
            $block_valid_in_end_ts = $b['start'] + DEFAULT_BLOCK_GRACE_SECONDS;
            $preceding_break_index = $b['index'] - 2;
            if ($preceding_break_index >= 0 && isset($breakIntervals[$preceding_break_index])) {
                $preceding_break = $breakIntervals[$preceding_break_index];
                if (!empty($preceding_break['is_shift_split'])) {
                    $vbie = $preceding_break['valid_break_in_end_str'] ?? null;
                    if (!empty($vbie)) {
                        $ts = makeTimestamp($attendance_date, $vbie);
                        if ($ts !== null) {
                            if ($ts < $b['start'] && ($b['start'] - $ts) > (12*3600)) $ts += 24*3600;
                            $block_valid_in_end_ts = $ts;
                            $used_baseline = 'preceding_break.valid_break_in_end';
                        } else {
                            $block_valid_in_end_ts = $preceding_break['clipped_break_end_ts'];
                            $used_baseline = 'preceding_break.clipped_break_end';
                        }
                    } else {
                        $block_valid_in_end_ts = $preceding_break['clipped_break_end_ts'];
                        $used_baseline = 'preceding_break.clipped_break_end';
                    }
                }
            }
        }

        if ($block_in < $b['start'] && ($b['start'] - $block_in) > (12*3600)) {
            $block_in += 24*3600;
        }

        $check = [
            'block_index' => $b['index'],
            'block_start' => date('H:i:s', $b['start']),
            'block_end' => date('H:i:s', $b['end']),
            'block_valid_end_ts' => date('Y-m-d H:i:s', $block_valid_in_end_ts),
            'baseline_source' => $used_baseline,
            'punch_in_time' => date('H:i:s', $block_in),
            'punch_in_ts' => $block_in,
            'computed_late_minutes' => null,
            'tier_id' => null,
            'matched_rule' => null
        ];

        if ($block_in > $block_valid_in_end_ts) {
            $late_minutes = intval(ceil(($block_in - $block_valid_in_end_ts)/60.0));
            $check['computed_late_minutes'] = $late_minutes;

            $tier_id = getLateTierForWorkTimeBlock($conn, $shift_wt_id, $b['index']);
            $check['tier_id'] = $tier_id;
            if ($tier_id) {
                $rule = getMatchingLateRule($conn, $tier_id, $late_minutes);
                if ($rule) {
                    $ded_fraction = floatval($rule['deduction_value']);
                    if ($ded_fraction < 0) $ded_fraction = abs($ded_fraction);
                    if ($ded_fraction > 1) $ded_fraction = 1.0;

                    $total_deduction_fraction += $ded_fraction;
                    if ($total_deduction_fraction > 1.0) $total_deduction_fraction = 1.0;

                    $last_rule_id = isset($rule['id']) ? intval($rule['id']) : $last_rule_id;

                    $applied_rules[] = [
                        'block' => $b['index'],
                        'late_minutes' => $late_minutes,
                        'rule' => $rule,
                        'deduction_fraction' => $ded_fraction
                    ];

                    $check['matched_rule'] = [
                        'id' => $rule['id'],
                        'min' => $rule['min_minutes'],
                        'max' => $rule['max_minutes'],
                        'deduction' => $rule['deduction_value']
                    ];
                }
            }
        } else {
            $check['computed_late_minutes'] = 0;
        }

        $late_debug['checks'][] = $check;
    } // foreach blocks

    if ($total_deduction_fraction > 0) {
        $late_deduction_value_db = round($total_deduction_fraction, 4);
        $deducted_days_db = round($total_deduction_fraction, 2);
        $final_days_credited = max(0.0, round($adjusted_days - $deducted_days_db, 2));

        if ($last_rule_id === null) {
            $update_sql = "UPDATE attendance 
                SET days_credited = ?, late_deduction_value = ?, deducted_days = ?, late_deduction_id = NULL
                WHERE attendance_id = ?";
            $ut = $conn->prepare($update_sql);
            if ($ut) {
                $ut->bind_param("dddi", $final_days_credited, $late_deduction_value_db, $deducted_days_db, $attendance_id);
                $ut->execute();
                $ut->close();
            }
        } else {
            $update_sql = "UPDATE attendance 
                SET days_credited = ?, late_deduction_value = ?, deducted_days = ?, late_deduction_id = ?
                WHERE attendance_id = ?";
            $ut = $conn->prepare($update_sql);
            if ($ut) {
                $ut->bind_param("dddii", $final_days_credited, $late_deduction_value_db, $deducted_days_db, $last_rule_id, $attendance_id);
                $ut->execute();
                $ut->close();
            }
        }

        $late_debug['applied'] = true;
        $late_debug['reason'] = 'applied_rule_fraction_directly';
        $late_debug['deduction_value'] = $late_deduction_value_db;
        $late_debug['final_days_credited'] = $final_days_credited;
        $late_debug['details'] = $applied_rules;
    } else {
        $late_debug['reason'] = 'no_block_late';
    }

    $resp['success'] = true;
    $resp['attendance_id'] = $attendance_id;
    $resp['original_days_credited'] = round($adjusted_days, 2);
    $resp['late_debug'] = $late_debug;
    return $resp;
}

/* ------------------ main endpoint logic ------------------ */

$input_id = isset($_POST['id']) ? intval($_POST['id']) : null;
$status_raw = isset($_POST['status']) ? strtolower(trim($_POST['status'])) : null;
$reviewed_by = isset($_POST['reviewed_by']) ? $_POST['reviewed_by'] : null;

if (!$input_id || !$status_raw || !$reviewed_by) {
    echo json_encode(["success" => false, "message" => "Missing required fields: id, status, reviewed_by."]);
    exit;
}

$valid_statuses = ['pending','approved','rejected'];
if (!in_array($status_raw, $valid_statuses)) {
    echo json_encode(["success" => false, "message" => "Invalid status."]);
    exit;
}

$conn->begin_transaction();
try {
    // fetch existing request (locked)
    $fetchSql = "SELECT * FROM late_attendance_requests WHERE request_id = ? FOR UPDATE";
    $fetchStmt = $conn->prepare($fetchSql);
    if (!$fetchStmt) throw new Exception("Prepare failed: ".$conn->error);
    $fetchStmt->bind_param("i", $input_id);
    $fetchStmt->execute();
    $res = $fetchStmt->get_result();
    $old_req = $res->fetch_assoc();
    $fetchStmt->close();

    if (!$old_req) throw new Exception("Request not found.");

    $old_status = strtolower($old_req['status']);
    $employee_id = $old_req['employee_id'];
    $employee_name = $old_req['employee_name'];
    $attendance_date = $old_req['attendance_date'];

    // APPROVE: backup original attendance times into request.original_* and process attendance
    if ($status_raw === 'approved' && $old_status !== 'approved') {
        // read existing attendance times (if any)
        $attSql = "SELECT time_in_morning, time_out_morning, time_in_afternoon, time_out_afternoon, attendance_id FROM attendance WHERE employee_id = ? AND attendance_date = ? LIMIT 1";
        $v_in_morning = $v_out_morning = $v_in_afternoon = $v_out_afternoon = $found_att_id = null;
        $ast = $conn->prepare($attSql);
        if (!$ast) throw new Exception("Prepare failed: ".$conn->error);
        $ast->bind_param("ss", $employee_id, $attendance_date);
        $ast->execute();
        $ast->bind_result($v_in_morning, $v_out_morning, $v_in_afternoon, $v_out_afternoon, $found_att_id);
        $has_att = $ast->fetch() ? true : false;
        $ast->close();

        // update request with original_* values and set status = approved
        $updReqSql = "UPDATE late_attendance_requests SET original_time_in_morning = ?, original_time_out_morning = ?, original_time_in_afternoon = ?, original_time_out_afternoon = ?, status = ?, reviewed_by = ?, reviewed_at = NOW() WHERE request_id = ?";
        $urz = $conn->prepare($updReqSql);
        if (!$urz) throw new Exception("Prepare failed: ".$conn->error);
        $urz->bind_param("ssssssi", $v_in_morning, $v_out_morning, $v_in_afternoon, $v_out_afternoon, $status_raw, $reviewed_by, $input_id);
        if (!$urz->execute()) {
            $urz->close();
            throw new Exception("Failed to update request backup: " . $urz->error);
        }
        $urz->close();

        // process attendance using the requested times, prefer stored work_time_id
        $time_in_morning = $old_req['requested_time_in_morning'];
        $time_out_morning = $old_req['requested_time_out_morning'];
        $time_in_afternoon = $old_req['requested_time_in_afternoon'];
        $time_out_afternoon = $old_req['requested_time_out_afternoon'];
        $override_wt = isset($old_req['work_time_id']) ? intval($old_req['work_time_id']) : null;

        $proc = process_block_aware_attendance($conn, $employee_id, $employee_name, $attendance_date,
            $time_in_morning, $time_out_morning, $time_in_afternoon, $time_out_afternoon, $override_wt);

        if (!$proc['success']) {
            throw new Exception("Attendance processing failed: " . ($proc['message'] ?? 'unknown'));
        }

        $conn->commit();
        echo json_encode([
            "success" => true,
            "message" => "Request approved and attendance processed.",
            "attendance_id" => $proc['attendance_id'],
            "late_debug" => $proc['late_debug']
        ]);
        exit;
    }

    // REJECT: if previous was approved -> restore original times
    if ($status_raw === 'rejected' && $old_status === 'approved') {
        // update request status first
        $updReqSql = "UPDATE late_attendance_requests SET status = ?, reviewed_by = ?, reviewed_at = NOW() WHERE request_id = ?";
        $urz = $conn->prepare($updReqSql);
        if (!$urz) throw new Exception("Prepare failed: ".$conn->error);
        $urz->bind_param("ssi", $status_raw, $reviewed_by, $input_id);
        if (!$urz->execute()) {
            $urz->close();
            throw new Exception("Failed to update request status: " . $urz->error);
        }
        $urz->close();

        // restore attendance times from request.original_*
        $restoreSql = "UPDATE attendance SET time_in_morning = ?, time_out_morning = ?, time_in_afternoon = ?, time_out_afternoon = ? WHERE employee_id = ? AND attendance_date = ?";
        $rst = $conn->prepare($restoreSql);
        if (!$rst) throw new Exception("Prepare failed: ".$conn->error);
        $orig_in_m = $old_req['original_time_in_morning'];
        $orig_out_m = $old_req['original_time_out_morning'];
        $orig_in_a = $old_req['original_time_in_afternoon'];
        $orig_out_a = $old_req['original_time_out_afternoon'];
        $rst->bind_param("ssssss", $orig_in_m, $orig_out_m, $orig_in_a, $orig_out_a, $employee_id, $attendance_date);
        $rst->execute();
        $rst->close();

        $conn->commit();
        echo json_encode(["success" => true, "message" => "Request rejected and original attendance restored."]);
        exit;
    }

    // otherwise just update status/reviewed_by
    $updReqSql = "UPDATE late_attendance_requests SET status = ?, reviewed_by = ?, reviewed_at = NOW() WHERE request_id = ?";
    $urz = $conn->prepare($updReqSql);
    if (!$urz) throw new Exception("Prepare failed: ".$conn->error);
    $urz->bind_param("ssi", $status_raw, $reviewed_by, $input_id);
    if (!$urz->execute()) {
        $urz->close();
        throw new Exception("Failed to update request status: " . $urz->error);
    }
    $urz->close();

    $conn->commit();
    echo json_encode(["success" => true, "message" => "Request status updated."]);
    exit;

} catch (Exception $ex) {
    $conn->rollback();
    echo json_encode(["success" => false, "message" => $ex->getMessage()]);
    exit;
}

$conn->close();
