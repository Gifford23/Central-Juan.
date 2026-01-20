<?php
use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\Exception;

require '../email/PHPMailer/src/Exception.php';
require '../email/PHPMailer/src/PHPMailer.php';
require '../email/PHPMailer/src/SMTP.php';

include('../server/connection.php');
include("../server/cors.php");

// Collect POST data
$employee_id      = $_POST['employee_id'] ?? '';
$employee_name    = $_POST['employee_name'] ?? '';
$date_requested   = $_POST['date_requested'] ?? '';
$time_start       = $_POST['time_start'] ?? '';
$end_time         = $_POST['end_time'] ?? '';
$hours_requested  = $_POST['hours_requested'] ?? '';
$reason           = $_POST['reason'] ?? '';

// Logo path
$logoPath = '/home/u274016928/domains/centraljuan.com/public_html/hris/systemImage/HorizonHR-logoPC-white.png';
// $logoPath = 'C:\xampp\htdocs\central_juan\public\systemImage\centraljuan_blackwhite_logo.png';

// Default multiplier values
$holiday_id = null;
$multiplier_used = 1.00;

// Holiday logic
$holiday_sql = "SELECT * FROM holidays 
                WHERE (holiday_date = ? OR (is_recurring = 1 AND DATE_FORMAT(holiday_date, '%m-%d') = DATE_FORMAT(?, '%m-%d')))
                AND (extended_until IS NULL OR extended_until = '0000-00-00' OR extended_until >= ?)
                LIMIT 1";
$holiday_stmt = $conn->prepare($holiday_sql);
$holiday_stmt->bind_param("sss", $date_requested, $date_requested, $date_requested);
$holiday_stmt->execute();
$holiday_result = $holiday_stmt->get_result();

if ($holiday_result && $holiday_result->num_rows > 0) {
    $holiday_row = $holiday_result->fetch_assoc();
    $holiday_id = $holiday_row['holiday_id'];
    if (!empty($holiday_row['apply_multiplier']) && $holiday_row['apply_multiplier'] == 1) {
        $multiplier_used = !empty($holiday_row['ot_multiplier']) && $holiday_row['ot_multiplier'] > 0
            ? floatval($holiday_row['ot_multiplier'])
            : floatval($holiday_row['default_multiplier']);
    }
}
$holiday_stmt->close();

// Check required fields
if (!$employee_id || !$employee_name || !$date_requested || !$time_start || !$end_time || !$reason) {
    echo json_encode(["success" => false, "message" => "Missing required fields."]);
    exit;
}

// Function to send email
function sendOvertimeEmail($conn, $employee_id, $employee_name, $date_requested, $time_start, $end_time, $hours_requested, $reason, $logoPath) {
    $formattedDate = date("F j, Y", strtotime($date_requested));

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

        // Get active HR emails
        $stmt = $conn->prepare("SELECT hr_email FROM email_settings WHERE is_active = 'active'");
        $stmt->execute();
        $result = $stmt->get_result();
        $hasRecipient = false;
        while ($row = $result->fetch_assoc()) {
            $mail->addAddress($row['hr_email']);
            $hasRecipient = true;
        }
        if (!$hasRecipient) return false;

        $mail->isHTML(true);
        $mail->Subject = "Overtime Request - $employee_name ($employee_id)";

        // Build HTML email body
        $body = '
        <div style="font-family: Arial, sans-serif; color: #333; background-color: #f4f4f4; padding: 20px;">
            <div style="background-color: #004080; padding: 20px; text-align: center; border-radius: 8px 8px 0 0;">
                <img src="cid:hris_logo" alt="Horizon HR Logo" style="height: 60px;">
            </div>
            <div style="background-color: #ffffff; border-radius: 0 0 8px 8px; padding: 20px; box-shadow: 0 4px 8px rgba(0,0,0,0.1);">
                <h2 style="color: #004080; margin-top: 0;">Overtime Request</h2>
                <p><b>Employee ID:</b> '.$employee_id.'</p>
                <p><b>Employee Name:</b> '.$employee_name.'</p>
                <p><b>Date:</b> '.$formattedDate.'</p>';

        if ($time_start || $end_time) {
            $body .= '<div style="background-color: #e6f0ff; padding: 10px; border-radius: 6px; margin-bottom: 10px;">
                        <h3 style="margin:0 0 5px 0; color:#004080;">Overtime Details</h3>';
            if ($time_start) $body .= '<p><b>Start Time:</b> '.date("g:i A", strtotime($time_start)).'</p>';
            if ($end_time) $body .= '<p><b>End Time:</b> '.date("g:i A", strtotime($end_time)).'</p>';
            if ($hours_requested) $body .= '<p><b>Hours Requested:</b> '.$hours_requested.'</p>';
            $body .= '</div>';
        }

        $body .= '<div style="padding: 10px; border-left: 4px solid #004080; margin-top: 10px;">
                    <p><b>Reason:</b> '.$reason.'</p>
                  </div>
            </div>
        </div>';

        $mail->addEmbeddedImage($logoPath, 'hris_logo');
        $mail->Body = $body;

        return $mail->send();

    } catch (Exception $e) {
        error_log("Mailer Error: " . $mail->ErrorInfo);
        return false;
    }
}

// Check if a record already exists
$checkSql = "SELECT request_id FROM employee_overtime_request WHERE employee_id = ? AND date_requested = ?";
$checkStmt = $conn->prepare($checkSql);
$checkStmt->bind_param("ss", $employee_id, $date_requested);
$checkStmt->execute();
$checkStmt->store_result();

if ($checkStmt->num_rows > 0) {
    $updateSql = "UPDATE employee_overtime_request 
                  SET time_start=?, end_time=?, hours_requested=?, reason=?, status='Pending', holiday_id=?, multiplier_used=?
                  WHERE employee_id=? AND date_requested=?";
    $updateStmt = $conn->prepare($updateSql);
    $updateStmt->bind_param("ssssdsds", $time_start, $end_time, $hours_requested, $reason, $holiday_id, $multiplier_used, $employee_id, $date_requested);

    if ($updateStmt->execute()) {
        sendOvertimeEmail($conn, $employee_id, $employee_name, $date_requested, $time_start, $end_time, $hours_requested, $reason, $logoPath);
        echo json_encode(["success" => true, "message" => "Overtime request updated & email sent."]);
    } else {
        echo json_encode(["success" => false, "message" => "Failed to update overtime request."]);
    }
    $updateStmt->close();
} else {
    $insertSql = "INSERT INTO employee_overtime_request
        (employee_id, employee_name, date_requested, time_start, end_time, hours_requested, reason, status, holiday_id, multiplier_used)
        VALUES (?, ?, ?, ?, ?, ?, ?, 'Pending', ?, ?)";
    $insertStmt = $conn->prepare($insertSql);
    $insertStmt->bind_param("sssssdsid", $employee_id, $employee_name, $date_requested, $time_start, $end_time, $hours_requested, $reason, $holiday_id, $multiplier_used);

    if ($insertStmt->execute()) {
        sendOvertimeEmail($conn, $employee_id, $employee_name, $date_requested, $time_start, $end_time, $hours_requested, $reason, $logoPath);
        echo json_encode(["success" => true, "message" => "Overtime request submitted & email sent."]);
    } else {
        echo json_encode(["success" => false, "message" => "Failed to submit overtime request."]);
    }
    $insertStmt->close();
}

$checkStmt->close();
$conn->close();
?>
