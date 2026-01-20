<?php
include('../server/cors.php');
include('../server/connection.php');

// Expect POST JSON or form-data: employee_id, amount, payroll_cutoff (YYYY-MM-DD), reward_rule_id (optional), description (optional), origin (optional), created_by (optional), payroll_id (optional)
$data = json_decode(file_get_contents('php://input'), true);
if (!$data) $data = $_POST;

$employee_id = $conn->real_escape_string($data['employee_id'] ?? '');
$amount = isset($data['amount']) ? (float)$data['amount'] : 0.00;
$payroll_cutoff = isset($data['payroll_cutoff']) ? $conn->real_escape_string($data['payroll_cutoff']) : NULL;
$reward_rule_id = isset($data['reward_rule_id']) ? (int)$data['reward_rule_id'] : NULL;
$description = isset($data['description']) ? $conn->real_escape_string($data['description']) : NULL;
$origin = isset($data['origin']) ? $conn->real_escape_string($data['origin']) : 'manual';
$created_by = isset($data['created_by']) ? $conn->real_escape_string($data['created_by']) : NULL;
$payroll_id = isset($data['payroll_id']) ? (int)$data['payroll_id'] : NULL;

if (empty($employee_id) || $amount <= 0) {
    echo json_encode(['success' => false, 'message' => 'employee_id and positive amount required']);
    $conn->close();
    exit;
}

$sql = "INSERT INTO reward_journal_entry (payroll_id, employee_id, reward_rule_id, amount, payroll_cutoff, origin, description, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?)";
$stmt = $conn->prepare($sql);
$stmt->bind_param("isidssss", $payroll_id, $employee_id, $reward_rule_id, $amount, $payroll_cutoff, $origin, $description, $created_by);

if ($stmt->execute()) {
    echo json_encode(['success' => true, 'journal_id' => $stmt->insert_id]);
} else {
    echo json_encode(['success' => false, 'error' => $stmt->error]);
}

$stmt->close();
$conn->close();
?>
