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

$today = date('Y-m-d');

$sql = "
    SELECT 
        el.*, 
        e.first_name, 
        e.last_name, 
        lt.leave_name,
        lt.is_paid  -- ✅ bring is_paid from leave_types
    FROM employee_leaves el
    JOIN employees e ON el.employee_id = e.employee_id
    JOIN leave_types lt ON el.leave_type_id = lt.leave_type_id
    WHERE el.status = 'approved'
    ORDER BY el.date_from ASC
";

$result = $conn->query($sql);

if (!$result) {
    echo json_encode([
        "success" => false,
        "error" => "SQL Error: " . $conn->error
    ]);
    exit();
}

$leaves = [];
while ($row = $result->fetch_assoc()) {
    $date_from = $row['date_from'] ?? null;
    $date_until = $row['date_until'] ?? null;

    if ($date_from && $today < $date_from) {
        $row['category'] = 'Coming Leave';
    } elseif ($date_from && $date_until && $today >= $date_from && $today <= $date_until) {
        $row['category'] = 'On Leave';
    } else {
        $row['category'] = 'Done';
    }

    // ✅ normalize is_paid (cast tinyint to int for frontend safety)
    $row['is_paid'] = isset($row['is_paid']) ? (int)$row['is_paid'] : 0;

    $leaves[] = $row;
}

echo json_encode([
    "success" => true,
    "data" => $leaves
]);
?>
