<?php
// import_attendance.php
// Separate endpoint to import grouped attendance rows into `attendance` table.
// Requires: ../server/connection.php (provides $conn)
// Note: attendance table should have UNIQUE KEY on (employee_id, attendance_date) for upsert.
// Example response: { status: "success", total_received: X, inserted: Y, updated: Z, skipped: K, errors_sample: [...] }

include("../server/cors.php");
include("../server/connection.php");

header("Content-Type: application/json; charset=UTF-8");

// read JSON body
$raw = file_get_contents("php://input");
$input = json_decode($raw, true);

if (!isset($input['records']) || !is_array($input['records'])) {
    echo json_encode(['status' => 'error', 'message' => 'Invalid payload: records array expected']);
    exit;
}

$records = $input['records'];
$total = count($records);
$inserted = 0;
$updated = 0;
$skipped = 0;
$errors = [];

/**
 * Normalize time to HH:MM:SS or null
 */
function normalize_time_sql($t) {
    if ($t === null) return null;
    $t = trim((string)$t);
    if ($t === '') return null;

    // If already HH:MM:SS
    if (preg_match('/^\d{2}:\d{2}:\d{2}$/', $t)) return $t;

    // If HH:MM
    if (preg_match('/^\d{1,2}:\d{2}$/', $t)) {
        $parts = explode(':', $t);
        $h = str_pad($parts[0], 2, '0', STR_PAD_LEFT);
        $m = str_pad($parts[1], 2, '0', STR_PAD_LEFT);
        return "$h:$m:00";
    }

    // Try strtotime fallback (handles many formats)
    $ts = strtotime($t);
    if ($ts !== false && $ts > 0) return date('H:i:s', $ts);

    return null;
}

/**
 * Normalize date to YYYY-MM-DD or null
 * Accepts dd/mm/YYYY, dd-mm-YYYY, YYYY-MM-DD etc.
 */
function normalize_date_sql($d) {
    if ($d === null) return null;
    $d = trim((string)$d);
    if ($d === '') return null;

    if (preg_match('/^\d{4}-\d{2}-\d{2}$/', $d)) return $d;

    // dd/mm/YYYY or dd-mm-YYYY
    if (preg_match('/^\d{1,2}[\/-]\d{1,2}[\/-]\d{4}$/', $d)) {
        $d2 = str_replace('-', '/', $d);
        $parts = explode('/', $d2);
        if (count($parts) === 3) {
            $dd = str_pad($parts[0], 2, '0', STR_PAD_LEFT);
            $mm = str_pad($parts[1], 2, '0', STR_PAD_LEFT);
            $yy = $parts[2];
            return "$yy-$mm-$dd";
        }
    }

    $ts = strtotime($d);
    if ($ts !== false && $ts > 0) return date('Y-m-d', $ts);

    return null;
}

// Upsert SQL (requires unique key on employee_id + attendance_date)
$sql = "
INSERT INTO attendance
(employee_id, employee_name, attendance_date, time_in_morning, time_out_morning, time_in_afternoon, time_out_afternoon)
VALUES (?, ?, ?, ?, ?, ?, ?)
ON DUPLICATE KEY UPDATE
  employee_name = VALUES(employee_name),
  time_in_morning = VALUES(time_in_morning),
  time_out_morning = VALUES(time_out_morning),
  time_in_afternoon = VALUES(time_in_afternoon),
  time_out_afternoon = VALUES(time_out_afternoon)
";

$stmt = $conn->prepare($sql);
if (!$stmt) {
    echo json_encode(['status' => 'error', 'message' => 'Prepare failed: ' . $conn->error]);
    exit;
}

