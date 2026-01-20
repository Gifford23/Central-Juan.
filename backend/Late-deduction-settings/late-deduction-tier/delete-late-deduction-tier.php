<?php
include("../../server/cors.php");

include '../../server/connection.php';

// Full CORS Headers

$data = json_decode(file_get_contents("php://input"));

if (!empty($data->id)) {
    // Delete tier (rules + mappings will be cascade-deleted if FK is set)
    $stmt = $conn->prepare("DELETE FROM late_deduction_tier WHERE id = ?");
    $stmt->bind_param("i", $data->id);

    if ($stmt->execute()) {
        echo json_encode(["success" => true, "message" => "Tier deleted successfully"]);
    } else {
        echo json_encode(["success" => false, "message" => "Failed to delete tier"]);
    }
    $stmt->close();
} else {
    echo json_encode(["success" => false, "message" => "Tier ID is required"]);
}

$conn->close();
?>
