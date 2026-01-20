<?php
header("Content-Type: application/json");
include("../server/cors.php");
include('../server/connection.php');

/*
 * GET params: employee_id, calendar_year
 * Returns row from thirteenth_month_payouts
 */

$employee_id = isset($_GET['employee_id']) ? $_GET['employee_id'] : null;
$calendar_year = isset($_GET['calendar_year']) ? (int)$_GET['calendar_year'] : null;

if (!$employee_id || !$calendar_year) {
    http_response_code(422);
    echo json_encode(['success' => false, 'message' => 'employee_id and calendar_year required']);
    exit;
}

$sql = "SELECT * FROM thirteenth_month_payouts WHERE employee_id = ? AND calendar_year = ? LIMIT 1";
$stmt = $conn->prepare($sql);
$stmt->bind_param('si', $employee_id, $calendar_year);
$stmt->execute();
$res = $stmt->get_result();
$row = $res->fetch_assoc();
$stmt->close();

if (!$row) {
    echo json_encode(['success' => false, 'message' => 'Payout not found']);
    exit;
}

echo json_encode(['success' => true, 'data' => $row]);
