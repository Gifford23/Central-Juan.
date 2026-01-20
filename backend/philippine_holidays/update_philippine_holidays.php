<?php

// header('Access-Control-Allow-Origin: *');
// header('Access-Control-Allow-Methods: PUT');
// header('Access-Control-Allow-Headers: Content-Type, Authorization');

require_once '../server/connection.php'; // Adjust path based on your folder structure
include("../server/cors.php");

// Get the input data
$data = json_decode(file_get_contents("php://input"), true);
$id = $data['id'] ?? null;
$holiday_name = $data['holiday_name'] ?? null;
$holiday_date = $data['holiday_date'] ?? null;
$credited_days = $data['credited_days'] ?? null;
$holiday_type = $data['holiday_type'] ?? null;

if ($id && ($holiday_name || $holiday_date || $credited_days || $holiday_type)) {
    $query = "UPDATE philippine_holidays SET ";
    $params = [];
    $types = "";

    if ($holiday_name) {
        $query .= "holiday_name = ?, ";
        $params[] = $holiday_name;
        $types .= "s";
    }
    if ($holiday_date) {
        $query .= "holiday_date = ?, ";
        $params[] = $holiday_date;
        $types .= "s";
    }
    if ($credited_days !== null) {
        $query .= "credited_days = ?, ";
        $params[] = $credited_days;
        $types .= "i";
    }
    if ($holiday_type) {
        $query .= "holiday_type = ?, ";
        $params [] = $holiday_type;
        $types .= "s";
    }

    $query = rtrim($query, ", ") . " WHERE id = ?";
    $params[] = $id;
    $types .= "i";

    $stmt = $conn->prepare($query);
    $stmt->bind_param($types, ...$params);

    if ($stmt->execute()) {
        echo json_encode(["success" => true, "message" => "Holiday updated successfully."]);
    } else {
        echo json_encode(["success" => false, "message" => "Failed to update holiday."]);
    }

    $stmt->close();
} else {
    echo json_encode(["success" => false, "message" => "Invalid input."]);
}

$conn->close();
?>