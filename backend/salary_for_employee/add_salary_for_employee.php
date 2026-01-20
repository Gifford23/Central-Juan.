<?php
// header("Access-Control-Allow-Origin: *");
// header("Access-Control-Allow-Methods: POST, OPTIONS");
// header("Access-Control-Allow-Headers: Content-Type, Authorization");
// header("Content-Type: application/json; charset=UTF-8");

include('../server/connection.php'); // Include your database connection file
include("../server/cors.php");

// Get the JSON input
$data = json_decode(file_get_contents("php://input"), true);

// Validate input
if (isset($data['employee_id'], $data['employee_name'], $data['department_name'], $data['position_name'], $data['position_level'], $data['step'])) {
    $employee_id = $data['employee_id'];
    $employee_name = $data['employee_name'];
    $department_name = $data['department_name'];
    $position_name = $data['position_name'];
    $position_level = $data['position_level'];
    $step = $data['step'];

    // Prepare and execute the insert statement
    $sql = "INSERT INTO salary_for_employee (employee_id, employee_name, department_name, position_name, position_level, step) VALUES (?, ?, ?, ?, ?, ?)";
    $stmt = $conn->prepare($sql);
    $stmt->bind_param("ssssii", $employee_id, $employee_name, $department_name, $position_name, $position_level, $step);

    if ($stmt->execute()) {
        echo json_encode(["success" => true, "message" => "Salary record added successfully."]);
    } else {
        echo json_encode(["success" => false, "message" => "Error adding record: " . $stmt->error]);
    }

    $stmt->close();
} else {
    echo json_encode(["success" => false, "message" => "Invalid input."]);
}

$conn->close(); // Close the database connection
?>