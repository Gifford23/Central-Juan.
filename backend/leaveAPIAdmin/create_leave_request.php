<?php
// Allow CORS (for development only — restrict this in production)
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

// Handle file upload
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

// Sanitize inputs
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
    // Start transaction so everything is consistent
    $conn->begin_transaction();

    // 1. Insert into leave_requests (for audit trail)
    $stmt = $conn->prepare("INSERT INTO leave_requests 
        (employee_id, leave_type_id, date_from, date_until, total_days, reason, status, approver_id, approval_remarks, attachment_url) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
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
    $stmt->execute();

    // 2. Also insert into employee_leaves so triggers/balances work
    $stmt2 = $conn->prepare("INSERT INTO employee_leaves 
        (employee_id, leave_type_id, date_from, date_until, total_days, reason, status) 
        VALUES (?, ?, ?, ?, ?, ?, ?)");
    $stmt2->bind_param(
        "sissdss",
        $employee_id,
        $leave_type_id,
        $date_from,
        $date_until,
        $total_days,
        $reason,
        $status
    );
    $stmt2->execute();

    // Commit both inserts
    $conn->commit();

    echo json_encode(["success" => true, "message" => "Leave request added successfully and balances updated."]);

} catch (Exception $e) {
    $conn->rollback();
    echo json_encode(["success" => false, "message" => "Server error: " . $e->getMessage()]);
}
