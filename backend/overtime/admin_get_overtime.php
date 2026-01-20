<?php
// header("Access-Control-Allow-Origin: *");
// header("Access-Control-Allow-Methods: GET, OPTIONS");
// header("Access-Control-Allow-Headers: Content-Type, Authorization");
// header("Content-Type: application/json; charset=UTF-8");

// if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
//     http_response_code(200);
//     exit();
// }

include('../server/connection.php');
include("../server/cors.php");


$employee_id = $_GET['employee_id'] ?? '';
$date_requested = $_GET['date_requested'] ?? '';

if (!$employee_id || !$date_requested) {
    echo json_encode(["success" => false, "message" => "Missing parameters."]);
    exit;
}

$sql = "SELECT * FROM employee_overtime_request WHERE employee_id = ? AND date_requested = ?";
$stmt = $conn->prepare($sql);
$stmt->bind_param("ss", $employee_id, $date_requested);
$stmt->execute();
$result = $stmt->get_result();

if ($row = $result->fetch_assoc()) {
    echo json_encode(["success" => true, "data" => $row]);
} else {
    echo json_encode(["success" => true, "data" => null]);
}

$stmt->close();
$conn->close();
?>