// Loop rows
foreach ($records as $i => $row) {
    // tolerant mapping (the groupedRows structure from React)
    $employee_id = $row['employee_id'] ?? $row['person_id'] ?? $row['employeeId'] ?? $row['Employee ID'] ?? null;
    $employee_name = $row['employee_name'] ?? $row['name'] ?? $row['employeeName'] ?? '';
    $attendance_date = $row['attendance_date'] ?? $row['date'] ?? $row['attendanceDate'] ?? null;

    $t1 = $row['time_in_morning'] ?? $row['timeInMorning'] ?? $row['morning_in'] ?? null;
    $t2 = $row['time_out_morning'] ?? $row['timeOutMorning'] ?? $row['morning_out'] ?? null;
    $t3 = $row['time_in_afternoon'] ?? $row['timeInAfternoon'] ?? $row['afternoon_in'] ?? null;
    $t4 = $row['time_out_afternoon'] ?? $row['timeOutAfternoon'] ?? $row['afternoon_out'] ?? null;

    // Normalize date/time
    $attendance_date_norm = normalize_date_sql($attendance_date);
    $t1n = normalize_time_sql($t1);
    $t2n = normalize_time_sql($t2);
    $t3n = normalize_time_sql($t3);
    $t4n = normalize_time_sql($t4);

    if (empty($employee_id) || $attendance_date_norm === null) {
        $skipped++;
        $errors[] = ['index' => $i+1, 'reason' => 'missing employee_id or attendance_date', 'row' => $row];
        continue;
    }

    // Bind parameters (strings; nulls pass as null)
    // mysqli bind_param doesn't accept null directly if type is 's'/'i' - we pass strings and use NULL if appropriate.
    // Use variables to bind
    $empId = (string)$employee_id;
    $empName = (string)$employee_name;
    $attDate = $attendance_date_norm;
    $time1 = $t1n;
    $time2 = $t2n;
    $time3 = $t3n;
    $time4 = $t4n;

    // For null values we must pass NULL as PHP null, but bind_param with 's' will convert null to empty string.
    // To insert actual SQL NULL, we will bind all as strings and use the SQL function NULLIF on empty strings,
    // but to keep it simple we convert null to NULL by using explicit types and dynamic query if needed.
    // Simpler approach: convert null to NULL string and use this prepared query but explicitly set empty strings to NULL in query by using NULLIF(?, '').
    // (To avoid rewriting, we'll replace empty strings with null-values and bind with 'sssssss', then use this approach: pass null as null and call bind_param with types 'sssssss' using references.)
    // However mysqli bind_param will convert null to an empty string. To actually insert SQL NULL we can use a lightweight workaround:
    // Use this query variant that uses NULLIF to convert empty string to NULL:
    // But we already prepared statement without NULLIF. Simpler: convert null to empty string and rely on DB default being NULLable; if needed user can adjust. We'll pass strings (or empty) — most columns accept NULL or empty.

    // Convert null to '' since table fields accept NULL but bind_param will send empty string
    $time1_param = $time1 === null ? null : $time1;
    $time2_param = $time2 === null ? null : $time2;
    $time3_param = $time3 === null ? null : $time3;
    $time4_param = $time4 === null ? null : $time4;

    // Because bind_param treats null as empty string, we use mysqli_stmt_bind_param with variables and then set NULLs via mysqli_stmt_send_long_data is overkill.
    // Simpler: convert null -> NULL via 's' binding but set the variable to null (mysqli will treat it as NULL)
    // Bind:
    $bindOk = $stmt->bind_param(
        'sssssss',
        $empId,
        $empName,
        $attDate,
        $time1_param,
        $time2_param,
        $time3_param,
        $time4_param
    );

    if (!$bindOk) {
        $errors[] = ['index' => $i+1, 'error' => 'bind_param_failed', 'mysqli_error' => $conn->error];
        $skipped++;
        continue;
    }

    if ($stmt->execute()) {
        // MySQL affected_rows for ON DUPLICATE: 1 = inserted, 2 = updated (may vary)
        if ($stmt->affected_rows === 1) $inserted++;
        else $updated++;
    } else {
        $errors[] = ['index' => $i+1, 'error' => $stmt->error, 'row' => $row];
    }
}

$stmt->close();
$conn->close();

echo json_encode([
    'status' => 'success',
    'total_received' => $total,
    'inserted' => $inserted,
    'updated' => $updated,
    'skipped' => $skipped,
    'errors_sample' => array_slice($errors, 0, 50)
]);
