<?php
include("../server/cors.php");
use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\Exception;

require './PHPMailer/src/Exception.php';
require './PHPMailer/src/PHPMailer.php';
require './PHPMailer/src/SMTP.php';

$data = json_decode(file_get_contents("php://input"), true);

$targetEmail = $data['targetEmail'] ?? '';
$message = $data['message'] ?? '';

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
    $mail->addAddress($targetEmail);
    $mail->isHTML(true);
    $mail->Subject = 'Shift Schedule Update';
    $mail->Body = nl2br($message);

    $mail->send();
    echo json_encode(["success" => true, "message" => "Email sent to $targetEmail"]);
} catch (Exception $e) {
    echo json_encode(["success" => false, "message" => $mail->ErrorInfo]);
}
?>
