<?php
include '../server/connection.php';
include("../server/cors.php");

// Full CORS Headers
// header("Access-Control-Allow-Origin: *");
// header("Access-Control-Allow-Methods: GET, OPTIONS");
// header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");
// header("Content-Type: application/json; charset=UTF-8");

// if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
//     http_response_code(200);
//     exit();
// }

$employeeId = $_GET['employee_id'] ?? null;

if (!$employeeId) {
    echo json_encode([
        "success" => false,
        "message" => "employee_id is required"
    ]);
    exit();
}

try {
    $sql = "
        SELECT 
            e.employee_id,
            CONCAT(e.first_name, ' ', e.last_name) AS employee_name,
            lt.leave_type_id,
            lt.leave_name,
            elb.leave_limit,
            elb.leave_used,
            elb.leave_balance
        FROM employee_leave_balances elb
        INNER JOIN employees e ON e.employee_id = elb.employee_id
        INNER JOIN leave_types lt ON lt.leave_type_id = elb.leave_type_id
        WHERE e.employee_id = ?
          AND elb.leave_balance > 0
        ORDER BY lt.leave_type_id
    ";

    $stmt = $conn->prepare($sql);
    $stmt->bind_param("s", $employeeId);
    $stmt->execute();

    $result = $stmt->get_result()->fetch_all(MYSQLI_ASSOC);

    echo json_encode([
        "success" => true,
        "data" => $result
    ]);

} catch (Exception $e) {
    echo json_encode([
        "success" => false,
        "message" => $e->getMessage()
    ]);
}
