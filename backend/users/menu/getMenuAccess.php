<?php
include("../../server/cors.php");
include("../../server/connection.php");


if (!isset($_GET['username'])) {
    echo json_encode(["error" => "Username required"]);
    exit;
}

$username = mysqli_real_escape_string($conn, $_GET['username']);

// ✅ Query user + menu access
$sql = "
SELECT 
  u.user_id,
  u.username,
  u.role,
  u.status,
  m.dashboard,
  m.employees,
  m.attendance,
  m.dtr,
  m.payroll,
  m.utilities,
  m.requests,
  m.users,
  m.biometrics,
  m.email_customization,
  m.contributions,
  m.menu_access,
  m.time_in_out,
  m.users_management,
  m.reset_password,
  m.logs
FROM users u
LEFT JOIN user_menu_access m ON u.username = m.username
WHERE u.username = '$username'
";

$result = mysqli_query($conn, $sql);

if ($result && mysqli_num_rows($result) > 0) {
    $row = mysqli_fetch_assoc($result);

    // ✅ Ensure all fields exist with default "no"
    $fields = [
        "dashboard", "employees", "attendance", "payroll", "utilities",
        "requests", "users", "biometrics", "email_customization", "contributions"
    ];
    foreach ($fields as $f) {
        if (!isset($row[$f]) || $row[$f] === null) {
            $row[$f] = "no";
        }
    }

    echo json_encode($row);
} else {
    echo json_encode(["error" => "User not found"]);
}
?>
