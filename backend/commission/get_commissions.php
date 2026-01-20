<?php
// get_commissions.php
error_reporting(E_ALL);
ini_set('display_errors', 0);
header('Content-Type: application/json; charset=utf-8');

include("../server/cors.php");
include("../server/connection.php");

ob_start();

try {
    $sql = "SELECT
                commission_id,
                employee_id,
                name,
                date_from,
                date_until,
                basic_salary,
                commission,
                total,
                salary,
                created_at
            FROM commission_per_employee
            ORDER BY created_at DESC";

    $res = $conn->query($sql);
    if ($res === false) throw new Exception($conn->error);

    $rows = [];
    while ($r = $res->fetch_assoc()) {
        $rows[] = $r;
    }

    ob_clean();
    echo json_encode(['success' => true, 'data' => $rows]);
} catch (Exception $e) {
    ob_clean();
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
}

$conn->close();
