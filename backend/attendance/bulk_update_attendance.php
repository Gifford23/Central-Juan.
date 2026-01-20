<?php
// bulk_update_attendance.php
// Fill missing attendance rows (time_* = NULL) for all active employees in the month,
// then recalculate attendance for every row in that month (block-aware).
// Expects POST JSON: { month: 1..12, year: YYYY, user_full_name?: string, user_role?: string }

ob_start();
include_once("../server/cors.php");
include_once("../server/connection.php");
error_reporting(E_ALL);
ini_set('display_errors', 1);
header("Content-Type: application/json; charset=UTF-8");

date_default_timezone_set('Asia/Manila');
define('DEFAULT_BLOCK_GRACE_SECONDS', 5 * 60);

/* ---------------- helpers ---------------- */
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

/* ---------------- DB helpers (your original logic) ---------------- */
/* (kept unchanged — these functions are used by recalculation) */
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

/* ---------------- utilities ---------------- */
function attendanceIdIsAutoIncrement($conn) {
    $dbName = null;
    $r = $conn->query("SELECT DATABASE() as dbname");
    if ($r) { $row = $r->fetch_assoc(); $dbName = $row['dbname'] ?? null; $r->close(); }
    if (!$dbName) return false;
    $stmt = $conn->prepare("
        SELECT EXTRA
        FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'attendance' AND COLUMN_NAME = 'attendance_id' LIMIT 1
    ");
    if (!$stmt) return false;
    $stmt->bind_param("s", $dbName);
    $stmt->execute();
    $res = $stmt->get_result();
    $extra = null;
    if ($res && $row = $res->fetch_assoc()) $extra = $row['EXTRA'];
    $stmt->close();
    return (strpos($extra ?? '', 'auto_increment') !== false);
}

/* ---------------- input validation & dates ---------------- */
$payload = json_decode(file_get_contents("php://input"), true);
if (!$payload || !isset($payload['month'], $payload['year'])) {
    echo json_encode(["success" => false, "message" => "Missing required month/year in JSON body."]);
    exit;
}
$month = intval($payload['month']);
$year  = intval($payload['year']);
$user_full_name = isset($payload['user_full_name']) ? substr($payload['user_full_name'], 0, 255) : 'SYSTEM';
$user_role = isset($payload['user_role']) ? substr($payload['user_role'], 0, 255) : 'SYSTEM';

if ($month < 1 || $month > 12 || $year < 2000 || $year > 3000) {
    echo json_encode(["success" => false, "message" => "Invalid month or year."]);
    exit;
}

$start_date = sprintf("%04d-%02d-01", $year, $month);
$end_date = date("Y-m-t", strtotime($start_date)); // last day of month

/* ---------------- create missing attendance rows ---------------- */
try {
    // fetch active employees using your schema (employee_id, first_name, last_name, status)
    $employees = [];
    $empSql = "SELECT employee_id, CONCAT(first_name, ' ', last_name) AS employee_name FROM employees WHERE status = 'active'";
    $eRes = $conn->query($empSql);
    if ($eRes) {
        while ($r = $eRes->fetch_assoc()) {
            $employees[] = ['employee_id' => $r['employee_id'], 'employee_name' => $r['employee_name']];
        }
        $eRes->close();
    }

    if (count($employees) === 0) {
        // fallback to distinct employees from attendance if employees table empty
        $fres = $conn->query("SELECT DISTINCT employee_id, employee_name FROM attendance ORDER BY employee_id");
        if ($fres) {
            while ($r = $fres->fetch_assoc()) {
                $employees[] = ['employee_id' => $r['employee_id'], 'employee_name' => $r['employee_name']];
            }
            $fres->close();
        }
    }

    if (count($employees) === 0) {
        echo json_encode(["success" => false, "message" => "No employees found to populate attendance for."]);
        exit;
    }

    $needAttendanceId = !attendanceIdIsAutoIncrement($conn);
    // compute next attendance_id if needed
    $nextAttendanceId = null;
    if ($needAttendanceId) {
        $qr = $conn->query("SELECT COALESCE(MAX(attendance_id),0) + 1 AS nextid FROM attendance");
        if ($qr && $row = $qr->fetch_assoc()) $nextAttendanceId = intval($row['nextid']);
        else $nextAttendanceId = 1;
        if ($qr) $qr->close();
    }

    // Prepare statements
    $checkStmt = $conn->prepare("SELECT attendance_id FROM attendance WHERE employee_id = ? AND attendance_date = ? LIMIT 1");
    if (!$checkStmt) throw new Exception("Prepare failed (check): " . $conn->error);

    if ($needAttendanceId) {
        $insStmt = $conn->prepare("INSERT INTO attendance (attendance_id, employee_id, employee_name, attendance_date, time_in_morning, time_out_morning, time_in_afternoon, time_out_afternoon) VALUES (?, ?, ?, ?, NULL, NULL, NULL, NULL)");
        if (!$insStmt) throw new Exception("Prepare failed (insert): " . $conn->error);
    } else {
        $insStmt = $conn->prepare("INSERT INTO attendance (employee_id, employee_name, attendance_date, time_in_morning, time_out_morning, time_in_afternoon, time_out_afternoon) VALUES (?, ?, ?, NULL, NULL, NULL, NULL)");
        if (!$insStmt) throw new Exception("Prepare failed (insert): " . $conn->error);
    }

    // build date list for month
    $periodStart = new DateTime($start_date);
    $periodEnd = new DateTime($end_date);
    $interval = new DateInterval('P1D');

    $inserted_count = 0;
    $insert_errors = [];

    $conn->begin_transaction();

    for ($d = clone $periodStart; $d <= $periodEnd; $d->add($interval)) {
        $attendance_date = $d->format('Y-m-d');
        foreach ($employees as $emp) {
            $eid = (string)$emp['employee_id'];
            $ename = (string)$emp['employee_name'];

            $checkStmt->bind_param("ss", $eid, $attendance_date);
            $checkStmt->execute();
            $cres = $checkStmt->get_result();
            $exists = ($cres && $cres->num_rows > 0);
            if ($cres) $cres->free();

            if (!$exists) {
                if ($needAttendanceId) {
                    $aid = $nextAttendanceId++;
                    $insStmt->bind_param("isss", $aid, $eid, $ename, $attendance_date);
                } else {
                    $insStmt->bind_param("sss", $eid, $ename, $attendance_date);
                }
                if (!$insStmt->execute()) {
                    $insert_errors[] = ["employee_id"=>$eid,"date"=>$attendance_date,"error"=>$insStmt->error];
                } else {
                    $inserted_count++;
                }
            }
        }
    }

    $conn->commit();

    $checkStmt->close();
    $insStmt->close();

} catch (Exception $ex) {
    if ($conn->in_transaction) $conn->rollback();
    echo json_encode(["success" => false, "message" => "Failed to populate missing attendance rows: " . $ex->getMessage()]);
    $conn->close();
    exit;
}

/* ---------------- gather attendance rows for the month ---------------- */
$sel = $conn->prepare("
    SELECT attendance_id, employee_id, employee_name,
           attendance_date, time_in_morning, time_out_morning, time_in_afternoon, time_out_afternoon
    FROM attendance
    WHERE attendance_date BETWEEN ? AND ?
    ORDER BY employee_id, attendance_date
");
if (!$sel) {
    echo json_encode(["success" => false, "message" => "DB prepare failed: " . $conn->error]);
    exit;
}
$sel->bind_param("ss", $start_date, $end_date);
$sel->execute();
$res = $sel->get_result();
$rows = $res ? $res->fetch_all(MYSQLI_ASSOC) : [];
$sel->close();

$results = [];
$processed = 0;

/* ---------------- iterate and recalc per attendance row (your original code) ---------------- */
foreach ($rows as $row) {
    $attendance_id = intval($row['attendance_id']);
    $employee_id   = $row['employee_id'];
    $employee_name = $row['employee_name'];
    $attendance_date = $row['attendance_date'];

    // normalize recorded times
    $time_in_morning    = normalizeTimeInput($row['time_in_morning']);
    $time_out_morning   = normalizeTimeInput($row['time_out_morning']);
    $time_in_afternoon  = normalizeTimeInput($row['time_in_afternoon']);
    $time_out_afternoon = normalizeTimeInput($row['time_out_afternoon']);

    try {
        // Start transaction per-row to keep partial failures isolated
        $conn->begin_transaction();

        // fetch shift & breaks
        $shift = getEmployeeShift($conn, $employee_id, $attendance_date);
        if (!$shift) {
            // nothing to do: mark and continue
            $results[] = ["attendance_id"=>$attendance_id, "attendance_date"=>$attendance_date, "success"=>false, "message"=>"No shift found"];
            $conn->rollback();
            continue;
        }
        $shift_wt_id = intval($shift['wt_id'] ?? 0);
        $shift_start = $shift['start_time'];
        $shift_end   = $shift['end_time'];
        $shift_valid_in_end = $shift['valid_in_end'] ?? null;

        $breaks = getShiftBreaks($conn, $shift_wt_id);

        // normalize shift interval
        $shiftInterval = normalizeIntervalTs($attendance_date, $shift_start, $shift_end);
        if (!$shiftInterval) {
            $results[] = ["attendance_id"=>$attendance_id, "attendance_date"=>$attendance_date, "success"=>false, "message"=>"Invalid shift times"];
            $conn->rollback();
            continue;
        }

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
                ];
                $total_mapped_break_minutes += intval(floor($ov / 60));
            }
        }

        // working intervals = shift minus break intervals
        $workingIntervals = [$shiftInterval];
        foreach ($breakIntervals as $subMeta) {
            $sub = $subMeta['range'];
            $new = [];
            foreach ($workingIntervals as $it) {
                $resarr = subtractIntervalFromIntervals([$it], $sub);
                $new = array_merge($new, $resarr);
            }
            $workingIntervals = $new;
        }

        // credit basis minutes
        $credit_basis_minutes = 0;
        foreach ($workingIntervals as $it) {
            $credit_basis_minutes += intval(floor(($it[1] - $it[0]) / 60));
        }
        if ($credit_basis_minutes < 1) $credit_basis_minutes = 1;

        // build worked intervals from stored punches
        $workedIntervals = [];
        if ($time_in_morning && $time_out_morning) {
            $mi = normalizeIntervalTs($attendance_date, $time_in_morning, $time_out_morning);
            if ($mi) $workedIntervals[] = $mi;
        }
        if ($time_in_afternoon && $time_out_afternoon) {
            $ai = normalizeIntervalTs($attendance_date, $time_in_afternoon, $time_out_afternoon);
            if ($ai) $workedIntervals[] = $ai;
        }

        // compute actual worked seconds as overlap of workedIntervals with workingIntervals
        $actual_worked_seconds = 0;
        foreach ($workedIntervals as $w) {
            foreach ($workingIntervals as $wk) {
                $ov = overlapSeconds($w[0], $w[1], $wk[0], $wk[1]);
                if ($ov > 0) $actual_worked_seconds += $ov;
            }
        }
        $actual_rendered_minutes = intval(floor($actual_worked_seconds / 60));

        // detect late-in missing seconds (as in single-update logic)
        $late_ignored_extra_seconds = 0;
        $blocks_preview = [];
        foreach ($workingIntervals as $i => $it) {
            $secs = max(0, $it[1] - $it[0]);
            $blocks_preview[] = ['index'=>$i+1,'start'=>$it[0],'end'=>$it[1],'seconds'=>$secs,'worked_seconds'=>0];
        }
        foreach ($blocks_preview as &$b) {
            foreach ($workedIntervals as $w) {
                $b['worked_seconds'] += overlapSeconds($b['start'],$b['end'],$w[0],$w[1]);
            }
            $block_in = null;
            foreach ($workedIntervals as $w) {
                if ($w[0] >= $b['start'] && $w[0] <= $b['end']) { $block_in = $w[0]; break; }
                if ($w[0] < $b['start'] && ($b['start'] - $w[0]) < 30*60 && $w[1] > $b['start']) { $block_in = $w[0]; break; }
            }
            if ($block_in !== null) {
                if ($block_in < $b['start'] && ($b['start'] - $block_in) > (12*3600)) $block_in += 24*3600;
                $block_valid_in_end_ts = $b['start'] + DEFAULT_BLOCK_GRACE_SECONDS;
                $preceding_break_index = $b['index'] - 2;
                if ($b['index'] == 1 && !empty($shift_valid_in_end)) {
                    $ts = makeTimestamp($attendance_date, $shift_valid_in_end);
                    if ($ts !== null) {
                        if ($ts < $b['start'] && ($b['start'] - $ts) > (12*3600)) $ts += 24*3600;
                        $block_valid_in_end_ts = $ts;
                    }
                } else {
                    if ($preceding_break_index >= 0 && isset($breakIntervals[$preceding_break_index])) {
                        $preceding_break = $breakIntervals[$preceding_break_index];
                        if (!empty($preceding_break['is_shift_split'])) {
                            $vbie = $preceding_break['valid_break_in_end_str'] ?? null;
                            if (!empty($vbie)) {
                                $ts2 = makeTimestamp($attendance_date, $vbie);
                                if ($ts2 !== null) {
                                    if ($ts2 < $b['start'] && ($b['start'] - $ts2) > (12*3600)) $ts2 += 24*3600;
                                    $block_valid_in_end_ts = $ts2;
                                } else {
                                    $block_valid_in_end_ts = $preceding_break['clipped_break_end_ts'];
                                }
                            } else {
                                $block_valid_in_end_ts = $preceding_break['clipped_break_end_ts'];
                            }
                        }
                    }
                }
                if ($block_in > $block_valid_in_end_ts && $b['worked_seconds'] > 0) {
                    $missing_seconds = max(0, $block_in - $b['start']);
                    $late_ignored_extra_seconds += $missing_seconds;
                }
            }
        }
        unset($b);

        $adjusted_actual_worked_seconds = $actual_worked_seconds + $late_ignored_extra_seconds;
        $adjusted_rendered_minutes = intval(floor($adjusted_actual_worked_seconds / 60));

        $adjusted_days = 0.0;
        if ($adjusted_rendered_minutes > 0 && $credit_basis_minutes > 0) {
            $adjusted_days = $adjusted_rendered_minutes / $credit_basis_minutes;
        }
        $adjusted_days = max(0, min(1.0, floor($adjusted_days * 100) / 100));

        // holiday detection (simple)
        $is_holiday_attendance = 0;
        $holiday_sql = "SELECT * FROM holidays 
                        WHERE (holiday_date = ? OR (is_recurring = 1 AND DATE_FORMAT(holiday_date, '%m-%d') = DATE_FORMAT(?, '%m-%d')))
                        AND (extended_until IS NULL OR extended_until = '0000-00-00' OR extended_until >= ?) 
                        LIMIT 1";
        $holiday_stmt = $conn->prepare($holiday_sql);
        if ($holiday_stmt) {
            $holiday_stmt->bind_param("sss", $attendance_date, $attendance_date, $attendance_date);
            $holiday_stmt->execute();
            $hres = $holiday_stmt->get_result();
            if ($hres && $hres->num_rows > 0) $is_holiday_attendance = 1;
            $holiday_stmt->close();
        }

        // early_out detection (best-effort)
        $early_out = 0;
        if (($time_out_morning && makeTimestamp($attendance_date, $time_out_morning) < makeTimestamp($attendance_date, '12:00:00')) ||
            ($time_out_afternoon && makeTimestamp($attendance_date, $time_out_afternoon) < makeTimestamp($attendance_date, '17:00:00'))) {
            $early_out = 1;
        }

        // Write base fields first
        $base_update_sql = "UPDATE attendance SET
                applied_break_minutes = ?, net_work_minutes = ?, actual_rendered_minutes = ?,
                days_credited = ?, early_out = ?, is_holiday_attendance = ?,
                late_deduction_id = NULL, late_deduction_value = 0.0000, deducted_days = 0.00
            WHERE attendance_id = ?";
        $bst = $conn->prepare($base_update_sql);
        if (!$bst) {
            $conn->rollback();
            $results[] = ["attendance_id"=>$attendance_id,"attendance_date"=>$attendance_date,"success"=>false,"message"=>"Prepare failed (base update): ".$conn->error];
            continue;
        }
        $bst->bind_param("iiidiii",
            $total_mapped_break_minutes,
            $credit_basis_minutes,
            $actual_rendered_minutes,
            $adjusted_days,
            $early_out,
            $is_holiday_attendance,
            $attendance_id
        );
        if (!$bst->execute()) {
            $err = $bst->error;
            $bst->close();
            $conn->rollback();
            $results[] = ["attendance_id"=>$attendance_id,"attendance_date"=>$attendance_date,"success"=>false,"message"=>"Execute failed (base update): ".$err];
            continue;
        }
        $bst->close();

        // --------- Late deduction per-block (same as single-update) ----------
        $blocks = [];
        foreach ($workingIntervals as $i => $it) {
            $secs = max(0, $it[1] - $it[0]);
            $blocks[] = ['index'=>$i+1,'start'=>$it[0],'end'=>$it[1],'seconds'=>$secs,'worked_seconds'=>0,'coverage'=>0.0];
        }
        foreach ($blocks as &$b) {
            foreach ($workedIntervals as $w) {
                $b['worked_seconds'] += overlapSeconds($b['start'],$b['end'],$w[0],$w[1]);
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
                if ($w[0] >= $b['start'] && $w[0] <= $b['end']) { $block_in = $w[0]; break; }
                if ($w[0] < $b['start'] && ($b['start'] - $w[0]) < 30*60 && $w[1] > $b['start']) { $block_in = $w[0]; break; }
            }
            if (!$block_in) continue;

            $used_baseline = 'default';
            if ($b['index'] == 1 && !empty($shift_valid_in_end)) {
                $block_valid_in_end_ts = makeTimestamp($attendance_date, $shift_valid_in_end);
                if ($block_valid_in_end_ts !== null && $block_valid_in_end_ts < $b['start'] && ($b['start'] - $block_valid_in_end_ts) > (12*3600)) $block_valid_in_end_ts += 24*3600;
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

            if ($block_in < $b['start'] && ($b['start'] - $block_in) > (12*3600)) $block_in += 24*3600;

            if ($block_in > $block_valid_in_end_ts) {
                $late_minutes = intval(floor(($block_in - $block_valid_in_end_ts)/60.0));

                $tier_id = getLateTierForWorkTimeBlock($conn, $shift_wt_id, $b['index']);
                if ($tier_id) {
                    $rule = getMatchingLateRule($conn, $tier_id, $late_minutes);
                    if ($rule) {
                        $ded_fraction = floatval($rule['deduction_value']);
                        if ($ded_fraction < 0) $ded_fraction = abs($ded_fraction);
                        if ($ded_fraction > 1) $ded_fraction = 1.0;
                        $total_deduction_fraction += $ded_fraction;
                        if ($total_deduction_fraction > 1.0) $total_deduction_fraction = 1.0;
                        $last_rule_id = isset($rule['id']) ? intval($rule['id']) : $last_rule_id;
                        $applied_rules[] = ['block'=>$b['index'],'late_minutes'=>$late_minutes,'rule'=>$rule,'deduction_fraction'=>$ded_fraction];
                    }
                }
            }
        } // end blocks

        if ($total_deduction_fraction > 0) {
            $late_deduction_value_db = round($total_deduction_fraction, 4);
            $deducted_days_db = round($total_deduction_fraction, 2);
            $final_days_credited = max(0.0, floor(($adjusted_days - $deducted_days_db) * 100) / 100);

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
            $results[] = ["attendance_id"=>$attendance_id,"attendance_date"=>$attendance_date,"success"=>true,"original_days"=>$adjusted_days,"final_days"=>$final_days_credited,"deduction"=>$total_deduction_fraction];
        } else {
            // Write adjusted days even if no deduction
            $upd = $conn->prepare("UPDATE attendance SET days_credited = ? WHERE attendance_id = ?");
            if ($upd) { $upd->bind_param("di", $adjusted_days, $attendance_id); $upd->execute(); $upd->close(); }
            $results[] = ["attendance_id"=>$attendance_id,"attendance_date"=>$attendance_date,"success"=>true,"original_days"=>$adjusted_days,"final_days"=>$adjusted_days,"deduction"=>0];
        }

        $conn->commit();
        $processed++;

    } catch (Exception $ex) {
        $conn->rollback();
        $results[] = ["attendance_id"=>$attendance_id,"attendance_date"=>$attendance_date,"success"=>false,"message"=>$ex->getMessage()];
    }
}

/* ---------------- final response ---------------- */
echo json_encode([
    "success" => true,
    "message" => "Created missing rows (if any) and processed attendance recalculation for month.",
    "month" => $month,
    "year" => $year,
    "inserted_missing_rows" => $inserted_count ?? 0,
    "insert_errors_sample" => array_slice($insert_errors ?? [],0,10),
    "processed_rows" => $processed,
    "details_sample" => array_slice($results, 0, 50),
    "details_count" => count($results)
]);

$conn->close();
exit;
?>
