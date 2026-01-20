<?php

// header("Access-Control-Allow-Origin: *");
// header("Access-Control-Allow-Methods: GET, OPTIONS");
// header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");
// header("Content-Type: application/json; charset=UTF-8");
include '../server/connection.php';
include("../server/cors.php");

// if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
//     http_response_code(204);
//     exit();
// }

// if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
//     echo json_encode(["success" => false, "message" => "Invalid request method."]);
//     exit;
// }

try {
    $sql = "
        SELECT 
            lr.leave_id,
            lr.employee_id,
            CONCAT(e.first_name, ' ', 
                   COALESCE(CONCAT(e.middle_name, ' '), ''), 
                   e.last_name) AS employee_name,
            lt.leave_name AS leave_type_name,
            lt.is_paid,
            elb.leave_balance,
            lr.date_from,
            lr.date_until,
            lr.status,
            lr.total_days,
            (CASE 
                WHEN lt.is_paid = 1 THEN (elb.leave_balance - lr.total_days)
                ELSE NULL
             END) AS projected_balance,
            lr.created_at,
            lr.reason
        FROM leave_requests lr
        LEFT JOIN leave_types lt 
            ON lr.leave_type_id = lt.leave_type_id
        LEFT JOIN employees e
            ON lr.employee_id = e.employee_id
        LEFT JOIN employee_leave_balances elb 
            ON lr.employee_id = elb.employee_id 
           AND lr.leave_type_id = elb.leave_type_id 
           AND elb.year = YEAR(lr.date_from) -- yearly tracking
        ORDER BY lr.created_at DESC
    ";

    $result = $conn->query($sql);
    $data = [];

    while ($row = $result->fetch_assoc()) {
        $data[] = $row;
    }

    echo json_encode($data);

} catch (Exception $e) {
    echo json_encode(["success" => false, "message" => $e->getMessage()]);
}
?>
