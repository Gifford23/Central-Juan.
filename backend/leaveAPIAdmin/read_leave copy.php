<?php
// create_leave.php
// Allow CORS (for development only — restrict in production)
// header("Access-Control-Allow-Origin: *");
// header("Access-Control-Allow-Methods: POST, OPTIONS");
// header("Access-Control-Allow-Headers: Content-Type, Authorization");
// header("Content-Type: application/json; charset=UTF-8");

include_once("../server/connection.php");
include("../server/cors.php");

// if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
//     echo json_encode(["success" => false, "message" => "Invalid request method."]);
//     exit;
// }

// =======================
// Handle file upload
// =======================
$attachmentUrl = null;
if (isset($_FILES['attachment']) && $_FILES['attachment']['error'] === UPLOAD_ERR_OK) {
    $uploadDir = "../uploads/leave_attachments/";
    if (!is_dir($uploadDir)) {
        mkdir($uploadDir, 0777, true);
    }
    $filename = uniqid() . "_" . basename($_FILES["attachment"]["name"]);
    $targetFilePath = $uploadDir . $filename;
    if (move_uploaded_file($_FILES["attachment"]["tmp_name"], $targetFilePath)) {
        $attachmentUrl = $filename;
    }
}

// =======================
// Sanitize and validate inputs
// =======================
$employee_id    = $_POST['employee_id'] ?? '';
$leave_type_id  = $_POST['leave_type_id'] ?? '';
$date_from      = $_POST['date_from'] ?? '';
$date_until     = $_POST['date_until'] ?? '';
$total_days     = $_POST['total_days'] ?? 1;
$reason         = $_POST['reason'] ?? '';
$status         = 'approved'; // Since admin is manually adding it
$approver_id    = 'admin';    // Replace with session user ID if needed
$approval_remarks = 'Manually added by admin';

if (!$employee_id || !$leave_type_id || !$date_from || !$date_until) {
    echo json_encode(["success" => false, "message" => "Missing required fields."]);
    exit;
}

try {
    // Start transaction — ensures both request and balance deduction succeed together
    $conn->begin_transaction();

    // =======================
    // Insert into leave_requests
    // =======================
    $stmt = $conn->prepare("
        INSERT INTO leave_requests 
        (employee_id, leave_type_id, date_from, date_until, total_days, reason, status, approver_id, approval_remarks, attachment_url) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ");
    $stmt->bind_param(
        "sissdsssss",
        $employee_id,
        $leave_type_id,
        $date_from,
        $date_until,
        $total_days,
        $reason,
        $status,
        $approver_id,
        $approval_remarks,
        $attachmentUrl
    );

    if (!$stmt->execute()) {
        throw new Exception("Failed to insert leave request.");
    }

    // Get the inserted leave_id for logging
    $leave_id = $conn->insert_id;
    $stmt->close();

    // =======================
    // Deduct from employee_leave_balances
    // =======================
    $updateBalance = $conn->prepare("
        UPDATE employee_leave_balances 
        SET leave_used = leave_used + ?, 
            leave_balance = leave_limit - (leave_used + ?)
        WHERE employee_id = ? 
          AND leave_type_id = ? 
          AND year = YEAR(CURDATE())
    ");
    $updateBalance->bind_param("ddsi", $total_days, $total_days, $employee_id, $leave_type_id);

    if (!$updateBalance->execute()) {
        throw new Exception("Failed to update leave balance.");
    }
    $updateBalance->close();

    // =======================
    // Log deduction in leave_deduction_logs
    // =======================
    $logStmt = $conn->prepare("
        INSERT INTO leave_deduction_logs (employee_id, leave_type_id, leave_id, deducted_days) 
        VALUES (?, ?, ?, ?)
    ");
    $logStmt->bind_param("siid", $employee_id, $leave_type_id, $leave_id, $total_days);

    if (!$logStmt->execute()) {
        throw new Exception("Failed to log leave deduction.");
    }
    $logStmt->close();

    // Commit all changes
    $conn->commit();

    echo json_encode(["success" => true, "message" => "Leave request added and balance updated successfully."]);

} catch (Exception $e) {
    // Rollback on failure
    $conn->rollback();
    echo json_encode(["success" => false, "message" => "Server error: " . $e->getMessage()]);
}
?>
