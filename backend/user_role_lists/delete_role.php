<?php
include "../server/cors.php";

include '../server/connection.php';

$data = json_decode(file_get_contents("php://input"), true);

if (!isset($data['role_id'])) {
    http_response_code(400);
    echo json_encode(["error" => "role_id is required"]);
    exit;
}

$id = intval($data['role_id']);

$stmt = $conn->prepare("DELETE FROM user_role_list WHERE role_id=?");
$stmt->bind_param("i", $id);

if ($stmt->execute()) {
    echo json_encode(["success" => true]);
} else {
    http_response_code(500);
    echo json_encode(["error" => "Delete failed"]);
}
