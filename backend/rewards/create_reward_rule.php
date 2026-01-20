<?php
// create_reward_rule.php
include('../server/connection.php');
include("../server/cors.php");

header('Content-Type: application/json; charset=utf-8');

// Read JSON body
$body = json_decode(file_get_contents('php://input'), true);

if (!$body) {
    http_response_code(400);
    echo json_encode(["success" => false, "message" => "Invalid or missing JSON body."]);
    exit;
}

// Required: name, payout_type, payout_value (other fields optional)
$name = isset($body['name']) ? trim($body['name']) : '';
$description = array_key_exists('description', $body) ? trim($body['description']) : null;
$min_total_hours = array_key_exists('min_total_hours', $body) && $body['min_total_hours'] !== "" ? $body['min_total_hours'] : null;
$min_daily_hours = array_key_exists('min_daily_hours', $body) && $body['min_daily_hours'] !== "" ? $body['min_daily_hours'] : null;
$min_daily_hours_max = array_key_exists('min_daily_hours_max', $body) && $body['min_daily_hours_max'] !== "" ? $body['min_daily_hours_max'] : null; // NEW
$min_days_credited = array_key_exists('min_days_credited', $body) && $body['min_days_credited'] !== "" ? $body['min_days_credited'] : null;
$payout_type = isset($body['payout_type']) ? $body['payout_type'] : 'fixed';
$payout_value = isset($body['payout_value']) ? $body['payout_value'] : 0;
$is_active = isset($body['is_active']) ? intval($body['is_active']) : 1;
$is_deduction = isset($body['is_deduction']) ? intval($body['is_deduction']) : 0; // NEW
$priority = isset($body['priority']) ? intval($body['priority']) : 10;
$applies_to_employee_type = array_key_exists('applies_to_employee_type', $body) ? trim((string)$body['applies_to_employee_type']) : null;

$validPayouts = ['fixed', 'per_hour', 'percentage'];

// Add applies_to_department_id and applies_to_position_id support
$applies_to_department_id = isset($body['applies_to_department_id']) ? $body['applies_to_department_id'] : null;
$applies_to_position_id = isset($body['applies_to_position_id']) ? $body['applies_to_position_id'] : null;

// Basic validations
if ($name === '') {
    http_response_code(400);
    echo json_encode(["success" => false, "message" => "Rule name is required."]);
    exit;
}
if (!in_array($payout_type, $validPayouts)) {
    http_response_code(400);
    echo json_encode(["success" => false, "message" => "Invalid payout_type."]);
    exit;
}
if (!is_numeric($payout_value) || floatval($payout_value) < 0) {
    http_response_code(400);
    echo json_encode(["success" => false, "message" => "Invalid payout_value."]);
    exit;
}
if ($payout_type === 'percentage' && floatval($payout_value) > 100) {
    http_response_code(400);
    echo json_encode(["success" => false, "message" => "payout_value (percentage) cannot exceed 100."]);
    exit;
}

// validate optional numeric fields if provided
if ($min_total_hours !== null && $min_total_hours !== "" && !is_numeric($min_total_hours)) {
    http_response_code(400);
    echo json_encode(["success" => false, "message" => "min_total_hours must be a number or null."]);
    exit;
}
if ($min_daily_hours !== null && $min_daily_hours !== "" && !is_numeric($min_daily_hours)) {
    http_response_code(400);
    echo json_encode(["success" => false, "message" => "min_daily_hours must be a number or null."]);
    exit;
}
if ($min_daily_hours_max !== null && $min_daily_hours_max !== "" && !is_numeric($min_daily_hours_max)) {
    http_response_code(400);
    echo json_encode(["success" => false, "message" => "min_daily_hours_max must be a number or null."]);
    exit;
}
if ($min_days_credited !== null && $min_days_credited !== "" && !is_numeric($min_days_credited)) {
    http_response_code(400);
    echo json_encode(["success" => false, "message" => "min_days_credited must be a number or null."]);
    exit;
}

// Optional: sanity constraint - min_daily_hours and min_daily_hours_max should be <= 24
if ($min_daily_hours !== null && $min_daily_hours !== "" && floatval($min_daily_hours) > 24) {
    http_response_code(400);
    echo json_encode(["success" => false, "message" => "min_daily_hours cannot exceed 24 hours."]);
    exit;
}
if ($min_daily_hours_max !== null && $min_daily_hours_max !== "" && floatval($min_daily_hours_max) > 24) {
    http_response_code(400);
    echo json_encode(["success" => false, "message" => "min_daily_hours_max cannot exceed 24 hours."]);
    exit;
}

