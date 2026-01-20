
<?php
use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\Exception;

require '../email/PHPMailer/src/Exception.php';
require '../email/PHPMailer/src/PHPMailer.php';
require '../email/PHPMailer/src/SMTP.php';


// require '../email/PHPMailer/src/Exception.php';

require_once '../server/connection.php';
include("../server/cors.php");

function timeDiffWithinRange($start, $end, $range_start = "09:00:00", $range_end = "18:00:00") {
    $start_ts = max(strtotime($start), strtotime($range_start));
    $end_ts = min(strtotime($end), strtotime($range_end));
    $diff = $end_ts - $start_ts;
    return ($diff > 0) ? $diff / 60 : 0;
}
function sendLateAttendanceEmail($conn, $employee_id, $employee_name, $attendance_date,
    $inMorning, $outMorning, $inAfternoon, $outAfternoon, $reason) {

                // Format date as "August 8, 2025"
        $formattedDate = !empty($attendance_date) 
            ? date("F j, Y", strtotime($attendance_date)) 
            : "";

        // Format times as 12-hour with AM/PM
        $formattedInMorning = !empty($inMorning) 
            ? date("g:i A", strtotime($inMorning)) 
            : null;

        $formattedOutMorning = !empty($outMorning) 
            ? date("g:i A", strtotime($outMorning)) 
            : null;

        $formattedInAfternoon = !empty($inAfternoon) 
            ? date("g:i A", strtotime($inAfternoon)) 
            : null;

        $formattedOutAfternoon = !empty($outAfternoon) 
            ? date("g:i A", strtotime($outAfternoon)) 
            : null;

    $mail = new PHPMailer(true);

    try {
        $mail->isSMTP();
        $mail->Host = 'smtp.gmail.com';
        $mail->SMTPAuth = true;
        $mail->Username = 'atacadorragheil@gmail.com'; // Sender (system)
        $mail->Password = 'zgjh uxek mxus lqpt';       // Gmail App Password
        $mail->SMTPSecure = 'tls';
        $mail->Port = 587;

        $mail->setFrom('atacadorragheil@gmail.com', 'HRIS System');

        // ✅ Get active HR email(s) dynamically
        $stmt = $conn->prepare("SELECT hr_email FROM email_settings WHERE is_active = 'active'");
        $stmt->execute();
        $result = $stmt->get_result();

        $hasRecipient = false;
        while ($row = $result->fetch_assoc()) {
            $mail->addAddress($row['hr_email']);
            $hasRecipient = true;
        }

        if (!$hasRecipient) {
            error_log("No active HR email found in email_settings.");
            return false;
        }

            $mail->isHTML(true);
            $mail->Subject = "Late Attendance Request - $employee_name ($employee_id)";

            // Build email body dynamically (only show filled fields)
            $body = "
                <h2>Late Attendance Request</h2>
                <p><b>Employee ID:</b> $employee_id</p>
                <p><b>Employee Name:</b> $employee_name</p>
                <p><b>Date:</b> $formattedDate</p>
            ";

            if (!empty($formattedInMorning)) {
                $body .= "<p><b>Time In (Morning):</b> $formattedInMorning</p>";
            }
            if (!empty($formattedOutMorning)) {
                $body .= "<p><b>Time Out (Morning):</b> $formattedOutMorning</p>";
            }
            if (!empty($formattedInAfternoon)) {
                $body .= "<p><b>Time In (Afternoon):</b> $formattedInAfternoon</p>";
            }
            if (!empty($formattedOutAfternoon)) {
                $body .= "<p><b>Time Out (Afternoon):</b> $formattedOutAfternoon</p>";
            }

            // Always include reason
            $body .= "<p><b>Reason:</b> $reason</p>";

            $mail->Body = $body;



        return $mail->send();

    } catch (Exception $e) {
        error_log("Mailer Error: " . $mail->ErrorInfo);
        return false;
    }
}



$data = json_decode(file_get_contents("php://input"), true); // decode as array

