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
$name = isset($input['name']) ? trim($input['name']) : null;
$address = isset($input['address']) ? trim($input['address']) : null;
$phone = isset($input['phone']) ? trim($input['phone']) : null;
$description = isset($input['description']) ? trim($input['description']) : null;
$assigned_employee_id = array_key_exists('assigned_employee_id', $input) && $input['assigned_employee_id'] !== "" ? trim($input['assigned_employee_id']) : null;

// check branch exists
$stmt = $conn->prepare("SELECT assigned_employee_id FROM branches WHERE branch_id = ? LIMIT 1");
$stmt->bind_param("i", $branch_id);
$stmt->execute();
$res = $stmt->get_result();
if ($res->num_rows === 0) {
    echo json_encode(["success" => false, "message" => "Branch not found."]);
    $stmt->close();
    $conn->close();
    exit;
}
$current = $res->fetch_assoc();
$stmt->close();

// if assigned_employee_id provided, ensure employee exists
if ($assigned_employee_id !== null) {
    $s = $conn->prepare("SELECT 1 FROM employees WHERE employee_id = ? LIMIT 1");
    $s->bind_param("s", $assigned_employee_id);
    $s->execute();
    $r = $s->get_result();
    if ($r->num_rows === 0) {
        echo json_encode(["success" => false, "message" => "Assigned employee_id not found."]);
        $s->close();
        $conn->close();
        exit;
    }
    $s->close();
}

// Build dynamic update query (only update provided fields)
$fields = [];
$types = "";
$params = [];

if ($name !== null) { $fields[] = "name = ?"; $types .= "s"; $params[] = $name; }
if ($address !== null) { $fields[] = "address = ?"; $types .= "s"; $params[] = $address; }
if ($phone !== null) { $fields[] = "phone = ?"; $types .= "s"; $params[] = $phone; }
if ($description !== null) { $fields[] = "description = ?"; $types .= "s"; $params[] = $description; }
if (array_key_exists('assigned_employee_id', $input)) { $fields[] = "assigned_employee_id = ?"; $types .= "s"; $params[] = $assigned_employee_id; }

$fields[] = "updated_at = NOW()";

if (count($fields) === 1) { // only updated_at
    echo json_encode(["success" => false, "message" => "No updatable fields provided."]);
    $conn->close();
    exit;
}

$sql = "UPDATE branches SET " . implode(", ", $fields) . " WHERE branch_id = ?";
$types .= "i";
$params[] = $branch_id;

$stmt = $conn->prepare($sql);
$bind_names[] = $types;
for ($i=0;$i<count($params);$i++) {
    $bind_name = 'bind' . $i;
    $$bind_name = $params[$i];
    $bind_names[] = &$$bind_name;
}
// call_user_func_array expects parameters by reference
call_user_func_array(array($stmt, 'bind_param'), $bind_names);

if ($stmt->execute()) {
    // If assigned_employee_id changed, optionally update employees.branch_id for previous and new manager to keep consistency.
    if (array_key_exists('assigned_employee_id', $input)) {
        $old_emp = $current['assigned_employee_id'];
        $new_emp = $assigned_employee_id;

        // clear old manager's branch_id if they pointed to this branch (avoid wiping if they belong to other branch)
        if ($old_emp !== null && $old_emp !== "" && ($new_emp === null || $new_emp === "" || $old_emp !== $new_emp)) {
            $u1 = $conn->prepare("UPDATE employees SET branch_id = NULL WHERE employee_id = ? AND branch_id = ?");
            $u1->bind_param("si", $old_emp, $branch_id);
            $u1->execute();
            $u1->close();
        }

        // set new manager's branch_id to this branch
        if ($new_emp !== null && $new_emp !== "") {
            $u2 = $conn->prepare("UPDATE employees SET branch_id = ? WHERE employee_id = ?");
            $u2->bind_param("is", $branch_id, $new_emp);
            $u2->execute();
            $u2->close();
        }
    }

    echo json_encode(["success" => true, "message" => "Branch updated."]);
} else {
    echo json_encode(["success" => false, "message" => "Update failed: " . $stmt->error]);
}

$stmt->close();
$conn->close();
