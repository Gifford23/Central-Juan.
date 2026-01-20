<?php
// header("Access-Control-Allow-Origin: *");
// header("Access-Control-Allow-Methods: POST, OPTIONS");
// header("Access-Control-Allow-Headers: Content-Type");
// header("Content-Type: application/json");

// Enable detailed error reporting for debugging
error_reporting(E_ALL);
ini_set("display_errors", 1);

include_once "../../server/connection.php"; // Ensure this file exists and is correct
include("../../server/cors.php");

$data = json_decode(file_get_contents("php://input"), true);

if (!$data || !isset($data["id"]) || !isset($data["ph_id"])) {
    echo json_encode(["success" => false, "message" => "Invalid input"]);
    exit;
}

$id = intval($data["id"]);
$ph_id = $data["ph_id"];

$query = "UPDATE philhealth_contribution SET ph_id = ? WHERE PH_contribution_id = ?";
$stmt = $conn->prepare($query);

if (!$stmt) {
    echo json_encode(["success" => false, "message" => "Statement preparation failed", "error" => $conn->error]);
    exit;
}

$stmt->bind_param("si", $ph_id, $id);

if ($stmt->execute()) {
    echo json_encode(["success" => true, "message" => "PH Number updated successfully"]);
} else {
    echo json_encode(["success" => false, "message" => "Failed to update PH Number", "error" => $stmt->error]);
}

$stmt->close();
$conn->close();
?>
