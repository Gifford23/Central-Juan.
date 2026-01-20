<?php
// header('Access-Control-Allow-Origin: *');
// header('Access-Control-Allow-Methods: POST, PUT, OPTIONS');
// header('Access-Control-Allow-Headers: Content-Type');
// header('Content-Type: application/json');

require_once '../server/connection.php';
include("../server/cors.php");


$data = json_decode(file_get_contents("php://input"), true);

$leave_id    = $data['leave_id'] ?? null;
$status      = $data['status'] ?? null;
$approver_id = $data['approver_id'] ?? null;
$remarks     = $data['approval_remarks'] ?? null;

if (!$leave_id) {
    echo json_encode(['success' => false, 'message' => 'leave_id is required']);
    exit;
}

try {
    $conn->begin_transaction();

    // ✅ If only status is changing (approve/reject)
    if (in_array(strtolower($status), ['approved', 'rejected'])) {
        $stmt = $conn->prepare("
            UPDATE leave_requests
            SET status = ?, approver_id = ?, approval_remarks = ?, updated_at = NOW()
            WHERE leave_id = ?
        ");
        $stmt->bind_param("sssi", $status, $approver_id, $remarks, $leave_id);
    } else {
        // ✅ Full edit case (dates/reason)
        $date_from   = $data['date_from'] ?? null;
        $date_until  = $data['date_until'] ?? null;
        $total_days  = $data['total_days'] ?? null;
        $reason      = $data['reason'] ?? null;

        $stmt = $conn->prepare("
            UPDATE leave_requests 
            SET date_from=?, date_until=?, total_days=?, reason=?, status=?, approver_id=?, approval_remarks=?, updated_at=NOW()
            WHERE leave_id=?
        ");
        $stmt->bind_param(
            "ssdssssi",
            $date_from, $date_until, $total_days,
            $reason, $status, $approver_id, $remarks,
            $leave_id
        );
    }

    if (!$stmt->execute()) {
        throw new Exception("Failed to update leave request.");
    }
    $stmt->close();

    $conn->commit();
    echo json_encode(['success' => true, 'message' => "Leave request $status successfully"]);

} catch (Exception $e) {
    $conn->rollback();
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
}
?>
