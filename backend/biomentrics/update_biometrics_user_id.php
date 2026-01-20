<?php
require __DIR__ . '/../server/cors.php';
require __DIR__ . '/../server/connection.php';

header("Content-Type: application/json; charset=UTF-8");

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(["error" => "Only POST allowed"]);
    exit;
}

$data = json_decode(file_get_contents("php://input"), true);

$old_id = $data['old_user_id'] ?? null;
$new_id = $data['new_user_id'] ?? null;

if (!$old_id || !$new_id) {
    http_response_code(400);
    echo json_encode(["error" => "Missing old_user_id or new_user_id"]);
    exit;
}

// SQL: UPDATE user_id only
$sql = "UPDATE users SET user_id = ? WHERE user_id = ?";
$stmt = $conn->prepare($sql);
$stmt->bind_param("ss", $new_id, $old_id);

if ($stmt->execute()) {
    echo json_encode(["success" => true, "message" => "Biometrics User ID updated"]);
} else {
    echo json_encode(["success" => false, "error" => "Failed to update user"]);
}

$stmt->close();
$conn->close();
