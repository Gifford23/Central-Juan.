<?php

// header('Access-Control-Allow-Origin: *');
// header('Access-Control-Allow-Methods: POST');
// header('Access-Control-Allow-Headers: Content-Type, Authorization');

require_once '../server/connection.php';
include("../server/cors.php");

// Get the input data
$data = json_decode(file_get_contents("php://input"), true);

$holiday_name = $data['holiday_name'] ?? null;
$holiday_date = $data['holiday_date'] ?? null;
$credited_days = $data['credited_days'] ?? 1; // Default to 1
$holiday_type = $data['holiday_type'] ?? 'Regular'; // Default to Regular

if ($holiday_name && $holiday_date) {
    // Validate and format date
    $formattedDate = date('Y-m-d', strtotime($holiday_date));
    if (!$formattedDate || $formattedDate === '1970-01-01') {
        echo json_encode(["success" => false, "message" => "Invalid holiday_date format"]);
        exit;
    }

    $stmt = $conn->prepare("INSERT INTO philippine_holidays (holiday_name, holiday_date, credited_days, holiday_type) VALUES (?, ?, ?, ?)");
    $stmt->bind_param("ssis", $holiday_name, $formattedDate, $credited_days, $holiday_type);

    if ($stmt->execute()) {
        echo json_encode(["success" => true, "message" => "Holiday added successfully."]);
    } else {
        echo json_encode(["success" => false, "message" => "Failed to add holiday."]);
    }

    $stmt->close();
} else {
    echo json_encode(["success" => false, "message" => "Invalid input. Holiday name and date are required."]);
}

$conn->close();
?>
