<?php
// Allow CORS
// header("Access-Control-Allow-Origin: *"); // Allow all origins
// header("Access-Control-Allow-Methods: GET, POST, OPTIONS"); // Allow specific methods
// header("Access-Control-Allow-Headers: Content-Type"); // Allow specific headers
// Include the database connection file
include('../../server/connection.php');
include("../../server/cors.php");


// Handle preflight request
// if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
//     header("HTTP/1.1 204 No Content");
//     exit;
// }

// Get the department_id from the query parameters
$department_id = isset($_GET['department_id']) ? mysqli_real_escape_string($conn, $_GET['department_id']) : '';

// Prepare the SQL statement
if (!empty($department_id)) {
    $query = "SELECT * FROM positions WHERE department_id = ?";
    $stmt = $conn->prepare($query);
    $stmt->bind_param("s", $department_id);
} else {
    // If no valid department_id is provided, return an empty array
    $positions = [];
    header('Content-Type: application/json');
    echo json_encode($positions);
    exit; // Exit the script
}

// Execute the query
if ($stmt->execute()) {
    $result = $stmt->get_result();
    
    // Fetch the data as an associative array
    $positions = [];
    while ($row = $result->fetch_assoc()) {
        $positions[] = $row;
    }
    
    // Return the positions as JSON
    header('Content-Type: application/json');
    echo json_encode($positions);
} else {
    // Handle query execution error
    header('Content-Type: application/json');
    echo json_encode(["error" => "Query execution failed: " . $stmt->error]);
}

// Close the statement and database connection
$stmt->close();
mysqli_close($conn);
?>