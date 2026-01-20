<?php

// Full CORS Headers
include("../server/cors.php");

include('../server/connection.php');

$id = isset($_GET['id']) ? intval($_GET['id']) : null;
$work_time_id = isset($_GET['work_time_id']) ? intval($_GET['work_time_id']) : null;

try {
    if ($id) {
        // Fetch specific break by ID
        $stmt = $conn->prepare("SELECT * FROM break_time WHERE id = ?");
        $stmt->bind_param("i", $id);
    } elseif ($work_time_id) {
        // Fetch all breaks for a specific shift
        $stmt = $conn->prepare("SELECT * FROM break_time WHERE work_time_id = ?");
        $stmt->bind_param("i", $work_time_id);
    } else {
        // Fetch all breaks
        $stmt = $conn->prepare("SELECT * FROM break_time");
    }

    $stmt->execute();
    $result = $stmt->get_result();
    $breaks = $result->fetch_all(MYSQLI_ASSOC);

    echo json_encode(["success" => true, "data" => $breaks]);
} catch (Exception $e) {
    echo json_encode(["success" => false, "message" => $e->getMessage()]);
}
