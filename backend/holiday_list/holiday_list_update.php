<?php
// holiday_list_update.php
// header('Access-Control-Allow-Origin: *');
// header('Access-Control-Allow-Methods: POST, OPTIONS');
// header('Access-Control-Allow-Headers: Content-Type, Authorization');

require_once '../server/connection.php';
include("../server/cors.php");


$data = json_decode(file_get_contents("php://input"));

if (!isset($data->holiday_id)) {
    echo json_encode(["success" => false, "message" => "Missing holiday_id."]);
    exit;
}

$holiday_id = intval($data->holiday_id);
$holiday_name = trim($data->holiday_name ?? '');
$holiday_date = trim($data->holiday_date ?? '');
$credit_day = floatval($data->credit_day ?? 0.0);
$holiday_type = trim($data->holiday_type ?? 'Regular');

// Input validation (optional but recommended)
$allowed_types = ['Regular', 'Special Non-Working', 'Special Working'];
if (!in_array($holiday_type, $allowed_types)) {
    echo json_encode(["success" => false, "message" => "Invalid holiday_type."]);
    exit;
}

// Normalize date: if format is MM-DD, prefix with year 0000
if (preg_match('/^\d{2}-\d{2}$/', $holiday_date)) {
    $holiday_date = '0000-' . $holiday_date;
}

$sql = "UPDATE holidays_list 
        SET holiday_name = ?, 
            holiday_date = ?, 
            credit_day = ?, 
            holiday_type = ?
        WHERE holiday_id = ?";

$stmt = $conn->prepare($sql);
$stmt->bind_param("ssdsi", $holiday_name, $holiday_date, $credit_day, $holiday_type, $holiday_id);

if ($stmt->execute()) {
    echo json_encode(["success" => true, "message" => "Holiday updated successfully."]);
} else {
    echo json_encode(["success" => false, "message" => "Failed to update holiday.", "error" => $stmt->error]);
}

$stmt->close();
$conn->close();
?>
