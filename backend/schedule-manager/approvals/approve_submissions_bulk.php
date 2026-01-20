<?php
// approve_submissions_bulk_optimized.php
include('../../server/cors.php');
include '../../server/connection.php';

header('Content-Type: application/json; charset=utf-8');

// Decode incoming JSON
$data = json_decode(file_get_contents("php://input"), true);
if (!$data || !is_array($data)) {
    http_response_code(400);
    echo json_encode(["success" => false, "message" => "Invalid JSON payload."]);
    exit;
}

$submission_ids = isset($data['submission_ids']) && is_array($data['submission_ids']) ? array_values($data['submission_ids']) : [];
$action = isset($data['action']) ? trim($data['action']) : null; // 'approve' or 'reject'
$approver_level = isset($data['approver_level']) ? intval($data['approver_level']) : null;
$approver_id = isset($data['approver_id']) ? $data['approver_id'] : null;
$approver_name = isset($data['approver_name']) ? $data['approver_name'] : null;
$comment = isset($data['comment']) ? $data['comment'] : null;

if (!$submission_ids || count($submission_ids) === 0) {
    http_response_code(400);
    echo json_encode(["success" => false, "message" => "Missing submission_ids."]);
    exit;
}
if (!in_array($action, ['approve', 'reject'])) {
    http_response_code(400);
    echo json_encode(["success" => false, "message" => "Invalid action."]);
    exit;
}
if ($approver_level !== 1 && $approver_level !== 2) {
    http_response_code(400);
    echo json_encode(["success" => false, "message" => "Invalid approver_level."]);
    exit;
}

$results = [];

// Fetch all submissions in one query to reduce DB calls
$placeholders = implode(',', array_fill(0, count($submission_ids), '?'));
$types = str_repeat('i', count($submission_ids));
$stmt = $conn->prepare("SELECT * FROM schedule_submissions WHERE submission_id IN ($placeholders)");
if (!$stmt) {
    echo json_encode(["success" => false, "message" => "Prepare failed: " . $conn->error]);
    exit;
}

// Bind dynamically
$params = [];
foreach ($submission_ids as $id) $params[] = $id;
$tmp = [];
$tmp[] = &$types;
for ($i = 0; $i < count($params); $i++) $tmp[] = &$params[$i];
call_user_func_array([$stmt, 'bind_param'], $tmp);

$stmt->execute();
$res = $stmt->get_result();
$submissions = [];
while ($row = $res->fetch_assoc()) {
    $submissions[$row['submission_id']] = $row;
}
$stmt->close();

// Group employee_id + effective_date for batch delete (for Level 2 approval)
$employeeDatesToDelete = [];

foreach ($submission_ids as $subIdRaw) {
    $submission_id = intval($subIdRaw);
    if (!isset($submissions[$submission_id])) {
        $results[] = ["submission_id" => $submission_id, "success" => false, "message" => "Submission not found"];
        continue;
    }

    $sub = $submissions[$submission_id];
    $currentStatus = $sub['status'] ?? 'pending';

    // Handle rejection
    if ($action === 'reject') {
        $updateSQL = ($approver_level === 1)
            ? "UPDATE schedule_submissions SET status='rejected', approved_by_lvl1=?, approved_at_lvl1=NOW(), comment=?, notes=? WHERE submission_id=?"
            : "UPDATE schedule_submissions SET status='rejected', approved_by_lvl2=?, approved_at_lvl2=NOW(), comment=?, notes=? WHERE submission_id=?";
        $stmtUpd = $conn->prepare($updateSQL);
        $notes = $comment;
        $stmtUpd->bind_param("sssi", $approver_id, $comment, $notes, $submission_id);
        if ($stmtUpd->execute()) {
            $results[] = ["submission_id" => $submission_id, "success" => true, "message" => "Rejected"];
        } else {
            $results[] = ["submission_id" => $submission_id, "success" => false, "message" => "Failed to update submission: ".$stmtUpd->error];
        }
        $stmtUpd->close();
        continue;
    }

    // Handle Level 1 Approval
    if ($approver_level === 1) {
        if ($currentStatus !== 'pending') {
            $results[] = ["submission_id" => $submission_id, "success" => false, "message" => "Level 1 can only approve pending submissions. Current status: {$currentStatus}"];
            continue;
        }
        $stmtUpd = $conn->prepare("UPDATE schedule_submissions SET status='lvl1_approved', approved_by_lvl1=?, approved_at_lvl1=NOW(), comment=? WHERE submission_id=?");
        $stmtUpd->bind_param("ssi", $approver_id, $comment, $submission_id);
        if ($stmtUpd->execute()) {
            $results[] = ["submission_id" => $submission_id, "success" => true, "message" => "Level 1 approved"];
        } else {
            $results[] = ["submission_id" => $submission_id, "success" => false, "message" => "Failed to update submission: ".$stmtUpd->error];
        }
        $stmtUpd->close();
        continue;
    }

    // Handle Level 2 Approval
    if (!in_array($currentStatus, ['pending', 'lvl1_approved'])) {
        $results[] = ["submission_id" => $submission_id, "success" => false, "message" => "Level 2 can only approve pending or lvl1_approved submissions. Current status: {$currentStatus}"];
        continue;
    }

    // Mark employee + effective_date for batch delete
    $employeeDatesToDelete[] = ['employee_id' => $sub['employee_id'], 'effective_date' => $sub['effective_date']];
}

