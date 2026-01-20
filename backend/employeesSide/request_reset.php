<?php
include('../server/connection.php');
include("../server/cors.php");


// header("Access-Control-Allow-Origin: *");
// header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
// header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");
// header("Content-Type: application/json; charset=UTF-8");

// if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(204); exit(); }

use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\Exception;

require '../email/PHPMailer/src/Exception.php';
require '../email/PHPMailer/src/PHPMailer.php';
require '../email/PHPMailer/src/SMTP.php';

$data = json_decode(file_get_contents("php://input"));
$email = $data->email ?? '';

if (!$email) {
    echo json_encode(["success" => false, "message" => "Email is required"]);
    exit();
}

// ✅ First check if email exists
$stmt = $conn->prepare("SELECT COUNT(*) FROM employees WHERE email = ?");
$stmt->bind_param("s", $email);
$stmt->execute();
$stmt->bind_result($count);
$stmt->fetch();
$stmt->close();

if ($count == 0) {
    echo json_encode(["success" => false, "message" => "Email not found"]);
    exit();
}

// ✅ Generate random 6-digit code
$code = rand(100000, 999999);

// ✅ Directly update reset_code for this email only (100% safe)
$stmt = $conn->prepare("UPDATE employees SET reset_code = ? WHERE email = ?");
$stmt->bind_param("ss", $code, $email);
$stmt->execute();
$stmt->close();

// ✅ Send email with reset code
$mail = new PHPMailer(true);

try {
    $mail->isSMTP();
    $mail->Host = 'smtp.gmail.com';
    $mail->SMTPAuth = true;
    $mail->Username = 'atacadorragheil@gmail.com';
    $mail->Password = 'zgjh uxek mxus lqpt';
    $mail->SMTPSecure = 'tls';
    $mail->Port = 587;

    $mail->setFrom('atacadorragheil@gmail.com', 'HRIS Reset');
    $mail->addAddress($email);
    $mail->isHTML(true);
    $mail->Subject = 'Password Reset Code';
    $mail->Body = "<h3>Your password reset code is:</h3><h1>{$code}</h1>";

    $mail->send();

    echo json_encode(["success" => true, "message" => "Reset code sent to email"]);
} catch (Exception $e) {
    echo json_encode(["success" => false, "message" => "Mail Error: {$mail->ErrorInfo}"]);
}

$conn->close();
?>
