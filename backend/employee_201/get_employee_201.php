<?php

// http://localhost/central_juan/backend/api/get_employee_201.php

// header('Access-Control-Allow-Origin: *'); // Allow requests from any origin
// header('Access-Control-Allow-Methods: GET, OPTIONS'); // Allow GET and OPTIONS methods
// header('Access-Control-Allow-Headers: Content-Type, Authorization'); // Allow specific headers
include("../server/cors.php");

require_once '../server/connection.php'; // Adjust path based on your folder structure

$sql = "SELECT * FROM employee_201"; // SQL query to select all records from the employee_201 table
$result = $conn->query($sql); // Execute the query

if ($result->num_rows > 0) {
    $employeeData = [];
    while ($row = $result->fetch_assoc()) {
        $employeeData[] = $row; // Fetch each row as an associative array
    }
    echo json_encode(["success" => true, "data" => $employeeData]); // Return success response with data
} else {
    echo json_encode(["success" => false, "message" => "No records found."]); // Return failure response
}

$conn->close(); // Close the database connection
?>