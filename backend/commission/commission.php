
<?php

//commission.php
include("../server/cors.php");

include('../server/connection.php');


$sql = "SELECT * FROM commission_per_employee"; // SQL query to select all records from the payroll table
$result = $conn->query($sql); // Execute the query

if ($result->num_rows > 0) {
    $commissionPerEmployeeData = [];
    while ($row = $result->fetch_assoc()) {
        $commissionPerEmployeeData[] = $row; // Fetch each row as an associative array
    }
    echo json_encode(["success" => true, "data" => $commissionPerEmployeeData]); // Return success response with data
} else {
    echo json_encode(["success" => false, "message" => "No records found."]); // Return failure response
}

$conn->close(); // Close the database connection
?>
