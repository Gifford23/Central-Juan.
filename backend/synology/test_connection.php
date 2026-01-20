<?php
// connection.php
header('Content-Type: application/json');

// Database connection details
$servername = "10.0.254.219";  // Your Synology NAS IP
$username = "root";            // Username set in PHPMyAdmin
$password = "CJP@ssw0rd!";     // Your MySQL password
$dbname = "central_juan_hris";  // Your database name
$port = 3306;                  // Default MySQL port on Synology

// Create connection
$conn = new mysqli($servername, $username, $password, $dbname, $port);

// Check connection
if ($conn->connect_error) {
    echo json_encode(["message" => "Database connection failed", "error" => $conn->connect_error]);
    exit();
}

echo json_encode(["message" => "Connected successfully"]);
?>
