<?php
// Enable error reporting (remove in production)
error_reporting(E_ALL);
ini_set('display_errors', 1);

// Allow cross-origin requests
// header("Access-Control-Allow-Origin: *");
// header("Access-Control-Allow-Methods: POST");
// header("Access-Control-Allow-Headers: Content-Type");

// Include the database connection file
include('../server/connection.php');
include("../server/cors.php");


// Read the input data
$data = json_decode(file_get_contents("php://input"), true);

if (isset($data['department_name']) && isset($data['department_id'])) {
    $department_name = $conn->real_escape_string($data['department_name']);
    $department_id = $conn->real_escape_string($data['department_id']);

    $sql = "INSERT INTO `departments` (`department_id`, `department_name`) 
            VALUES ('$department_id', '$department_name')";

    if ($conn->query($sql) === TRUE) {
        echo json_encode(["status" => "success", "message" => "Department added successfully"]);
    } else {
        echo json_encode(["status" => "error", "message" => "Error: " . $conn->error]);
    }
} else {
    echo json_encode(["status" => "error", "message" => "Invalid department data"]);
}

$conn->close();
?>
