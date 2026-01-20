<?php
// header("Access-Control-Allow-Origin: *");
// header("Access-Control-Allow-Methods: GET, OPTIONS");
// header("Access-Control-Allow-Headers: Content-Type, Authorization");
// header("Content-Type: application/json; charset=UTF-8");

include_once("../server/connection.php");
include("../server/cors.php");

// if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
//     http_response_code(204);
//     exit();
// }

// if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
//     http_response_code(405);
//     echo json_encode(['error' => 'Method not allowed']);
//     exit();
// }

// Optional filters
$employeeId = $_GET['employee_id'] ?? null;
$status = $_GET['status'] ?? null;

$sql = "
    SELECT 
        el.leave_id,
        el.employee_id,
        CONCAT(e.first_name, ' ', e.last_name) AS employee_name,
        lt.leave_name AS leave_type_name,
        el.date_from,
        el.date_until,
        el.total_days,
        el.reason,
        el.status,
        el.created_at,
        el.updated_at
    FROM employee_leaves el
    JOIN leave_types lt ON el.leave_type_id = lt.leave_type_id
    JOIN employees e ON el.employee_id = e.employee_id
    WHERE 1=1
";

$params = [];
$types = "";

if ($employeeId) {
    $sql .= " AND el.employee_id = ?";
    $params[] = $employeeId;
    $types .= "s";
}

if ($status) {
    $sql .= " AND el.status = ?";
    $params[] = $status;
    $types .= "s";
}

$stmt = $conn->prepare($sql);

if ($params) {
    $stmt->bind_param($types, ...$params);
}

$stmt->execute();
$result = $stmt->get_result();
echo json_encode($result->fetch_all(MYSQLI_ASSOC));

$stmt->close();
$conn->close();
