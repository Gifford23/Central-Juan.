<?php
// save_commission_daily.php
error_reporting(E_ALL);
ini_set('display_errors', 0);
header('Content-Type: application/json; charset=utf-8');

include("../server/cors.php");
include("../server/connection.php");

ob_start();
try {
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') throw new Exception("POST only");

    $commission_id = isset($_POST['commission_id']) ? intval($_POST['commission_id']) : 0;
    // accept either 'date' (preferred) or 'work_date' (legacy)
    $work_date = $_POST['date'] ?? ($_POST['work_date'] ?? null);
    $amount    = isset($_POST['amount']) ? $_POST['amount'] : null;

    if (!$commission_id || !$work_date || $amount === null) throw new Exception("Invalid input");

    if (!is_numeric($amount) || (float)$amount < 0) throw new Exception("Invalid amount");
    $amt = (float)$amount;

    // validate date
    if (strtotime($work_date) === false) throw new Exception("Invalid date");

    // ensure commission exists
    $chk = $conn->prepare("SELECT commission_id FROM commission_per_employee WHERE commission_id = ? LIMIT 1");
    if (!$chk) throw new Exception($conn->error);
    $chk->bind_param('i', $commission_id);
    $chk->execute();
    $cres = $chk->get_result();
    if ($cres->num_rows === 0) throw new Exception("Commission row not found");

    // insert or update using the actual column name: `date`
    $ins = $conn->prepare("
        INSERT INTO commission_daily (commission_id, `date`, amount)
        VALUES (?, ?, ?)
        ON DUPLICATE KEY UPDATE amount = VALUES(amount)
    ");
    if (!$ins) throw new Exception($conn->error);
    $ins->bind_param('isd', $commission_id, $work_date, $amt);
    if (!$ins->execute()) throw new Exception($ins->error);

    // recompute total (sum of daily amounts)
    $sum = $conn->prepare("SELECT IFNULL(SUM(amount),0) as total FROM commission_daily WHERE commission_id = ?");
    if (!$sum) throw new Exception($conn->error);
    $sum->bind_param('i', $commission_id);
    $sum->execute();
    $total_row = $sum->get_result()->fetch_assoc();
    $total = (float)($total_row['total'] ?? 0.00);

    // update commission_per_employee total and commission fields (keep salary unchanged)
    $upd = $conn->prepare("UPDATE commission_per_employee SET total = ?, commission = ? WHERE commission_id = ?");
    if (!$upd) throw new Exception($conn->error);
    $upd->bind_param('ddi', $total, $total, $commission_id);
    if (!$upd->execute()) throw new Exception($upd->error);

    ob_clean();
    echo json_encode(['success' => true, 'total' => number_format($total, 2, '.', '')]);

} catch (Exception $e) {
    if (isset($conn) && $conn->connect_errno === 0) @$conn->rollback();
    ob_clean();
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
}

$conn->close();
