<?php
include("../server/cors.php");
include("../server/connection.php");

header('Content-Type: application/json');

// Optional filters (date range)
$start = $_GET['start'] ?? null;
$end = $_GET['end'] ?? null;

$query = "SELECT b.id, b.person_id, u.username, b.name, b.department, b.time_log 
          FROM tbl_biometrics_logs b
          LEFT JOIN users u ON b.person_id = u.user_id";

if ($start && $end) {
    $query .= " WHERE b.time_log BETWEEN '$start' AND '$end'";
}

$query .= " ORDER BY b.time_log ASC";

$result = mysqli_query($conn, $query);
$data = [];

if ($result) {
    while ($row = mysqli_fetch_assoc($result)) {
        $data[] = $row;
    }
    echo json_encode([
        "status" => "success",
        "count" => count($data),
        "records" => $data
    ]);
} else {
    echo json_encode([
        "status" => "error",
        "message" => mysqli_error($conn)
    ]);
}
?>
