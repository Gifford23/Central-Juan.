<?php
include("../../server/cors.php");
include("../../server/connection.php");

$data = json_decode(file_get_contents("php://input"), true);

$id = $data['id'] ?? null;
$email = $data['hr_email'] ?? null;
$label = $data['label'] ?? null;
$is_active = isset($data['is_active']) ? strtolower(trim($data['is_active'])) : 'active';
if (!in_array($is_active, ['active', 'inactive'])) {
    $is_active = 'active';
}

if (!$id || !$email) {
    echo json_encode(["success" => false, "message" => "ID and Email are required."]);
    exit;
}

$stmt = $conn->prepare("UPDATE email_settings SET hr_email=?, label=?, is_active=? WHERE id=?");
$stmt->bind_param("sssi", $email, $label, $is_active, $id);

if ($stmt->execute()) {
    echo json_encode(["success" => true, "message" => "Email updated successfully"]);
} else {
    echo json_encode(["success" => false, "message" => "Failed to update email"]);
}

$stmt->close();
$conn->close();
