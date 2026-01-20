<?php
header("Content-Type: application/json");
include("../server/cors.php");
include('../server/connection.php'); // expects $conn (mysqli)

/*
 * Compute 13th month for one employee & year.
 * Input (JSON): { "employee_id": "CJIS-2025-0001", "calendar_year": 2025 }
 * Response: { success, summed_earnings, computed_amount }
 */

$input = json_decode(file_get_contents('php://input'), true);
$employee_id = $input['employee_id'] ?? null;
$calendar_year = isset($input['calendar_year']) ? (int)$input['calendar_year'] : null;

if (!$employee_id || !$calendar_year) {
    http_response_code(422);
    echo json_encode(['success' => false, 'message' => 'employee_id and calendar_year required']);
    exit;
}

try {
    // Sum gross_amount for the employee/year
    $sql = "SELECT IFNULL(SUM(gross_amount),0) AS summed FROM thirteenth_month_entries WHERE employee_id = ? AND calendar_year = ?";
    $stmt = $conn->prepare($sql);
    $stmt->bind_param('si', $employee_id, $calendar_year);
    $stmt->execute();
    $res = $stmt->get_result();
    $row = $res->fetch_assoc();
    $stmt->close();

    $summed = (float)$row['summed'];
    $computed = round($summed / 12, 2);

    // Upsert to thirteenth_month_payouts
    $sql2 = "INSERT INTO thirteenth_month_payouts (employee_id, calendar_year, summed_earnings, computed_amount, created_by, created_at)
             VALUES (?, ?, ?, ?, ?, NOW())
             ON DUPLICATE KEY UPDATE summed_earnings = VALUES(summed_earnings), computed_amount = VALUES(computed_amount), updated_at = NOW()";

    $created_by = $input['created_by'] ?? 'system';
    $stmt2 = $conn->prepare($sql2);
    $stmt2->bind_param('sidds', $employee_id, $calendar_year, $summed, $computed, $created_by);
    $ok = $stmt2->execute();
    if (!$ok) {
        throw new Exception($stmt2->error);
    }
    $stmt2->close();

    echo json_encode([
        'success' => true,
        'employee_id' => $employee_id,
        'calendar_year' => $calendar_year,
        'summed_earnings' => $summed,
        'computed_amount' => $computed
    ]);
} catch (Exception $ex) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => $ex->getMessage()]);
}
