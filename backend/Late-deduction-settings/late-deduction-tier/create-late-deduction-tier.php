<?php
include("../../server/cors.php");

include '../../server/connection.php';

// Full CORS Headers

$data = json_decode(file_get_contents("php://input"));

if (!empty($data->tier_name)) {
    $stmt = $conn->prepare("INSERT INTO late_deduction_tier (tier_name, description) VALUES (?, ?)");
    $stmt->bind_param("ss", $data->tier_name, $data->description);
    
    if ($stmt->execute()) {
        echo json_encode(["success" => true, "message" => "Tier created successfully", "id" => $conn->insert_id]);
    } else {
        echo json_encode(["success" => false, "message" => "Failed to create tier"]);
    }
    $stmt->close();
} else {
    echo json_encode(["success" => false, "message" => "Tier name is required"]);
}

$conn->close();
?>
