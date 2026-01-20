<?php
include '../server/connection.php';
include '../server/cors.php';

// Get all shifts or specific shift by id
$id = isset($_GET['id']) ? intval($_GET['id']) : null;

if ($id) {
    $stmt = $conn->prepare("SELECT * FROM work_time WHERE id = ?");
    $stmt->bind_param("i", $id);
} else {
    $stmt = $conn->prepare("SELECT * FROM work_time");
}

$stmt->execute();
$result = $stmt->get_result();

$shifts = [];
while ($row = $result->fetch_assoc()) {
    $shifts[] = $row;
}

$stmt->close();
$conn->close();

echo json_encode(["success" => true, "data" => $shifts]);
?>
