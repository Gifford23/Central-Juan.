<?php
// header('Access-Control-Allow-Origin: *');
// header('Access-Control-Allow-Methods: POST, OPTIONS');
// header('Access-Control-Allow-Headers: Content-Type, Authorization');
include("../server/cors.php");

require_once '../server/connection.php';

$data = json_decode(file_get_contents("php://input"), true);

if (!$data || !isset($data['holiday_id'])) {
    echo json_encode(['success' => false, 'message' => 'Missing holiday ID or data']);
    exit;
}

$id = $data['holiday_id'];
$name = $data['name'] ?? '';
$date = $data['holiday_date'] ?? '';
$isRecurring = $data['is_recurring'] ?? false;
$defaultMultiplier = $data['default_multiplier'] ?? 1.00;
$applyMultiplier = $data['apply_multiplier'] ?? true;
$extendedUntil = $data['extended_until'] ?? null;
$holidayType = $data['holiday_type'] ?? 'Regular';
$otMultiplier = $data['ot_multiplier'] ?? 1.00;

$query = "UPDATE holidays
          SET name = ?, holiday_date = ?, is_recurring = ?, default_multiplier = ?, apply_multiplier = ?, ot_multiplier = ?, extended_until = ?, holiday_type = ?
          WHERE holiday_id = ?";
$stmt = $conn->prepare($query);
$stmt->bind_param("ssidddssi", $name, $date, $isRecurring, $defaultMultiplier, $applyMultiplier, $otMultiplier, $extendedUntil, $holidayType, $id);

if ($stmt->execute()) {
    echo json_encode(['success' => true, 'message' => 'Holiday updated successfully']);
} else {
    echo json_encode(['success' => false, 'message' => 'Failed to update holiday']);
}

$stmt->close();
$conn->close();
?>
