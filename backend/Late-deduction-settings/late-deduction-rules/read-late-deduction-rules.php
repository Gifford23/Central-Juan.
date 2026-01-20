<?php
include '../../server/connection.php';

include "../../server/cors.php";

$tier_id = isset($_GET['tier_id']) ? intval($_GET['tier_id']) : null;
$id = isset($_GET['id']) ? intval($_GET['id']) : null;

if ($id) {
    $sql = "SELECT * FROM late_deduction WHERE id = ?";
    $stmt = $conn->prepare($sql);
    $stmt->bind_param("i", $id);
} elseif ($tier_id) {
    $sql = "SELECT * FROM late_deduction WHERE tier_id = ? ORDER BY min_minutes ASC";
    $stmt = $conn->prepare($sql);
    $stmt->bind_param("i", $tier_id);
} else {
    $sql = "SELECT * FROM late_deduction ORDER BY tier_id, min_minutes ASC";
    $stmt = $conn->prepare($sql);
}

$stmt->execute();
$result = $stmt->get_result();

$rules = [];
while ($row = $result->fetch_assoc()) {
    $rules[] = $row;
}

echo json_encode($rules);
?>
