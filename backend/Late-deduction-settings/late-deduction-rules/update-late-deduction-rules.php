<?php
include '../../server/connection.php';

include "../../server/cors.php";

$data = json_decode(file_get_contents("php://input"), true);

if (isset($data['id'])) {
    $id = $data['id'];
    $tier_id = $data['tier_id'];
    $min_minutes = $data['min_minutes'];
    $max_minutes = isset($data['max_minutes']) ? $data['max_minutes'] : null;
    $deduction_type = $data['deduction_type'];
    $deduction_value = $data['deduction_value'];
    $description = isset($data['description']) ? $data['description'] : null;

    $sql = "UPDATE late_deduction 
            SET tier_id = ?, min_minutes = ?, max_minutes = ?, deduction_type = ?, deduction_value = ?, description = ? 
            WHERE id = ?";
    $stmt = $conn->prepare($sql);
    $stmt->bind_param("iiisdsi", $tier_id, $min_minutes, $max_minutes, $deduction_type, $deduction_value, $description, $id);

    if ($stmt->execute()) {
        echo json_encode(["success" => true]);
    } else {
        echo json_encode(["success" => false, "message" => $stmt->error]);
    }
} else {
    echo json_encode(["success" => false, "message" => "Missing rule ID"]);
}
?>
