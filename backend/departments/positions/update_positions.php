<?php
error_reporting(E_ALL);
ini_set('display_errors', 1);

include("../../server/cors.php");
include('../../server/connection.php');

$data = json_decode(file_get_contents("php://input"), true);

if ($_SERVER['REQUEST_METHOD'] === 'PUT') {
    if (!empty($data['position_id']) && !empty($data['position_name'])) {
        $position_id = $conn->real_escape_string($data['position_id']);
        $new_position_id = !empty($data['new_position_id']) 
            ? $conn->real_escape_string($data['new_position_id']) 
            : $position_id; // fallback if not provided
        $position_name = $conn->real_escape_string($data['position_name']);
    
        $sql = "UPDATE `positions` 
                SET `position_id` = '$new_position_id', `position_name` = '$position_name' 
                WHERE `position_id` = '$position_id'";

        if ($conn->query($sql) === TRUE) {
            echo json_encode(["status" => "success", "message" => "Position updated successfully"]);
        } else {
            echo json_encode(["status" => "error", "message" => "Error updating position: " . $conn->error]);
        }
    } else {
        echo json_encode(["status" => "error", "message" => "Invalid position data"]);
    }
} else {
    echo json_encode(["status" => "error", "message" => "Invalid request method"]);
}

$conn->close();
?>
