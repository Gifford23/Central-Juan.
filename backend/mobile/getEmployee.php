<?php
include('../server/connection.php');
include("../server/cors.php");

// CORS Headers
// header("Access-Control-Allow-Origin: *");
// header("Access-Control-Allow-Headers: Content-Type");
// header("Access-Control-Allow-Methods: GET");

// // Only allow GET requests
// if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
//     http_response_code(405); // Method Not Allowed
//     echo json_encode(["message" => "Method not allowed"]);
//     exit;
// }

// Get employee_id from query params
$employee_id = $_GET['employee_id'] ?? '';

if (empty($employee_id)) {
    echo json_encode(["message" => "Employee ID is required"]);
    exit;
}

// SQL query to join the employees, positions, and departments tables
$sql = "
    SELECT 
        e.*, 
        p.position_name, 
        d.department_name
    FROM employees e
    LEFT JOIN positions p ON e.position_id = p.position_id
    LEFT JOIN departments d ON p.department_id = d.department_id
    WHERE e.employee_id = ?
";

$stmt = $conn->prepare($sql);
$stmt->bind_param("s", $employee_id);
$stmt->execute();
$result = $stmt->get_result();

if ($result->num_rows > 0) {
    $employee = $result->fetch_assoc();
    echo json_encode($employee);
} else {
    echo json_encode(["message" => "Employee not found"]);
}

$stmt->close();
$conn->close();
?>
