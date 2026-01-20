<?php
include("../../server/cors.php");
include("../../server/connection.php");

use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\Exception;

require '../PHPMailer/src/Exception.php';
require '../PHPMailer/src/PHPMailer.php';
require '../PHPMailer/src/SMTP.php';

$data = json_decode(file_get_contents("php://input"), true);

$email = $data['hr_email'] ?? null;
$label = $data['label'] ?? "HR Email";
$is_active = isset($data['is_active']) ? strtolower(trim($data['is_active'])) : 'active';
if (!in_array($is_active, ['active', 'inactive'])) {
    $is_active = 'active';
}

if (!$email) {
    echo json_encode(["success" => false, "message" => "Email is required."]);
    exit;
}

$stmt = $conn->prepare("INSERT INTO email_settings (hr_email, label, is_active) VALUES (?, ?, ?)");
$stmt->bind_param("sss", $email, $label, $is_active);

if ($stmt->execute()) {
    $response = ["success" => true, "message" => "Email added successfully"];

    $mail = new PHPMailer(true);
    try {
        $mail->isSMTP();
        $mail->Host = 'smtp.gmail.com';
        $mail->SMTPAuth = true;
        $mail->Username = 'atacadorragheil@gmail.com';
        $mail->Password = 'zgjh uxek mxus lqpt'; // Gmail App Password
        $mail->SMTPSecure = 'tls';
        $mail->Port = 587;

        $mail->setFrom('atacadorragheil@gmail.com', 'HRIS System');
        $mail->addAddress($email);

        // Embed logo image
        $logoPath = '/home/u274016928/domains/centraljuan.com/public_html/hris/systemImage/HorizonHR-logoPC-white.png';
        if (file_exists($logoPath)) {
            $mail->addEmbeddedImage($logoPath, 'hrlogo');
        }

       $mail->isHTML(true);
        $mail->Subject = "HRIS Email Added Successfully";


        $mail->Body = '
        <div style="font-family: Arial, sans-serif; color: #333; background: #f0f4ff; padding: 30px;">
           <div style="max-width: 600px; margin: auto; background: #fff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 10px rgba(0,0,0,0.1);">

                <!-- Header with Gradient -->
                <div style="background: linear-gradient(135deg, #1e3a8a, #3b82f6); padding: 20px; text-align: center;">
                <img src="cid:hrlogo" alt="HRIS Logo" style="max-height: 70px; margin-bottom: 10px;" />
                </div>

                <!-- Content -->
                <div style="padding: 25px; line-height: 1.6; color: #1e293b;">
                <p>Hi,</p>
                <p>The email <strong style="color:#1e3a8a;">' . htmlspecialchars($email) . '</strong> has been successfully added to the HRIS system.</p>
                <p>You will now start receiving <strong>Employee Attendance Requests</strong> through this email.</p>
                <p style="color: #b91c1c; font-style: italic;">If this email was added by mistake, please contact the administrator immediately.</p>
                </div>

                <!-- Footer -->
                <div style="background: #f9fafb; padding: 15px; text-align: center; font-size: 12px; color: #475569;">
                <p>POWERED BY <br><strong>Central Juan I.T. Solutions</strong></p>
                <p>&copy; ' . date("Y") . ' HRIS System. All rights reserved.</p>
                </div>
          </div>
        </div>';



        //VERSION 1

        // $mail->Body = '
        // <div style="font-family: Arial, sans-serif; color: #333; background: #f0f4ff; padding: 30px;">
        //    <div style="max-width: 600px; margin: auto; background: #fff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 10px rgba(0,0,0,0.1);">

        //         <!-- Header with Gradient -->
        //         <div style="background: linear-gradient(135deg, #1e3a8a, #3b82f6); padding: 20px; text-align: center;">
        //         <img src="cid:hrlogo" alt="HRIS Logo" style="max-height: 70px; margin-bottom: 10px;" />
        //         <h2 style="color: #fff; margin: 0; font-size: 20px;">HRIS System Notification</h2>
        //         </div>

        //         <!-- Content -->
        //         <div style="padding: 25px; line-height: 1.6; color: #1e293b;">
        //         <p>Hi,</p>
        //         <p>The email <strong style="color:#1e3a8a;">' . htmlspecialchars($email) . '</strong> has been successfully added to the HRIS system.</p>
        //         <p>You will now start receiving <strong>employee attendance requests</strong> through this email.</p>
        //         <p style="color: #b91c1c; font-style: italic;">If this email was added by mistake, please contact the administrator immediately.</p>
        //         </div>

        //         <!-- Footer -->
        //         <div style="background: #f9fafb; padding: 15px; text-align: center; font-size: 12px; color: #475569;">
        //         <p>POWERED BY <br><strong>Central Juan I.T. Solutions</strong></p>
        //         <p>&copy; ' . date("Y") . ' HRIS System. All rights reserved.</p>
        //         </div>
        //   </div>
        // </div>';


        $mail->send();
        $response["email_notification"] = "Notification sent successfully";
    } catch (Exception $e) {
        $response["email_notification"] = "Mailer Error: " . $mail->ErrorInfo;
    }

    echo json_encode($response);
} else {
    echo json_encode(["success" => false, "message" => "Failed to add email"]);
}

$stmt->close();
$conn->close();