<?php
include("../server/cors.php");
include('../server/connection.php');

$id = $_GET['id'] ?? null;

if (!$id) {
    echo json_encode(["success" => false, "message" => "Missing id"]);
    exit;
}

try {
    // Remove mapping in work_time_break if needed
    $stmt = $conn->prepare("DELETE FROM work_time_break WHERE break_id = ?");
    $stmt->bind_param("i", $id);
    $stmt->execute();

    // Delete break record
    $stmt = $conn->prepare("DELETE FROM break_time WHERE id = ?");
    $stmt->bind_param("i", $id);
    $stmt->execute();

    echo json_encode(["success" => true, "message" => "Break deleted"]);
} catch (Exception $e) {
    echo json_encode(["success" => false, "message" => $e->getMessage()]);
}
