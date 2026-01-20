<?php
// approve_submission.php
include('../../server/cors.php');
include '../../server/connection.php';

header('Content-Type: application/json; charset=utf-8');

// read JSON body
$raw = file_get_contents("php://input");
$data = json_decode($raw, true);
if (!$data || !is_array($data)) {
    http_response_code(400);
    echo json_encode(["success" => false, "message" => "Invalid JSON payload."]);
    exit;
}

$submission_id = isset($data['submission_id']) ? intval($data['submission_id']) : null;
$action = isset($data['action']) ? trim($data['action']) : null; // 'approve' or 'reject'
$approver_level = isset($data['approver_level']) ? intval($data['approver_level']) : null;
$approver_id = isset($data['approver_id']) ? $data['approver_id'] : null;
$approver_name = isset($data['approver_name']) ? $data['approver_name'] : null;
$comment = isset($data['comment']) ? $data['comment'] : null;

if (!$submission_id) {
    http_response_code(400);
    echo json_encode(["success" => false, "message" => "Missing submission_id."]);
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

// load submission
$stmt = $conn->prepare("SELECT * FROM schedule_submissions WHERE submission_id = ? LIMIT 1");
if (!$stmt) {
    http_response_code(500);
    echo json_encode(["success" => false, "message" => "Prepare failed: ".$conn->error]);
    exit;
}
$stmt->bind_param("i", $submission_id);
$stmt->execute();
$res = $stmt->get_result();
if (!$res || $res->num_rows === 0) {
    http_response_code(404);
    echo json_encode(["success" => false, "message" => "Submission not found."]);
    exit;
}
$sub = $res->fetch_assoc();
$stmt->close();

// Basic state machine guard: only allow L1 approve when pending; only allow L2 after L1 or allow L2 override depending on rules.
// We'll implement: L1 can approve when status == 'pending'. L2 can approve when status == 'pending' or status == 'lvl1_approved'.
// Applying (final) will happen at L2 approval (status -> 'applied').
$currentStatus = $sub['status'] ?? 'pending';

if ($action === 'reject') {
    // mark as rejected by this level (if level2 doing reject set level2 fields)
    if ($approver_level === 1) {
        $sql = "UPDATE schedule_submissions SET status = 'rejected', approved_by_lvl1 = ?, approved_at_lvl1 = NOW(), comment = ?, notes = ? WHERE submission_id = ?";
        $stmt = $conn->prepare($sql);
        $notes = $comment;
        if (!$stmt) {
            http_response_code(500);
            echo json_encode(["success" => false, "message" => "Prepare failed: ".$conn->error]);
            exit;
        }
        $stmt->bind_param("sssi", $approver_id, $comment, $notes, $submission_id);
    } else {
        // level 2 reject
        $sql = "UPDATE schedule_submissions SET status = 'rejected', approved_by_lvl2 = ?, approved_at_lvl2 = NOW(), comment = ?, notes = ? WHERE submission_id = ?";
        $stmt = $conn->prepare($sql);
        $notes = $comment;
        if (!$stmt) {
            http_response_code(500);
            echo json_encode(["success" => false, "message" => "Prepare failed: ".$conn->error]);
            exit;
        }
        $stmt->bind_param("sssi", $approver_id, $comment, $notes, $submission_id);
    }

    if ($stmt->execute()) {
        echo json_encode(["success" => true, "message" => "Submission rejected."]);
    } else {
        http_response_code(500);
        echo json_encode(["success" => false, "message" => "Failed to update submission: ".$stmt->error]);
    }
    $stmt->close();
    $conn->close();
    exit;
}

// ACTION == approve
if ($approver_level === 1) {
    // allow only when pending
    if ($currentStatus !== 'pending') {
        http_response_code(400);
        echo json_encode(["success" => false, "message" => "Level 1 can only approve pending submissions. Current status: {$currentStatus}"]);
        exit;
    }
    // mark L1 approved
    $sql = "UPDATE schedule_submissions SET status = 'lvl1_approved', approved_by_lvl1 = ?, approved_at_lvl1 = NOW(), comment = ? WHERE submission_id = ?";
    $stmt = $conn->prepare($sql);
    if (!$stmt) {
        http_response_code(500);
        echo json_encode(["success" => false, "message" => "Prepare failed: ".$conn->error]);
        exit;
    }
    $stmt->bind_param("ssi", $approver_id, $comment, $submission_id);
    if ($stmt->execute()) {
        echo json_encode(["success" => true, "message" => "Level 1 approved"]);
    } else {
        http_response_code(500);
        echo json_encode(["success" => false, "message" => "Failed to update submission: ".$stmt->error]);
    }
    $stmt->close();
    $conn->close();
    exit;
}

// approver_level === 2 -> final approval: apply schedule and mark applied
// allow only when pending or lvl1_approved (depending on your workflow)
if (!in_array($currentStatus, ['pending', 'lvl1_approved'])) {
    http_response_code(400);
    echo json_encode(["success" => false, "message" => "Level 2 can only approve pending or lvl1_approved submissions. Current status: {$currentStatus}"]);
    exit;
}

// we will apply the schedule to employee_shift_schedule now
$employee_id = $sub['employee_id'];
$work_time_id = $sub['work_time_id']; // may be NULL to mean clear
$effective_date = $sub['effective_date'];
$end_date = $sub['end_date'] ?: null;
$recurrence_type = $sub['recurrence_type'] ?: 'none';
$recurrence_interval = intval($sub['recurrence_interval']) ?: 1;
$days_of_week = $sub['days_of_week'] ?? null;
$priority = intval($sub['priority']) ?: 1;

// If the submission is for clearing a day (work_time_id null), we may want to delete schedule rows for that date or insert a null schedule.
// Implementation choice: if work_time_id is null => delete any active schedule entries for that employee on that effective_date.
// If not null => insert a new schedule record (single date) with is_active=1. For recurring or ranges, you'd need a more advanced approach.

$conn->begin_transaction();

try {
    if ($work_time_id === null || $work_time_id === '') {
        // remove any active schedule for that employee covering the date (simple approach: remove rows where effective_date = date and employee_id matches)
        // note: adapt logic if your schedule storage uses ranges/recurrence
        $del = $conn->prepare("DELETE FROM employee_shift_schedule WHERE employee_id = ? AND effective_date = ? AND is_active = 1");
        if (!$del) throw new Exception("Prepare failed (delete): ".$conn->error);
        $del->bind_param("ss", $employee_id, $effective_date);
        if (!$del->execute()) throw new Exception("Delete failed: ".$del->error);
        $del->close();
    } else {
        // insert a new schedule row
        // MAKE SURE employee_shift_schedule.schedule_id is AUTO_INCREMENT; if not, change it.
        $ins = $conn->prepare("INSERT INTO employee_shift_schedule (employee_id, work_time_id, effective_date, end_date, recurrence_type, recurrence_interval, days_of_week, is_active, priority, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?, NOW())");
        if (!$ins) throw new Exception("Prepare failed (insert): ".$conn->error);
        $bind_days = $days_of_week;
        $bind_end = $end_date;
        $ins->bind_param("sisssisi", $employee_id, $work_time_id, $effective_date, $bind_end, $recurrence_type, $recurrence_interval, $bind_days, $priority);
        if (!$ins->execute()) throw new Exception("Insert failed: ".$ins->error);
        $ins->close();
    }

    // mark submission as applied + record approver lvl2
    $upd = $conn->prepare("UPDATE schedule_submissions SET status = 'applied', approved_by_lvl2 = ?, approved_at_lvl2 = NOW(), applied_by = ?, applied_at = NOW(), comment = ? WHERE submission_id = ?");
    if (!$upd) throw new Exception("Prepare failed (update submission): ".$conn->error);
    $upd->bind_param("sssi", $approver_id, $approver_name, $comment, $submission_id);
    if (!$upd->execute()) throw new Exception("Update submission failed: ".$upd->error);
    $upd->close();

    $conn->commit();
    echo json_encode(["success" => true, "message" => "Level 2 approved and schedule applied"]);
} catch (Exception $ex) {
    $conn->rollback();
    http_response_code(500);
    echo json_encode(["success" => false, "message" => "Failed to apply submission: " . $ex->getMessage()]);
}

$conn->close();
exit;
?>
