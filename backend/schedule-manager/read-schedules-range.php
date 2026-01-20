<?php
// schedule-manager/read-schedules-range.php
// Supports PDO ($pdo) or MySQLi ($conn or $con) as provided by your connection.php
include '../server/connection.php';
include("../server/cors.php");

header('Content-Type: application/json');

$start = $_GET['start'] ?? null;
$end   = $_GET['end'] ?? null;

if (!$start || !$end) {
    echo json_encode(['success' => false, 'message' => 'start and end query params required (YYYY-MM-DD)']);
    exit;
}
if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $start) || !preg_match('/^\d{4}-\d{2}-\d{2}$/', $end)) {
    echo json_encode(['success' => false, 'message' => 'Invalid date format']);
    exit;
}

// helper for generating occurrence dates (same logic for both DB clients)
function generateDatesForSchedule(array $s, string $rangeStart, string $rangeEnd) : array {
    $eff = new DateTime($s['effective_date']);
    $sStart = new DateTime($rangeStart);
    $sEnd   = new DateTime($rangeEnd);

    $schedEnd = !empty($s['end_date']) ? new DateTime($s['end_date']) : null;
    $from = ($eff > $sStart) ? clone $eff : clone $sStart;
    $to   = $schedEnd ? (($schedEnd < $sEnd) ? clone $schedEnd : clone $sEnd) : clone $sEnd;

    if ($from > $to) return [];

    $recType = $s['recurrence_type'] ?? 'none';
    $interval = max(1, intval($s['recurrence_interval'] ?? 1));
    $daysOfWeek = [];
    if (!empty($s['days_of_week'])) {
        $daysOfWeek = array_map('trim', explode(',', $s['days_of_week']));
    }
    $occLimit = $s['occurrence_limit'] ? intval($s['occurrence_limit']) : null;

    $dates = [];
    $count = 0;
    $cursor = clone $from;
    while ($cursor <= $to) {
        $add = false;
        $diff = $eff->diff($cursor);
        $diffDays = (int)$diff->format('%a'); // absolute days from effective_date to cursor
        switch ($recType) {
            case 'none':
                if ($cursor->format('Y-m-d') === $eff->format('Y-m-d')) $add = true;
                break;
            case 'daily':
                if ($diffDays >= 0 && ($diffDays % $interval) === 0) $add = true;
                break;
            case 'weekly':
                $dayName = $cursor->format('D'); // Mon, Tue, ...
                if (in_array($dayName, $daysOfWeek, true)) {
                    $weeks = intdiv($diffDays, 7);
                    if ($diffDays >= 0 && ($weeks % $interval) === 0) $add = true;
                }
                break;
            case 'monthly':
                if ($cursor->format('j') === $eff->format('j')) {
                    $months = ($cursor->format('Y') - $eff->format('Y')) * 12 + ($cursor->format('n') - $eff->format('n'));
                    if ($months >= 0 && ($months % $interval) === 0) $add = true;
                }
                break;
            default:
                break;
        }

        if ($add) {
            $dates[] = $cursor->format('Y-m-d');
            $count++;
            if ($occLimit && $count >= $occLimit) break;
        }
        $cursor->modify('+1 day');
    }
    return $dates;
}

