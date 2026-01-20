<?php
// delete_leave.php
// header('Access-Control-Allow-Origin: *');
// header('Access-Control-Allow-Methods: DELETE, POST');
// header('Access-Control-Allow-Headers: Content-Type');
// header('Content-Type: application/json');

require_once '../server/connection.php';
include("../server/cors.php");

$data = json_decode(file_get_contents("php://input"), true);
$leave_id = $data['leave_id'] ?? null;

if (!$leave_id) {
    echo json_encode(['success' => false, 'message' => 'leave_id is required']);
    exit;
}

try {
    $conn->begin_transaction();

    // Get leave info for balance restoration
    $infoStmt = $conn->prepare("
        SELECT employee_id, leave_type_id, total_days 
        FROM leave_requests 
        WHERE leave_id = ?
    ");
    $infoStmt->bind_param("i", $leave_id);
    $infoStmt->execute();
    $info = $infoStmt->get_result()->fetch_assoc();
    $infoStmt->close();

    if (!$info) {
        throw new Exception("Leave request not found.");
    }

    // Delete leave request
    $delStmt = $conn->prepare("DELETE FROM leave_requests WHERE leave_id = ?");
    $delStmt->bind_param("i", $leave_id);
    if (!$delStmt->execute()) {
        throw new Exception("Failed to delete leave request.");
    }
    $delStmt->close();

    // Restore balance
    $restoreStmt = $conn->prepare("
        UPDATE employee_leave_balances 
        SET leave_used = leave_used - ?, 
            leave_balance = leave_balance + ?
        WHERE employee_id = ? 
          AND leave_type_id = ? 
          AND year = YEAR(CURDATE())
    ");
    $restoreStmt->bind_param(
        "ddsi",
        $info['total_days'],
        $info['total_days'],
        $info['employee_id'],
        $info['leave_type_id']
    );
    if (!$restoreStmt->execute()) {
        throw new Exception("Failed to restore leave balance.");
    }
    $restoreStmt->close();

    // Delete deduction log
    $logDel = $conn->prepare("DELETE FROM leave_deduction_logs WHERE leave_id = ?");
    $logDel->bind_param("i", $leave_id);
    $logDel->execute();
    $logDel->close();

    $conn->commit();

    echo json_encode(['success' => true, 'message' => 'Leave request deleted and balance restored successfully']);

} catch (Exception $e) {
    $conn->rollback();
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
}
?>
