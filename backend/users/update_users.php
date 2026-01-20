<?php
include '../server/connection.php';
include("../server/cors.php");

header('Content-Type: application/json');

$data = json_decode(file_get_contents("php://input"), true);

if (!isset($data['user_id'], $data['role'], $data['status'])) {
    echo json_encode([
        "success" => false,
        "message" => "Missing required fields"
    ]);
    exit;
}

$user_id = intval($data['user_id']);
$role = $data['role'];
$status = $data['status'];

try {
    $query = "UPDATE users SET role = ?, status = ? WHERE user_id = ?";
    $stmt = $conn->prepare($query);
    $stmt->bind_param("ssi", $role, $status, $user_id);

    if ($stmt->execute()) {
        echo json_encode([
            "success" => true,
            "message" => "User updated successfully"
        ]);
    } else {
        echo json_encode([
            "success" => false,
            "message" => "Failed to update user"
        ]);
    }
} catch (Exception $e) {
    echo json_encode([
        "success" => false,
        "message" => $e->getMessage()
    ]);
}
?>
