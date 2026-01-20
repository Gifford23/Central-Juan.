
<?php

// header("Access-Control-Allow-Origin: *");
// header("Access-Control-Allow-Methods: GET, OPTIONS");
// header("Access-Control-Allow-Headers: Content-Type, Authorization");
// header("Content-Type: application/json; charset=UTF-8");
include("../../../server/cors.php");

include('../../../server/connection.php');

// PHILHEALTH EMPLOYEE CONTRIBUTIONS TABLE http://10.0.254.104/central_juan/backend/contributions/philhealth/table/philhealth_table.php
$sql = "SELECT * FROM philhealth_contributions_2025"; // SQL query to select all records from the payroll table
$result = $conn->query($sql); // Execute the query

if ($result->num_rows > 0) {
    $payrollData = [];
    while ($row = $result->fetch_assoc()) {
        $payrollData[] = $row; // Fetch each row as an associative array
    }
    echo json_encode(["success" => true, "data" => $payrollData]); // Return success response with data
} else {
    echo json_encode(["success" => false, "message" => "No records found."]); // Return failure response
}

$conn->close(); // Close the database connection
?>
