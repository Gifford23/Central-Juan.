<?php
// header('Access-Control-Allow-Origin: *');
// header('Access-Control-Allow-Methods: POST, OPTIONS');
// header('Access-Control-Allow-Headers: Content-Type, Authorization');
include("../server/cors.php");

require_once '../server/connection.php';

$data = json_decode(file_get_contents("php://input"), true);

if (!$data) {
    echo json_encode(['success' => false, 'message' => 'Invalid input']);
    exit;
}

$name = $data['name'] ?? '';
$date = $data['holiday_date'] ?? '';
$isRecurring = $data['is_recurring'] ?? false;
$defaultMultiplier = $data['default_multiplier'] ?? 1.00;
$applyMultiplier = $data['apply_multiplier'] ?? true;
$extendedUntil = $data['extended_until'] ?? null;
$holidayType = $data['holiday_type'] ?? 'Regular';
$otMultiplier = $data['ot_multiplier'] ?? 1.00;

$query = "INSERT INTO holidays (name, holiday_date, is_recurring, default_multiplier, apply_multiplier, ot_multiplier, extended_until, holiday_type)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)";
$stmt = $conn->prepare($query);
$stmt->bind_param("ssidddss", $name, $date, $isRecurring, $defaultMultiplier, $applyMultiplier, $otMultiplier, $extendedUntil, $holidayType);

if ($stmt->execute()) {
    echo json_encode(['success' => true, 'message' => 'Holiday created successfully']);
} else {
    echo json_encode(['success' => false, 'message' => 'Failed to create holiday']);
}

$stmt->close();
$conn->close();
?>
