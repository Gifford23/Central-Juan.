<?php
include('../server/connection.php');
include("../server/cors.php");

header('Content-Type: application/json; charset=utf-8');

// read JSON body (support PUT / POST)
$body = json_decode(file_get_contents('php://input'), true);
if (!$body) {
    http_response_code(400);
    echo json_encode(["success" => false, "message" => "Invalid or missing JSON body."]);
    exit;
}

$ruleId = isset($body['reward_rule_id']) ? intval($body['reward_rule_id']) : 0;
if ($ruleId <= 0) {
    http_response_code(400);
    echo json_encode(["success" => false, "message" => "reward_rule_id is required."]);
    exit;
}

// Allowed fields to update (kept for reference)
$allowed = [
    'name', 'description', 'min_total_hours', 'min_daily_hours', 'min_days_credited',
    'payout_type', 'payout_value', 'is_active', 'priority', 'applies_to_employee_type',
    'applies_to_department_id', 'applies_to_position_id', 'is_deduction', 'min_daily_hours_max'
];

$patch = [];
$params = [];
$types = "";

// validate and prepare fields
if (isset($body['name'])) {
    $name = trim($body['name']);
    if ($name === "") {
        http_response_code(400);
        echo json_encode(["success" => false, "message" => "name cannot be empty."]);
        exit;
    }
    $patch[] = "name = ?";
    $types .= "s"; $params[] = $name;
}

if (array_key_exists('description', $body)) {
    $patch[] = "description = ?";
    $types .= "s"; $params[] = $body['description'] === null ? null : trim($body['description']);
}

if (array_key_exists('min_total_hours', $body)) {
    $val = $body['min_total_hours'];
    if ($val === "" || $val === null) {
        $patch[] = "min_total_hours = NULL";
    } else {
        if (!is_numeric($val) || floatval($val) < 0) {
            http_response_code(400); echo json_encode(["success"=>false,"message"=>"min_total_hours must be a positive number or null."]); exit;
        }
        $patch[] = "min_total_hours = ?";
        $types .= "d"; $params[] = floatval($val);
    }
}

// NEW: support min_daily_hours
if (array_key_exists('min_daily_hours', $body)) {
    $val = $body['min_daily_hours'];
    if ($val === "" || $val === null) {
        $patch[] = "min_daily_hours = NULL";
    } else {
        if (!is_numeric($val) || floatval($val) < 0 || floatval($val) > 24) {
            http_response_code(400); echo json_encode(["success"=>false,"message"=>"min_daily_hours must be between 0 and 24 or null."]); exit;
        }
        $patch[] = "min_daily_hours = ?";
        $types .= "d"; $params[] = floatval($val);
    }
}

// NEW: support min_daily_hours_max (lower bound for deduction ranges)
if (array_key_exists('min_daily_hours_max', $body)) {
    $val = $body['min_daily_hours_max'];
    if ($val === "" || $val === null) {
        $patch[] = "min_daily_hours_max = NULL";
    } else {
        if (!is_numeric($val) || floatval($val) < 0 || floatval($val) > 24) {
            http_response_code(400); echo json_encode(["success"=>false,"message"=>"min_daily_hours_max must be between 0 and 24 or null."]); exit;
        }
        $patch[] = "min_daily_hours_max = ?";
        $types .= "d"; $params[] = floatval($val);
    }
}

if (array_key_exists('min_days_credited', $body)) {
    $val = $body['min_days_credited'];
    if ($val === "" || $val === null) { $patch[] = "min_days_credited = NULL"; }
    else {
        if (!is_numeric($val) || floatval($val) < 0) {
            http_response_code(400); echo json_encode(["success"=>false,"message"=>"min_days_credited must be a positive number or null."]); exit;
        }
        $patch[] = "min_days_credited = ?";
        $types .= "d"; $params[] = floatval($val);
    }
}

if (isset($body['payout_type'])) {
    $pt = $body['payout_type'];
    $valid = ['fixed','per_hour','percentage'];
    if (!in_array($pt, $valid)) { http_response_code(400); echo json_encode(["success"=>false,"message"=>"Invalid payout_type"]); exit; }
    $patch[] = "payout_type = ?";
    $types .= "s"; $params[] = $pt;
}

