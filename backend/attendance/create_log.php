<?php
// create_log.php
// Single-purpose endpoint to insert a log into `logs` table.
// Change $allowed_origin to your frontend origin.

ob_start();
@session_start();
include("../server/cors.php");
include '../server/connection.php';

// include DB connection (adjust path to match your project)
include_once __DIR__ . '/../server/connection.php'; // <- adjust if file placed elsewhere

// read JSON body
$raw = file_get_contents("php://input");
$data = json_decode($raw, true);
if (!is_array($data)) $data = [];

// determine acting user (session -> JSON -> header -> fallback)
$user_full_name = null;
$user_role = null;

if (!empty($_SESSION['user_full_name'])) $user_full_name = $_SESSION['user_full_name'];
if (!$user_full_name && !empty($_SESSION['full_name'])) $user_full_name = $_SESSION['full_name'];
if (!$user_full_name && !empty($_SESSION['name'])) $user_full_name = $_SESSION['name'];
if (!$user_full_name && !empty($_SESSION['username'])) $user_full_name = $_SESSION['username'];

if (empty($user_full_name) && !empty($data['user_full_name'])) $user_full_name = $data['user_full_name'];
if (empty($user_full_name) && !empty($_SERVER['HTTP_X_USER_FULL_NAME'])) $user_full_name = $_SERVER['HTTP_X_USER_FULL_NAME'];

if (!empty($_SESSION['user_role'])) $user_role = $_SESSION['user_role'];
if (empty($user_role) && !empty($data['user_role'])) $user_role = $data['user_role'];
if (empty($user_role) && !empty($_SERVER['HTTP_X_USER_ROLE'])) $user_role = $_SERVER['HTTP_X_USER_ROLE'];

if (empty($user_full_name)) $user_full_name = "Unknown User";
if (empty($user_role)) $user_role = "Unknown Role";

// build action text
$action = isset($data['action']) ? trim($data['action']) : null;

// If action not provided, try to synthesize from available context
if (empty($action)) {
    $parts = [];
    if (!empty($data['attendance_id'])) $parts[] = "Attendance ID: " . $data['attendance_id'];
    if (!empty($data['employee_name'])) $parts[] = "Employee: " . $data['employee_name'];
    if (!empty($data['employee_id']) && empty($data['employee_name'])) $parts[] = "Employee ID: " . $data['employee_id'];
    if (!empty($data['attendance_date'])) $parts[] = "Date: " . $data['attendance_date'];

    if (!empty($parts)) {
        $action = "Log - " . implode(", ", $parts);
    }
}

if (empty($action)) {
    echo json_encode(["success" => false, "message" => "Missing 'action' (or insufficient context to build it)."]);
    exit;
}

// truncate to 1000 chars (DB column limit)
if (mb_strlen($action) > 1000) {
    $action = mb_substr($action, 0, 1000);
}

// Prepare and insert
$sql = "INSERT INTO logs (user_full_name, user_role, action) VALUES (?, ?, ?)";
$stmt = $conn->prepare($sql);
if (!$stmt) {
    echo json_encode(["success" => false, "message" => "DB prepare failed: " . $conn->error]);
    exit;
}

$stmt->bind_param("sss", $user_full_name, $user_role, $action);
$ok = $stmt->execute();
$log_id = $ok ? $conn->insert_id : null;
$created_at = date("Y-m-d H:i:s");

if ($ok) {
    echo json_encode([
        "success" => true,
        "log_id" => intval($log_id),
        "log_created_at" => $created_at,
        "created_by" => $user_full_name,
        "created_by_role" => $user_role
    ]);
} else {
    echo json_encode(["success" => false, "message" => "DB execute failed: " . $stmt->error]);
}

$stmt->close();
$conn->close();
