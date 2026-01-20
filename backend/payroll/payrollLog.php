
<?php

// header("Access-Control-Allow-Origin: *");
// header("Access-Control-Allow-Methods: GET, OPTIONS");
// header("Access-Control-Allow-Headers: Content-Type, Authorization");
// header("Content-Type: application/json; charset=UTF-8");

include('../server/connection.php');
include("../server/cors.php");


$sql = "SELECT * FROM payroll_logs"; // SQL query to select all records from the payroll table
$result = $conn->query($sql); // Execute the query

if ($result->num_rows > 0) {
    $payrollData = [];
    while ($row = $result->fetch_assoc()) {
        $payrollData[] = $row; // Fetch each row as an associative array
    }
    echo json_encode(["success" => true, "data" => $payrollData]); // Return success response with data
} else {
    echo json_encode(["success" => false, "message" => "No Payroll Logs found"]); // Return failure response
}

$conn->close(); // Close the database connection
?>
