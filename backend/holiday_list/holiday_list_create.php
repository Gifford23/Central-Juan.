<?php
// holiday_list_create.php
// header('Access-Control-Allow-Origin: *');
// header('Access-Control-Allow-Methods: POST, OPTIONS');
// header('Access-Control-Allow-Headers: Content-Type, Authorization');
// header('Content-Type: application/json');

require_once '../server/connection.php';
include("../server/cors.php");

// Decode incoming JSON
$input = file_get_contents("php://input");
$data = json_decode($input);

if (json_last_error() !== JSON_ERROR_NONE) {
    echo json_encode(["success" => false, "message" => "Invalid JSON input."]);
    exit;
}

// Validate required fields
if (
    !isset($data->holiday_name) ||
    !isset($data->holiday_date) || // expected as MM-DD
    !isset($data->credit_day)
) {
    echo json_encode(["success" => false, "message" => "Missing required fields."]);
    exit;
}

$holiday_name = trim($data->holiday_name);
$holiday_day = trim($data->holiday_date); // format: MM-DD
$credit_day = floatval($data->credit_day);

// Optional: holiday_year
$holiday_year = isset($data->holiday_year) && is_numeric($data->holiday_year)
    ? intval($data->holiday_year)
    : null;

// Validate holiday_day format
if (!preg_match('/^\d{2}-\d{2}$/', $holiday_day)) {
    echo json_encode(["success" => false, "message" => "Invalid date format. Use MM-DD."]);
    exit;
}

// Build full date: YYYY-MM-DD
$year = $holiday_year ? $holiday_year : 0001; // Default year for recurring holidays
$holiday_date = sprintf('%04d-%s', $year, $holiday_day);

// Normalize holiday_type
$allowed_types = [
    'Regular' => 'Regular',
    'Special Non-Working' => 'Special Non-Working',
    'Special Working' => 'Special Working'
];

$holiday_type_input = isset($data->holiday_type)
    ? trim(ucwords(strtolower($data->holiday_type)))
    : 'Regular';

$holiday_type = $allowed_types[$holiday_type_input] ?? 'Regular';

// Insert into database
if ($holiday_year === null) {
    $stmt = $conn->prepare("INSERT INTO holidays_list (holiday_name, holiday_date, credit_day, holiday_type) VALUES (?, ?, ?, ?)");
    $stmt->bind_param("ssds", $holiday_name, $holiday_date, $credit_day, $holiday_type);
} else {
    $stmt = $conn->prepare("INSERT INTO holidays_list (holiday_name, holiday_date, credit_day, holiday_type, holiday_year) VALUES (?, ?, ?, ?, ?)");
    $stmt->bind_param("ssdsi", $holiday_name, $holiday_date, $credit_day, $holiday_type, $holiday_year);
}

// Execute and respond
if ($stmt->execute()) {
    echo json_encode(["success" => true, "message" => "Holiday added successfully."]);
} else {
    echo json_encode(["success" => false, "message" => "Failed to add holiday."]);
}

$stmt->close();
$conn->close();
?>
