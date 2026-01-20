<?php
header("Content-Type: application/json");

include("../server/cors.php");
include("../server/connection.php");

$sql = "
    SELECT 
        p.payroll_id,
        p.employee_id,
        p.name,
        p.date_from,
        p.date_until,
        p.basic_salary,
        p.total_salary,
        p.commission_based
    FROM payroll p
    INNER JOIN employees e ON e.employee_id = p.employee_id
    WHERE e.status = 'active'
    ORDER BY p.employee_id ASC
";


$result = $conn->query($sql);

if (!$result) {
    echo json_encode(["success" => false, "message" => $conn->error]);
    exit;
}

$data = [];
while ($row = $result->fetch_assoc()) {
    $data[] = $row;
}

echo json_encode(["success" => true, "data" => $data]);
$conn->close();
