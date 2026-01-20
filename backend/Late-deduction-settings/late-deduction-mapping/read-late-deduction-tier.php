<?php
include ("../../server/cors.php");
include '../../server/connection.php';

try {
    $query = "SELECT id, tier_name, description FROM late_deduction_tier ORDER BY id ASC";
    $result = $conn->query($query);

    $rows = [];
    while ($row = $result->fetch_assoc()) {
        $rows[] = [
            "id" => $row['id'],
            "tier_name" => $row['tier_name'],
            "description" => $row['description'],
        ];
    }

    echo json_encode($rows);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(["error" => $e->getMessage()]);
}
?>
