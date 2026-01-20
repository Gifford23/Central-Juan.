<?php
// branches/assign_employee.php
include("../server/cors.php");
require_once '../server/connection.php';
header('Content-Type: application/json; charset=utf-8');

try {
    // Accept JSON or form POST
    $input = json_decode(file_get_contents('php://input'), true);
    $branch_id = isset($input['branch_id']) ? (int)$input['branch_id'] : (isset($_POST['branch_id']) ? (int)$_POST['branch_id'] : null);
    $employee_id = isset($input['employee_id']) ? $input['employee_id'] : (isset($_POST['employee_id']) ? $_POST['employee_id'] : null);

    if ($branch_id === null || $branch_id <= 0) throw new Exception("branch_id is required and must be positive.");
    if (empty($employee_id)) throw new Exception("employee_id is required.");

    // Start transaction
    $conn->begin_transaction();

    // 1) Get branch name (for branch_name column if present)
    $stmt = $conn->prepare("SELECT name FROM branches WHERE branch_id = ? LIMIT 1");
    if (!$stmt) throw new Exception("Prepare failed: " . $conn->error);
    $stmt->bind_param("i", $branch_id);
    $stmt->execute();
    $res = $stmt->get_result();
    $branch_name = null;
    if ($row = $res->fetch_assoc()) {
        $branch_name = $row['name'];
    }
    $stmt->close();

    // 2) Update employee: set branch_id and branch_name (if column exists)
    // We'll try to update branch_name; if column doesn't exist, fallback to update only branch_id.
    // First, try update with branch_name
    $updateSql = "UPDATE employees SET branch_id = ?, branch_name = ? WHERE employee_id = ? LIMIT 1";
    $stmt = $conn->prepare($updateSql);
    if ($stmt) {
        $stmt->bind_param("iss", $branch_id, $branch_name, $employee_id);
        if (!$stmt->execute()) {
            $stmt->close();
            throw new Exception("Failed to update employee: " . $conn->error);
        }
        $affected = $stmt->affected_rows;
        $stmt->close();
    } else {
        // fallback if branch_name column doesn't exist
        $stmt = $conn->prepare("UPDATE employees SET branch_id = ? WHERE employee_id = ? LIMIT 1");
        if (!$stmt) throw new Exception("Prepare failed: " . $conn->error);
        $stmt->bind_param("is", $branch_id, $employee_id);
        if (!$stmt->execute()) {
            $stmt->close();
            throw new Exception("Failed to update employee: " . $conn->error);
        }
        $affected = $stmt->affected_rows;
        $stmt->close();
    }

    // commit
    $conn->commit();

    echo json_encode(["success" => true, "message" => "Employee assigned to branch.", "affected" => $affected], JSON_UNESCAPED_UNICODE);
    $conn->close();
} catch (Exception $e) {
    if (isset($conn) && $conn->connect_errno === 0) $conn->rollback();
    http_response_code(400);
    echo json_encode(["success" => false, "message" => $e->getMessage()]);
    if (isset($stmt) && $stmt) $stmt->close();
    if (isset($conn) && $conn) $conn->close();
}
?>
