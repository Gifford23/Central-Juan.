<?php
include("../server/cors.php");
include("../server/connection.php");
header("Content-Type: application/json");

$sql = "SELECT id, person_id, name, department, time_log , attendance_status
        FROM tbl_biometrics_logs
        ORDER BY time_log ASC";

$result = mysqli_query($conn, $sql);

if (!$result) {
    echo json_encode(["status" => "error", "message" => mysqli_error($conn)]);
    exit;
}

$data = [];
while ($row = mysqli_fetch_assoc($result)) {
    $data[] = $row;
}

echo json_encode([
    "status" => "success",
    "records" => $data
]);
?>
