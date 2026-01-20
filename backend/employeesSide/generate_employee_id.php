<?php
include('../server/connection.php'); // Include your database connection file
include("../server/cors.php");
// // Set headers to allow CORS and handle content
// header("Access-Control-Allow-Origin: *");
// header("Content-Type: application/json; charset=UTF-8");
// header("Access-Control-Allow-Methods: GET, OPTIONS");
// header("Access-Control-Allow-Headers: Content-Type, Authorization");

// // Handle preflight request
// if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
//     http_response_code(204);
//     exit();
// }

// Function to generate the next employee ID
function generateEmployeeId($conn) {
    $year = date("Y");
    $query = "SELECT employee_id FROM employees WHERE employee_id LIKE 'CJIS-$year-%' ORDER BY employee_id DESC LIMIT 1";
    $result = $conn->query($query);
    
    // Default ID if no employees exist for the current year
    $latestId = "CJIS-$year-0000"; 

    if ($result && $result->num_rows > 0) {
        $row = $result->fetch_assoc();
        $latestId = $row['employee_id'];
    }

    // Increment the ID
    $currentIdNumber = (int)substr($latestId, -4); // Get the numeric part
    $currentIdNumber++; // Increment the number

    // Format the new ID
    return sprintf("CJIS-%d-%04d", $year, $currentIdNumber); // Format to 4 digits
}

// Generate the new employee ID
$newEmployeeId = generateEmployeeId($conn);

// Return the new employee ID as JSON
echo json_encode(['employee_id' => $newEmployeeId]);

// Close the database connection
$conn->close();
?>