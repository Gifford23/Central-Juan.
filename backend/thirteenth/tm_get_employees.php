<?php
header("Content-Type: application/json");
include("../server/cors.php");
include('../server/connection.php');

/*
 * GET params:
 *  - status=active|inactive|all (default active)
 *  - q (optional search)
 *
 * Returns simple employee list for dropdowns: employee_id, first_name, last_name, department_id, position_id
 */

$status = isset($_GET['status']) ? $_GET['status'] : 'active';
$q = isset($_GET['q']) ? $conn->real_escape_string($_GET['q']) : null;

$sql = "SELECT employee_id, first_name, middle_name, last_name, department_id, position_id, branch_name FROM employees";
$where = [];
if ($status === 'active') $where[] = "status = 'active'";
if ($q) {
    $like = '%' . $q . '%';
    $where[] = "(first_name LIKE ? OR last_name LIKE ? OR employee_id LIKE ?)";
}
if (count($where)) $sql .= " WHERE " . implode(' AND ', $where);
$sql .= " ORDER BY first_name, last_name LIMIT 1000";

if ($q) {
    $stmt = $conn->prepare($sql);
    $stmt->bind_param('sss', $like, $like, $like);
    $stmt->execute();
    $res = $stmt->get_result();
} else {
    $res = $conn->query($sql);
}

$rows = [];
while ($r = $res->fetch_assoc()) $rows[] = $r;
echo json_encode(['success' => true, 'count' => count($rows), 'data' => $rows]);