if (
    isset($data['employee_id']) && isset($data['employee_name']) &&
    isset($data['attendance_date']) && isset($data['reason'])
) {
    $employee_id = $data['employee_id'];
    $employee_name = $data['employee_name'];
    $attendance_date = $data['attendance_date'];
    $requested_time_in_morning = $data['requested_time_in_morning'];
    $requested_time_out_morning = $data['requested_time_out_morning'];
    $requested_time_in_afternoon = $data['requested_time_in_afternoon'];
    $requested_time_out_afternoon = $data['requested_time_out_afternoon'];
    $reason = $data['reason'];


    // Calculate total minutes as before
    $total_minutes = 0;
    if ($requested_time_in_morning && $requested_time_out_morning) {
        $total_minutes += timeDiffWithinRange($requested_time_in_morning, $requested_time_out_morning);
    }
    if ($requested_time_in_afternoon && $requested_time_out_afternoon) {
        $total_minutes += timeDiffWithinRange($requested_time_in_afternoon, $requested_time_out_afternoon);
    }
    $standard_full_minutes = 480;
    $days_credited = min(round($total_minutes / $standard_full_minutes, 2), 1.0);

    // ✅ First check if request exists
    $checkSql = "SELECT request_id FROM late_attendance_requests WHERE employee_id = ? AND attendance_date = ? AND status = 'pending'";
    $checkStmt = $conn->prepare($checkSql);
    $checkStmt->bind_param("ss", $employee_id, $attendance_date);
    $checkStmt->execute();
    $checkStmt->store_result();

    if ($checkStmt->num_rows > 0) {
        // UPDATE existing request
        $updateSql = "UPDATE late_attendance_requests 
                      SET requested_time_in_morning=?, requested_time_out_morning=?, 
                          requested_time_in_afternoon=?, requested_time_out_afternoon=?, reason=? 
                      WHERE employee_id=? AND attendance_date=? AND status='pending'";
        $updateStmt = $conn->prepare($updateSql);
        $updateStmt->bind_param(
            "sssssss",
            $requested_time_in_morning,
            $requested_time_out_morning,
            $requested_time_in_afternoon,
            $requested_time_out_afternoon,
            $reason,
            $employee_id,
            $attendance_date
        );

        if ($updateStmt->execute()) {
            // ✅ Send email on success
            sendLateAttendanceEmail($conn, $employee_id, $employee_name, $attendance_date,
    $requested_time_in_morning, $requested_time_out_morning,
    $requested_time_in_afternoon, $requested_time_out_afternoon, $reason);

            echo json_encode(["success" => true, "message" => "Request updated.", "calculated_credit" => $days_credited]);
        } else {
            echo json_encode(["success" => false, "message" => "Failed to update request."]);
        }
        $updateStmt->close();
    } else {
        // INSERT new request
        $insertSql = "INSERT INTO late_attendance_requests 
                      (employee_id, employee_name, attendance_date, requested_time_in_morning, requested_time_out_morning, 
                       requested_time_in_afternoon, requested_time_out_afternoon, reason, status) 
                      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending')";

        $insertStmt = $conn->prepare($insertSql);
        $insertStmt->bind_param(
            "ssssssss",
            $employee_id,
            $employee_name,
            $attendance_date,
            $requested_time_in_morning,
            $requested_time_out_morning,
            $requested_time_in_afternoon,
            $requested_time_out_afternoon,
            $reason
        );

        if ($insertStmt->execute()) {
            // ✅ Send email on success
            sendLateAttendanceEmail($conn, $employee_id, $employee_name, $attendance_date,
            $requested_time_in_morning, $requested_time_out_morning,
            $requested_time_in_afternoon, $requested_time_out_afternoon, $reason);


          echo json_encode(["success" => true, "message" => "Request submitted & email sent."]);
    } else {
        echo json_encode(["success" => false, "message" => "Request saved but email failed."]);
    }
        $insertStmt->close();
    }

    $checkStmt->close();
} else {
    echo json_encode(["success" => false, "message" => "Missing required fields."]);
}

$conn->close();
?>
