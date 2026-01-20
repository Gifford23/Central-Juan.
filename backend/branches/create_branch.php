<?php
include("../server/cors.php");
require_once '../server/connection.php';
header('Content-Type: application/json');

// read JSON input
$input = json_decode(file_get_contents('php://input'), true);
if (!$input) {
    echo json_encode(["success" => false, "message" => "Invalid JSON input."]);
    exit;
}

// required field
if (empty($input['name'])) {
    echo json_encode(["success" => false, "message" => "Branch name is required."]);
    exit;
}

$name = trim($input['name']);
$address = isset($input['address']) ? trim($input['address']) : null;
$phone = isset($input['phone']) ? trim($input['phone']) : null;
$description = isset($input['description']) ? trim($input['description']) : null;
$assigned_employee_id = isset($input['assigned_employee_id']) && $input['assigned_employee_id'] !== "" ? trim($input['assigned_employee_id']) : null;

// optional: validate that branch_id is auto-increment on the DB side
// (we assume your branches.branch_id is AUTO_INCREMENT as requested)

// if assigned_employee_id provided, ensure that employee exists
if ($assigned_employee_id !== null) {
    $stmt = $conn->prepare("SELECT 1 FROM employees WHERE employee_id = ? LIMIT 1");
    $stmt->bind_param("s", $assigned_employee_id);
    $stmt->execute();
    $res = $stmt->get_result();
    if ($res->num_rows === 0) {
        echo json_encode(["success" => false, "message" => "Assigned employee_id not found."]);
        $stmt->close();
        $conn->close();
        exit;
    }
    $stmt->close();
}

// Insert branch
$stmt = $conn->prepare("INSERT INTO branches (name, address, phone, description, assigned_employee_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?, NOW(), NOW())");
$stmt->bind_param("sssss", $name, $address, $phone, $description, $assigned_employee_id);

if ($stmt->execute()) {
    $new_branch_id = $stmt->insert_id;

    // Optionally set the employee's branch_id to this branch (keep data consistent).
    if ($assigned_employee_id !== null) {
        $u = $conn->prepare("UPDATE employees SET branch_id = ? WHERE employee_id = ?");
        $u->bind_param("is", $new_branch_id, $assigned_employee_id);
        $u->execute();
        $u->close();
    }

    echo json_encode(["success" => true, "message" => "Branch created.", "branch_id" => $new_branch_id]);
} else {
    echo json_encode(["success" => false, "message" => "Insert failed: " . $stmt->error]);
}

$stmt->close();
$conn->close();
