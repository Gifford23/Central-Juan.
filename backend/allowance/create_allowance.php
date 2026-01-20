<?php
// allowance/create_allowance.php
include("../server/cors.php");
include('../server/connection.php');

header('Content-Type: application/json');

// read input (JSON preferred)
$input = json_decode(file_get_contents('php://input'), true);
if (!$input) $input = $_POST;

$employee_id = $input['employee_id'] ?? null;
$allowance_name = $input['allowance_name'] ?? null;
$amount = isset($input['amount']) ? $input['amount'] : null;
$amount_type = $input['amount_type'] ?? 'fixed';
$percent_of = $input['percent_of'] ?? 'basic_salary';
$frequency = $input['frequency'] ?? 'monthly';
$prorate = isset($input['prorate_if_partial']) ? intval($input['prorate_if_partial']) : 1;
$start_date = isset($input['start_date']) && $input['start_date'] !== '' ? $input['start_date'] : null;
$end_date = isset($input['end_date']) && $input['end_date'] !== '' ? $input['end_date'] : null;

// basic validation
if (!$employee_id || !$allowance_name || ($amount === null || $amount === '')) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'employee_id, allowance_name, and amount are required']);
    exit;
}

if (!in_array($amount_type, ['fixed','percent'])) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Invalid amount_type']);
    exit;
}

if (!in_array($frequency, ['monthly','semi-monthly'])) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Invalid frequency']);
    exit;
}

$amount = floatval($amount);

try {
    // Build VALUES placeholders dynamically so we can use NULL for missing dates
    // columns order: employee_id, allowance_name, amount, amount_type, percent_of, frequency, prorate_if_partial, start_date, end_date, active
    $valuesPlaceholders = '?, ?, ?, ?, ?, ?, ?'; // first 7 required
    $bindTypes = 'ssdsss i'; // placeholder, will be rebuilt correctly below (we'll remove spaces)
    // but we'll build exact types dynamically
    $bindValues = [
        $employee_id,
        $allowance_name,
        $amount,
        $amount_type,
        $percent_of,
        $frequency,
        $prorate
    ];
    $types = 'ssdsssi'; // s,s,d,s,s,s,i

    if ($start_date !== null) {
        $valuesPlaceholders .= ', ?';
        $bindValues[] = $start_date;
        $types .= 's';
    } else {
        $valuesPlaceholders .= ', NULL';
    }

    if ($end_date !== null) {
        $valuesPlaceholders .= ', ?';
        $bindValues[] = $end_date;
        $types .= 's';
    } else {
        $valuesPlaceholders .= ', NULL';
    }

    $valuesPlaceholders .= ', 1'; // active = 1

    $sql = "INSERT INTO employee_allowance (employee_id, allowance_name, amount, amount_type, percent_of, frequency, prorate_if_partial, start_date, end_date, active)
            VALUES ($valuesPlaceholders)";

    $stmt = $conn->prepare($sql);
    if (!$stmt) {
        throw new Exception("Prepare failed: " . $conn->error);
    }

    // bind params dynamically (call_user_func_array requires references)
    if (count($bindValues) > 0) {
        // create an array of references
        $bindParams = [];
        $bindParams[] = $types;
        foreach ($bindValues as $key => $val) {
            // bind param must be passed by reference
            $bindParams[] = &$bindValues[$key];
        }
        call_user_func_array([$stmt, 'bind_param'], $bindParams);
    }

    if (!$stmt->execute()) {
        throw new Exception("Execute failed: " . $stmt->error);
    }

    $newId = $conn->insert_id;
    $stmt->close();

    echo json_encode(['success' => true, 'message' => 'Allowance created', 'allowance_id' => $newId]);
    exit;
} catch (Exception $e) {
    // better error message for debugging
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Server error: ' . $e->getMessage()]);
    exit;
}
