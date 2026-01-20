<?php
include('../server/connection.php');

header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");
header("Content-Type: application/json; charset=UTF-8");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(204); exit(); }

$data = json_decode(file_get_contents("php://input"));
$email = $data->email ?? '';
$code = $data->code ?? '';

if (!$email || !$code) {
    echo json_encode(["success" => false, "message" => "Email and code required"]);
    exit();
}

$stmt = $conn->prepare("SELECT employee_id FROM employees WHERE email = ? AND reset_code = ?");
$stmt->bind_param("ss", $email, $code);
$stmt->execute();
$stmt->store_result();

if ($stmt->num_rows == 0) {
    echo json_encode(["success" => false, "message" => "Invalid code"]);
} else {
    echo json_encode(["success" => true, "message" => "Code verified"]);
}

$stmt->close();
$conn->close();
?>
