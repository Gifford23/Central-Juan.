<?php
// Enable error reporting for debugging (remove in production)
error_reporting(E_ALL);
ini_set('display_errors', 1);

// Allow cross-origin requests
// header("Access-Control-Allow-Origin: *");
// header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
// header("Access-Control-Allow-Headers: Content-Type, Authorization");
include("../server/cors.php");

// Include the database connection file
include('../server/connection.php');

// Check if the "count" query parameter is set
if (isset($_GET['count']) && $_GET['count'] === 'true') {
    $sql = "SELECT COUNT(*) AS total_departments FROM `departments`";
    $result = $conn->query($sql);

    if ($result) {
        $row = $result->fetch_assoc();
        echo json_encode([
            "status" => "success",
            "total_departments" => $row['total_departments']
        ]);
    } else {
        echo json_encode([
            "status" => "error",
            "message" => "Error fetching count: " . $conn->error
        ]);
    }
} else {
    // Default query to fetch all departments
    $sql = "SELECT * FROM `departments`";
    $result = $conn->query($sql);

    if ($result && $result->num_rows > 0) {
        $departments = [];

        while ($row = $result->fetch_assoc()) {
            $departments[] = $row;
        }

        echo json_encode([
            "status" => "success",
            "data" => $departments
        ]);
    } else {
        echo json_encode([
            "status" => "error",
            "message" => "No departments found or query failed"
        ]);
    }
}

// Close the database connection
$conn->close();
?>
