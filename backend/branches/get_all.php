<?php
// employees/get_all.php
include("../server/cors.php");
require_once '../server/connection.php';
header('Content-Type: application/json; charset=utf-8');

try {
    $sql = "
      SELECT employee_id, image, first_name, middle_name, last_name, email, branch_id, IFNULL(branch_name, '') AS branch_name, status
      FROM employees
      ORDER BY last_name, first_name
    ";
    $stmt = $conn->prepare($sql);
    if (!$stmt) throw new Exception("Prepare failed: " . $conn->error);
    $stmt->execute();
    $res = $stmt->get_result();
    $rows = [];
    while ($r = $res->fetch_assoc()) {
        $r['full_name'] = trim($r['first_name'] . ' ' . ($r['middle_name'] ? $r['middle_name'] . ' ' : '') . $r['last_name']);
        $rows[] = $r;
    }
    echo json_encode(["success" => true, "data" => $rows], JSON_UNESCAPED_UNICODE);
    $stmt->close();
    $conn->close();
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(["success" => false, "message" => $e->getMessage()]);
    if (isset($stmt) && $stmt) $stmt->close();
    if (isset($conn) && $conn) $conn->close();
}
?>
