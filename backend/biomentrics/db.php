<?php
// connection.php
$servername = "localhost";
$username = "root";
$password = "";
$dbname = "central_juan_hris";

// Create connection
$conn = new mysqli($servername, $username, $password, $dbname);

// Check connection
if ($conn->connect_error) {
    die(json_encode(["message" => "Database connection failed: " . $conn->connect_error]));
}
?>



<!-- <?php

 //DEPLOYED CONNECTION
// connection.php

// Database credentials
//$servername = "auth-db605.hstgr.io";
//$username = "u274016928_JbaUW";
// $password = "CJP@ssw0rd!";
// $dbname = "u274016928_83TLZ";

// Create connection
// $conn = new mysqli($servername, $username, $password, $dbname);

// // Check connection
// if ($conn->connect_error) {
//     die("❌ Database connection failed: " . $conn->connect_error);
// } else {
//     echo "✅ Database connection successful!lalallala";
// }

?> -->