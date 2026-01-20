<?php
// create_attendance.php  (Block-aware late deduction; second block baseline uses preceding break.valid_break_in_end when is_shift_split=1)
// Updated: ignore minutes lost from LATE IN when computing initial days_credited (those minutes are treated as if worked for credit calculation)
// - early-out still reduces credited time
// - late deduction per-tier still applies afterwards
// - no rounding up: conversions from seconds->minutes use floor(), late minutes use floor(), days truncation to 2 decimals uses floor()
//10/6/2025
ob_start();
include("../server/cors.php");
include '../server/connection.php';
error_reporting(E_ALL);
ini_set('display_errors', 1);
header("Content-Type: application/json; charset=UTF-8");

/* --------- config / thresholds --------- */
define('DEFAULT_BLOCK_GRACE_SECONDS', 5 * 60); // fallback grace for non-first blocks

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


// return true if schedule row matches attendance_date given recurrence rules
function schedule_matches_date($row, $attendance_date) {
    $recurrence = $row['recurrence_type'];
    $interval = max(1, intval($row['recurrence_interval'] ?? 1));
    $occ_limit = ($row['occurrence_limit'] !== null && $row['occurrence_limit'] !== '') ? intval($row['occurrence_limit']) : null;
    $daysOfWeek = ($row['days_of_week'] !== null && trim($row['days_of_week']) !== '') ? array_map('trim', explode(',', $row['days_of_week'])) : null;

    $eff_ts = strtotime($row['effective_date']);
    $att_ts = strtotime($attendance_date);
    if ($att_ts < $eff_ts) return false;

    if ($recurrence === 'daily') {
        $daysDiff = floor(($att_ts - $eff_ts) / 86400);
        if ($daysDiff % $interval !== 0) return false;
        // occurrence index (1-based)
        $occIndex = intval(floor($daysDiff / $interval)) + 1;
        if ($occ_limit !== null && $occIndex > $occ_limit) return false;
        return true;
    }

    if ($recurrence === 'weekly') {
        // day-of-week must match (if provided)
        $dayName = date("D", $att_ts); // 'Mon' etc
        if ($daysOfWeek !== null && !in_array($dayName, $daysOfWeek)) return false;

        // compute week index from effective_date's week boundary
        // we measure weeks as 7-day units from effective_date (weekIndex=0 covers eff_date..eff_date+6)
        $daysDiff = floor(($att_ts - $eff_ts) / 86400);
        $weekIndex = intval(floor($daysDiff / 7)); // may be 0 for first 7-day window
        if ($weekIndex % $interval !== 0) return false;

        // occurrence_limit: count matching occurrences from effective_date up to attendance_date
        if ($occ_limit !== null) {
            $count = count_schedule_occurrences_up_to($row, $attendance_date, 10000); // safe cap
            if ($count === null) return false; // safety fail
            if ($count > $occ_limit) return false;
        }
        return true;
    }

    if ($recurrence === 'monthly') {
        // compute months difference
        $y1 = intval(date("Y", $eff_ts));
        $m1 = intval(date("n", $eff_ts)); // 1-12
        $d1 = intval(date("j", $eff_ts)); // day-of-month
        $y2 = intval(date("Y", $att_ts));
        $m2 = intval(date("n", $att_ts));
        $d2 = intval(date("j", $att_ts));
        $monthsDiff = ($y2 - $y1) * 12 + ($m2 - $m1);
        if ($monthsDiff < 0) return false;
        if ($monthsDiff % $interval !== 0) return false;

        // expected day in attendance month: clamp to last day if necessary
        $lastDay = intval(date("t", strtotime(date("Y-m", $att_ts) . "-01"))); // days in month
        $expectedDay = min($d1, $lastDay);
        if ($d2 != $expectedDay) return false;

        // occurrence index (1-based)
        $occIndex = intval(floor($monthsDiff / $interval)) + 1;
        if ($occ_limit !== null && $occIndex > $occ_limit) return false;

        return true;
    }

    return false;
}

