<?php
include ("../../server/cors.php");
include '../../server/connection.php';

// Accept id from JSON body OR POST form or GET/query param
$raw = file_get_contents("php://input");
$data = json_decode($raw, true);

// fallback to $_POST if form-encoded
if (!$data) $data = $_POST ?? [];

// fallback to query param
if ((!isset($data['id']) || $data['id'] === null) && isset($_GET['id'])) {
    $data['id'] = $_GET['id'];
}

if (!isset($data['id'])) {
    echo json_encode(["success" => false, "message" => "Missing required id"]);
    exit;
}

$id = intval($data['id']);

$stmt = $conn->prepare("DELETE FROM work_time_late_deduction WHERE id = ?");
if (!$stmt) {
    echo json_encode(["success" => false, "message" => "Prepare failed: " . $conn->error]);
    exit;
}
$stmt->bind_param("i", $id);

if ($stmt->execute()) {
    // optional: check affected_rows to know if row existed
    if ($stmt->affected_rows > 0) {
        echo json_encode(["success" => true, "message" => "Mapping deleted successfully"]);
    } else {
        echo json_encode(["success" => false, "message" => "No mapping found with this id"]);
    }
} else {
    echo json_encode(["success" => false, "message" => "Failed to delete mapping: " . $stmt->error]);
}

$stmt->close();
$conn->close();
