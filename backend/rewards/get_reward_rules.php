<?php
include('../server/connection.php');
include("../server/cors.php");

header('Content-Type: application/json; charset=utf-8');

try {
    // Optional query params: active (0|1), is_deduction (0|1), applies_to_employee_type, applies_to_department_id, applies_to_position_id, limit, offset
    $active = isset($_GET['active']) ? $_GET['active'] : null;
    $isDeduction = isset($_GET['is_deduction']) ? $_GET['is_deduction'] : null;
    $appliesTo = isset($_GET['applies_to_employee_type']) ? trim($_GET['applies_to_employee_type']) : null;
    $appliesDept = isset($_GET['applies_to_department_id']) ? trim($_GET['applies_to_department_id']) : null;
    $appliesPos = isset($_GET['applies_to_position_id']) ? trim($_GET['applies_to_position_id']) : null;
    $limit = isset($_GET['limit']) ? intval($_GET['limit']) : null;
    $offset = isset($_GET['offset']) ? intval($_GET['offset']) : null;

    // include min_daily_hours_max and is_deduction and new applies_to_department_id / applies_to_position_id in the SELECT
    $sql = "SELECT reward_rule_id, name, description, min_total_hours, min_daily_hours, min_daily_hours_max, min_days_credited, payout_type, payout_value, is_active, is_deduction, priority, applies_to_employee_type, applies_to_department_id, applies_to_position_id, created_at
            FROM reward_rules
            WHERE 1=1";
    $params = [];
    $types = "";

    if ($active !== null && ($active === "0" || $active === "1" || $active === 0 || $active === 1)) {
        $sql .= " AND is_active = ?";
        $params[] = intval($active);
        $types .= "i";
    }

    if ($isDeduction !== null && ($isDeduction === "0" || $isDeduction === "1" || $isDeduction === 0 || $isDeduction === 1)) {
        $sql .= " AND is_deduction = ?";
        $params[] = intval($isDeduction);
        $types .= "i";
    }

    if ($appliesTo !== null && $appliesTo !== "") {
        // support either exact match or NULL/empty (global) — keep previous behavior
        $sql .= " AND (applies_to_employee_type = ? OR applies_to_employee_type IS NULL OR applies_to_employee_type = '')";
        $params[] = $appliesTo;
        $types .= "s";
    }

    if ($appliesDept !== null && $appliesDept !== "") {
        // If caller requests rules for a department, return rules that either target that department OR are global (NULL/empty)
        $sql .= " AND (applies_to_department_id = ? OR applies_to_department_id IS NULL OR applies_to_department_id = '')";
        $params[] = $appliesDept;
        $types .= "s";
    }

    if ($appliesPos !== null && $appliesPos !== "") {
        // If caller requests rules for a position, return rules that either target that position OR are global (NULL/empty)
        $sql .= " AND (applies_to_position_id = ? OR applies_to_position_id IS NULL OR applies_to_position_id = '')";
        $params[] = $appliesPos;
        $types .= "s";
    }

    // sensible default ordering: priority asc, created_at desc
    $sql .= " ORDER BY priority ASC, created_at DESC";

    if ($limit !== null && $limit > 0) {
        $sql .= " LIMIT ?";
        $params[] = $limit;
        $types .= "i";

        if ($offset !== null && $offset >= 0) {
            $sql .= " OFFSET ?";
            $params[] = $offset;
            $types .= "i";
        }
    }

    $stmt = $conn->prepare($sql);
    if ($stmt === false) {
        throw new Exception("Prepare failed: " . $conn->error);
    }

    if (!empty($params)) {
        // bind parameters if any
        $stmt->bind_param($types, ...$params);
    }

    $stmt->execute();
    $res = $stmt->get_result();
    $rows = [];
    while ($r = $res->fetch_assoc()) {
        // cast numeric fields (include min_daily_hours_max, is_deduction and new applies_to_* fields)
        $r['reward_rule_id'] = (int)$r['reward_rule_id'];
        $r['min_total_hours'] = $r['min_total_hours'] !== null ? (float)$r['min_total_hours'] : null;
        $r['min_daily_hours'] = $r['min_daily_hours'] !== null ? (float)$r['min_daily_hours'] : null;
        $r['min_daily_hours_max'] = $r['min_daily_hours_max'] !== null ? (float)$r['min_daily_hours_max'] : null;
        $r['min_days_credited'] = $r['min_days_credited'] !== null ? (float)$r['min_days_credited'] : null;
        $r['payout_value'] = $r['payout_value'] !== null ? (float)$r['payout_value'] : 0.0;
        $r['is_active'] = (int)$r['is_active'];
        $r['is_deduction'] = isset($r['is_deduction']) ? (int)$r['is_deduction'] : 0;
        $r['priority'] = (int)$r['priority'];

        // ensure department/position fields exist and normalize empty => null for clarity in JSON
        $r['applies_to_department_id'] = isset($r['applies_to_department_id']) && $r['applies_to_department_id'] !== '' ? $r['applies_to_department_id'] : null;
        $r['applies_to_position_id'] = isset($r['applies_to_position_id']) && $r['applies_to_position_id'] !== '' ? $r['applies_to_position_id'] : null;

        $rows[] = $r;
    }

    echo json_encode([
        "success" => true,
        "data" => $rows
    ]);
    exit;
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        "success" => false,
        "message" => "Server error: " . $e->getMessage()
    ]);
    exit;
}
