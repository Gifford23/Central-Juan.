<?php
header("Content-Type: application/json");
include("../server/cors.php");
include('../server/connection.php');

/*
 * Bulk compute for all active employees or a given list.
 * Input (JSON): { "calendar_year": 2025, "only_active": true }
 * Response: { success, processed: N, errors: [...] }
 */

$input = json_decode(file_get_contents('php://input'), true);
$calendar_year = isset($input['calendar_year']) ? (int)$input['calendar_year'] : null;
$only_active = isset($input['only_active']) ? (bool)$input['only_active'] : true;

if (!$calendar_year) {
    http_response_code(422);
    echo json_encode(['success' => false, 'message' => 'calendar_year required']);
    exit;
}

try {
    // fetch list of employees
    $sql = "SELECT employee_id FROM employees";
    if ($only_active) $sql .= " WHERE status = 'active'";
    $res = $conn->query($sql);
    $employees = [];
    while ($r = $res->fetch_assoc()) $employees[] = $r['employee_id'];

    $processed = 0;
    $errors = [];

    $conn->begin_transaction();

    foreach ($employees as $eid) {
        // sum for each employee
        $sstmt = $conn->prepare("SELECT IFNULL(SUM(gross_amount),0) as summed FROM thirteenth_month_entries WHERE employee_id = ? AND calendar_year = ?");
        $sstmt->bind_param('si', $eid, $calendar_year);
        $sstmt->execute();
        $sres = $sstmt->get_result();
        $srow = $sres->fetch_assoc();
        $sstmt->close();

        $summed = (float)$srow['summed'];
        $computed = round($summed / 12, 2);

        $upstmt = $conn->prepare("INSERT INTO thirteenth_month_payouts (employee_id, calendar_year, summed_earnings, computed_amount, created_by, created_at)
             VALUES (?, ?, ?, ?, ?, NOW())
             ON DUPLICATE KEY UPDATE summed_earnings = VALUES(summed_earnings), computed_amount = VALUES(computed_amount), updated_at = NOW()");
        $created_by = $input['created_by'] ?? 'system';
        $ok = $upstmt->bind_param('sidds', $eid, $calendar_year, $summed, $computed, $created_by) && $upstmt->execute();
        if (!$ok) {
            $errors[] = ['employee_id' => $eid, 'error' => $upstmt->error];
        } else {
            $processed++;
        }
        $upstmt->close();
    }

    if (count($errors) > 0) {
        $conn->rollback();
        echo json_encode(['success' => false, 'message' => 'Errors occurred; transaction rolled back', 'processed' => $processed, 'errors' => $errors]);
    } else {
        $conn->commit();
        echo json_encode(['success' => true, 'message' => 'Bulk compute completed', 'processed' => $processed]);
    }
} catch (Exception $ex) {
    $conn->rollback();
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => $ex->getMessage()]);
}
