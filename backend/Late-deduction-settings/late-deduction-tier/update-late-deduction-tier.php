<?php
include("../../server/cors.php");

include '../../server/connection.php';

// Full CORS Headers

$data = json_decode(file_get_contents("php://input"));

if (!empty($data->id) && !empty($data->tier_name)) {
    $stmt = $conn->prepare("UPDATE late_deduction_tier SET tier_name = ?, description = ? WHERE id = ?");
    $stmt->bind_param("ssi", $data->tier_name, $data->description, $data->id);

    if ($stmt->execute()) {
        echo json_encode(["success" => true, "message" => "Tier updated successfully"]);
    } else {
        echo json_encode(["success" => false, "message" => "Failed to update tier"]);
    }
    $stmt->close();
} else {
    echo json_encode(["success" => false, "message" => "ID and Tier name are required"]);
}

$conn->close();
?>
