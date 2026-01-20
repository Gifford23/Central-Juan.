<?php
include('../server/connection.php');
include("../server/cors.php");

// header("Access-Control-Allow-Origin: *");
// header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
// header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");
// header("Content-Type: application/json; charset=UTF-8");

// if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(204); exit(); }

$data = json_decode(file_get_contents("php://input"));
$email = $data->email ?? '';
$code = $data->code ?? '';
$newPassword = $data->newPassword ?? '';

if (!$email || !$code || !$newPassword) {
    echo json_encode(["success" => false, "message" => "All fields required"]);
    exit();
}

// Validate code and email
$stmt = $conn->prepare("UPDATE employees SET password = ?, reset_code = NULL WHERE email = ? AND reset_code = ?");
$stmt->bind_param("sss", $newPassword, $email, $code);
$stmt->execute();

if ($stmt->affected_rows > 0) {
    echo json_encode(["success" => true, "message" => "Password updated successfully"]);
} else {
    echo json_encode(["success" => false, "message" => "Invalid email or code"]);
}

$stmt->close();
$conn->close();
?>
