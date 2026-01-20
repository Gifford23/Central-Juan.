
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
           $logoPath = '/home/u274016928/domains/centraljuan.com/public_html/hris/systemImage/HorizonHR-logoPC-white.png';

            $body = '
            <div style="font-family: Arial, sans-serif; color: #333; background-color: #f4f4f4; padding: 20px;">
                <!-- Header with Logo -->
                <div style="background-color: #004080; padding: 20px; text-align: center; border-radius: 8px 8px 0 0;">
                    <img src="cid:hris_logo" alt="Horizon HR Logo" style="height: 60px;">
                </div>

                <!-- Main Content Card -->
                <div style="background-color: #ffffff; border-radius: 0 0 8px 8px; padding: 20px; box-shadow: 0 4px 8px rgba(0,0,0,0.1);">

                    <h2 style="color: #004080; margin-top: 0;">Late Attendance Request</h2>
                    <p><b>Employee ID:</b> ' . $employee_id . '</p>
                    <p><b>Employee Name:</b> ' . $employee_name . '</p>
                    <p><b>Date:</b> ' . $formattedDate . '</p>

                    <!-- Morning Section -->
                    ' . ((!empty($inMorning) || !empty($outMorning)) ? '
                    <div style="background-color: #e6f0ff; padding: 10px; border-radius: 6px; margin-bottom: 10px;">
                        <h3 style="margin: 0 0 5px 0; color: #004080;">Morning</h3>
                        ' . (!empty($inMorning) ? '<p><b>Time In:</b> ' . date("g:i A", strtotime($inMorning)) . '</p>' : '') . '
                        ' . (!empty($outMorning) ? '<p><b>Time Out:</b> ' . date("g:i A", strtotime($outMorning)) . '</p>' : '') . '
                    </div>' : '') . '

                    <!-- Afternoon Section -->
                    ' . ((!empty($inAfternoon) || !empty($outAfternoon)) ? '
                    <div style="background-color: #fff0f5; padding: 10px; border-radius: 6px; margin-bottom: 10px;">
                        <h3 style="margin: 0 0 5px 0; color: #800040;">Afternoon</h3>
                        ' . (!empty($inAfternoon) ? '<p><b>Time In:</b> ' . date("g:i A", strtotime($inAfternoon)) . '</p>' : '') . '
                        ' . (!empty($outAfternoon) ? '<p><b>Time Out:</b> ' . date("g:i A", strtotime($outAfternoon)) . '</p>' : '') . '
                    </div>' : '') . '

                    <!-- Reason Section -->
                    <div style="padding: 10px; border-left: 4px solid #004080; margin-top: 10px;">
                        <p><b>Reason:</b> ' . $reason . '</p>
                    </div>

                </div>
            </div>
            ';

            // Attach the logo inline
            $mail->addEmbeddedImage($logoPath, 'hris_logo');
            $mail->Body = $body;
            $mail->isHTML(true);



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
