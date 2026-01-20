<?php
// get_employee_shift_window.php
include("../server/cors.php");
include '../server/connection.php';

/*
 Accepts:
   ?employee_id=...&date=YYYY-MM-DD

 Returns:
   - work_time (if schedule found)
   - default_work_time + default_used=true (if no schedule found)
   - schedule (if found)
   - allowed_windows - computed HH:MM:SS strings
     * AM: valid_in_start comes from DB (fallback to start_time), valid_in_end = valid_in_start + 60 minutes
     * PM: uses DB values (valid_out_start / valid_out_end) as-is (fallbacks applied)
*/

$employee_id = isset($_GET['employee_id']) ? $_GET['employee_id'] : null;
$date = isset($_GET['date']) ? $_GET['date'] : null; // YYYY-MM-DD

if (!$employee_id || !$date) {
    echo json_encode([
        "success" => false,
        "message" => "Missing parameters. Required: employee_id, date"
    ]);
    exit;
}

try {
    // 1) Find applicable schedule rows for employee (ordered by priority/effective)
    $query = "
        SELECT s.* , wt.id as wt_id, wt.shift_name, wt.start_time, wt.end_time,
               wt.valid_in_start, wt.valid_in_end, wt.valid_out_start, wt.valid_out_end
        FROM employee_shift_schedule s
        LEFT JOIN work_time wt ON wt.id = s.work_time_id
        WHERE s.employee_id = ? AND s.is_active = 1
        ORDER BY s.priority DESC, s.effective_date DESC
    ";
    $stmt = $conn->prepare($query);
    $stmt->bind_param("s", $employee_id);
    $stmt->execute();
    $res = $stmt->get_result();

    $foundSchedule = null;
    $foundWorkTime = null;

    while ($row = $res->fetch_assoc()) {
        // Decide whether this schedule applies to $date
        $effective = $row['effective_date'];
        $end_date = $row['end_date'];
        $recurrence = strtolower(trim($row['recurrence_type'] ?? 'none'));
        $days_of_week_raw = $row['days_of_week'] ?? '';

        $dateTs = strtotime($date);
        $effTs = $effective ? strtotime($effective) : null;
        $endTs = $end_date ? strtotime($end_date) : null;

        if ($effective && $dateTs < $effTs) continue;
        if ($end_date && $dateTs > $endTs) continue;

        if ($recurrence === 'weekly' && strlen(trim($days_of_week_raw)) > 0) {
            $parts = preg_split('/[,\s]+/', trim($days_of_week_raw));
            $dowMap = ['sun'=>0,'mon'=>1,'tue'=>2,'wed'=>3,'thu'=>4,'fri'=>5,'sat'=>6];
            $targetDow = date('w', $dateTs); // 0..6
            $hit = false;
            foreach ($parts as $p) {
                $p3 = strtolower(substr(trim($p), 0, 3));
                if (isset($dowMap[$p3]) && $dowMap[$p3] == $targetDow) { $hit = true; break; }
            }
            if (!$hit) continue;
        }

        // matched schedule for date
        $foundSchedule = $row;

        // If left join gave us work_time data, use it
        if (!empty($row['wt_id'])) {
            $foundWorkTime = [
                "id" => $row['wt_id'],
                "shift_name" => $row['shift_name'],
                "start_time" => $row['start_time'],
                "end_time" => $row['end_time'],
                "valid_in_start" => $row['valid_in_start'],
                "valid_in_end" => $row['valid_in_end'],
                "valid_out_start" => $row['valid_out_start'],
                "valid_out_end" => $row['valid_out_end']
            ];
        } else {
            // attempt to fetch explicit work_time if schedule has work_time_id
            if (!empty($row['work_time_id'])) {
                $wtId = intval($row['work_time_id']);
                $qwt = $conn->prepare("SELECT id, shift_name, start_time, end_time, valid_in_start, valid_in_end, valid_out_start, valid_out_end FROM work_time WHERE id = ? LIMIT 1");
                $qwt->bind_param("i", $wtId);
                $qwt->execute();
                $rwt = $qwt->get_result();
                if ($rwt && $rwt->num_rows) {
                    $w = $rwt->fetch_assoc();
                    $foundWorkTime = [
                        "id" => $w['id'],
                        "shift_name" => $w['shift_name'],
                        "start_time" => $w['start_time'],
                        "end_time" => $w['end_time'],
                        "valid_in_start" => $w['valid_in_start'],
                        "valid_in_end" => $w['valid_in_end'],
                        "valid_out_start" => $w['valid_out_start'],
                        "valid_out_end" => $w['valid_out_end']
                    ];
                }
                if (isset($qwt)) { $qwt->close(); }
            }
        }

        break; // first matching schedule wins (ordered by priority/effective)
    }

    // 2) If no work_time found from schedule, fetch default work_time
    $defaultUsed = false;
    $defaultWorkTime = null;
    if (!$foundWorkTime) {
        $q2 = "SELECT id, shift_name, start_time, end_time, valid_in_start, valid_in_end, valid_out_start, valid_out_end FROM work_time WHERE is_default = 1 LIMIT 1";
        $r2 = $conn->query($q2);
        if ($r2 && $r2->num_rows) {
            $w = $r2->fetch_assoc();
            $defaultWorkTime = [
                "id" => $w['id'],
                "shift_name" => $w['shift_name'],
                "start_time" => $w['start_time'],
                "end_time" => $w['end_time'],
                "valid_in_start" => $w['valid_in_start'],
                "valid_in_end" => $w['valid_in_end'],
                "valid_out_start" => $w['valid_out_start'],
                "valid_out_end" => $w['valid_out_end']
            ];
            $defaultUsed = true;
        } else {
            // fallback: pick any work_time row if none marked default
            $r3 = $conn->query("SELECT id, shift_name, start_time, end_time, valid_in_start, valid_in_end, valid_out_start, valid_out_end FROM work_time ORDER BY id ASC LIMIT 1");
            if ($r3 && $r3->num_rows) {
                $w = $r3->fetch_assoc();
                $defaultWorkTime = [
                    "id" => $w['id'],
                    "shift_name" => $w['shift_name'],
                    "start_time" => $w['start_time'],
                    "end_time" => $w['end_time'],
                    "valid_in_start" => $w['valid_in_start'],
                    "valid_in_end" => $w['valid_in_end'],
                    "valid_out_start" => $w['valid_out_start'],
                    "valid_out_end" => $w['valid_out_end']
                ];
                $defaultUsed = true;
            }
        }
    }

    // choose responseWorkTime: prefer schedule's work_time; otherwise default_work_time
    $responseWorkTime = $foundWorkTime ?: $defaultWorkTime;

    if (!$responseWorkTime) {
        echo json_encode([
            "success" => false,
            "message" => "No work_time or schedule found for employee."
        ]);
        exit;
    }

    // === AM: Use DB valid_in_start if present (and not '00:00:00'), otherwise fallback to start_time ===
    $db_valid_in_start = (!empty($responseWorkTime['valid_in_start']) && $responseWorkTime['valid_in_start'] !== '00:00:00')
        ? $responseWorkTime['valid_in_start']
        : $responseWorkTime['start_time'];

    // Compute AM end = valid_in_start + 60 minutes (always)
    $t_start = strtotime($db_valid_in_start);
    $computed_valid_in_end = date('H:i:s', $t_start + 60 * 60);

    // PM windows: prefer DB values; fallback to end_time / end_time +30m
    $computed_valid_out_start = (!empty($responseWorkTime['valid_out_start']) && $responseWorkTime['valid_out_start'] !== '00:00:00')
        ? $responseWorkTime['valid_out_start']
        : $responseWorkTime['end_time'];

    $computed_valid_out_end = (!empty($responseWorkTime['valid_out_end']) && $responseWorkTime['valid_out_end'] !== '00:00:00')
        ? $responseWorkTime['valid_out_end']
        : date('H:i:s', strtotime($responseWorkTime['end_time']) + 30 * 60);

    $allowed_windows = [
        "valid_in_start" => $db_valid_in_start,
        "valid_in_end" => $computed_valid_in_end,
        "valid_out_start" => $computed_valid_out_start,
        "valid_out_end" => $computed_valid_out_end
    ];

    // Build final response
    $payload = [
        "success" => true,
        "found" => $foundSchedule ? true : false,
        "default_used" => $defaultUsed ? true : false,
        "schedule" => $foundSchedule,
        // keep schedule's work_time in "work_time" (if schedule provided it), and include default_work_time separately
        "work_time" => $foundWorkTime ? $foundWorkTime : null,
        "default_work_time" => $defaultUsed ? $defaultWorkTime : null,
        "allowed_windows" => $allowed_windows
    ];

    echo json_encode($payload);

    $stmt->close();
} catch (Exception $e) {
    echo json_encode([
        "success" => false,
        "message" => $e->getMessage()
    ]);
}

$conn->close();
