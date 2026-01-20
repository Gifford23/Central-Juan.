<?php

include '../server/connection.php';
include("../server/cors.php");

// Full CORS Headers
// header("Access-Control-Allow-Origin: *");
// header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
// header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");
// header("Content-Type: application/json; charset=UTF-8");

// Handle OPTIONS preflight
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit();
}

// Fetch all employees
$query = "SELECT employee_id, CONCAT(first_name, ' ', last_name) AS employee_name FROM employees";
$result = $conn->query($query);

$employees = [];

if ($result && $result->num_rows > 0) {
    while ($row = $result->fetch_assoc()) {
        $employees[] = $row;
    }

    echo json_encode(["success" => true, "data" => $employees]);
} else {
    echo json_encode(["success" => false, "message" => "No employees found"]);
}

$conn->close();
?>
