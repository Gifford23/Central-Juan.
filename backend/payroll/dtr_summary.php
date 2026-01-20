<?php
include("../server/cors.php");
include("../server/connection.php");

header("Content-Type: application/json; charset=UTF-8");

try {
    // --- Fetch all payrolls for date range reference
    $payrollRes = $conn->query("SELECT payroll_id, date_from, date_until FROM payroll");
    $payrolls = [];
    while ($p = $payrollRes->fetch_assoc()) {
        $payrolls[$p['payroll_id']] = $p;
    }

    // --- Fetch all attendance records
    $attendanceSql = "
        SELECT 
            a.employee_id,
            a.attendance_date,
            a.total_rendered_hours,
            a.total_late_hours,
            p.payroll_id,
            e.first_name,
            e.last_name
        FROM attendance a
        INNER JOIN employees e ON a.employee_id = e.employee_id
        INNER JOIN payroll_attendance pa ON pa.attendance_id = a.attendance_id
        INNER JOIN payroll p ON p.payroll_id = pa.payroll_id
        ORDER BY a.attendance_date ASC
    ";
    $attendanceRes = $conn->query($attendanceSql);
    $attendance = [];
    while ($row = $attendanceRes->fetch_assoc()) {
        $key = $row['employee_id'] . "_" . $row['attendance_date'];
        $attendance[$key] = $row;
    }

    // --- Fetch all active shift schedules
    $shiftSql = "
        SELECT 
            s.employee_id,
            s.effective_date,
            s.end_date,
            s.days_of_week,
            w.start_time,
            w.end_time
        FROM employee_shift_schedule s
        INNER JOIN work_time w ON s.work_time_id = w.work_time_id
        WHERE s.is_active = 1
    ";
    $shiftRes = $conn->query($shiftSql);
    $shifts = [];
    while ($row = $shiftRes->fetch_assoc()) {
        $shifts[$row['employee_id']][] = $row;
    }

    // --- Prepare data to send
    $records = [];

    foreach ($payrolls as $payroll) {
        $start = new DateTime($payroll['date_from']);
        $end = new DateTime($payroll['date_until']);

        while ($start <= $end) {
            $dateStr = $start->format('Y-m-d');
            $dayOfWeek = $start->format('D'); // Mon, Tue, etc.

            // --- Loop through each employee with a shift
            foreach ($shifts as $empId => $empShifts) {
                $validShift = null;
                foreach ($empShifts as $shift) {
                    $effective = new DateTime($shift['effective_date']);
                    $until = $shift['end_date'] ? new DateTime($shift['end_date']) : null;
                    if (
                        $effective <= $start &&
                        ($until === null || $start <= $until)
                    ) {
                        $validShift = $shift;
                        break;
                    }
                }

                // Determine if this day is a working day for the employee
                $isWorkday = false;
                if ($validShift && $validShift['days_of_week']) {
                    $days = explode(",", str_replace("'", "", $validShift['days_of_week']));
                    $isWorkday = in_array($dayOfWeek, $days);
                }

                $key = $empId . "_" . $dateStr;
                $rec = isset($attendance[$key]) ? $attendance[$key] : null;

                $status = "A";
                $rendered = 0;
                $late = 0;

                if ($rec) {
                    $status = "Present";
                    $rendered = floatval($rec['total_rendered_hours']);
                    $late = floatval($rec['total_late_hours']);
                } elseif (!$isWorkday) {
                    $status = "Rest Day";
                }

                $records[] = [
                    "payroll_id" => $payroll['payroll_id'],
                    "employee_id" => $empId,
                    "employee_name" => $rec
                        ? "{$rec['last_name']}, {$rec['first_name']}"
                        : "Employee {$empId}",
                    "attendance_date" => $dateStr,
                    "status" => $status,
                    "total_rendered_hours" => $rendered,
                    "total_late_hours" => $late
                ];
            }

            $start->modify('+1 day');
        }
    }

    echo json_encode([
        "status" => "success",
        "data" => $records,
    ]);
} catch (Exception $e) {
    echo json_encode([
        "status" => "error",
        "message" => $e->getMessage(),
    ]);
}
?>
