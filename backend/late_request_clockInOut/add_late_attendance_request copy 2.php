<?php
// create_late_attendance_request.php
use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\Exception;

require '../email/PHPMailer/src/Exception.php';
require '../email/PHPMailer/src/PHPMailer.php';
require '../email/PHPMailer/src/SMTP.php';

require_once '../server/connection.php';
include("../server/cors.php");

error_reporting(E_ALL);
ini_set('display_errors', 1);
header('Content-Type: application/json; charset=UTF-8');

/* ----------------- helpers ----------------- */
function timeDiffWithinRange($start, $end, $range_start = "09:00:00", $range_end = "18:00:00") {
    $start_ts = max(strtotime($start), strtotime($range_start));
    $end_ts = min(strtotime($end), strtotime($range_end));
    $diff = $end_ts - $start_ts;
    return ($diff > 0) ? $diff / 60 : 0;
}

function sendLateAttendanceEmail($conn, $employee_id, $employee_name, $attendance_date,
    $inMorning, $outMorning, $inAfternoon, $outAfternoon, $reason) {

    $formattedDate = !empty($attendance_date) ? date("F j, Y", strtotime($attendance_date)) : "";

    $formattedInMorning = !empty($inMorning) ? date("g:i A", strtotime($inMorning)) : null;
    $formattedOutMorning = !empty($outMorning) ? date("g:i A", strtotime($outMorning)) : null;
    $formattedInAfternoon = !empty($inAfternoon) ? date("g:i A", strtotime($inAfternoon)) : null;
    $formattedOutAfternoon = !empty($outAfternoon) ? date("g:i A", strtotime($outAfternoon)) : null;

    $mail = new PHPMailer(true);
    try {
        $mail->isSMTP();
        $mail->Host = 'smtp.gmail.com';
        $mail->SMTPAuth = true;
        $mail->Username = 'atacadorragheil@gmail.com';
        $mail->Password = 'kkyb ybgn xldv rmyj';
        $mail->SMTPSecure = 'tls';
        $mail->Port = 587;
        $mail->setFrom('atacadorragheil@gmail.com', 'HRIS System');

        // dynamic HR recipients
        $stmt = $conn->prepare("SELECT hr_email FROM email_settings WHERE is_active = 'active'");
        if ($stmt) {
            $stmt->execute();
            $result = $stmt->get_result();
            $hasRecipient = false;
            while ($row = $result->fetch_assoc()) {
                $mail->addAddress($row['hr_email']);
                $hasRecipient = true;
            }
            $stmt->close();
            if (!$hasRecipient) {
                error_log("No active HR email found in email_settings.");
                return false;
            }
        } else {
            error_log("Failed to prepare HR email query: ".$conn->error);
            return false;
        }

        $mail->isHTML(true);
        $mail->Subject = "Late Attendance Request - $employee_name ($employee_id)";

        $body = "<h2>Late Attendance Request</h2>
                 <p><b>Employee ID:</b> $employee_id</p>
                 <p><b>Employee Name:</b> $employee_name</p>
                 <p><b>Date:</b> $formattedDate</p>";
        if (!empty($formattedInMorning)) $body .= "<p><b>Time In (Morning):</b> $formattedInMorning</p>";
        if (!empty($formattedOutMorning)) $body .= "<p><b>Time Out (Morning):</b> $formattedOutMorning</p>";
        if (!empty($formattedInAfternoon)) $body .= "<p><b>Time In (Afternoon):</b> $formattedInAfternoon</p>";
        if (!empty($formattedOutAfternoon)) $body .= "<p><b>Time Out (Afternoon):</b> $formattedOutAfternoon</p>";
        $body .= "<p><b>Reason:</b> $reason</p>";

        $mail->Body = $body;

        return $mail->send();
    } catch (Exception $e) {
        error_log("Mailer Error: " . $mail->ErrorInfo);
        return false;
    }
}

/* ----------------- determine work_time_id helper ----------------- */
function detect_work_time_id($conn, $employee_id, $attendance_date) {
    $sql = "
      SELECT wt.id AS work_time_id
      FROM employee_shift_schedule ess
      JOIN work_time wt ON ess.work_time_id = wt.id
      WHERE ess.employee_id = ?
        AND ess.is_active = 1
        AND ess.effective_date <= ?
        AND (ess.end_date IS NULL OR ess.end_date = '0000-00-00' OR ess.end_date >= ?)
      ORDER BY ess.priority DESC, ess.effective_date DESC
      LIMIT 1
    ";
    $st = $conn->prepare($sql);
    if (!$st) return null;
    $st->bind_param("sss", $employee_id, $attendance_date, $attendance_date);
    $st->execute();
    $res = $st->get_result();
    $row = $res->fetch_assoc();
    $st->close();
    return $row ? intval($row['work_time_id']) : null;
}

/* ----------------- main ----------------- */
$data = json_decode(file_get_contents("php://input"), true);
if (!$data) { echo json_encode(["success"=>false,"message"=>"Invalid JSON"]); exit; }

