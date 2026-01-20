<?php
// schedule-manager/approvals/list_submissions.php
include('../../server/cors.php');
include '../../server/connection.php';
header('Content-Type: application/json; charset=utf-8');

// optional GET params: start_date, end_date, branch_id, status
$start_date = isset($_GET['start_date']) && $_GET['start_date'] !== '' ? $_GET['start_date'] : null;
$end_date = isset($_GET['end_date']) && $_GET['end_date'] !== '' ? $_GET['end_date'] : null;
$branch_id = isset($_GET['branch_id']) && $_GET['branch_id'] !== '' ? $_GET['branch_id'] : null;
$status = isset($_GET['status']) && $_GET['status'] !== '' ? $_GET['status'] : null;

// Build base query
$qparts = [];
$params = [];
$types = "";

// filter by effective_date range if provided
if ($start_date && $end_date) {
    $qparts[] = "(effective_date BETWEEN ? AND ?)";
    $types .= "ss";
    $params[] = $start_date;
    $params[] = $end_date;
} elseif ($start_date) {
    $qparts[] = "(effective_date >= ?)";
    $types .= "s";
    $params[] = $start_date;
} elseif ($end_date) {
    $qparts[] = "(effective_date <= ?)";
    $types .= "s";
    $params[] = $end_date;
}

// filter by branch id if provided (requires schedule_submissions has branch_id - if not we ignore)
$has_branch_col = false;
$resc = $conn->query("SHOW COLUMNS FROM `schedule_submissions` LIKE 'branch_id'");
if ($resc && $resc->num_rows > 0) $has_branch_col = true;
if ($branch_id !== null && $has_branch_col) {
    $qparts[] = "(branch_id = ?)";
    $types .= "s";
    $params[] = $branch_id;
}

// optional filter by status
if ($status) {
    $qparts[] = "(status = ?)";
    $types .= "s";
    $params[] = $status;
}

$where = "";
if (count($qparts) > 0) $where = "WHERE " . implode(" AND ", $qparts);

// select columns; be permissive
$sql = "SELECT * FROM schedule_submissions $where ORDER BY created_at DESC LIMIT 1000"; // limit to prevent huge results

$stmt = $conn->prepare($sql);
if (!$stmt) {
    echo json_encode(["success" => false, "message" => "Prepare failed: " . $conn->error, "sql" => $sql]);
    exit;
}

if (!empty($params)) {
    // bind params dynamically
    $bind_names = [];
    $bind_names[] = $types;
    for ($i = 0; $i < count($params); $i++) $bind_names[] = $params[$i];
    $a_params = [];
    foreach ($bind_names as $k => $v) $a_params[$k] = &$bind_names[$k];
    call_user_func_array([$stmt, 'bind_param'], $a_params);
}

$stmt->execute();
$result = $stmt->get_result();
$rows = [];
while ($r = $result->fetch_assoc()) {
    // cast integer-like columns if necessary, keep as-is
    $rows[] = $r;
}

echo json_encode(["success" => true, "data" => $rows]);
$stmt->close();
$conn->close();
