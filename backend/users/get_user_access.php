<?php
include '../server/connection.php';
include("../server/cors.php");

if (empty($_GET["username"])) {
    echo json_encode(["success" => false, "message" => "Username is required"]);
    exit;
}

$username = $_GET["username"];

$stmt = $conn->prepare("
    SELECT 
        u.username,
        u.role,
        u.status,
        ua.*
    FROM users u
    LEFT JOIN user_access ua ON ua.username = u.username
    WHERE u.username = ?
");
$stmt->bind_param("s", $username);
$stmt->execute();
$res = $stmt->get_result();

if ($res->num_rows === 0) {
    echo json_encode(["success" => false, "message" => "User not found"]);
    exit;
}

$row = $res->fetch_assoc();

echo json_encode(["success" => true, "data" => $row]);
