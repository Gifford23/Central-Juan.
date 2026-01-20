<?php
header("Content-Type: application/json");
include("../server/cors.php");
include('../server/connection.php');

/*
 * Returns global config row (single-row store)
 * Example response:
 * { success: true, data: { config_id: 1, default_mode: 'semi_monthly', cutoff_assignment: 'period_end' } }
 */

$sql = "SELECT * FROM thirteenth_month_config ORDER BY config_id LIMIT 1";
$res = $conn->query($sql);
$row = $res->fetch_assoc();

if (!$row) {
    // sensible defaults
    $row = [
        'config_id' => null,
        'default_mode' => 'semi_monthly',
        'cutoff_assignment' => 'period_end'
    ];
}

echo json_encode(['success' => true, 'data' => $row]);
