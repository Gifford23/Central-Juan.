<?php
// connection.php
$servername = "localhost";
$username = "root";
$password = "";
$dbname = "central_juan_hris_deployed";

// Create connection
$conn = new mysqli($servername, $username, $password, $dbname);

// Check connection
if ($conn->connect_error) {
    die(json_encode(["message" => "Database connection failed: " . $conn->connect_error]));
}
?>