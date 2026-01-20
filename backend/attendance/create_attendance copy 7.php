<?php
ob_start();
include("../server/cors.php");
include "../server/connection.php";
//back up 9/30/2025

// Show all errors in development
error_reporting(E_ALL);
ini_set('display_errors', 1);

// Ensure JSON header
header("Content-Type: application/json; charset=UTF-8");

/**
 * Get the applicable work shift for the employee on a specific date.
 */
function getEmployeeShift($conn, $employee_id, $attendance_date) {
    $sql = "
        SELECT ess.*, wt.*
        FROM employee_shift_schedule ess
        JOIN work_time wt ON ess.work_time_id = wt.id
        WHERE ess.employee_id = ?
          AND ess.is_active = 1
          AND ess.effective_date <= ?
          AND (ess.end_date IS NULL OR ess.end_date = '0000-00-00' OR ess.end_date >= ?)
        ORDER BY ess.effective_date DESC
    ";
    $stmt = $conn->prepare($sql);
    $stmt->bind_param("sss", $employee_id, $attendance_date, $attendance_date);
    $stmt->execute();
    $result = $stmt->get_result();

    while ($row = $result->fetch_assoc()) {
        $recurrence = $row['recurrence_type'];
        $daysOfWeek = $row['days_of_week'] ? explode(',', $row['days_of_week']) : [];
        $dayName    = date("D", strtotime($attendance_date)); // e.g. Fri

        if ($recurrence === 'none' && $row['effective_date'] == $attendance_date) {
            return $row;
        }

        if ($recurrence === 'weekly' && in_array($dayName, $daysOfWeek)) {
            return $row;
        }

        if ($recurrence === 'daily') {
            return $row;
        }

        if ($recurrence === 'monthly' && date("d", strtotime($row['effective_date'])) == date("d", strtotime($attendance_date))) {
            return $row;
        }
    }

    // fallback default
    $default_sql = "SELECT * FROM work_time WHERE is_default = 1 LIMIT 1";
    $default_result = $conn->query($default_sql);
    return $default_result->fetch_assoc();
}


/**
 * Restrict diff to valid range
 */
function timeDiffWithinRange($start, $end, $range_start, $range_end) {
    $start_ts = max(strtotime($start), strtotime($range_start));
    $end_ts   = min(strtotime($end), strtotime($range_end));
    $diff     = $end_ts - $start_ts;
    return ($diff > 0) ? $diff / 60 : 0;
}

/**
 * Late deduction lookup
 */
function getDeduction($conn, $late_time) {
    $sql = "SELECT deduction FROM deduction_table WHERE ? BETWEEN start_time AND end_time ORDER BY start_time DESC LIMIT 1";
    $stmt = $conn->prepare($sql);
    if (!$stmt) return 0;
    $stmt->bind_param("s", $late_time);
    $stmt->execute();
    $result = $stmt->get_result();
    $deduction = 0.0;
    if ($row = $result->fetch_assoc()) {
        $deduction = floatval($row['deduction']);
    }
    $stmt->close();
    return $deduction;
}

/**
 * Time Break
 */
function getShiftBreaks($conn, $work_time_id) {
    $sql = "
        SELECT bt.*
        FROM break_time bt
        JOIN work_time_break wtb ON bt.id = wtb.break_id
        WHERE wtb.work_time_id = ?
           OR bt.work_time_id IS NULL
    ";
    $stmt = $conn->prepare($sql);
    if (!$stmt) return [];

    $stmt->bind_param("i", $work_time_id);
    $stmt->execute();
    $result = $stmt->get_result();

    $breaks = [];
    while ($row = $result->fetch_assoc()) {
        $row['break_minutes'] = (strtotime($row['break_end']) - strtotime($row['break_start'])) / 60;
        $breaks[] = $row;
    }
    return $breaks;
}

// ================== MAIN ==================

$data = json_decode(file_get_contents("php://input"), true);

if (!$data) {
    echo json_encode(["success" => false, "message" => "Invalid or empty JSON input."]);
    exit;
}