// Count occurrences from effective_date up to attendance_date (inclusive) for given schedule row.
// Returns integer count or null on error. maxIter caps iterations for safety.
function count_schedule_occurrences_up_to($row, $attendance_date, $maxIter = 10000) {
    $recurrence = $row['recurrence_type'];
    $interval = max(1, intval($row['recurrence_interval'] ?? 1));
    $daysOfWeek = ($row['days_of_week'] !== null && trim($row['days_of_week']) !== '') ? array_map('trim', explode(',', $row['days_of_week'])) : null;

    $eff_ts = strtotime($row['effective_date']);
    $att_ts = strtotime($attendance_date);
    if ($att_ts < $eff_ts) return 0;

    if ($recurrence === 'daily') {
        $daysDiff = floor(($att_ts - $eff_ts) / 86400);
        $count = intval(floor($daysDiff / $interval)) + 1;
        return $count;
    }

    if ($recurrence === 'monthly') {
        $y1 = intval(date("Y", $eff_ts));
        $m1 = intval(date("n", $eff_ts));
        $y2 = intval(date("Y", $att_ts));
        $m2 = intval(date("n", $att_ts));
        $monthsDiff = ($y2 - $y1) * 12 + ($m2 - $m1);
        $count = intval(floor($monthsDiff / $interval)) + 1;
        return $count;
    }

    if ($recurrence === 'weekly') {
        // When weekdays are specified there may be multiple occurrences per interval window.
        // Easiest safe approach: iterate day-by-day from effective_date to attendance_date and count matches.
        $count = 0;
        $cur = $eff_ts;
        $iters = 0;
        while ($cur <= $att_ts && $iters < $maxIter) {
            $iters++;
            // check if cur is an occurrence
            $candidateDate = date("Y-m-d", $cur);
            // for weekly match, we need to apply same logic as schedule_matches_date but for each day
            if (schedule_matches_date_for_counting($row, $candidateDate)) {
                $count++;
            }
            // move to next day
            $cur = strtotime("+1 day", $cur);
        }
        if ($iters >= $maxIter) return null;
        return $count;
    }

    // fallback: no recurrence or unknown type
    return 0;
}

// internal small helper used by the day-by-day counting function to decide if a date is an occurrence
function schedule_matches_date_for_counting($row, $candidateDate) {
    $recurrence = $row['recurrence_type'];
    $interval = max(1, intval($row['recurrence_interval'] ?? 1));
    $daysOfWeek = ($row['days_of_week'] !== null && trim($row['days_of_week']) !== '') ? array_map('trim', explode(',', $row['days_of_week'])) : null;

    $eff_ts = strtotime($row['effective_date']);
    $cand_ts = strtotime($candidateDate);
    if ($cand_ts < $eff_ts) return false;

    if ($recurrence === 'weekly') {
        $dayName = date("D", $cand_ts);
        if ($daysOfWeek !== null && !in_array($dayName, $daysOfWeek)) return false;
        $daysDiff = floor(($cand_ts - $eff_ts) / 86400);
        $weekIndex = intval(floor($daysDiff / 7));
        if ($weekIndex % $interval !== 0) return false;
        return true;
    }

    // other recurrence types are checked in other functions and shouldn't reach here in this context
    return false;
}


/* --------- DB helpers (updated to include break valid_* fields) --------- */

function getEmployeeShift($conn, $employee_id, $attendance_date) {
    $sql = "
        SELECT ess.schedule_id, ess.employee_id, ess.work_time_id AS schedule_work_time_id,
               ess.effective_date, ess.end_date, ess.recurrence_type, ess.days_of_week, ess.priority,
               COALESCE(ess.recurrence_interval, 1) AS recurrence_interval,
               ess.occurrence_limit,
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
        // normalize fields
        $row['recurrence_interval'] = intval($row['recurrence_interval'] ?? 1);
        $row['occurrence_limit'] = ($row['occurrence_limit'] !== null && $row['occurrence_limit'] !== '') ? intval($row['occurrence_limit']) : null;
        $recurrence = $row['recurrence_type'];
        $daysOfWeek = ($row['days_of_week'] !== null && trim($row['days_of_week']) !== '') ? array_map('trim', explode(',', $row['days_of_week'])) : null;
        // date name 'Mon','Tue' etc.
        $dayName = date("D", strtotime($attendance_date));

        // helper closure: determines whether this schedule matches attendance_date
        $is_match = false;

        // If recurrence_type is 'none' => match only on exact effective_date
        if ($recurrence === 'none') {
            if ($row['effective_date'] === $attendance_date) {
                $is_match = true;
            } else {
                $is_match = false;
            }
        } else {
            // if effective_date is in the future - do not match
            if (strtotime($row['effective_date']) > strtotime($attendance_date)) {
                $is_match = false;
            } else {
                // delegate to helper that handles daily/weekly/monthly/intervals/occurrence_limit
                if (schedule_matches_date($row, $attendance_date)) {
                    $is_match = true;
                } else {
                    $is_match = false;
                }
            }
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
    // include valid_break_in_end etc so we can use DB-configured baselines
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
    // fallback to nearest lower bucket
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

// fetch breaks mapped to that work_time (includes is_shift_split)
$breaks = getShiftBreaks($conn, $shift_wt_id);

// normalize shift interval
$shiftInterval = normalizeIntervalTs($attendance_date, $shift_start, $shift_end);
if (!$shiftInterval) { echo json_encode(["success"=>false,"message"=>"Invalid shift times"]); exit; }

// build break intervals clipped to shift and compute mapped break minutes (and keep is_shift_split + raw timestamps + valid_* strings)
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
        // use floor() not round()
        $total_mapped_break_minutes += intval(floor($ov / 60));
    }
}