if (!isset($data['employee_id'], $data['employee_name'], $data['attendance_date'], $data['reason'])) {
    echo json_encode(["success"=>false,"message"=>"Missing required fields."]); exit;
}

$employee_id = $data['employee_id'];
$employee_name = $data['employee_name'];
$attendance_date = $data['attendance_date'];
$requested_time_in_morning = $data['requested_time_in_morning'] ?? null;
$requested_time_out_morning = $data['requested_time_out_morning'] ?? null;
$requested_time_in_afternoon = $data['requested_time_in_afternoon'] ?? null;
$requested_time_out_afternoon = $data['requested_time_out_afternoon'] ?? null;
$reason = $data['reason'];

// normalize afternoon time-in similar to mobile
if (!empty($requested_time_in_afternoon)) {
    $in_afternoon_ts = strtotime($requested_time_in_afternoon);
    if ($in_afternoon_ts >= strtotime("12:30:00") && $in_afternoon_ts <= strtotime("13:05:00")) {
        $requested_time_in_afternoon = "13:00:00";
    }
}

// compute credit preview (optional)
$total_minutes = 0;
if ($requested_time_in_morning && $requested_time_out_morning) {
    $total_minutes += timeDiffWithinRange($requested_time_in_morning, $requested_time_out_morning);
}
if ($requested_time_in_afternoon && $requested_time_out_afternoon) {
    $total_minutes += timeDiffWithinRange($requested_time_in_afternoon, $requested_time_out_afternoon);
}
$standard_full_minutes = 480;
$days_credited_preview = min(round($total_minutes / $standard_full_minutes, 2), 1.0);

// detect and store work_time_id
$work_time_id = detect_work_time_id($conn, $employee_id, $attendance_date);

// Check for existing pending request by same employee+date
$checkSql = "SELECT request_id FROM late_attendance_requests WHERE employee_id = ? AND attendance_date = ? AND status = 'pending' LIMIT 1";
$checkStmt = $conn->prepare($checkSql);
if (!$checkStmt) { echo json_encode(["success"=>false,"message"=>"Prepare failed: ".$conn->error]); exit; }
$checkStmt->bind_param("ss", $employee_id, $attendance_date);
$checkStmt->execute();
$checkStmt->store_result();

if ($checkStmt->num_rows > 0) {
    // update existing
    $updateSql = "UPDATE late_attendance_requests 
                  SET requested_time_in_morning=?, requested_time_out_morning=?, 
                      requested_time_in_afternoon=?, requested_time_out_afternoon=?, reason=?, work_time_id=?
                  WHERE employee_id=? AND attendance_date=? AND status='pending'";
    $updateStmt = $conn->prepare($updateSql);
    if (!$updateStmt) { echo json_encode(["success"=>false,"message"=>"Prepare failed: ".$conn->error]); exit; }
    $updateStmt->bind_param(
        "ssssssis",
        $requested_time_in_morning,
        $requested_time_out_morning,
        $requested_time_in_afternoon,
        $requested_time_out_afternoon,
        $reason,
        $work_time_id,
        $employee_id,
        $attendance_date
    );
    $ok = $updateStmt->execute();
    $updateStmt->close();

    if ($ok) {
        sendLateAttendanceEmail($conn, $employee_id, $employee_name, $attendance_date,
            $requested_time_in_morning, $requested_time_out_morning, $requested_time_in_afternoon, $requested_time_out_afternoon, $reason);
        echo json_encode(["success"=>true,"message"=>"Request updated.","calculated_credit"=>$days_credited_preview]);
    } else {
        echo json_encode(["success"=>false,"message"=>"Failed to update request."]);
    }
} else {
    // insert new
    $insertSql = "INSERT INTO late_attendance_requests 
                  (employee_id, employee_name, attendance_date, requested_time_in_morning, requested_time_out_morning, 
                   requested_time_in_afternoon, requested_time_out_afternoon, reason, status, work_time_id) 
                  VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?)";
    $insertStmt = $conn->prepare($insertSql);
    if (!$insertStmt) { echo json_encode(["success"=>false,"message"=>"Prepare failed: ".$conn->error]); exit; }
    $insertStmt->bind_param(
        "ssssssssi",
        $employee_id,
        $employee_name,
        $attendance_date,
        $requested_time_in_morning,
        $requested_time_out_morning,
        $requested_time_in_afternoon,
        $requested_time_out_afternoon,
        $reason,
        $work_time_id
    );
    $ok = $insertStmt->execute();
    $insertStmt->close();

    if ($ok) {
        sendLateAttendanceEmail($conn, $employee_id, $employee_name, $attendance_date,
            $requested_time_in_morning, $requested_time_out_morning, $requested_time_in_afternoon, $requested_time_out_afternoon, $reason);
        echo json_encode(["success"=>true,"message"=>"Request submitted & email sent.","calculated_credit"=>$days_credited_preview]);
    } else {
        echo json_encode(["success"=>false,"message"=>"Failed to create request."]);
    }
}

$checkStmt->close();
$conn->close();
