

<?php

//https://hris.centraljuan.com/central_juan/backend/loans/loan/loan.php
//http://localhost/central_juan/backend/loans/loan/loan.php


// header('Access-Control-Allow-Origin: *'); // Allow requests from any origin
// header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
// header('Access-Control-Allow-Headers: Content-Type, Authorization');

require_once '../../server/connection.php'; // Adjust path based on your folder structure
include("../../server/cors.php");


$sql = "SELECT * FROM loans"; // SQL query to select all records from the loans table
$result = $conn->query($sql); // Execute the query

if ($result->num_rows > 0) {
    $loansData = [];
    while ($row = $result->fetch_assoc()) {
        $loansData[] = $row; // Fetch each row as an associative array
    }
    echo json_encode(["success" => true, "data" => $loansData]); // Return success response with data
} else {
    echo json_encode(["success" => false, "message" => "No records found."]); // Return failure response
}

$conn->close(); // Close the database connection
?>