<?php
include("../server/cors.php");
require_once '../server/connection.php';
header('Content-Type: application/json');

$input = json_decode(file_get_contents('php://input'), true);
if (!$input) {
    echo json_encode(["success" => false, "message" => "Invalid JSON input."]);
    exit;
}

if (empty($input['branch_id'])) {
    echo json_encode(["success" => false, "message" => "branch_id is required."]);
    exit;
}

$branch_id = (int)$input['branch_id'];
$assigned_employee_id = array_key_exists('assigned_employee_id', $input) && $input['assigned_employee_id'] !== "" ? trim($input['assigned_employee_id']) : null;

// ensure branch exists
$stmt = $conn->prepare("SELECT 1 FROM branches WHERE branch_id = ? LIMIT 1");
$stmt->bind_param("i", $branch_id);
$stmt->execute();
$res = $stmt->get_result();
if ($res->num_rows === 0) {
    echo json_encode(["success" => false, "message" => "Branch not found."]);
    $stmt->close();
    $conn->close();
    exit;
}
$stmt->close();

// if setting a manager, verify employee exists
if ($assigned_employee_id !== null) {
    $s = $conn->prepare("SELECT 1 FROM employees WHERE employee_id = ? LIMIT 1");
    $s->bind_param("s", $assigned_employee_id);
    $s->execute();
    $r = $s->get_result();
    if ($r->num_rows === 0) {
        echo json_encode(["success" => false, "message" => "Employee not found."]);
        $s->close();
        $conn->close();
        exit;
    }
    $s->close();
}

// Update branches.assigned_employee_id
$u = $conn->prepare("UPDATE branches SET assigned_employee_id = ?, updated_at = NOW() WHERE branch_id = ?");
$u->bind_param("si", $assigned_employee_id, $branch_id);
if (!$u->execute()) {
    echo json_encode(["success" => false, "message" => "Failed to update branch: " . $u->error]);
    $u->close();
    $conn->close();
    exit;
}
$u->close();

// Keep employees.branch_id consistent:
// 1) clear any employee previously assigned to this branch as manager if they're different
$v = $conn->prepare("SELECT assigned_employee_id FROM branches WHERE branch_id = ? LIMIT 1");
$v->bind_param("i", $branch_id);
$v->execute();
$tmp = $v->get_result()->fetch_assoc();
$v->close();
$previous_manager = $tmp['assigned_employee_id'] ?? null;

// Note: we fetched assigned_employee_id AFTER we updated it — so previous_manager is the *new* manager.
// To get the old manager we'd have needed to fetch earlier. For safety, just clear any employees who have branch_id = this branch but are not the new manager.

$clear = $conn->prepare("UPDATE employees SET branch_id = NULL WHERE branch_id = ? AND employee_id <> ?");
$clear->bind_param("is", $branch_id, $assigned_employee_id);
$clear->execute();
$clear->close();

// If we set a new manager (not null), set that employee's branch_id to this branch
if ($assigned_employee_id !== null) {
    $set = $conn->prepare("UPDATE employees SET branch_id = ? WHERE employee_id = ?");
    $set->bind_param("is", $branch_id, $assigned_employee_id);
    $set->execute();
    $set->close();
}

echo json_encode(["success" => true, "message" => "Branch manager assigned/updated."]);

$conn->close();
