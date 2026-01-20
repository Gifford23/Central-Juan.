<?php
// update_commission.php (with daily breakdown)
error_reporting(E_ALL);
ini_set('display_errors', 0);
header('Content-Type: application/json; charset=utf-8');

include("../server/cors.php");
include("../server/connection.php");

ob_start();

try {
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') throw new Exception('Only POST allowed');

    $commission_id = isset($_POST['commission_id']) ? (int)$_POST['commission_id'] : 0;
    if (!$commission_id) throw new Exception('Missing commission_id');

    // optional fields
    $commission_in = isset($_POST['commission']) ? trim($_POST['commission']) : null;
    $date_from_in  = isset($_POST['date_from']) ? trim($_POST['date_from']) : null;
    $date_until_in = isset($_POST['date_until']) ? trim($_POST['date_until']) : null;

    // fetch current row
    $stmt = $conn->prepare("
        SELECT commission_id, employee_id, name, date_from, date_until, basic_salary, commission
        FROM commission_per_employee
        WHERE commission_id = ?
        LIMIT 1
    ");
    if (!$stmt) throw new Exception($conn->error);
    $stmt->bind_param("i", $commission_id);
    $stmt->execute();
    $res = $stmt->get_result();
    if ($res->num_rows === 0) throw new Exception('Commission record not found');
    $row = $res->fetch_assoc();

    // compute new values (keep existing if not provided)
    $commission_val   = $commission_in !== null ? (float)$commission_in : (float)$row['commission'];
    $date_from_val    = $date_from_in  !== null ? $date_from_in  : $row['date_from'];
    $date_until_val   = $date_until_in !== null ? $date_until_in : $row['date_until'];
    $basic_salary_val = (float)$row['basic_salary']; // salary will remain basic_salary

    // validations
    if (!is_numeric($commission_val) || $commission_val < 0) throw new Exception('Invalid commission value');
    if (!strtotime($date_from_val) || !strtotime($date_until_val)) throw new Exception('Invalid dates');
    if (strtotime($date_from_val) > strtotime($date_until_val)) throw new Exception('date_from must be before or equal to date_until');

    // business rule: total = commission, salary remains basic_salary
    $total_val = $commission_val;
    $salary_val = $basic_salary_val;

    // transaction start
    $conn->begin_transaction();

    // update commission_per_employee row
    $upd = $conn->prepare("
        UPDATE commission_per_employee
        SET commission = ?, total = ?, salary = ?, date_from = ?, date_until = ?
        WHERE commission_id = ?
    ");
    if (!$upd) throw new Exception($conn->error);
    $upd->bind_param('ddsssi', $commission_val, $total_val, $salary_val, $date_from_val, $date_until_val, $commission_id);
    if (!$upd->execute()) throw new Exception($upd->error);

    //
    // DAILY BREAKDOWN GENERATION
    // - delete existing commission_daily rows for this commission_id
    // - insert 1 row per day in the inclusive range
    // - per_day = round(commission / days, 2)
    // - remainder assigned to last day
    //

    // delete existing daily rows
    $del = $conn->prepare("DELETE FROM commission_daily WHERE commission_id = ?");
    if (!$del) throw new Exception($conn->error);
    $del->bind_param('i', $commission_id);
    if (!$del->execute()) throw new Exception($del->error);

    // compute days
    $start_ts = strtotime($date_from_val);
    $end_ts   = strtotime($date_until_val);
    $days = intval(($end_ts - $start_ts) / 86400) + 1;
    if ($days <= 0) $days = 1;

    // compute per-day amounts
    // use floor-like distribution with remainder on last day to keep total exact to 2 decimals
    $per_day = floor(($commission_val / $days) * 100) / 100.0; // truncated to 2 decimals
    $sum_per_day = $per_day * $days;
    $remainder = round($commission_val - $sum_per_day, 2); // may be 0 to 0.XX

    // prepare insert
    $ins = $conn->prepare("INSERT INTO commission_daily (commission_id, `date`, amount) VALUES (?, ?, ?)");
    if (!$ins) throw new Exception($conn->error);

    // iterate days and insert
    $current_ts = $start_ts;
    for ($i = 0; $i < $days; $i++) {
        $date_str = date('Y-m-d', $current_ts);
        $amount = $per_day;
        // add remainder to last day
        if ($i === $days - 1 && $remainder != 0.0) {
            $amount = round($amount + $remainder, 2);
        }
        $ins->bind_param('isd', $commission_id, $date_str, $amount);
        if (!$ins->execute()) throw new Exception($ins->error);
        $current_ts += 86400; // next day
    }

    // commit
    $conn->commit();

    // return updated row and daily breakdown
    $stmt2 = $conn->prepare("
        SELECT commission_id, employee_id, name, date_from, date_until, basic_salary, commission, total, salary, created_at
        FROM commission_per_employee
        WHERE commission_id = ?
        LIMIT 1
    ");
    $stmt2->bind_param('i', $commission_id);
    $stmt2->execute();
    $updated = $stmt2->get_result()->fetch_assoc();

    // fetch daily rows
    $stmt3 = $conn->prepare("SELECT id, commission_id, `date`, amount, created_at FROM commission_daily WHERE commission_id = ? ORDER BY `date` ASC");
    $stmt3->bind_param('i', $commission_id);
    $stmt3->execute();
    $daily_res = $stmt3->get_result();
    $daily_rows = [];
    while ($dr = $daily_res->fetch_assoc()) $daily_rows[] = $dr;

    ob_clean();
    echo json_encode(['success' => true, 'updated_row' => $updated, 'daily' => $daily_rows]);

} catch (Exception $e) {
    if (isset($conn) && $conn->connect_errno === 0) {
        @$conn->rollback();
    }
    ob_clean();
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
}

$conn->close();
