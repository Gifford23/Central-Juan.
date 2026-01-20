<?php
// schedule-manager/approvals/create_submission.php
// Transactional: atomically update existing non-final submission or insert a new one.

include('../../server/cors.php');
include '../../server/connection.php';
header('Content-Type: application/json; charset=utf-8');

// DEV: show errors while debugging (disable on production)
ini_set('display_errors', 1);
error_reporting(E_ALL);

// read JSON
$raw = file_get_contents("php://input");
$data = json_decode($raw, true);
if (!is_array($data)) {
    echo json_encode(["success" => false, "message" => "Invalid JSON payload."]);
    exit;
}

// required
$employee_id = isset($data['employee_id']) ? trim($data['employee_id']) : null;
$effective_date = isset($data['effective_date']) ? trim($data['effective_date']) : null;
if (!$employee_id || !$effective_date) {
    echo json_encode(["success" => false, "message" => "Missing employee_id or effective_date."]);
    exit;
}

// optional values
$work_time_id = array_key_exists('work_time_id', $data) && $data['work_time_id'] !== null && $data['work_time_id'] !== ''
    ? intval($data['work_time_id']) : null;
$end_date = array_key_exists('end_date', $data) && $data['end_date'] !== '' ? $data['end_date'] : $effective_date;
$recurrence_type = isset($data['recurrence_type']) ? $data['recurrence_type'] : 'none';
$recurrence_interval = isset($data['recurrence_interval']) ? intval($data['recurrence_interval']) : 1;
$days_of_week = array_key_exists('days_of_week', $data) && $data['days_of_week'] !== '' ? $data['days_of_week'] : null;
$priority = isset($data['priority']) ? intval($data['priority']) : 1;
$submitter_id = isset($data['submitter_id']) ? $data['submitter_id'] : null;
$submitter_name = isset($data['submitter_name']) ? $data['submitter_name'] : null;
$notes = isset($data['notes']) ? $data['notes'] : null;

// helper: columnExists
function columnExists($conn, $table, $column) {
    $table = preg_replace('/[^0-9A-Za-z_]/', '', $table);
    $sql = "SELECT COUNT(*) AS cnt
            FROM INFORMATION_SCHEMA.COLUMNS
            WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?";
    $stmt = $conn->prepare($sql);
    if (!$stmt) return false;
    $stmt->bind_param("ss", $table, $column);
    $stmt->execute();
    $stmt->bind_result($cnt);
    $stmt->fetch();
    $stmt->close();
    return intval($cnt) > 0;
}

// table
$table = 'schedule_submissions'; // <-- change if your table differs

if (!$conn) {
    echo json_encode(["success" => false, "message" => "Database connection not available."]);
    exit;
}

