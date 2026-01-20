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
    $stmt = $conn->prepare("
        SELECT employee_list, department, attendance_dtr, attendance_log, leave_access, payroll_records, loan, late_deduction, leave_type, overtime, holidays, leave_balances
        FROM card_access
        WHERE role = ?
    ");

    if (!$stmt) {
        echo json_encode(["success" => false, "message" => "Prepare failed: " . $conn->error]);
        exit;
    }

    $stmt->bind_param("s", $role);
    $stmt->execute();
    $result = $stmt->get_result();
    $permissions = $result->fetch_assoc();

    if ($permissions) {
        echo json_encode(["success" => true, "permissions" => $permissions]);
    } else {
        echo json_encode(["success" => false, "message" => "No permissions found for role: $role"]);
    }

    $stmt->close();
    $conn->close();
} catch (Exception $e) {
    echo json_encode(["success" => false, "message" => $e->getMessage()]);
}
?>
