<?php
include("../server/cors.php");
include('../server/connection.php');
header('Content-Type: application/json');

$employee_id = $_GET['employee_id'] ?? null;
$calendar_year = isset($_GET['calendar_year']) ? intval($_GET['calendar_year']) : null;

$sql = "SELECT * FROM thirteenth_deductions WHERE 1=1";
$params = [];
$types = '';
if ($employee_id) { $sql .= " AND employee_id = ?"; $params[] = $employee_id; $types .= 's'; }
if ($calendar_year) { $sql .= " AND calendar_year = ?"; $params[] = $calendar_year; $types .= 'i'; }
$sql .= " ORDER BY deduction_id ASC";

$stmt = $conn->prepare($sql);
if (!empty($params)) {
  $stmt->bind_param($types, ...$params);
}
$stmt->execute();
$res = $stmt->get_result();
$data = $res->fetch_all(MYSQLI_ASSOC);
echo json_encode(['success'=>true,'data'=>$data]);
$stmt->close();
$conn->close();
