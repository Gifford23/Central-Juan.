<?php

// header("Access-Control-Allow-Origin: *");
// header("Access-Control-Allow-Methods: POST, OPTIONS");
// header("Access-Control-Allow-Headers: Content-Type, Authorization");
// header("Content-Type: application/json; charset=UTF-8");

include('../server/connection.php');
include("../server/cors.php");

// Get the JSON input
$data = json_decode(file_get_contents("php://input"), true);
error_log("Received data: " . print_r($data, true)); // Log all received data

if (isset($data['employee_id'], $data['date_from'], $data['date_until'], $data['total_days'], $data['total_salary'])) {
    $employee_id = trim($data['employee_id']); // Trim spaces
    $date_from = $data['date_from'];
    $date_until = $data['date_until'];
    $total_days = (int)$data['total_days'];
    $total_salary = (float)$data['total_salary'];

    // Log the individual values
    error_log("Employee ID: $employee_id, Date From: $date_from, Date Until: $date_until, Total Days: $total_days, Total Salary: $total_salary");

    // Validate employee ID exists
    $checkEmployee = $conn->prepare("SELECT COUNT(*) FROM employees WHERE employee_id = ?");
    $checkEmployee->bind_param("s", $employee_id);
    $checkEmployee->execute();
    $checkEmployee->bind_result($count);
    $checkEmployee->fetch();
    $checkEmployee->close();

    if ($count == 0) {
        echo json_encode(["success" => false, "message" => "Employee ID does not exist in employees table."]);
        exit;
    }

    // Validate date format (YYYY-MM-DD)
    if (!DateTime::createFromFormat('Y-m-d', $date_from) || !DateTime::createFromFormat('Y-m-d', $date_until)) {
        echo json_encode(["success" => false, "message" => "Invalid date format. Use YYYY-MM-DD."]);
        exit;
    }

    // Insert payroll record
    $sql = "INSERT INTO payroll (employee_id, date_from, date_until, total_days, total_salary) VALUES (?, ?, ?, ?, ?)";
    $stmt = $conn->prepare($sql);
    $stmt->bind_param("sssds", $employee_id, $date_from, $date_until, $total_days, $total_salary);

    if ($stmt->execute()) {
        echo json_encode(["success" => true, "message" => "Payroll record added successfully."]);
    } else {
        echo json_encode(["success" => false, "message" => "Error adding record: " . $stmt->error]);
    }

    $stmt->close();
} else {
    echo json_encode(["success" => false, "message" => "Invalid request. Missing required fields."]);
}

$conn->close();
?>
