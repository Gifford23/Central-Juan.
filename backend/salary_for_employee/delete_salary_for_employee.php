<?php
// header("Access-Control-Allow-Origin: *");
// header("Content-Type: application/json; charset=UTF-8");

include('../server/connection.php'); // Include your database connection file
include("../server/cors.php");

// Get the JSON input
$data = json_decode(file_get_contents("php://input"), true);

// Validate input
if (isset($data['salary_id'])) {
    $salary_id = $data['salary_id'];

    // Prepare and execute the delete statement
    $sql = "DELETE FROM salary_for_employee WHERE salary_id=?";
    $stmt = $conn->prepare($sql);
    $stmt->bind_param("i", $salary_id);

    if ($stmt->execute()) {
        echo json_encode(["success" => true, "message" => "Salary record deleted successfully."]);
    } else {
        echo json_encode(["success" => false, "message" => "Error deleting record: " . $stmt->error]);
    }

    $stmt->close();
} else {
    echo json_encode(["success" => false, "message" => "Invalid input."]);
}

$conn->close(); // Close the database connection
?>