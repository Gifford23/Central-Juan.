<?php

//https://hris.centraljuan.com/central_juan/backend/loans/loan_payment_history/loan_payment.php
//http://localhost/central_juan/backend/loans/loan_payment_history/loan_payment.php

// header('Access-Control-Allow-Origin: *'); // Allow requests from any origin
// header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
// header('Access-Control-Allow-Headers: Content-Type, Authorization');

require_once '../../server/connection.php'; // Adjust path based on your folder structure
include("../../server/cors.php");

$sql = "SELECT * FROM loan_payment_history"; // SQL query to select all records from the loan_payment_history table
$result = $conn->query($sql); // Execute the query

if ($result->num_rows > 0) {
    $loan_payment_historyData = [];
    while ($row = $result->fetch_assoc()) {
        $loan_payment_historyData[] = $row; // Fetch each row as an associative array
    }
    echo json_encode(["success" => true, "data" => $loan_payment_historyData]); // Return success response with data
} else {
    echo json_encode(["success" => false, "message" => "No records found."]); // Return failure response
}

$conn->close(); // Close the database connection
?>