try {
    // Start transaction
    $conn->begin_transaction();

    // 1) find existing non-final submission for this employee/date, lock it
    // consider 'applied' and 'rejected' as final; everything else replaceable
    $checkSql = "SELECT submission_id, work_time_id, status FROM `$table`
                 WHERE employee_id = ? AND effective_date = ? AND status NOT IN ('applied','rejected')
                 ORDER BY created_at DESC
                 LIMIT 1 FOR UPDATE";
    $chkStmt = $conn->prepare($checkSql);
    if (!$chkStmt) throw new Exception("Prepare failed (check): " . $conn->error);
    $chkStmt->bind_param("ss", $employee_id, $effective_date);
    $chkStmt->execute();
    $chkStmt->bind_result($foundId, $foundWorkTimeId, $foundStatus);
    $existingId = null;
    if ($chkStmt->fetch()) {
        $existingId = $foundId;
    }
    $chkStmt->close();

    // dynamic column detection
    $canUseSubmitterId = columnExists($conn, $table, 'submitter_id');
    $canUseSubmitterName = columnExists($conn, $table, 'submitter_name');
    $hasNotes = columnExists($conn, $table, 'notes');
    $hasUpdatedAt = columnExists($conn, $table, 'updated_at');

    if ($existingId) {
        // If existing row has same work_time_id as requested, simply update timestamps/submitter (optional) and return
        $existingWtNormalized = ($foundWorkTimeId === null || $foundWorkTimeId === '') ? null : strval($foundWorkTimeId);
        $chosen = $work_time_id === null ? null : strval($work_time_id);
        if ($existingWtNormalized === $chosen) {
            // optionally update submitter/notes/updated_at, but do not duplicate rows
            $setParts = [];
            $types = '';
            $bind = [];

            // update submitter_id/name/notes if present
            if ($canUseSubmitterId) { $setParts[] = "`submitter_id` = ?"; $types .= 's'; $bind[] = ($submitter_id === null ? null : $submitter_id); }
            if ($canUseSubmitterName) { $setParts[] = "`submitter_name` = ?"; $types .= 's'; $bind[] = ($submitter_name === null ? null : $submitter_name); }
            if ($hasNotes) { $setParts[] = "`notes` = ?"; $types .= 's'; $bind[] = ($notes === null ? null : $notes); }
            if ($hasUpdatedAt) { $setParts[] = "`updated_at` = NOW()"; } // no bind

            if (count($setParts) > 0) {
                $sql = "UPDATE `$table` SET " . implode(", ", $setParts) . " WHERE submission_id = ? LIMIT 1";
                $stmt = $conn->prepare($sql);
                if (!$stmt) throw new Exception("Prepare failed (update-same): " . $conn->error);

                // bind params
                if ($types !== '') {
                    $typesWithId = $types . 'i';
                    $bind[] = intval($existingId);
                    $bindNames = [];
                    $bindNames[] = $typesWithId;
                    foreach ($bind as $i => $b) $bindNames[] = &$bind[$i];
                    call_user_func_array([$stmt, 'bind_param'], $bindNames);
                } else {
                    // only updated_at changed (no params)
                    $stmt->bind_param('i', $existingId); // fallback; won't be used if no types
                }
                $ok = $stmt->execute();
                $stmt->close();
            }
            $conn->commit();
            echo json_encode(["success" => true, "action" => "updated", "submission_id" => intval($existingId), "note" => "no substantive change (work_time_id identical)"]);
            exit;
        }

        // Otherwise, update the existing submission with new values
        $setParts = [
            "`work_time_id` = ?",
            "`end_date` = ?",
            "`recurrence_type` = ?",
            "`recurrence_interval` = ?",
            "`days_of_week` = ?",
            "`priority` = ?"
        ];
        $bindTypes = "sisss i"; // we'll replace spaces — but easier to build below correctly
        // build binding list in order
        $bindVals = [];
        // work_time_id (allow null)
        $bindVals[] = $work_time_id === null ? null : $work_time_id;
        // end_date
        $bindVals[] = $end_date === null ? null : $end_date;
        // recurrence_type
        $bindVals[] = $recurrence_type;
        // recurrence_interval
        $bindVals[] = $recurrence_interval;
        // days_of_week
        $bindVals[] = $days_of_week === null ? null : $days_of_week;
        // priority
        $bindVals[] = $priority;

        if ($canUseSubmitterId) { $setParts[] = "`submitter_id` = ?"; $bindVals[] = ($submitter_id === null ? null : $submitter_id); }
        if ($canUseSubmitterName) { $setParts[] = "`submitter_name` = ?"; $bindVals[] = ($submitter_name === null ? null : $submitter_name); }
        if ($hasNotes) { $setParts[] = "`notes` = ?"; $bindVals[] = ($notes === null ? null : $notes); }
        if ($hasUpdatedAt) { $setParts[] = "`updated_at` = NOW()"; } // no bind

        $sql = "UPDATE `$table` SET " . implode(", ", $setParts) . " WHERE submission_id = ? LIMIT 1";
        $stmt = $conn->prepare($sql);
        if (!$stmt) throw new Exception("Prepare failed (update): " . $conn->error);

        // build types string
        // map each bindVal to type: integer for recurrence_interval and priority and work_time_id; rest string
        $types = '';
        foreach ($bindVals as $idx => $v) {
            // indices: 0 = work_time_id (i), 1 = end_date (s), 2 = recurrence_type (s), 3 = recurrence_interval (i), 4 = days_of_week (s), 5 = priority (i)
            if ($idx === 0 || $idx === 3 || $idx === 5) $types .= 'i';
            else $types .= 's';
        }
        // append final 'i' for submission_id
        $types .= 'i';
        $bindVals[] = intval($existingId);

        // call bind_param by reference
        $bindNames = [];
        $bindNames[] = $types;
        for ($i = 0; $i < count($bindVals); $i++) $bindNames[] = &$bindVals[$i];
        call_user_func_array([$stmt, 'bind_param'], $bindNames);

        $ok = $stmt->execute();
        if (!$ok) throw new Exception("Execute failed (update): " . $stmt->error);
        $stmt->close();

        $conn->commit();
        echo json_encode(["success" => true, "action" => "updated", "submission_id" => intval($existingId)]);
        exit;
    } else {
        // No existing non-final submission -> INSERT new row
        $cols = ["employee_id","work_time_id","effective_date","end_date","recurrence_type","recurrence_interval","days_of_week","priority","status","created_at"];
        $placeholders = ["?","?","?","?","?","?","?","?","'pending'","NOW()"];
        $bindValues = [];
        $bindTypes = "";

        // employee_id
        $bindValues[] = $employee_id; $bindTypes .= "s";
        // work_time_id
        $bindValues[] = $work_time_id === null ? null : $work_time_id; $bindTypes .= "i";
        // effective_date
        $bindValues[] = $effective_date; $bindTypes .= "s";
        // end_date
        $bindValues[] = $end_date === null ? null : $end_date; $bindTypes .= "s";
        // recurrence_type
        $bindValues[] = $recurrence_type; $bindTypes .= "s";
        // recurrence_interval
        $bindValues[] = $recurrence_interval; $bindTypes .= "i";
        // days_of_week
        $bindValues[] = $days_of_week === null ? null : $days_of_week; $bindTypes .= "s";
        // priority
        $bindValues[] = $priority; $bindTypes .= "i";

        if ($canUseSubmitterId) { $cols[] = 'submitter_id'; $placeholders[]='?'; $bindValues[] = $submitter_id === null ? null : $submitter_id; $bindTypes .= 's'; }
        if ($canUseSubmitterName) { $cols[] = 'submitter_name'; $placeholders[]='?'; $bindValues[] = $submitter_name === null ? null : $submitter_name; $bindTypes .= 's'; }
        if ($hasNotes) { $cols[] = 'notes'; $placeholders[]='?'; $bindValues[] = $notes === null ? null : $notes; $bindTypes .= 's'; }

        $cols_sql = implode(", ", array_map(function($c){ return "`$c`"; }, $cols));
        $placeholders_sql = implode(", ", $placeholders);
        $sql = "INSERT INTO `$table` ($cols_sql) VALUES ($placeholders_sql)";

        $stmt = $conn->prepare($sql);
        if (!$stmt) throw new Exception("Prepare failed (insert): " . $conn->error);

        $bindNames = [];
        $bindNames[] = $bindTypes;
        for ($i = 0; $i < count($bindValues); $i++) $bindNames[] = &$bindValues[$i];
        call_user_func_array([$stmt, 'bind_param'], $bindNames);

        $execOk = $stmt->execute();
        if (!$execOk) throw new Exception("Insert failed: " . $stmt->error);

        $insertedId = $stmt->insert_id;
        $stmt->close();
        $conn->commit();
        echo json_encode(["success" => true, "action" => "created", "submission_id" => intval($insertedId)]);
        exit;
    }
} catch (Throwable $e) {
    // rollback and return error
    if ($conn) $conn->rollback();
    $err = $e->getMessage();
    echo json_encode(["success" => false, "message" => "Server error: " . $err]);
    exit;
}
