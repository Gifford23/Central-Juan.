<?php
include('../server/connection.php');

// CORS Headers
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Headers: Content-Type, Authorization");
header("Access-Control-Allow-Methods: GET, OPTIONS");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

$username = $_GET['username'] ?? '';

if (empty($username)) {
    echo json_encode([
        "success" => false,
        "message" => "Username is required"
    ]);
    exit;
}

// Step 1: Join users + user_access by username
$sql = "
    SELECT ua.*, u.username, u.role 
    FROM user_access ua
    INNER JOIN users u ON ua.user_id = u.user_id
    WHERE u.username = ?
";
$stmt = $conn->prepare($sql);

if (!$stmt) {
    echo json_encode([
        "success" => false,
        "message" => "Database error: " . $conn->error
    ]);
    exit;
}

$stmt->bind_param("s", $username);
$stmt->execute();
$result = $stmt->get_result();

if ($result->num_rows > 0) {
    $access = $result->fetch_assoc();

    echo json_encode([
        "success" => true,
        "username" => $access['username'],
        "role" => $access['role'],
        "access" => [
            "id" => $access['id'],
            "username" => $access['username'],
            "role" => $access['role'],
            "can_edit" => $access['can_edit'],
            "can_add" => $access['can_add'],
            "can_delete" => $access['can_delete'],
            "can_print" => $access['can_print'],
            "can_action" => $access['can_action'],
            "can_edit_payroll_date" => $access['can_edit_payroll_date'],
            "can_print_payroll" => $access['can_print_payroll'],
            "can_payroll_logs" => $access['can_payroll_logs'],
            "can_view" => $access['can_view'],

            // Cards          
            "employee_list" => $access['employee_list'],
            "department" => $access['department'],
            "branches" => $access['branches'],
            "user_biometrics" => $access['user_biometrics'],
            "attendance_dtr" => $access['attendance_dtr'],
            "attendance_log" => $access['attendance_log'],
            "leave_access" => $access['leave_access'],
            "payroll_records" => $access['payroll_records'],
            "loan" => $access['loan'],
            "late_deduction" => $access['late_deduction'],
            "leave_type" => $access['leave_type'],
            "overtime" => $access['overtime'],
            "holiday" => $access['holiday'],
            "leave_balances" => $access['leave_balances'],
            "users_management" => $access['users_management'],
            "user_role_management" => $access['user_role_management'],
        ]
    ]);
} else {
    echo json_encode([
        "success" => false,
        "message" => "No access found for this user"
    ]);
}

$stmt->close();
$conn->close();
