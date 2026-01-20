<?php
// schedule-manager/upsert-employee-shift.php
// Updated: supports PDO or mysqli connection variables (detects $pdo, $conn, $mysqli)
include '../server/connection.php';
include("../server/cors.php");

header('Content-Type: application/json');

$input = json_decode(file_get_contents('php://input'), true);
if (!$input) $input = $_POST;

$employee_id = $input['employee_id'] ?? null;
$schedule_date = $input['schedule_date'] ?? null;
$work_time_id = array_key_exists('work_time_id', $input) ? $input['work_time_id'] : null;
$priority = isset($input['priority']) ? intval($input['priority']) : 1;

if (!$employee_id || !$schedule_date) {
    echo json_encode(['success' => false, 'message' => 'employee_id and schedule_date required']);
    exit;
}
if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $schedule_date)) {
    echo json_encode(['success' => false, 'message' => 'Invalid schedule_date format']);
    exit;
}

// Helper to return error JSON
function json_error($msg) {
    echo json_encode(['success' => false, 'message' => $msg]);
    exit;
}

// Detect connection
$hasPdo = (isset($pdo) && ($pdo instanceof PDO));
$hasMysqli = false;
if (isset($conn) && ($conn instanceof mysqli)) $hasMysqli = true;
if (!$hasMysqli && isset($mysqli) && ($mysqli instanceof mysqli)) {
    $conn = $mysqli;
    $hasMysqli = true;
}

// If no supported connection, return helpful error
if (!$hasPdo && !$hasMysqli) {
    json_error('No supported DB connection found. Ensure connection.php defines $pdo (PDO) or $conn/$mysqli (mysqli).');
}

try {
    if ($hasPdo) {
        // PDO branch
        $pdo->beginTransaction();

        // delete existing non-recurring override for that employee/date
        $del = $pdo->prepare("DELETE FROM employee_shift_schedule WHERE employee_id = :eid AND recurrence_type = 'none' AND effective_date = :sdate");
        $del->execute([':eid' => $employee_id, ':sdate' => $schedule_date]);

        if ($work_time_id) {
            $ins = $pdo->prepare("INSERT INTO employee_shift_schedule
                (employee_id, work_time_id, effective_date, end_date, recurrence_type, recurrence_interval, is_active, created_at, priority)
                VALUES (:eid, :wid, :sdate, NULL, 'none', 1, 1, NOW(), :priority)
            ");
            $ins->execute([':eid' => $employee_id, ':wid' => $work_time_id, ':sdate' => $schedule_date, ':priority' => $priority]);
            $lastId = $pdo->lastInsertId();
            $pdo->commit();
            echo json_encode(['success' => true, 'message' => 'Shift set for date', 'schedule_id' => $lastId]);
            exit;
        } else {
            // cleared
            $pdo->commit();
            echo json_encode(['success' => true, 'message' => 'Shift cleared for date']);
            exit;
        }
    } else {
        // mysqli branch (uses $conn)
        $conn->begin_transaction();

        // DELETE existing override
        $delSql = "DELETE FROM employee_shift_schedule WHERE employee_id = ? AND recurrence_type = 'none' AND effective_date = ?";
        $delStmt = $conn->prepare($delSql);
        if (!$delStmt) throw new Exception("Prepare failed (delete): " . $conn->error);
        $delStmt->bind_param('ss', $employee_id, $schedule_date);
        $delOk = $delStmt->execute();
        $delStmt->close();
        if ($delOk === false) throw new Exception("Delete execute failed: " . $conn->error);

        if ($work_time_id) {
            $insSql = "INSERT INTO employee_shift_schedule
                (employee_id, work_time_id, effective_date, end_date, recurrence_type, recurrence_interval, is_active, created_at, priority)
                VALUES (?, ?, ?, NULL, 'none', 1, 1, NOW(), ?)";
            $insStmt = $conn->prepare($insSql);
            if (!$insStmt) throw new Exception("Prepare failed (insert): " . $conn->error);

            // ensure proper types
            $wid_int = intval($work_time_id);
            $priority_int = intval($priority);

            // bind: employee_id (s), work_time_id (i), schedule_date (s), priority (i)
            $insStmt->bind_param('sisi', $employee_id, $wid_int, $schedule_date, $priority_int);
            $insOk = $insStmt->execute();
            if ($insOk === false) {
                $insStmt->close();
                throw new Exception("Insert execute failed: " . $conn->error);
            }
            $lastId = $conn->insert_id;
            $insStmt->close();

            $conn->commit();
            echo json_encode(['success' => true, 'message' => 'Shift set for date', 'schedule_id' => $lastId]);
            exit;
        } else {
            // cleared
            $conn->commit();
            echo json_encode(['success' => true, 'message' => 'Shift cleared for date']);
            exit;
        }
    }
} catch (Exception $e) {
    // attempt rollback depending on connection
    if ($hasPdo && isset($pdo)) {
        try { $pdo->rollBack(); } catch (Exception $_) {}
    } elseif ($hasMysqli && isset($conn)) {
        try { $conn->rollback(); } catch (Exception $_) {}
    }
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
    exit;
}
