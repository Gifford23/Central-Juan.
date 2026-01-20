<?php
// update_access.php
header("Content-Type: application/json");
include("../server/cors.php"); // must send Access-Control-Allow-Origin headers
require_once("../server/connection.php");

$input = json_decode(file_get_contents("php://input"), true);

if (!$input || !isset($input['username']) || !isset($input['role']) || !isset($input['status'])) {
    echo json_encode(["success" => false, "message" => "Invalid input"]);
    exit;
}

$username    = $input['username'];
$role        = $input['role'];
$status      = $input['status'];
$permissions = $input['permissions'] ?? [];
$menus       = $input['menus'] ?? [];

// --- Define available columns ---
$PERMISSION_COLS = [
    "can_edit","can_add","can_delete","can_print","can_action",
    "can_edit_payroll_date","can_print_payroll","can_payroll_logs","can_view",
    "employee_list","department","branches","user_biometrics","attendance_dtr","attendance_log","leave_access",
    "payroll_records","loan","late_deduction","leave_type","overtime",
    "holiday","leave_balances","attendance_request","overtime_request","leave_request",
    "manage_users_access","user_role_management","schedule_management","schedule_settings",
    "assign_approver","approvals_queue"
];

$MENU_FIELDS = [
    "dashboard","employees","attendance", "dtr","payroll","utilities", 
    "requests","users","biometrics","email_customization","contributions",
    "menu_access","time_in_out","users_management","reset_password","logs"
];

// --- Default menus = no ---
foreach ($MENU_FIELDS as $field) {
    if (!isset($menus[$field]) || $menus[$field] !== "yes") {
        $menus[$field] = "no";
    }
}

$conn->begin_transaction();

try {
    /* -------------------------
       1. Update role & status
    -------------------------- */
    $stmt = $conn->prepare("UPDATE users SET role = ?, status = ? WHERE username = ?");
    $stmt->bind_param("sss", $role, $status, $username);
    $stmt->execute();
    $stmt->close();

    /* -------------------------
       2. Update user_access
    -------------------------- */
    $check = $conn->prepare("SELECT id FROM user_access WHERE username = ?");
    $check->bind_param("s", $username);
    $check->execute();
    $check->store_result();

    if ($check->num_rows > 0) {
        // update
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
        // insert
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

    /* -------------------------
       3. Update user_menu_access
    -------------------------- */
    $checkMenu = $conn->prepare("SELECT username FROM user_menu_access WHERE username = ?");
    $checkMenu->bind_param("s", $username);
    $checkMenu->execute();
    $checkMenu->store_result();

    if ($checkMenu->num_rows > 0) {
        // update
        $fields = [];
        $params = [];
        $types  = "";

        foreach ($MENU_FIELDS as $col) {
            $fields[] = "$col = ?";
            $params[] = $menus[$col] === "yes" ? "yes" : "no";
            $types   .= "s";
        }
        $params[] = $username;
        $types   .= "s";

        $sql = "UPDATE user_menu_access SET " . implode(", ", $fields) . " WHERE username = ?";
        $stmt = $conn->prepare($sql);
        $stmt->bind_param($types, ...$params);
        $stmt->execute();
        $stmt->close();
    } else {
        // insert
        $cols   = ["username"];
        $vals   = ["?"];
        $params = [$username];
        $types  = "s";

        foreach ($MENU_FIELDS as $col) {
            $cols[] = $col;
            $vals[] = "?";
            $params[] = $menus[$col] === "yes" ? "yes" : "no";
            $types   .= "s";
        }

        $sql = "INSERT INTO user_menu_access (" . implode(", ", $cols) . ") VALUES (" . implode(", ", $vals) . ")";
        $stmt = $conn->prepare($sql);
        $stmt->bind_param($types, ...$params);
        $stmt->execute();
        $stmt->close();
    }
    $checkMenu->close();

    $conn->commit();
    echo json_encode(["success" => true, "message" => "Access updated successfully"]);

} catch (Exception $e) {
    $conn->rollback();
    echo json_encode(["success" => false, "message" => $e->getMessage()]);
}
