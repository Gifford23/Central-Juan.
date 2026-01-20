<?php
// update_menu_access.php
include '../../server/connection.php';
include("../../server/cors.php");

$data = json_decode(file_get_contents("php://input"), true);

if (!isset($data['username'])) {
    echo json_encode(["success" => false, "message" => "Username required"]);
    exit;
}

$username = mysqli_real_escape_string($conn, $data['username']);

$fields = [
  "dashboard", "employees", "attendance", "dtr", "payroll", "utilities",
  "requests", "users", "biometrics", "email_customization", "contributions", 
  "menu_access", "time_in_out", "users_management", "reset_password"
];

// ✅ Guarantee all fields exist (default = no)
foreach ($fields as $field) {
    if (!isset($data[$field]) || $data[$field] !== "yes") {
        $data[$field] = "no";
    }
}

// ✅ Build SET clause
$updates = [];
foreach ($fields as $field) {
    $value = $data[$field] === "yes" ? "yes" : "no";
    $updates[] = "$field = '$value'";
}
$setClause = implode(", ", $updates);

// ✅ Ensure record exists (insert if not)
$check = mysqli_query($conn, "SELECT username FROM user_menu_access WHERE username = '$username'");
if (mysqli_num_rows($check) > 0) {
    $sql = "UPDATE user_menu_access SET $setClause WHERE username = '$username'";
} else {
    $sql = "INSERT INTO user_menu_access (username, " . implode(", ", $fields) . ")
            VALUES ('$username', " . implode(", ", array_map(fn($f) => "'" . $data[$f] . "'", $fields)) . ")";
}

if (mysqli_query($conn, $sql)) {
    echo json_encode(["success" => true, "message" => "Access updated"]);
} else {
    echo json_encode(["success" => false, "message" => mysqli_error($conn)]);
}
?>