// compute working intervals = shift minus break intervals (chronological)
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

// credit basis minutes = sum length of workingIntervals
$credit_basis_minutes = 0;
foreach ($workingIntervals as $it) {
    // use floor, not round
    $credit_basis_minutes += intval(floor(($it[1] - $it[0]) / 60));
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
// use floor when converting seconds -> minutes (no round up)
$actual_rendered_minutes = intval(floor($actual_worked_seconds / 60));

// ---- NEW: detect late-in missing seconds (per-block) and ignore them for initial day-credit calculation
$late_ignored_extra_seconds = 0;
// build blocks (chronological) from workingIntervals to inspect per-block in-punch positions
$blocks_preview = [];
foreach ($workingIntervals as $i => $it) {
    $secs = max(0, $it[1] - $it[0]);
    $blocks_preview[] = [
        'index' => $i + 1,
        'start' => $it[0],
        'end' => $it[1],
        'seconds' => $secs,
        'worked_seconds' => 0
    ];
}
// compute worked coverage per block and detect block_in
foreach ($blocks_preview as &$b) {
    foreach ($workedIntervals as $w) {
        $b['worked_seconds'] += overlapSeconds($b['start'], $b['end'], $w[0], $w[1]);
    }
    // detect first_in punch that lands in this block
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
    if ($block_in !== null) {
        // overnight adjust
        if ($block_in < $b['start'] && ($b['start'] - $block_in) > (12*3600)) $block_in += 24*3600;
        // determine baseline valid end for lateness (replicate logic used later)
        $block_valid_in_end_ts = $b['start'] + DEFAULT_BLOCK_GRACE_SECONDS;
        $preceding_break_index = $b['index'] - 2;
        if ($b['index'] == 1 && !empty($shift_valid_in_end)) {
            $block_valid_in_end_ts = makeTimestamp($attendance_date, $shift_valid_in_end);
            if ($block_valid_in_end_ts !== null && $block_valid_in_end_ts < $b['start'] && ($b['start'] - $block_valid_in_end_ts) > (12*3600)) {
                $block_valid_in_end_ts += 24*3600;
            }
        } else {
            if ($preceding_break_index >= 0 && isset($breakIntervals[$preceding_break_index])) {
                $preceding_break = $breakIntervals[$preceding_break_index];
                if (!empty($preceding_break['is_shift_split'])) {
                    $vbie = $preceding_break['valid_break_in_end_str'] ?? null;
                    if (!empty($vbie)) {
                        $ts = makeTimestamp($attendance_date, $vbie);
                        if ($ts !== null) {
                            if ($ts < $b['start'] && ($b['start'] - $ts) > (12*3600)) $ts += 24*3600;
                            $block_valid_in_end_ts = $ts;
                        } else {
                            $block_valid_in_end_ts = $preceding_break['clipped_break_end_ts'];
                        }
                    } else {
                        $block_valid_in_end_ts = $preceding_break['clipped_break_end_ts'];
                    }
                }
            }
        }

        // if block_in is after the valid baseline AND the employee did work some seconds in this block,
        // then treat the missing start seconds (block_in - block_start) as "ignored for credit" ---
        // i.e., we add back those seconds so lateness itself does not double-penalize the days_credited.
        if ($block_in > $block_valid_in_end_ts && $b['worked_seconds'] > 0) {
            $missing_seconds = max(0, $block_in - $b['start']);
            $late_ignored_extra_seconds += $missing_seconds;
        }
    }
}
unset($b);

// adjusted actual worked seconds (original actual_worked_seconds + missing seconds ignored from late-in)
$adjusted_actual_worked_seconds = $actual_worked_seconds + $late_ignored_extra_seconds;
$adjusted_rendered_minutes = intval(floor($adjusted_actual_worked_seconds / 60));

// compute days credited (fraction capped at 1) BEFORE late deduction
$adjusted_days = 0.0;
if ($adjusted_rendered_minutes > 0 && $credit_basis_minutes > 0) {
    $adjusted_days = $adjusted_rendered_minutes / $credit_basis_minutes;
}
// truncate to 2 decimals (no round up)
$adjusted_days = max(0, min(1.0, floor($adjusted_days * 100) / 100));

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

/* --------- LATE DEDUCTION CALC (BLOCK-AWARE, apply rule fraction directly) --------- */
$late_debug = [
    'applied' => false,
    'reason' => null,
    'late_minutes' => 0,
    'tier_id' => null,
    'rule' => null,
    'deduction_value' => 0.0,
    'final_days_credited' => $adjusted_days,
    'checks' => [],
    'ignored_late_in_seconds' => $late_ignored_extra_seconds
];

if ($insert_id) {
    // build block objects (chronological) from workingIntervals
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

    // compute worked coverage per block
    foreach ($blocks as &$b) {
        foreach ($workedIntervals as $w) {
            $b['worked_seconds'] += overlapSeconds($b['start'], $b['end'], $w[0], $w[1]);
        }
        $b['coverage'] = ($b['seconds'] > 0) ? ($b['worked_seconds'] / $b['seconds']) : 0;
    }
    unset($b);

    // accumulate deduction fractions directly (sum of rule.deduction_value), cap at 1.0
    $total_deduction_fraction = 0.0;
    $applied_rules = [];
    $last_rule_id = null;

    foreach ($blocks as $b) {
        // find first_in punch that lands in this block
        $block_in = null;
        foreach ($workedIntervals as $w) {
            if ($w[0] >= $b['start'] && $w[0] <= $b['end']) {
                $block_in = $w[0];
                break;
            }
            // edge-case: slightly before block start but crosses
            if ($w[0] < $b['start'] && ($b['start'] - $w[0]) < 30*60 && $w[1] > $b['start']) {
                $block_in = $w[0];
                break;
            }
        }
        if (!$block_in) continue; // no in punch in this block

        // Determine baseline for lateness
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

        // overnight adjust
        if ($block_in < $b['start'] && ($b['start'] - $block_in) > (12*3600)) {
            $block_in += 24*3600;
        }

        // prepare debug check record
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

        // check lateness
        if ($block_in > $block_valid_in_end_ts) {
            // use floor to avoid rounding up
            $late_minutes = intval(floor(($block_in - $block_valid_in_end_ts)/60.0));
            $check['computed_late_minutes'] = $late_minutes;

            $tier_id = getLateTierForWorkTimeBlock($conn, $shift_wt_id, $b['index']);
            $check['tier_id'] = $tier_id;
            if ($tier_id) {
                $rule = getMatchingLateRule($conn, $tier_id, $late_minutes);
                if ($rule) {
                    $ded_fraction = floatval($rule['deduction_value']);
                    if ($ded_fraction < 0) $ded_fraction = abs($ded_fraction);
                    if ($ded_fraction > 1) $ded_fraction = 1.0;

                    // accumulate fraction (directly). If multiple rules match across blocks we sum them and cap at 1.0
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

    // write aggregated fraction directly to DB (if any)
    if ($total_deduction_fraction > 0) {
        $late_deduction_value_db = round($total_deduction_fraction, 4); // stored precise
        $deducted_days_db = round($total_deduction_fraction, 2);       // payroll-visible
        $final_days_credited = max(0.0, floor(($adjusted_days - $deducted_days_db) * 100) / 100);

        if ($last_rule_id === null) {
            $update_sql = "UPDATE attendance 
                SET days_credited = ?, late_deduction_value = ?, deducted_days = ?, late_deduction_id = NULL
                WHERE attendance_id = ?";
            $ut = $conn->prepare($update_sql);
            if ($ut) {
                $ut->bind_param("dddi", $final_days_credited, $late_deduction_value_db, $deducted_days_db, $insert_id);
                $ut->execute();
                $ut->close();
            }
        } else {
            $update_sql = "UPDATE attendance 
                SET days_credited = ?, late_deduction_value = ?, deducted_days = ?, late_deduction_id = ?
                WHERE attendance_id = ?";
            $ut = $conn->prepare($update_sql);
            if ($ut) {
                $ut->bind_param("dddii", $final_days_credited, $late_deduction_value_db, $deducted_days_db, $last_rule_id, $insert_id);
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
}

/* --------- response --------- */
if ($ok) {
    $resp = [
        "success" => true,
        "attendance_id" => $insert_id,
        "original_days_credited" => $adjusted_days,
        "late_debug" => $late_debug
    ];
    echo json_encode($resp);
} else {
    echo json_encode(["success" => false, "message" => $stmt->error, "late_debug" => $late_debug]);
}


// ----------------- Minimal log insert (DO NOT alter attendance) -----------------
// Only stores who performed the create & a short action summary in `logs`.

// ---------------- Minimal logs insert (only writes to logs table) ----------------
// ---------------- Minimal logs insert (only writes to logs table) ----------------
// ---------------- Minimal logs insert (store full name) ----------------
if (!empty($insert_id)) {
    if (session_status() !== PHP_SESSION_ACTIVE) session_start();

    $user_full_name = null;
    $user_role = null;

    // Prefer explicit "full_name" session key (you said it must be full name)
    if (!empty($_SESSION['full_name'])) {
        $user_full_name = (string) $_SESSION['full_name'];
    }
    // fallback session keys
    if (empty($user_full_name) && !empty($_SESSION['user_full_name'])) {
        $user_full_name = (string) $_SESSION['user_full_name'];
    }
    if (empty($user_full_name) && !empty($_SESSION['name'])) {
        $user_full_name = (string) $_SESSION['name'];
    }

    // Role from session if available
    if (!empty($_SESSION['user_role'])) {
        $user_role = (string) $_SESSION['user_role'];
    } elseif (!empty($_SESSION['role'])) {
        $user_role = (string) $_SESSION['role'];
    }

    // Fallback to client-sent fields in JSON body (less secure)
    if (empty($user_full_name) && !empty($data['full_name'])) {
        $user_full_name = (string) $data['full_name'];
    }
    if (empty($user_full_name) && !empty($data['user_full_name'])) {
        $user_full_name = (string) $data['user_full_name'];
    }
    if (empty($user_role) && !empty($data['user_role'])) {
        $user_role = (string) $data['user_role'];
    }

    // Final explicit fallback so logs are clear (avoid "Unknown")
    if (empty($user_full_name)) $user_full_name = "UNAUTHENTICATED / NO ACTOR";
    if (empty($user_role)) $user_role = "UNSET";
// -- readable action message with friendly date & time formatting --
    $emp = $conn->real_escape_string($employee_id);
    $name = $conn->real_escape_string($employee_name);

    // attendance date (human): "Oct. 15, 2025"
    $attendance_date_text = "N/A";
    if (!empty($attendance_date)) {
        $ts = strtotime($attendance_date);
        if ($ts !== false) {
            $attendance_date_text = date("M. j, Y", $ts); // e.g. "Oct. 15, 2025"
        }
    }

    // helper to turn "HH:MM:SS" into "9:00 AM" or "—"
    function fmt_time_friendly($t) {
        if (empty($t) || $t === "00:00:00" || $t === "00:00") return "—";
        $d = DateTime::createFromFormat('H:i:s', $t);
        if ($d) return $d->format('g:i A'); // 12-hour e.g. 9:00 PM
        // try H:i
        $d2 = DateTime::createFromFormat('H:i', $t);
        if ($d2) return $d2->format('g:i A');
        return $t;
    }

    $am_in  = fmt_time_friendly($time_in_morning ?? null);
    $am_out = fmt_time_friendly($time_out_morning ?? null);
    $pm_in  = fmt_time_friendly($time_in_afternoon ?? null);
    $pm_out = fmt_time_friendly($time_out_afternoon ?? null);

    $applied_break = isset($applied_break_minutes) ? intval($applied_break_minutes) . " min" : "—";
    $abr_credit = isset($adjusted_days) ? number_format((float)$adjusted_days, 2) : "N/A";

    // creation timestamp (server time), e.g. "Oct. 15, 2025 at 9:00 PM"
    $created_at_text = date("M. j, Y \\a\\t g:i A");

    // if you have actor name available (from session or payload), include it
    $actor_name_for_msg = (isset($user_full_name) && trim($user_full_name) !== "") ? $conn->real_escape_string($user_full_name) : null;

    $action_msg = sprintf(
        "Created attendance for employee %s (%s) for %s. Time in AM: in %s | Time out AM: %s.  Time in PM: %s | Time out PM: %s.",
        $emp,
        $name,
        $attendance_date_text,
        $am_in,
        $am_out,
        $pm_in,
        $pm_out,
        $applied_break,
        $abr_credit,
        $created_at_text,
        $actor_name_for_msg ? " by " . $actor_name_for_msg : ""
    );


    $ins_sql = "INSERT INTO logs (user_full_name, user_role, action) VALUES (?, ?, ?)";
    $lstmt = $conn->prepare($ins_sql);
    if ($lstmt) {
        $a = $user_full_name;
        $r = $user_role;
        $lstmt->bind_param("sss", $a, $r, $action_msg);
        if (!$lstmt->execute()) {
            error_log("logs insert failed: " . $lstmt->error);
        }
        $lstmt->close();
    } else {
        error_log("logs prepare failed: " . $conn->error);
    }
}



$stmt->close();
$conn->close();
