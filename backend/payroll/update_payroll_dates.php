<?php 
// update_payroll_dates.php
// header("Access-Control-Allow-Origin: *");
// header("Access-Control-Allow-Methods: POST, PUT, OPTIONS");
// header("Access-Control-Allow-Headers: Content-Type, Authorization");
// header("Content-Type: application/json; charset=UTF-8");

include('../server/connection.php');
include("../server/cors.php");

// Handle preflight request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// Get the JSON input
$data = json_decode(file_get_contents("php://input"), true);

// Check if the necessary data is provided
if (isset($data['date_from']) && isset($data['date_until']) && isset($data['payroll_id'])) {
    $date_from = $data['date_from'];
    $date_until = $data['date_until'];
    $payroll_id = $data['payroll_id'];

    // Check if date fields are not empty
    if (empty($date_from) || empty($date_until)) {
        echo json_encode(["success" => false, "message" => "Date fields cannot be empty."]);
        exit();
    }

    // ✅ Update the specific payroll record
$sql = "UPDATE payroll SET date_from = ?, date_until = ?";
$stmt = $conn->prepare($sql);
$stmt->bind_param("ss", $date_from, $date_until);

    if ($stmt->execute()) {
        // Insert into payroll_logs
        $logSql = "INSERT INTO payroll_logs (date_from, date_until, created_at) VALUES (?, ?, current_timestamp())";
        $logStmt = $conn->prepare($logSql);
        $logStmt->bind_param("ss", $date_from, $date_until);

        if ($logStmt->execute()) {
            echo json_encode(["success" => true, "message" => "Payroll record updated successfully and log added."]);
        } else {
            echo json_encode(["success" => false, "message" => "Updated payroll record, but failed to add log: " . $logStmt->error]);
        }

        $logStmt->close();
    } else {
        echo json_encode(["success" => false, "message" => "Error updating payroll record: " . $stmt->error]);
    }

    $stmt->close();
} else {
    echo json_encode(["success" => false, "message" => "Invalid request. Date fields and payroll_id are required."]);
}

$conn->close();
?>
