<?php
include '../server/connection.php';
include "../server/cors.php";
// Full CORS Headers
// header("Access-Control-Allow-Origin: *");
// header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
// header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");
// header("Content-Type: application/json; charset=UTF-8");

$work_time_id = isset($_GET['work_time_id']) ? intval($_GET['work_time_id']) : null;

$sql = "SELECT wtb.id AS mapping_id, wtb.work_time_id, wt.shift_name, wtb.break_id, bt.break_name, bt.break_start, bt.break_end
        FROM work_time_break wtb
        INNER JOIN work_time wt ON wtb.work_time_id = wt.id
        INNER JOIN break_time bt ON wtb.break_id = bt.id";

if ($work_time_id) {
    $sql .= " WHERE wtb.work_time_id = ?";
    $stmt = $conn->prepare($sql);
    $stmt->bind_param("i", $work_time_id);
    $stmt->execute();
    $result = $stmt->get_result();
} else {
    $result = $conn->query($sql);
}

$data = [];
while ($row = $result->fetch_assoc()) {
    $data[] = $row;
}

echo json_encode(["success" => true, "data" => $data]);
?>