try {
    // Branch: PDO available
    if (isset($pdo) && $pdo instanceof PDO) {
        // --- fetch active employees with position & department ---
        $sqlEmployees = "
            SELECT e.employee_id, e.first_name, e.middle_name, e.last_name,
                   pos.position_id, pos.position_name, dep.department_id, dep.department_name
            FROM employees e
            LEFT JOIN positions pos ON e.position_id = pos.position_id
            LEFT JOIN departments dep ON pos.department_id = dep.department_id
            WHERE e.status = 'active'
            ORDER BY pos.position_name, e.last_name, e.first_name
        ";
        $stmt = $pdo->prepare($sqlEmployees);
        $stmt->execute();
        $emps = $stmt->fetchAll(PDO::FETCH_ASSOC);

        // --- fetch schedules that might intersect the range (is_active = 1) ---
        $sqlSchedules = "
            SELECT s.*, wt.shift_name, wt.start_time, wt.end_time
            FROM employee_shift_schedule s
            LEFT JOIN work_time wt ON s.work_time_id = wt.id
            WHERE s.is_active = 1
              AND s.effective_date <= :end
              AND (s.end_date IS NULL OR s.end_date >= :start)
            ORDER BY s.employee_id, s.priority DESC, s.created_at DESC
        ";
        $stmt2 = $pdo->prepare($sqlSchedules);
        $stmt2->execute([':start' => $start, ':end' => $end]);
        $schedules = $stmt2->fetchAll(PDO::FETCH_ASSOC);
    }
    // Branch: MySQLi available (common in XAMPP)
    elseif (isset($conn) || isset($con)) {
        // $conn preferred, fallback to $con
        $mysqli = $conn ?? $con;

        if (!($mysqli instanceof mysqli)) {
            throw new Exception('Connection variable ($conn / $con) is not a valid MySQLi instance.');
        }

        // employees (no params)
        $sqlEmployees = "
            SELECT e.employee_id, e.first_name, e.middle_name, e.last_name,
                   pos.position_id, pos.position_name, dep.department_id, dep.department_name
            FROM employees e
            LEFT JOIN positions pos ON e.position_id = pos.position_id
            LEFT JOIN departments dep ON pos.department_id = dep.department_id
            WHERE e.status = 'active'
            ORDER BY pos.position_name, e.last_name, e.first_name
        ";
        $res = $mysqli->query($sqlEmployees);
        if ($res === false) throw new Exception('MySQLi employees query error: ' . $mysqli->error);
        $emps = [];
        while ($r = $res->fetch_assoc()) $emps[] = $r;
        $res->free();

        // schedules with params (use ? placeholders)
        $sqlSchedules = "
            SELECT s.*, wt.shift_name, wt.start_time, wt.end_time
            FROM employee_shift_schedule s
            LEFT JOIN work_time wt ON s.work_time_id = wt.id
            WHERE s.is_active = 1
              AND s.effective_date <= ?
              AND (s.end_date IS NULL OR s.end_date >= ?)
            ORDER BY s.employee_id, s.priority DESC, s.created_at DESC
        ";
        $stmt2 = $mysqli->prepare($sqlSchedules);
        if (!$stmt2) throw new Exception('MySQLi prepare failed: ' . $mysqli->error);
        $stmt2->bind_param('ss', $end, $start);
        if (!$stmt2->execute()) throw new Exception('MySQLi execute failed: ' . $stmt2->error);
        $result = $stmt2->get_result();
        $schedules = [];
        while ($row = $result->fetch_assoc()) $schedules[] = $row;
        $stmt2->close();
    }
    else {
        // neither PDO nor MySQLi connection available
        echo json_encode(['success' => false, 'message' => 'No DB connection found. Ensure connection.php defines $pdo (PDO) or $conn / $con (MySQLi).']);
        exit;
    }

    // build schedule occurrences map: employee_id => date => array of candidate schedule rows
    $occMap = [];
    foreach ($schedules as $s) {
        $emp = $s['employee_id'];
        $coveredDates = generateDatesForSchedule($s, $start, $end);
        if (empty($coveredDates)) continue;
        foreach ($coveredDates as $d) {
            if (!isset($occMap[$emp][$d])) $occMap[$emp][$d] = [];
            $occMap[$emp][$d][] = $s; // keep the schedule row to resolve later
        }
    }

    // resolve one schedule per employee per date using priority (higher int) then created_at (newer wins)
    $resolved = []; // [employee_id][date] => schedule summary
    foreach ($occMap as $empId => $dateArr) {
        foreach ($dateArr as $d => $candidates) {
            usort($candidates, function($a, $b) {
                $pa = intval($a['priority'] ?? 0);
                $pb = intval($b['priority'] ?? 0);
                if ($pa !== $pb) return $pb <=> $pa;
                // created_at may be missing; handle safely
                $ta = isset($a['created_at']) ? strtotime($a['created_at']) : 0;
                $tb = isset($b['created_at']) ? strtotime($b['created_at']) : 0;
                return $tb <=> $ta;
            });
            $pick = $candidates[0];
            $resolved[$empId][$d] = [
                'schedule_id' => isset($pick['schedule_id']) ? intval($pick['schedule_id']) : null,
                'work_time_id' => isset($pick['work_time_id']) ? intval($pick['work_time_id']) : null,
                'shift_name' => $pick['shift_name'] ?? null,
                'start_time' => $pick['start_time'] ?? null,
                'end_time' => $pick['end_time'] ?? null,
                'recurrence_type' => $pick['recurrence_type'] ?? null,
                'priority' => isset($pick['priority']) ? intval($pick['priority']) : 0,
                'created_at' => $pick['created_at'] ?? null
            ];
        }
    }

    // build groups by position
    $groups = [];
    foreach ($emps as $e) {
        $empId = $e['employee_id'];
        $posKey = $e['position_id'] ?? 'no_position';
        if (!isset($groups[$posKey])) {
            $groups[$posKey] = [
                'position_id' => $e['position_id'] ?? null,
                'position_name' => $e['position_name'] ?? 'Unassigned',
                'department_id' => $e['department_id'] ?? null,
                'department_name' => $e['department_name'] ?? null,
                'employees' => []
            ];
        }
        $groups[$posKey]['employees'][] = [
            'employee_id' => $empId,
            'first_name' => $e['first_name'],
            'middle_name' => $e['middle_name'] ?? null,
            'last_name' => $e['last_name'],
            'schedules' => $resolved[$empId] ?? []
        ];
    }

    // produce dates array for columns
    $dates = [];
    $startDt = new DateTime($start);
    $endDt = new DateTime($end);
    $cursor = clone $startDt;
    while ($cursor <= $endDt) {
        $dates[] = $cursor->format('Y-m-d');
        $cursor->modify('+1 day');
    }

    echo json_encode(['success' => true, 'data' => ['groups' => array_values($groups), 'dates' => $dates]]);
    exit;

} catch (Exception $ex) {
    echo json_encode(['success' => false, 'message' => $ex->getMessage()]);
    exit;
}
