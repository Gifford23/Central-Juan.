<?php
// header("Access-Control-Allow-Origin: *");
// header("Access-Control-Allow-Methods: POST, OPTIONS");
// header("Access-Control-Allow-Headers: Content-Type");
// header("Content-Type: application/json");

// Enable detailed error reporting for debugging
error_reporting(E_ALL);
ini_set("display_errors", 1);
include("../../server/cors.php");

include_once "../../server/connection.php"; // Ensure this file exists and is correct

$data = json_decode(file_get_contents("php://input"), true);

if (!$data || !isset($data["id"]) || !isset($data["sss_number"])) {
    echo json_encode(["success" => false, "message" => "Invalid input"]);
    exit;
}

$id = intval($data["id"]);
$sss_number = $data["sss_number"];

$query = "UPDATE sss_contribution SET sss_number = ? WHERE SSS_Contribution_id = ?";
$stmt = $conn->prepare($query);

if (!$stmt) {
    echo json_encode(["success" => false, "message" => "Statement preparation failed", "error" => $conn->error]);
    exit;
}

$stmt->bind_param("si", $sss_number, $id);

if ($stmt->execute()) {
    echo json_encode(["success" => true, "message" => "SSS Number updated successfully"]);
} else {
    echo json_encode(["success" => false, "message" => "Failed to update SSS Number", "error" => $stmt->error]);
}

$stmt->close();
$conn->close();
?>
