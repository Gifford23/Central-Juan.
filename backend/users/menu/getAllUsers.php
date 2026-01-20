<?php
// getAllUsers.php
include '../../server/connection.php';
include("../../server/cors.php");

$sql = "SELECT user_id, username, role, status FROM users ORDER BY username ASC";
$result = mysqli_query($conn, $sql);

$users = [];

if ($result && mysqli_num_rows($result) > 0) {
    while ($row = mysqli_fetch_assoc($result)) {
        $users[] = $row;
    }
}

echo json_encode($users);
?>
