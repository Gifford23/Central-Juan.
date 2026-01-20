<?php

// header("Access-Control-Allow-Origin: *");
// header("Access-Control-Allow-Headers: Content-Type");
// header("Access-Control-Allow-Methods: POST");
// header("Content-Type: application/json");
include("../server/cors.php");


use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\Exception;

require './PHPMailer/src/Exception.php';
require './PHPMailer/src/PHPMailer.php';
require './PHPMailer/src/SMTP.php';

$data = json_decode(file_get_contents("php://input"));

$targetEmail = $data->targetEmail ?? '';
$message = $data->message ?? '';

$mail = new PHPMailer(true);
 
try {
    $mail->isSMTP();
    $mail->Host = 'smtp.gmail.com';
    $mail->SMTPAuth = true;
    $mail->Username = 'atacadorragheil@gmail.com';
    $mail->Password = 'zgjh uxek mxus lqpt';
    $mail->SMTPSecure = 'tls';
    $mail->Port = 587;

    // Set fixed sender address
    $mail->setFrom('atacadorragheil@gmail.com', 'HRIS System');

    // Target recipient from form input
    $mail->addAddress($targetEmail);

    $mail->isHTML(true);
    $mail->Subject = 'Message from HRIS Contact Form';
    $mail->Body = "<p><strong>Message:</strong><br>{$message}</p>";

    $mail->send();

    echo json_encode(["success" => true, "message" => "✅ Email sent successfully"]);
} catch (Exception $e) {
    echo json_encode(["success" => false, "message" => "❌ Error: {$mail->ErrorInfo}"]);
}
