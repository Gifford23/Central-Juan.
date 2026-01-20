<?php
include '../server/connection.php';
include("../server/cors.php");

header('Content-Type: application/json');

if (!isset($_GET['role'])) {
    echo json_encode(["success" => false, "message" => "Role required"]);
    exit;
}

$role = $_GET['role'];

try {
    $stmt = $conn->prepare("SELECT can_edit, can_add, can_delete, can_print, can_action, can_edit_payroll_date, can_print_payroll, can_payroll_logs, can_view FROM permissions WHERE role = ?");
    $stmt->bind_param("s", $role);
    $stmt->execute();
    $result = $stmt->get_result();
    $permissions = $result->fetch_assoc();

    if ($permissions) {
        echo json_encode(["success" => true, "permissions" => $permissions]);
    } else {
        echo json_encode(["success" => false, "message" => "No permissions found"]);
    }
} catch (Exception $e) {
    echo json_encode(["success" => false, "message" => $e->getMessage()]);
}
