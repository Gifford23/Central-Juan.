<?php

// header("Access-Control-Allow-Origin: *");
// header("Access-Control-Allow-Methods: POST, PUT, OPTIONS");
// header("Access-Control-Allow-Headers: Content-Type, Authorization");
// header("Content-Type: application/json; charset=UTF-8");

include('../server/connection.php'); // Include your database connection file
include("../server/cors.php");

// Get the JSON input
$data = json_decode(file_get_contents("php://input"), true);

// Validate input
if (isset($data['salary_id'], $data['position_level'], $data['step'])) {
    $salary_id = $data['salary_id'];
    $position_level = $data['position_level'];
    $step = $data['step'];

    // Prepare and execute the update statement
    $sql = "UPDATE salary_for_employee SET position_level=?, step=? WHERE salary_id=?";
    $stmt = $conn->prepare($sql);
    
    if ($stmt === false) {
        echo json_encode(["success" => false, "message" => "Error preparing statement: " . $conn->error]);
        exit;
    }

    // Bind parameters (make sure the types match your database schema)
    $stmt->bind_param("ssi", $position_level, $step, $salary_id);

    // Execute the statement
    if ($stmt->execute()) {
        echo json_encode(["success" => true, "message" => "Salary record updated successfully."]);
    } else {
        echo json_encode(["success" => false, "message" => "Error updating record: " . $stmt->error]);
    }

    $stmt->close();
} else {
    echo json_encode(["success" => false, "message" => "Invalid input."]);
}

$conn->close(); // Close the database connection
?>