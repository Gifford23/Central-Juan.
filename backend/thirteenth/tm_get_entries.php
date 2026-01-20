<?php

include("../server/cors.php");
include('../server/connection.php');
header("Content-Type: application/json");

// Query params: employee_id, calendar_year (optional)
$employee_id = isset($_GET['employee_id']) ? $_GET['employee_id'] : null;
$calendar_year = isset($_GET['calendar_year']) ? (int)$_GET['calendar_year'] : null;

$params = [];
$where = [];

if ($employee_id) {
    $where[] = "tme.employee_id = ?";
    $params[] = $employee_id;
}
if ($calendar_year) {
    $where[] = "tme.calendar_year = ?";
    $params[] = $calendar_year;
}

$sql = "SELECT tme.* FROM thirteenth_month_entries tme";
if (count($where)) {
    $sql .= " WHERE " . implode(" AND ", $where);
}
$sql .= " ORDER BY tme.employee_id, tme.period_index";

$stmt = $conn->prepare($sql);
if ($stmt === false) {
    http_response_code(500);
    echo json_encode(['success'=>false,'message'=>'Prepare failed: '.$conn->error]);
    exit;
}

if (count($params)) {
    // Build types string
    $types = '';
    foreach ($params as $p) {
        $types .= is_int($p) ? 'i' : 's';
    }
    // bind dynamically
    $refs = [];
    $refs[] = & $types;
    for ($i=0;$i<count($params);$i++) {
        $refs[] = & $params[$i];
    }
    call_user_func_array([$stmt, 'bind_param'], $refs);
}

$stmt->execute();
$res = $stmt->get_result();
$rows = $res->fetch_all(MYSQLI_ASSOC);
$stmt->close();

echo json_encode(['success' => true, 'count' => count($rows), 'data' => $rows]);
