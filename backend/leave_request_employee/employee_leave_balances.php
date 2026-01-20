<?php
include '../server/connection.php';
include("../server/cors.php");

// header("Access-Control-Allow-Origin: *");
// header("Access-Control-Allow-Methods: GET, OPTIONS");
// header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");
// header("Content-Type: application/json; charset=UTF-8");

$employee_id = $_GET['employee_id'] ?? null;

if (!$employee_id) {
    echo json_encode(["success" => false, "data" => [], "message" => "Employee ID is required"]);
    exit;
}

$query = "SELECT leave_type_id, balance FROM employee_leave_balances WHERE employee_id = ?";
$stmt = $conn->prepare($query);
$stmt->bind_param("s", $employee_id);
$stmt->execute();
$result = $stmt->get_result();

$balances = [];
while ($row = $result->fetch_assoc()) {
    $balances[] = $row;
}

echo json_encode(["success" => true, "data" => $balances]);

$stmt->close();
$conn->close();
