<?php
// Allow requests from any origin (adjust this to allow only specific origins in production)
// header("Access-Control-Allow-Origin: *");
// header("Access-Control-Allow-Methods: POST, OPTIONS");
// header("Access-Control-Allow-Headers: Content-Type, Authorization");
// header("Content-Type: application/json; charset=UTF-8");

// Handle preflight request (for OPTIONS method)
// if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
//     http_response_code(200);
//     exit;
// }

include('../server/connection.php');
include("../server/cors.php");

// Get the input data from the POST request
$data = json_decode(file_get_contents("php://input"));

if (isset($data->grade_id) && isset($data->position_level) && isset($data->step1) && isset($data->step2) && isset($data->step3)) {
    // Prepare the SQL query to update the salary grade
    $grade_id = $data->grade_id;
    $position_level = $data->position_level;
    $step1 = $data->step1;
    $step2 = $data->step2;
    $step3 = $data->step3;

    // Prevent SQL injection by using prepared statements
    $stmt = $conn->prepare("UPDATE salary_grades SET PositionLevel = ?, Step1 = ?, Step2 = ?, Step3 = ? WHERE GradeID = ?");
    $stmt->bind_param("ssssi", $position_level, $step1, $step2, $step3, $grade_id);

    if ($stmt->execute()) {
        echo json_encode(["success" => true, "message" => "Salary grade updated successfully."]);
    } else {
        echo json_encode(["success" => false, "message" => "Error updating salary grade: " . $conn->error]);
    }
} else {
    echo json_encode(["success" => false, "message" => "Invalid input data."]);
}

$conn->close();