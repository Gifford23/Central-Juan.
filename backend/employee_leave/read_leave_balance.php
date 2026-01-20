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

$employee_id = $_GET['employee_id'] ?? null;
$leave_type_id = $_GET['leave_type_id'] ?? null;

if (!$employee_id || !$leave_type_id) {
    echo json_encode(["success" => false, "message" => "Missing employee_id or leave_type_id"]);
    exit();
}

// 🔹 Get leave balance for this employee and leave type
$query = $conn->prepare("
    SELECT 
        elb.employee_id,
        elb.leave_type_id,
        elb.year,
        elb.leave_limit,
        elb.leave_used,
        elb.leave_balance,
        lt.leave_name,
        lt.is_paid
    FROM employee_leave_balances elb
    INNER JOIN leave_types lt ON elb.leave_type_id = lt.leave_type_id
    WHERE elb.employee_id = ? AND elb.leave_type_id = ?
");
$query->bind_param("si", $employee_id, $leave_type_id);
$query->execute();
$result = $query->get_result();

if ($row = $result->fetch_assoc()) {
    echo json_encode([
        "success" => true,
        "data" => $row
    ]);
} else {
    echo json_encode([
        "success" => false,
        "message" => "No leave balance found"
    ]);
}
