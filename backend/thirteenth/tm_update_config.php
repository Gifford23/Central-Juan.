<?php
header("Content-Type: application/json");
include("../server/cors.php");
include('../server/connection.php');

/*
 * POST JSON:
 * { default_mode: 'monthly'|'semi_monthly', cutoff_assignment: 'period_end'|'period_start', updated_by: 'admin' }
 */

$input = json_decode(file_get_contents('php://input'), true);
$default_mode = $input['default_mode'] ?? null;
$cutoff_assignment = $input['cutoff_assignment'] ?? null;
$updated_by = $input['updated_by'] ?? 'web-admin';

if (!$default_mode) {
    http_response_code(422);
    echo json_encode(['success' => false, 'message' => 'default_mode required']);
    exit;
}

try {
    // If row exists update, else insert
    $existsRes = $conn->query("SELECT config_id FROM thirteenth_month_config LIMIT 1");
    if ($existsRes && $existsRes->num_rows > 0) {
        $row = $existsRes->fetch_assoc();
        $id = $row['config_id'];
        $stmt = $conn->prepare("UPDATE thirteenth_month_config SET default_mode = ?, cutoff_assignment = ?, updated_by = ?, updated_at = NOW() WHERE config_id = ?");
        $stmt->bind_param('sssi', $default_mode, $cutoff_assignment, $updated_by, $id);
        $ok = $stmt->execute();
        $stmt->close();
    } else {
        $stmt = $conn->prepare("INSERT INTO thirteenth_month_config (default_mode, cutoff_assignment, updated_by, updated_at) VALUES (?, ?, ?, NOW())");
        $stmt->bind_param('sss', $default_mode, $cutoff_assignment, $updated_by);
        $ok = $stmt->execute();
        $stmt->close();
    }

    if (!$ok) throw new Exception('DB error when saving config');

    echo json_encode(['success' => true, 'message' => 'Config saved']);
} catch (Exception $ex) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => $ex->getMessage()]);
}
