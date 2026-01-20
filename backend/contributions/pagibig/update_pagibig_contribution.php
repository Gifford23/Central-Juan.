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

// Log the input data for debugging
error_log(print_r($data, true));

if (!$data || !isset($data["id"]) || !isset($data["pagibig_ID"])) {
    echo json_encode(["success" => false, "message" => "Invalid input"]);
    exit;
}

$id = intval($data["id"]);
$pagibig_ID = $data["pagibig_ID"];

$query = "UPDATE pagibig_contribution SET pagibig_ID = ? WHERE pagibig_contribution_id = ?";
$stmt = $conn->prepare($query);

if (!$stmt) {
    echo json_encode(["success" => false, "message" => "Statement preparation failed", "error" => $conn->error]);
    exit;
}

$stmt->bind_param("si", $pagibig_ID, $id);

if ($stmt->execute()) {
    echo json_encode(["success" => true, "message" => "PAG-IBIG ID updated successfully"]);
} else {
    echo json_encode(["success" => false, "message" => "Failed to update PAG-IBIG ID", "error" => $stmt->error]);
}

$stmt->close();
$conn->close();
?>