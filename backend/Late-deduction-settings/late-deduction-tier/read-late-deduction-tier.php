<?php
include("../../server/cors.php");

include '../../server/connection.php';


$id = isset($_GET['id']) ? intval($_GET['id']) : null;

if ($id) {
    $stmt = $conn->prepare("SELECT * FROM late_deduction_tier WHERE id = ?");
    $stmt->bind_param("i", $id);
    $stmt->execute();
    $result = $stmt->get_result()->fetch_assoc();
    echo json_encode($result);
    $stmt->close();
} else {
    $result = $conn->query("SELECT * FROM late_deduction_tier ORDER BY created_at DESC");
    $tiers = [];
    while ($row = $result->fetch_assoc()) {
        $tiers[] = $row;
    }
    echo json_encode($tiers);
}

$conn->close();
?>
