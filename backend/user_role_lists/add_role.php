<?php
include "../server/cors.php";

include '../server/connection.php';

$data = json_decode(file_get_contents("php://input"), true);

if (!isset($data['role_name']) || trim($data['role_name']) === "") {
    http_response_code(400);
    echo json_encode(["error" => "Role name is required"]);
    exit;
}

$role_name = trim($data['role_name']);

$stmt = $conn->prepare("INSERT INTO user_role_list (role_name) VALUES (?)");
$stmt->bind_param("s", $role_name);

if ($stmt->execute()) {
    echo json_encode(["success" => true, "role_id" => $stmt->insert_id]);
} else {
    http_response_code(500);
    echo json_encode(["error" => "Insert failed"]);
}