if (isset($body['payout_value'])) {
    if (!is_numeric($body['payout_value']) || floatval($body['payout_value']) < 0) {
        http_response_code(400); echo json_encode(["success"=>false,"message"=>"Invalid payout_value"]); exit;
    }
    $pv = floatval($body['payout_value']);
    // if payout_type is provided in body and is percentage, ensure <= 100
    if (isset($body['payout_type']) && $body['payout_type'] === 'percentage' && $pv > 100) {
        http_response_code(400); echo json_encode(["success"=>false,"message"=>"payout_value cannot exceed 100 for percentage"]); exit;
    }
    $patch[] = "payout_value = ?";
    $types .= "d"; $params[] = $pv;
}

if (isset($body['is_active'])) {
    $patch[] = "is_active = ?";
    $types .= "i"; $params[] = intval($body['is_active']) ? 1 : 0;
}

// NEW: is_deduction flag (0/1)
if (isset($body['is_deduction'])) {
    $patch[] = "is_deduction = ?";
    $types .= "i"; $params[] = intval($body['is_deduction']) ? 1 : 0;
}

if (isset($body['priority'])) {
    if (!is_numeric($body['priority'])) { http_response_code(400); echo json_encode(["success"=>false,"message"=>"Invalid priority"]); exit; }
    $patch[] = "priority = ?";
    $types .= "i"; $params[] = intval($body['priority']);
}

if (array_key_exists('applies_to_employee_type', $body)) {
    $val = $body['applies_to_employee_type'];
    if ($val === "" || $val === null) {
        $patch[] = "applies_to_employee_type = NULL";
    } else {
        $patch[] = "applies_to_employee_type = ?";
        $types .= "s"; $params[] = trim($val);
    }
}

// NEW: Add applies_to_department_id and applies_to_position_id support
if (array_key_exists('applies_to_department_id', $body)) {
    $val = $body['applies_to_department_id'];
    if ($val === "" || $val === null) {
        $patch[] = "applies_to_department_id = NULL";
    } else {
        $patch[] = "applies_to_department_id = ?";
        $types .= "s"; $params[] = trim($val);
    }
}

if (array_key_exists('applies_to_position_id', $body)) {
    $val = $body['applies_to_position_id'];
    if ($val === "" || $val === null) {
        $patch[] = "applies_to_position_id = NULL";
    } else {
        $patch[] = "applies_to_position_id = ?";
        $types .= "s"; $params[] = trim($val);
    }
}

if (empty($patch)) {
    http_response_code(400);
    echo json_encode(["success" => false, "message" => "No valid fields provided to update."]);
    exit;
}

try {
    $setClause = implode(", ", $patch);
    $sql = "UPDATE reward_rules SET $setClause WHERE reward_rule_id = ?";
    $stmt = $conn->prepare($sql);
    if ($stmt === false) throw new Exception($conn->error);

    // bind params + rule id
    if ($types !== "") {
        $typesFinal = $types . "i";
        $paramsFinal = array_merge($params, [$ruleId]);
        $stmt->bind_param($typesFinal, ...$paramsFinal);
    } else {
        $stmt->bind_param("i", $ruleId);
    }

    if (!$stmt->execute()) {
        throw new Exception($stmt->error);
    }

    // fetch updated row
    $stmt2 = $conn->prepare("SELECT * FROM reward_rules WHERE reward_rule_id = ?");
    if ($stmt2 === false) throw new Exception($conn->error);
    $stmt2->bind_param("i", $ruleId);
    $stmt2->execute();
    $res = $stmt2->get_result();
    $row = $res->fetch_assoc();
    if ($row) {
        // cast numeric fields
        $row['reward_rule_id'] = (int)$row['reward_rule_id'];
        $row['min_total_hours'] = $row['min_total_hours'] !== null ? (float)$row['min_total_hours'] : null;
        $row['min_daily_hours'] = $row['min_daily_hours'] !== null ? (float)$row['min_daily_hours'] : null;
        $row['min_daily_hours_max'] = $row['min_daily_hours_max'] !== null ? (float)$row['min_daily_hours_max'] : null;
        $row['min_days_credited'] = $row['min_days_credited'] !== null ? (float)$row['min_days_credited'] : null;
        $row['payout_value'] = (float)$row['payout_value'];
        $row['is_active'] = (int)$row['is_active'];
        $row['is_deduction'] = isset($row['is_deduction']) ? (int)$row['is_deduction'] : 0;
        $row['priority'] = (int)$row['priority'];
    }

    echo json_encode(["success" => true, "message" => "Rule updated.", "rule" => $row]);
    exit;
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(["success" => false, "message" => "Server error: " . $e->getMessage()]);
    exit;
}
