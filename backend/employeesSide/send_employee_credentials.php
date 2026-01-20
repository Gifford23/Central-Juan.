<?php
include("../server/cors.php");

// header("Access-Control-Allow-Origin: *");
// header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
// header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");
// header("Content-Type: application/json; charset=UTF-8");



// if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
//     http_response_code(204);
//     exit();
// }

use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\Exception;

require '../email/PHPMailer/src/Exception.php';
require '../email/PHPMailer/src/PHPMailer.php';
require '../email/PHPMailer/src/SMTP.php';

$data = json_decode(file_get_contents("php://input"));

$employeeEmail = $data->email ?? '';
$employeeID = $data->employee_id ?? '';
$password = $data->password ?? '';

$mail = new PHPMailer(true);

try {
    $mail->isSMTP();
    $mail->Host = 'smtp.gmail.com';
    $mail->SMTPAuth = true;
    $mail->Username = 'atacadorragheil@gmail.com';
    $mail->Password = 'zgjh uxek mxus lqpt';
    $mail->SMTPSecure = 'tls';
    $mail->Port = 587;

    $mail->setFrom('atacadorragheil@gmail.com', 'HRIS System');
    $mail->addAddress($employeeEmail);

    $mail->isHTML(true);
    $mail->Subject = 'Your HRIS Account Credentials';

    define('EMAIL_URL', 'https://hris.centraljuan.com');

    $mail->Body = "
        <h3>Welcome to HRIS!</h3>
        <p>Your account has been created successfully.</p>
        <p><strong>Employee ID:</strong> {$employeeID}</p>
        <p><strong>Password:</strong> {$password}</p>
        <p>Please login and change your password after first login.</p>
        <hr>
        <p>If you forgot your password or want to reset it in the future, you can do so here:</p>
        <p><a href='" . EMAIL_URL . "/reset-password'>Reset your password</a></p>
    ";


    $mail->send();

    echo json_encode(["success" => true, "message" => "✅ Credentials sent successfully"]);
} catch (Exception $e) {
    echo json_encode(["success" => false, "message" => "❌ Error: {$mail->ErrorInfo}"]);
}
?>
