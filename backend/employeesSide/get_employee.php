<?php
// ✅ Full CORS Headers
// header("Access-Control-Allow-Origin: *");
// header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
// header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");
// header("Content-Type: application/json; charset=UTF-8");

// // ✅ OPTIONS preflight
// if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
//     http_response_code(204);
//     exit();
// }
include("../server/cors.php");

include '../server/connection.php';

// ✅ Use $_GET instead of php://input for GET method
$employee_id = $_GET['employee_id'] ?? null;

if (!$employee_id) {
    echo json_encode(["success" => false, "message" => "Missing employee_id"]);
    exit();
}

$employee_id = $conn->real_escape_string($employee_id);

$query = "SELECT e.employee_id, e.first_name, e.email 
          FROM employees e 
          WHERE e.employee_id = '$employee_id'";

$result = $conn->query($query);

if ($result && $result->num_rows > 0) {
    $employee = $result->fetch_assoc();
    echo json_encode(["success" => true, "data" => $employee]);
} else {
    echo json_encode(["success" => false, "message" => "Employee not found"]);
}

$conn->close();
?>
