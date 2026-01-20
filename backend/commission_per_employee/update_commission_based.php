<?php
include("../server/cors.php");
include("../server/connection.php");

$data = json_decode(file_get_contents("php://input"), true);

$employee_id = $data['employee_id'] ?? null;
$date_from = $data['date_from'] ?? null;
$date_until = $data['date_until'] ?? null;
$commission_based = $data['commission_based'] ?? null;

if (!$employee_id || !$date_from || !$date_until || !in_array($commission_based, ['yes', 'no'])) {
    echo json_encode([
        "success" => false,
        "message" => "Invalid parameters"
    ]);
    exit;
}

$sql = "
  UPDATE payroll
  SET commission_based = ?
  WHERE employee_id = ?
    AND date_from >= ?
    AND date_until <= ?
";

$stmt = $conn->prepare($sql);
$stmt->bind_param(
    "ssss",
    $commission_based,
    $employee_id,
    $date_from,
    $date_until
);

if ($stmt->execute()) {
    echo json_encode([
        "success" => true,
        "affected_rows" => $stmt->affected_rows
    ]);
} else {
    echo json_encode([
        "success" => false,
        "message" => $stmt->error
    ]);
}

$stmt->close();
$conn->close();
