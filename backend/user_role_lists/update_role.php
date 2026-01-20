<?php
include "../server/cors.php";
include '../server/connection.php';

$data = json_decode(file_get_contents("php://input"), true);

if (!isset($data['role_id']) || !isset($data['role_name'])) {
    http_response_code(400);
    echo json_encode(["error" => "role_id and role_name are required"]);
    exit;
}

$id = intval($data['role_id']);
$role_name = trim($data['role_name']);

$stmt = $conn->prepare("UPDATE user_role_list SET role_name=? WHERE role_id=?");
$stmt->bind_param("si", $role_name, $id);

if ($stmt->execute()) {
    echo json_encode(["success" => true]);
} else {
    http_response_code(500);
    echo json_encode(["error" => "Update failed"]);
}
