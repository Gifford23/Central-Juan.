<?php
include("../server/cors.php");
include '../server/connection.php';

if (!isset($_GET['username'])) {
    echo json_encode(["error" => "Username is required"]);
    exit;
}

$username = $_GET['username'];

// Fetch user access data
$sql = "SELECT * FROM user_access WHERE username = ? LIMIT 1";
$stmt = $conn->prepare($sql);
$stmt->bind_param("s", $username);
$stmt->execute();
$result = $stmt->get_result();

if ($result->num_rows === 0) {
    echo json_encode(["error" => "User not found"]);
    exit;
}

$userData = $result->fetch_assoc();

// Extract permissions (skip id, username, role)
$permissions = [];
foreach ($userData as $key => $value) {
    if (!in_array($key, ['id', 'username', 'role'])) {
        $permissions[$key] = ($value === 'yes');
    }
}

// Return JSON response
echo json_encode([
    "username" => $userData['username'],
    "role" => $userData['role'],
    "permissions" => $permissions
]);

$conn->close();
?>
