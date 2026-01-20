<?php
header('Content-Type: application/json');
include_once '../config/database.php';

try {
    $data = json_decode(file_get_contents("php://input"), true);

    if (
        empty($data['action']) || 
        empty($data['employee_id']) || 
        empty($data['attendance_date']) ||
        empty($data['user_full_name']) ||
        empty($data['user_role'])
    ) {
        echo json_encode(["success" => false, "message" => "Missing required fields."]);
        exit;
    }

    $action = $data['action']; // Add | Edit | Clear
    $employee_id = $data['employee_id'];
    $employee_name = $data['employee_name'] ?? '';
    $attendance_date = $data['attendance_date'];
    $time_in = $data['time_in'] ?? null;
    $time_out = $data['time_out'] ?? null;
    $user_full_name = $data['user_full_name'];
    $user_role = $data['user_role'];

    $success = false;
    $message = '';
    $log_action_text = '';

    // 🔹 ADD or EDIT attendance
    if ($action === 'Add' || $action === 'Edit') {
        // Check if record exists
        $checkQuery = "SELECT attendance_id FROM attendance WHERE employee_id = ? AND attendance_date = ?";
        $checkStmt = $conn->prepare($checkQuery);
        $checkStmt->bind_param("ss", $employee_id, $attendance_date);
        $checkStmt->execute();
        $checkResult = $checkStmt->get_result();

        if ($checkResult->num_rows > 0) {
            // Update
            $updateQuery = "UPDATE attendance 
                            SET time_in = ?, time_out = ? 
                            WHERE employee_id = ? AND attendance_date = ?";
            $updateStmt = $conn->prepare($updateQuery);
            $updateStmt->bind_param("ssss", $time_in, $time_out, $employee_id, $attendance_date);
            $success = $updateStmt->execute();
            $updateStmt->close();

            $message = $success ? "Attendance updated successfully." : "Failed to update attendance.";
            $log_action_text = "Edited attendance for $employee_name ($employee_id) on $attendance_date.";
        } else {
            // Insert new
            $insertQuery = "INSERT INTO attendance (employee_id, employee_name, attendance_date, time_in, time_out)
                            VALUES (?, ?, ?, ?, ?)";
            $insertStmt = $conn->prepare($insertQuery);
            $insertStmt->bind_param("sssss", $employee_id, $employee_name, $attendance_date, $time_in, $time_out);
            $success = $insertStmt->execute();
            $insertStmt->close();

            $message = $success ? "Attendance added successfully." : "Failed to add attendance.";
            $log_action_text = "Added new attendance for $employee_name ($employee_id) on $attendance_date.";
        }

        $checkStmt->close();
    }

    // 🔹 CLEAR attendance
    elseif ($action === 'Clear') {
        $clearQuery = "DELETE FROM attendance WHERE employee_id = ? AND attendance_date = ?";
        $clearStmt = $conn->prepare($clearQuery);
        $clearStmt->bind_param("ss", $employee_id, $attendance_date);
        $success = $clearStmt->execute();
        $clearStmt->close();

        $message = $success ? "Attendance cleared successfully." : "Failed to clear attendance.";
        $log_action_text = "Cleared attendance for $employee_name ($employee_id) on $attendance_date.";
    }

    // 🔹 Insert into logs if successful
    if ($success) {
        $logQuery = "INSERT INTO logs (user_full_name, user_role, action) VALUES (?, ?, ?)";
        $logStmt = $conn->prepare($logQuery);
        $logStmt->bind_param("sss", $user_full_name, $user_role, $log_action_text);
        $logStmt->execute();
        $logStmt->close();
    }

    echo json_encode(["success" => $success, "message" => $message]);

    $conn->close();

} catch (Exception $e) {
    echo json_encode(["success" => false, "message" => $e->getMessage()]);
}
?>
