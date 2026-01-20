<?php
// Enable error reporting
error_reporting(E_ALL);
ini_set('display_errors', 1);

include 'connection.php';

$sql = "SELECT * FROM users";
$result = $conn->query($sql);

if ($result->num_rows > 0) {
    $users = [];
    while ($row = $result->fetch_assoc()) {
        $users[] = $row;
    }
    echo json_encode(["status" => "success", "data" => $users]);
} else {
    echo json_encode(["status" => "error", "message" => "No users found"]);
}

$conn->close();
?>
