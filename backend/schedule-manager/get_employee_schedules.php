<?php
// get_employee_schedules.php
include("../server/cors.php");
include '../server/connection.php';

$employee_id = isset($_GET['employee_id']) ? $_GET['employee_id'] : null;
$month = isset($_GET['month']) ? intval($_GET['month']) : null; // 1..12
$year  = isset($_GET['year'])  ? intval($_GET['year'])  : null;

if (!$employee_id || !$month || !$year) {
    echo json_encode([
        "success" => false,
        "message" => "Missing parameters. Required: employee_id, month, year"
    ]);
    exit;
}

// Build month range (YYYY-MM-01 .. YYYY-MM-lastday)
$startDate = sprintf("%04d-%02d-01", $year, $month);
$endDate   = date("Y-m-t", strtotime($startDate)); // last day of month

try {
    // Query active schedules for employee that overlap this month
    $query = "
        SELECT s.* , wt.shift_name, wt.start_time, wt.end_time
        FROM employee_shift_schedule s
        LEFT JOIN work_time wt ON wt.id = s.work_time_id
        WHERE s.employee_id = ? AND s.is_active = 1
    ";

    $stmt = $conn->prepare($query);
    $stmt->bind_param("s", $employee_id);
    $stmt->execute();
    $res = $stmt->get_result();

    $dates = []; // unique schedule dates in month

    while ($row = $res->fetch_assoc()) {
        $effective = $row['effective_date']; // may be NULL
        $end_date  = $row['end_date'] ?? null; // may be NULL
        $recurrence = strtolower(trim($row['recurrence_type'] ?? ''));
        $days_of_week_raw = $row['days_of_week'] ?? '';
        $occ_limit = intval($row['occurrence_limit'] ?? 0);

        // Normalize effective/end to YYYY-MM-DD or null
        $effective_ts = $effective ? strtotime($effective) : null;
        $end_ts = $end_date ? strtotime($end_date) : null;
        $startMonth_ts = strtotime($startDate);
        $endMonth_ts = strtotime($endDate);

        // If recurrence is weekly/daily and end_date is null OR equals effective_date,
        // interpret it as "ongoing" for the purpose of this queried month.
        // (This handles cases where DB stored a single date but recurrence is intended.)
        if (($recurrence === 'weekly' || $recurrence === 'daily' || $recurrence === 'everyday') 
            && (!$end_date || ($effective && $end_date && strtotime($end_date) === strtotime($effective)))) {
            // period for iteration -> clamp to month range
            $periodStart = $effective_ts && $effective_ts > $startMonth_ts ? date('Y-m-d', $effective_ts) : $startDate;
            $periodEnd = $endDate; // full month end
        } else {
            // Normal handling: intersect schedule effective..end with requested month
            if ($effective) {
                $periodStart = date('Y-m-d', max($effective_ts, $startMonth_ts));
            } else {
                $periodStart = $startDate;
            }

            if ($end_date) {
                $periodEnd = date('Y-m-d', min($end_ts, $endMonth_ts));
            } else {
                $periodEnd = $endDate;
            }
        }

        // sanity check: if periodStart > periodEnd skip (but allow single-day schedules)
        if (strtotime($periodStart) > strtotime($periodEnd)) {
            // allow a single effective_date within month if recurrence is 'once' or empty
            if ($recurrence === 'once' || empty($recurrence)) {
                if ($effective && strtotime($effective) >= $startMonth_ts && strtotime($effective) <= $endMonth_ts) {
                    $dates[$effective] = true;
                }
            }
            continue;
        }

        // parse days_of_week into 0..6 (Sun..Sat)
        $dowList = [];
        if (strlen(trim($days_of_week_raw)) > 0) {
            $parts = preg_split('/[,\s]+/', trim($days_of_week_raw));
            foreach ($parts as $p) {
                $pv = trim($p);
                if ($pv === '') continue;
                if (is_numeric($pv)) {
                    $n = intval($pv);
                    if ($n === 7) $n = 0;
                    if ($n >= 0 && $n <= 6) $dowList[] = $n;
                } else {
                    $k = strtolower(substr($pv,0,3));
                    $map = [
                        'sun'=>0,'mon'=>1,'tue'=>2,'wed'=>3,'thu'=>4,'fri'=>5,'sat'=>6
                    ];
                    if (isset($map[$k])) $dowList[] = $map[$k];
                }
            }
            $dowList = array_values(array_unique($dowList));
        }

        // iterate dates from periodStart..periodEnd
        $begin = new DateTime($periodStart);
        $end   = new DateTime($periodEnd);
        $end->modify('+1 day'); // make end inclusive
        $interval = new DateInterval('P1D');
        $period = new DatePeriod($begin, $interval, $end);

        $countOcc = 0;
        foreach ($period as $dt) {
            $dstr = $dt->format('Y-m-d');
            if ($recurrence === 'daily' || $recurrence === 'everyday') {
                $dates[$dstr] = true;
                $countOcc++;
            } elseif ($recurrence === 'weekly' && count($dowList) > 0) {
                if (in_array(intval($dt->format('w')), $dowList, true)) {
                    $dates[$dstr] = true;
                    $countOcc++;
                }
            } else {
                // fallback: if days_of_week exists treat like weekly
                if (count($dowList) > 0) {
                    if (in_array(intval($dt->format('w')), $dowList, true)) {
                        $dates[$dstr] = true;
                        $countOcc++;
                    }
                } else {
                    // if no recurrence but effective date is within month, include that date only
                    if ($effective && $dstr === $effective) {
                        $dates[$dstr] = true;
                        $countOcc++;
                    }
                }
            }

            if ($occ_limit > 0 && $countOcc >= $occ_limit) break;
        }
    }

    $unique = array_keys($dates);
    sort($unique);

    echo json_encode([
        "success" => true,
        "data" => $unique
    ]);
    $stmt->close();
} catch (Exception $e) {
    echo json_encode([
        "success" => false,
        "message" => $e->getMessage()
    ]);
}

$conn->close();
