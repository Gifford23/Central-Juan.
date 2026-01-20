<?php

// header('Access-Control-Allow-Origin: *');
// header('Access-Control-Allow-Methods: DELETE');
// header('Access-Control-Allow-Headers: Content-Type, Authorization');

require_once '../server/connection.php'; // Adjust path based on your folder structure
include("../server/cors.php");

// Get the input data
$data = json_decode(file_get_contents("php://input"), true);
$id = $data['id'] ?? null;

if ($id) {
    $stmt = $conn->prepare("DELETE FROM philippine_holidays WHERE id = ?");
    $stmt->bind_param("i", $id);

    if ($stmt->execute()) {
        if ($stmt->affected_rows > 0) {
            echo json_encode(["success" => true, "message" => "Holiday deleted successfully."]);
        } else {
            echo json_encode(["success" => false, "message" => "No holiday found with that ID."]);
        }
    } else {
        echo json_encode(["success" => false, "message" => "Failed to delete holiday."]);
    }

    $stmt->close();
} else {
    echo json_encode(["success" => false, "message" => "Invalid input."]);
}

$conn->close();
?>