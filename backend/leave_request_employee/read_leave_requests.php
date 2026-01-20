<?php
include '../server/connection.php';
include("../server/cors.php");

// header("Access-Control-Allow-Origin: *");
// header("Access-Control-Allow-Methods: GET, OPTIONS");
// header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");
// header("Content-Type: application/json; charset=UTF-8");

$employee_id = $_GET['employee_id'] ?? null;

if (!$employee_id) {
    echo json_encode(["success" => false, "message" => "Employee ID required"]);
    exit;
}

$query = "
SELECT 
    lt.leave_type_id,
    lt.leave_name,
    lt.is_paid,
    IFNULL(elb.leave_balance, 0) AS leave_balance
FROM leave_types lt
LEFT JOIN employee_leave_balances elb
    ON elb.leave_type_id = lt.leave_type_id
    AND elb.employee_id = ?
    AND elb.year = YEAR(CURDATE())   -- 👈 ensure only current year is matched
ORDER BY lt.leave_name ASC
";

$stmt = $conn->prepare($query);
$stmt->bind_param("s", $employee_id);
$stmt->execute();
$result = $stmt->get_result();

$leaveBalances = [];
while ($row = $result->fetch_assoc()) {
    $leaveBalances[] = $row;
}

echo json_encode(["success" => true, "data" => $leaveBalances]);

$stmt->close();
$conn->close();
?>