if (isset($data['attendance_date'], $data['employee_id'], $data['employee_name'])) {
    $attendance_date   = $data['attendance_date'];
    $employee_id       = $data['employee_id'];
    $employee_name     = $data['employee_name'];
    $time_in_morning   = $data['time_in_morning'] ?? null;
    $time_out_morning  = $data['time_out_morning'] ?? null;
    $time_in_afternoon = $data['time_in_afternoon'] ?? null;
    $time_out_afternoon= $data['time_out_afternoon'] ?? null;

    // ✅ Get employee shift
    $shift = getEmployeeShift($conn, $employee_id, $attendance_date);
    if (!$shift) {
        echo json_encode(["success" => false, "message" => "No shift schedule found."]);
        exit;
    }

    $shift_start = $shift['start_time'];
    $shift_end   = $shift['end_time'];
    $credit_basis_minutes = $shift['total_minutes'];

    // subtract break minutes
    $breaks = getShiftBreaks($conn, $shift['id']);
    foreach ($breaks as $br) {
        $credit_basis_minutes -= $br['break_minutes'];
    }

    $total_minutes = 0;

    // compute attendance while excluding break ranges
    if ($time_in_morning && $time_out_morning) {
        $minutes = timeDiffWithinRange($time_in_morning, $time_out_morning, $shift_start, $shift_end);
        foreach ($breaks as $br) {
            $minutes -= timeDiffWithinRange($time_in_morning, $time_out_morning, $br['break_start'], $br['break_end']);
        }
        $total_minutes += max(0, $minutes);
    }

    if ($time_in_afternoon && $time_out_afternoon) {
        $minutes = timeDiffWithinRange($time_in_afternoon, $time_out_afternoon, $shift_start, $shift_end);
        foreach ($breaks as $br) {
            $minutes -= timeDiffWithinRange($time_in_afternoon, $time_out_afternoon, $br['break_start'], $br['break_end']);
        }
        $total_minutes += max(0, $minutes);
    }

    // ✅ Fraction-based credit
    $adjusted_days = 0;
    if ($total_minutes > 0 && $credit_basis_minutes > 0) {
        $adjusted_days = $total_minutes / $credit_basis_minutes;
    }

    // ✅ Deduction (lateness override only)
    $deduction_morning = ($time_in_morning && strtotime($time_in_morning) > strtotime($shift_start)) 
        ? getDeduction($conn, $time_in_morning) : 0;
    $deduction_afternoon = ($time_in_afternoon && strtotime($time_in_afternoon) > strtotime("13:00:00")) 
        ? getDeduction($conn, $time_in_afternoon) : 0;

    if ($deduction_morning > 0 || $deduction_afternoon > 0) {
        $adjusted_days -= ($deduction_morning + $deduction_afternoon);
    }

    // ✅ Cap to [0, 1.0]
    $adjusted_days = max(0, min(1.0, $adjusted_days));

    // ✅ Holiday check
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
            $multiplier = floatval($holiday_row['default_multiplier'] ?? 1.0);
            $apply_multiplier = boolval($holiday_row['apply_multiplier'] ?? false);

            if ($apply_multiplier && round($adjusted_days, 2) === 1.0) {
                $adjusted_days = round($adjusted_days * $multiplier, 2);
            }
        }
    }

    $days_credited = $is_holiday_attendance ? $adjusted_days : min(1.0, round($adjusted_days, 2));

    // ✅ Save record
    $sql = "INSERT INTO attendance (
                attendance_date, employee_id, employee_name,
                work_time_id, time_in_morning, time_out_morning,
                time_in_afternoon, time_out_afternoon,
                days_credited, early_out, is_holiday_attendance
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";
    $stmt = $conn->prepare($sql);

    if (!$stmt) {
        echo json_encode(["success" => false, "message" => "Insert prepare failed: " . $conn->error]);
        exit;
    }

    $early_out = 0; // placeholder (re-add if needed)

    $stmt->bind_param(
        "sssissssdis",
        $attendance_date, $employee_id, $employee_name,
        $shift['id'],
        $time_in_morning, $time_out_morning,
        $time_in_afternoon, $time_out_afternoon,
        $days_credited, $early_out, $is_holiday_attendance
    );

    if ($stmt->execute()) {
        echo json_encode([
            "success" => true,
            "days_credited" => $days_credited,
            "debug" => [
                "total_minutes" => $total_minutes,
                "credit_basis_minutes" => $credit_basis_minutes,
                "breaks" => $breaks
            ]
        ]);
    } else {
        echo json_encode(["success" => false, "message" => $stmt->error]);
    }

    $stmt->close();
} else {
    echo json_encode(["success" => false, "message" => "Missing required fields."]);
}

$conn->close();
