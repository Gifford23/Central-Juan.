<?php
// delete_commission_day.php
error_reporting(E_ALL);
ini_set('display_errors', 0);
header('Content-Type: application/json; charset=utf-8');

include("../server/cors.php");
include("../server/connection.php");

ob_start();
try {
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') throw new Exception('Only POST allowed');

    $day_id = isset($_POST['day_id']) ? intval($_POST['day_id']) : 0;
    if (!$day_id) throw new Exception('Missing day_id');

    // get commission_id
    $get = $conn->prepare("SELECT commission_id FROM commission_daily WHERE id = ? LIMIT 1");
    $get->bind_param('i', $day_id);
    $get->execute();
    $res = $get->get_result();
    if ($res->num_rows === 0) throw new Exception('Daily row not found');
    $commission_id = (int)$res->fetch_assoc()['commission_id'];

    $conn->begin_transaction();

    $del = $conn->prepare("DELETE FROM commission_daily WHERE id = ?");
    $del->bind_param('i', $day_id);
    if (!$del->execute()) {
        $conn->rollback();
        throw new Exception($del->error);
    }

    // recompute total
    $sumStmt = $conn->prepare("SELECT COALESCE(SUM(amount),0) as sum_total FROM commission_daily WHERE commission_id = ?");
    $sumStmt->bind_param('i', $commission_id);
    $sumStmt->execute();
    $sum = (float)$sumStmt->get_result()->fetch_assoc()['sum_total'];

    $upd = $conn->prepare("UPDATE commission_per_employee SET total = ?, commission = ? WHERE commission_id = ?");
    $upd->bind_param('ddi', $sum, $sum, $commission_id);
    if (!$upd->execute()) {
        $conn->rollback();
        throw new Exception($upd->error);
    }

    $conn->commit();

    ob_clean();
    echo json_encode(['success' => true, 'total' => number_format($sum,2,'.','')]);
} catch (Exception $e) {
    if (isset($conn) && $conn->connect_errno === 0) @$conn->rollback();
    ob_clean();
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
}
$conn->close();
