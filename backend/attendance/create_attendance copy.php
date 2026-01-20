<?php
// add-attendance.php  (paste-ready fix: robust schedule matching + proper break handling)
ob_start();
include("../server/cors.php");
include "../server/connection.php";
error_reporting(E_ALL);
ini_set('display_errors', 1);
header("Content-Type: application/json; charset=UTF-8");

/* --------- helpers --------- */
function makeTimestamp($date, $time) {
    if (!$time || $time === "00:00:00") return null;
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

/* --------- DB helpers --------- */

/**
 * Get the applicable shift for an employee on a given date.
 * Robust: if days_of_week is non-empty we treat it as a weekly pattern
 * even if recurrence_type might be inconsistent.
 */
function getEmployeeShift($conn, $employee_id, $attendance_date) {
    $sql = "
        SELECT ess.schedule_id, ess.employee_id, ess.work_time_id AS schedule_work_time_id,
               ess.effective_date, ess.end_date, ess.recurrence_type, ess.days_of_week, ess.priority,
               wt.id AS wt_id, wt.shift_name, wt.start_time, wt.end_time, wt.total_minutes, wt.is_default
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

        // NEW: if days_of_week present -> treat as weekly (safe & defensive)
        if (!empty($daysOfWeek)) {
            if (in_array($dayName, $daysOfWeek)) $is_match = true;
        } else {
            // fallback to explicit recurrence_type behavior
            if ($recurrence === 'none' && $row['effective_date'] === $attendance_date) {
                $is_match = true;
            } elseif ($recurrence === 'weekly') {
                // no days specified => weekly full-week schedule
                $is_match = true;
            } elseif ($recurrence === 'daily') {
                $is_match = true;
            } elseif ($recurrence === 'monthly' && date("d", strtotime($row['effective_date'])) === date("d", strtotime($attendance_date))) {
                $is_match = true;
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
                    'total_minutes' => intval($row['total_minutes'])
                ]
            ];
        }
    }
    $stmt->close();

    // fallback to default work_time if none matched
    if (count($matches) === 0) {
        $default_sql = "SELECT id AS wt_id, shift_name, start_time, end_time, is_default, total_minutes FROM work_time WHERE is_default = 1 LIMIT 1";
        $default_result = $conn->query($default_sql);
        if ($default_result && $default_row = $default_result->fetch_assoc()) {
            $default_row['from_default'] = true;
            $default_row['conflicts'] = [];
            $default_row['selected_schedule_id'] = null;
            return $default_row;
        }
        return null;
    }

    // pick by priority then by latest effective_date
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

/* --------- main --------- */
$data = json_decode(file_get_contents("php://input"), true);
if (!$data) { echo json_encode(["success"=>false,"message"=>"Invalid JSON"]); exit; }

if (!isset($data['attendance_date'], $data['employee_id'], $data['employee_name'])) {
    echo json_encode(["success"=>false,"message"=>"Missing required fields."]); exit;
}

$attendance_date   = $data['attendance_date'];
$employee_id       = $data['employee_id'];
$employee_name     = $data['employee_name'];
$time_in_morning   = isset($data['time_in_morning']) && $data['time_in_morning'] !== '' ? $data['time_in_morning'] : null;
$time_out_morning  = isset($data['time_out_morning']) && $data['time_out_morning'] !== '' ? $data['time_out_morning'] : null;
$time_in_afternoon = isset($data['time_in_afternoon']) && $data['time_in_afternoon'] !== '' ? $data['time_in_afternoon'] : null;
$time_out_afternoon= isset($data['time_out_afternoon']) && $data['time_out_afternoon'] !== '' ? $data['time_out_afternoon'] : null;

// fetch shift (robust matching)
$shift = getEmployeeShift($conn, $employee_id, $attendance_date);
if (!$shift) { echo json_encode(["success"=>false,"message"=>"No shift found"]); exit; }

$shift_wt_id = intval($shift['wt_id'] ?? 0);
$shift_start = $shift['start_time'];
$shift_end   = $shift['end_time'];
$shift_total_minutes = floatval($shift['total_minutes'] ?? 0);

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

// compute actual worked minutes as overlap of workedIntervals with workingIntervals (so breaks aren't counted if employee didn't work there)
$actual_worked_seconds = 0;
foreach ($workedIntervals as $w) {
    foreach ($workingIntervals as $wk) {
        $ov = overlapSeconds($w[0], $w[1], $wk[0], $wk[1]);
        if ($ov > 0) $actual_worked_seconds += $ov;
    }
}
$actual_rendered_minutes = intval(round($actual_worked_seconds / 60));

// compute days credited (fraction capped at 1)
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

// clear DB-trigger deductions if you want deterministic result (optional)
if ($insert_id) {
    $clear_sql = "UPDATE attendance SET late_deduction_id = NULL, late_deduction_value = 0.0000, deducted_days = 0.00 WHERE attendance_id = ?";
    $cst = $conn->prepare($clear_sql);
    if ($cst) { $cst->bind_param("i", $insert_id); $cst->execute(); $cst->close(); }
}

if ($ok) {
    echo json_encode([
        "success" => true,
        "attendance_id" => $insert_id,
        "days_credited" => $adjusted_days
    ]);
} else {
    echo json_encode(["success" => false, "message" => $stmt->error]);
}

$stmt->close();
$conn->close();
