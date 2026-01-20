<?php
//update_user_access
header("Content-Type: application/json");
include("../server/cors.php");
require_once("../server/connection.php");

$input = json_decode(file_get_contents("php://input"), true);

if (!$input || !isset($input['username']) || !isset($input['role']) || !isset($input['status'])) {
    echo json_encode(["success" => false, "message" => "Invalid input"]);
    exit;
}

$username    = $input['username'];
$role        = $input['role'];
$status      = $input['status'];
$permissions = isset($input['permissions']) ? $input['permissions'] : [];

$PERMISSION_COLS = [
    "can_edit","can_add","can_delete","can_print","can_action",
    "can_edit_payroll_date","can_print_payroll","can_payroll_logs","can_view",
    "employee_list","department","branches", "user_biometrics","attendance_dtr","attendance_log","leave_access",
    "payroll_records","loan","late_deduction","leave_type","overtime",
    "holiday","leave_balances", "attendance_request", "overtime_request", "leave_request", 
    "manage_users_access", "user_role_management","schedule_management","schedule_settings",
    "assign_approver", "approvals_queue"
];

$conn->begin_transaction();

try {
    // --- 1. Update users (role + status only)
    $stmt = $conn->prepare("UPDATE users SET role = ?, status = ? WHERE username = ?");
    $stmt->bind_param("sss", $role, $status, $username);
    $stmt->execute();
    $stmt->close();

    // --- 2. Ensure user_access exists, then update permissions only
    $check = $conn->prepare("SELECT id FROM user_access WHERE username = ?");
    $check->bind_param("s", $username);
    $check->execute();
    $check->store_result();

    if ($check->num_rows > 0) {
        // Update permissions
        $fields = [];
        $params = [];
        $types  = "";

        foreach ($PERMISSION_COLS as $col) {
            $fields[] = "$col = ?";
            $params[] = (isset($permissions[$col]) && $permissions[$col] === "yes") ? "yes" : "no";
            $types   .= "s";
        }

        $params[] = $username;
        $types   .= "s";

        $sql = "UPDATE user_access SET " . implode(", ", $fields) . " WHERE username = ?";
        $stmt = $conn->prepare($sql);
        $stmt->bind_param($types, ...$params);
        $stmt->execute();
        $stmt->close();

    } else {
        // Insert new user_access row
        $cols   = ["username"];
        $vals   = ["?"];
        $params = [$username];
        $types  = "s";

        foreach ($PERMISSION_COLS as $col) {
            $cols[] = $col;
            $vals[] = "?";
            $params[] = (isset($permissions[$col]) && $permissions[$col] === "yes") ? "yes" : "no";
            $types   .= "s";
        }

        $sql = "INSERT INTO user_access (" . implode(", ", $cols) . ") VALUES (" . implode(", ", $vals) . ")";
        $stmt = $conn->prepare($sql);
        $stmt->bind_param($types, ...$params);
        $stmt->execute();
        $stmt->close();
    }

    $check->close();
    $conn->commit();

    echo json_encode(["success" => true, "message" => "User role, status, and access updated"]);

} catch (Exception $e) {
    $conn->rollback();
    echo json_encode(["success" => false, "message" => $e->getMessage()]);
}
