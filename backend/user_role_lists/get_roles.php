<?php
// --- CORS headers ---
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");
header("Content-Type: application/json; charset=UTF-8");

// --- Handle preflight ---
if ($_SERVER['REQUEST_METHOD'] === "OPTIONS") {
    http_response_code(200);
    exit(0);
}

include '../server/connection.php';

if ($conn->connect_error) {
    http_response_code(500);
    echo json_encode(["error" => "DB connection failed"]);
    exit();
}

// --- Query roles ---
$result = $conn->query("SELECT * FROM user_role_list ORDER BY role_id ASC");

$roles = [];
while ($row = $result->fetch_assoc()) {
    $roles[] = $row;
}

echo json_encode($roles);