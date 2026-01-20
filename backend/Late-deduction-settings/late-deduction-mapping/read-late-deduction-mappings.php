<?php
include ("../../server/cors.php");
include '../../server/connection.php';

// header("Access-Control-Allow-Origin: *");
// header("Access-Control-Allow-Methods: GET, OPTIONS");
// header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");
// header("Content-Type: application/json; charset=UTF-8");

$work_time_id = isset($_GET['work_time_id']) ? intval($_GET['work_time_id']) : null;

try {
    $query = "
        SELECT 
            wt.id AS work_time_id,
            wt.shift_name,
            wt.start_time,
            wt.end_time,
            wld.id AS mapping_id,
            wld.tier_id,
            ldt.tier_name
        FROM work_time wt
        LEFT JOIN work_time_late_deduction wld ON wt.id = wld.work_time_id
        LEFT JOIN late_deduction_tier ldt ON wld.tier_id = ldt.id
    ";

    if ($work_time_id) {
        $query .= " WHERE wt.id = ?";
    }

    $stmt = $conn->prepare($query);

    if ($work_time_id) {
        $stmt->bind_param("i", $work_time_id);
    }

    $stmt->execute();
    $result = $stmt->get_result();

    $rows = [];
    while ($row = $result->fetch_assoc()) {
        $rows[] = [
            "id" => $row['mapping_id'],   // mapping id (nullable if no mapping yet)
            "work_time_id" => $row['work_time_id'],
            "shift_name" => $row['shift_name'],
            "start_time" => $row['start_time'],
            "end_time" => $row['end_time'],
            "tier_id" => $row['tier_id'],
            "tier_name" => $row['tier_name'],
        ];
    }

    echo json_encode($rows);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(["error" => $e->getMessage()]);
}
?>