// is_deduction must be 0/1
if (!in_array($is_deduction, [0,1], true)) {
    $is_deduction = $is_deduction ? 1 : 0;
}

try {
    // Normalize values
    $nameEsc = $conn->real_escape_string($name);
    $descriptionEsc = $description === null || $description === '' ? "NULL" : ("'" . $conn->real_escape_string($description) . "'");
    $min_total_hours_sql = ($min_total_hours === null || $min_total_hours === '') ? "NULL" : (floatval($min_total_hours));
    $min_daily_hours_sql = ($min_daily_hours === null || $min_daily_hours === '') ? "NULL" : (floatval($min_daily_hours));
    $min_daily_hours_max_sql = ($min_daily_hours_max === null || $min_daily_hours_max === '') ? "NULL" : (floatval($min_daily_hours_max));
    $min_days_credited_sql = ($min_days_credited === null || $min_days_credited === '') ? "NULL" : (floatval($min_days_credited));
    $payout_typeEsc = $conn->real_escape_string($payout_type);
    $payout_value_sql = floatval($payout_value);
    $is_active_sql = intval($is_active) ? 1 : 0;
    $is_deduction_sql = intval($is_deduction) ? 1 : 0;
    $priority_sql = intval($priority);
    $applies_sql = ($applies_to_employee_type === null || $applies_to_employee_type === '') ? "NULL" : ("'" . $conn->real_escape_string($applies_to_employee_type) . "'");

    // Add applies_to_department_id and applies_to_position_id to SQL
    $applies_to_department_sql = $applies_to_department_id !== null ? "'" . $conn->real_escape_string($applies_to_department_id) . "'" : "NULL";
    $applies_to_position_sql = $applies_to_position_id !== null ? "'" . $conn->real_escape_string($applies_to_position_id) . "'" : "NULL";

    // Build SQL with explicit NULLs for numeric optional fields
    $sql = "
        INSERT INTO reward_rules
            (name, description, min_total_hours, min_daily_hours, min_daily_hours_max, min_days_credited, payout_type, payout_value, is_active, is_deduction, priority, applies_to_employee_type, applies_to_department_id, applies_to_position_id)
        VALUES
            (
               '{$nameEsc}',
               {$descriptionEsc},
               " . ($min_total_hours_sql === "NULL" ? "NULL" : $min_total_hours_sql) . ",
               " . ($min_daily_hours_sql === "NULL" ? "NULL" : $min_daily_hours_sql) . ",
               " . ($min_daily_hours_max_sql === "NULL" ? "NULL" : $min_daily_hours_max_sql) . ",
               " . ($min_days_credited_sql === "NULL" ? "NULL" : $min_days_credited_sql) . ",
               '{$payout_typeEsc}',
               {$payout_value_sql},
               {$is_active_sql},
               {$is_deduction_sql},
               {$priority_sql},
               {$applies_sql},
               {$applies_to_department_sql},
               {$applies_to_position_sql}
            )
    ";

    if (!$conn->query($sql)) {
        throw new Exception($conn->error . " -- SQL: " . $sql);
    }

    $insertId = $conn->insert_id;

    // fetch inserted row to return
    $stmt2 = $conn->prepare("SELECT reward_rule_id, name, description, min_total_hours, min_daily_hours, min_daily_hours_max, min_days_credited, payout_type, payout_value, is_active, is_deduction, priority, applies_to_employee_type, applies_to_department_id, applies_to_position_id, created_at FROM reward_rules WHERE reward_rule_id = ?");
    if ($stmt2 === false) {
        throw new Exception("Prepare failed: " . $conn->error);
    }
    $stmt2->bind_param("i", $insertId);
    $stmt2->execute();
    $res = $stmt2->get_result();
    $row = $res->fetch_assoc();
    $stmt2->close();

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

    echo json_encode(["success" => true, "message" => "Rule created.", "rule" => $row]);
    exit;
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(["success" => false, "message" => "Server error: " . $e->getMessage()]);
    exit;
} finally {
    if (isset($stmt2) && $stmt2) { /* already closed above if used */ }
    // keep connection open/close depends on your app; close here to be safe:
    $conn->close();
}
