<?php
// base_salary.php
// header('Access-Control-Allow-Origin: *'); // Allow requests from any origin
// header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
// header('Access-Control-Allow-Headers: Content-Type, Authorization');
include("../server/cors.php");

require_once '../server/connection.php'; // Adjust path based on your folder structure

$sql = "SELECT * FROM base_salary"; // SQL query to select all records from the attendance table
$result = $conn->query($sql); // Execute the query

if ($result->num_rows > 0) {
    $attendanceData = [];
    while ($row = $result->fetch_assoc()) {
        $attendanceData[] = $row; // Fetch each row as an associative array
    }
    echo json_encode(["success" => true, "data" => $attendanceData]); // Return success response with data
} else {
    echo json_encode(["success" => false, "message" => "No records found."]); // Return failure response
}

$conn->close(); // Close the database connection
?>