// Begin transaction for Level 2 schedule application
if ($approver_level === 2 && $action === 'approve') {
    $conn->begin_transaction();
    try {
        // Batch delete all existing schedules for same employee/date
        if (!empty($employeeDatesToDelete)) {
            $conds = [];
            foreach ($employeeDatesToDelete as $ed) {
                $conds[] = "(`employee_id`='" . $conn->real_escape_string($ed['employee_id']) . "' AND `effective_date`='" . $conn->real_escape_string($ed['effective_date']) . "')";
            }
            $deleteSQL = "DELETE FROM employee_shift_schedule WHERE is_active=1 AND (" . implode(" OR ", $conds) . ")";
            $conn->query($deleteSQL);
        }

        // Insert new schedules
        $stmtIns = $conn->prepare("INSERT INTO employee_shift_schedule (employee_id, work_time_id, effective_date, end_date, recurrence_type, recurrence_interval, days_of_week, is_active, priority, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?, NOW())");
        foreach ($submission_ids as $subIdRaw) {
            $submission_id = intval($subIdRaw);
            if (!isset($submissions[$submission_id])) continue;
            $sub = $submissions[$submission_id];
            $employee_id = $sub['employee_id'];
            $work_time_id = $sub['work_time_id'];
            if ($work_time_id === null) continue; // skip clearing shifts; already deleted
            $effective_date = $sub['effective_date'];
            $end_date = $sub['end_date'] ?: null;
            $recurrence_type = $sub['recurrence_type'] ?: 'none';
            $recurrence_interval = intval($sub['recurrence_interval']) ?: 1;
            $days_of_week = $sub['days_of_week'] ?? null;
            $priority = intval($sub['priority']) ?: 1;

            $stmtIns->bind_param("sisssisi", $employee_id, $work_time_id, $effective_date, $end_date, $recurrence_type, $recurrence_interval, $days_of_week, $priority);
            $stmtIns->execute();
        }
        $stmtIns->close();

        // Update submissions as applied
        $stmtUpdSub = $conn->prepare("UPDATE schedule_submissions SET status='applied', approved_by_lvl2=?, approved_at_lvl2=NOW(), applied_by=?, applied_at=NOW(), comment=? WHERE submission_id=?");
        foreach ($submission_ids as $subIdRaw) {
            $submission_id = intval($subIdRaw);
            if (!isset($submissions[$submission_id])) continue;
            $stmtUpdSub->bind_param("sssi", $approver_id, $approver_name, $comment, $submission_id);
            $stmtUpdSub->execute();
        }
        $stmtUpdSub->close();

        $conn->commit();
        $results[] = ["success" => true, "message" => "Level 2 approved and schedules applied"];
    } catch (Exception $ex) {
        $conn->rollback();
        $results[] = ["success" => false, "message" => "Failed to apply Level 2 submissions: " . $ex->getMessage()];
    }
}

echo json_encode(["success" => true, "results" => $results]);
$conn->close();
exit;
?>
