<?php
include("../server/cors.php");
require_once '../server/connection.php';
header('Content-Type: application/json');

$input = json_decode(file_get_contents('php://input'), true);
if (!$input) {
    echo json_encode(["success" => false, "message" => "Invalid JSON input."]);
    exit;
}

if (!isset($input['branch_id']) || !is_numeric($input['branch_id'])) {
    echo json_encode(["success" => false, "message" => "branch_id is required and must be numeric."]);
    exit;
}

$branch_id = (int)$input['branch_id'];

// Start transaction so we can safely rollback if delete fails
$conn->begin_transaction();

try {
    // 1) Check branch exists (for update lock is optional here; using simple check)
    $check = $conn->prepare("SELECT branch_id FROM branches WHERE branch_id = ? LIMIT 1");
    if (!$check) throw new Exception("Prepare failed: " . $conn->error);
    $check->bind_param("i", $branch_id);
    $check->execute();
    $res = $check->get_result();
    if ($res->num_rows === 0) {
        $check->close();
        $conn->rollback();
        echo json_encode(["success" => false, "message" => "Branch not found."]);
        $conn->close();
        exit;
    }
    $check->close();

    // 2) Delete branch row only (no employee updates)
    $del = $conn->prepare("DELETE FROM branches WHERE branch_id = ?");
    if (!$del) throw new Exception("Prepare failed: " . $conn->error);
    $del->bind_param("i", $branch_id);
    if (!$del->execute()) {
        // If delete fails (e.g., FK RESTRICT), throw and rollback
        $err = $del->error;
        $del->close();
        throw new Exception("Failed to delete branch: " . $err);
    }
    $affected = $del->affected_rows;
    $del->close();

    if ($affected !== 1) {
        // Unexpected: rollback and report
        $conn->rollback();
        echo json_encode(["success" => false, "message" => "Delete did not affect any rows."]);
        $conn->close();
        exit;
    }

    // Commit transaction
    $conn->commit();

    echo json_encode(["success" => true, "message" => "Branch deleted successfully."]);
} catch (Exception $e) {
    $conn->rollback();
    echo json_encode(["success" => false, "message" => "Error deleting branch: " . $e->getMessage()]);
}

$conn->close();
