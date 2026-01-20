<?php
// get_commission_days.php
error_reporting(E_ALL);
ini_set('display_errors', 0);
header('Content-Type: application/json; charset=utf-8');

include("../server/cors.php");
include("../server/connection.php");

ob_start();
try {
    $commission_id = isset($_GET['commission_id']) ? intval($_GET['commission_id']) : 0;
    if (!$commission_id) throw new Exception('Missing commission_id');

    $stmt = $conn->prepare("SELECT id, commission_id, `date`, amount, created_at FROM commission_daily WHERE commission_id = ? ORDER BY `date` ASC");
    if (!$stmt) throw new Exception($conn->error);
    $stmt->bind_param('i', $commission_id);
    $stmt->execute();
    $res = $stmt->get_result();

    $rows = [];
    while ($r = $res->fetch_assoc()) $rows[] = $r;

    ob_clean();
    echo json_encode(['success' => true, 'data' => $rows]);
} catch (Exception $e) {
    ob_clean();
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
}
$conn->close();
