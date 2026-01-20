<?php


// update_contribution_override.php
include('../server/connection.php');
include("../server/cors.php");

$data = json_decode(file_get_contents("php://input"), true);

if (!$data || !isset($data['employee_id'], $data['type'], $data['override_amount'])) {
    echo json_encode(["success" => false, "message" => "Missing required fields"]);
    exit;
}

$employee_id = $data['employee_id'];
$type = strtolower($data['type']); // "pagibig", "philhealth", or "sss"
$override_amount = (float)$data['override_amount'];
$is_override_enabled = isset($data['is_override_enabled']) ? (int)$data['is_override_enabled'] : 0;

// Map table names based on type
$tableMap = [
    "pagibig" => "pagibig_contribution",
    "philhealth" => "philhealth_contribution",
    "sss" => "sss_contribution"
];

if (!array_key_exists($type, $tableMap)) {
    echo json_encode(["success" => false, "message" => "Invalid contribution type"]);
    exit;
}

$table = $tableMap[$type];

// 1) Update override on the proper contribution table
$stmt = $conn->prepare("
    UPDATE {$table}
    SET override_employee_share = ?, is_override_enabled = ?
    WHERE employee_id = ?
");
$stmt->bind_param("dis", $override_amount, $is_override_enabled, $employee_id);
$stmt->execute();

// 2) Fetch updated contribution row to compute effective share (as before)
$stmt2 = $conn->prepare("
    SELECT employee_share, override_employee_share, is_override_enabled
    FROM {$table}
    WHERE employee_id = ?
");
$stmt2->bind_param("s", $employee_id);
$stmt2->execute();
$result = $stmt2->get_result();

$response = ["success" => true, "message" => "Override updated successfully"];

if ($row = $result->fetch_assoc()) {
    $effective_share = ($row['is_override_enabled'] && $row['override_employee_share'] !== null)
        ? (float)$row['override_employee_share']
        : (float)$row['employee_share'];

    $response["override_employee_share"] = $override_amount;
    $response["is_override_enabled"] = $is_override_enabled;
    $response["effective_share"] = $effective_share;
}

// 3) Fetch the latest payroll row for this employee and include effective contribution values
//    (Join contribution tables so frontend gets up-to-date fields)
$payrollSql = "
SELECT p.*,
       COALESCE(s.override_employee_share, s.employee_share) AS sss_employee_share,
       s.is_override_enabled AS sss_override_enabled,
       COALESCE(ph.override_employee_share, ph.employee_share) AS philhealth_employee_share,
       ph.is_override_enabled AS philhealth_override_enabled,
       COALESCE(pg.override_employee_share, pg.employee_share) AS pagibig_employee_share,
       pg.is_override_enabled AS pagibig_override_enabled
FROM payroll p
LEFT JOIN sss_contribution s ON s.employee_id = p.employee_id
LEFT JOIN philhealth_contribution ph ON ph.employee_id = p.employee_id
LEFT JOIN pagibig_contribution pg ON pg.employee_id = p.employee_id
WHERE p.employee_id = ?
ORDER BY p.date_until DESC
LIMIT 1
";

$stmt3 = $conn->prepare($payrollSql);
$stmt3->bind_param("s", $employee_id);
$stmt3->execute();
$payrollResult = $stmt3->get_result();

if ($payrollRow = $payrollResult->fetch_assoc()) {
    // Optionally cast numeric fields to floats (or leave strings if your frontend expects strings)
    $payrollRow['sss_employee_share'] = isset($payrollRow['sss_employee_share']) ? (float)$payrollRow['sss_employee_share'] : 0;
    $payrollRow['sss_override_enabled'] = isset($payrollRow['sss_override_enabled']) ? (int)$payrollRow['sss_override_enabled'] : 0;
    $payrollRow['philhealth_employee_share'] = isset($payrollRow['philhealth_employee_share']) ? (float)$payrollRow['philhealth_employee_share'] : 0;
    $payrollRow['philhealth_override_enabled'] = isset($payrollRow['philhealth_override_enabled']) ? (int)$payrollRow['philhealth_override_enabled'] : 0;
    $payrollRow['pagibig_employee_share'] = isset($payrollRow['pagibig_employee_share']) ? (float)$payrollRow['pagibig_employee_share'] : 0;
    $payrollRow['pagibig_override_enabled'] = isset($payrollRow['pagibig_override_enabled']) ? (int)$payrollRow['pagibig_override_enabled'] : 0;

    // 4) Fetch loans for the employee (optional but useful for the UI)
    $loans = [];
    $loanStmt = $conn->prepare("SELECT * FROM loans WHERE employee_id = ?");
    $loanStmt->bind_param("s", $employee_id);
    $loanStmt->execute();
    $loanRes = $loanStmt->get_result();
    while ($loanRow = $loanRes->fetch_assoc()) {
        // cast numeric fields if you want
        if (isset($loanRow['balance'])) $loanRow['balance'] = (float)$loanRow['balance'];
        if (isset($loanRow['loan_amount'])) $loanRow['loan_amount'] = (float)$loanRow['loan_amount'];
        $loans[] = $loanRow;
    }
    $payrollRow['loans'] = $loans;

    $response['payroll'] = $payrollRow;
} else {
    // No payroll found — that's okay; still return override info so frontend can update
    $response['payroll'] = null;
}

echo json_encode($response);
$conn->close();















// // header("Access-Control-Allow-Origin: *");
// // header("Access-Control-Allow-Methods: POST, GET, OPTIONS, PUT, DELETE");
// // header("Access-Control-Allow-Headers: Content-Type, Authorization");
// // header("Content-Type: application/json; charset=UTF-8");

// // if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
// //     http_response_code(200);
// //     exit();
// // }
// //C:\xampp\htdocs\central_juan\backend\payroll\update_contribution_override.php
// include('../server/connection.php');
// include("../server/cors.php");

// $data = json_decode(file_get_contents("php://input"), true);

// if (!$data || !isset($data['employee_id'], $data['type'], $data['override_amount'])) {
//     echo json_encode(["success" => false, "message" => "Missing required fields"]);
//     exit;
// }

// $employee_id = $data['employee_id'];
// $type = strtolower($data['type']); // "pagibig", "philhealth", or "sss"
// $override_amount = (float)$data['override_amount'];
// $is_override_enabled = isset($data['is_override_enabled']) ? (int)$data['is_override_enabled'] : 0;

// // Map table names based on type
// $tableMap = [
//     "pagibig" => "pagibig_contribution",
//     "philhealth" => "philhealth_contribution",
//     "sss" => "sss_contribution"
// ]; 

// if (!array_key_exists($type, $tableMap)) {
//     echo json_encode(["success" => false, "message" => "Invalid contribution type"]);
//     exit;
// }

// $table = $tableMap[$type];

// // 1. Update override
// $stmt = $conn->prepare("
//     UPDATE {$table}
//     SET override_employee_share = ?, is_override_enabled = ?
//     WHERE employee_id = ?
// ");
// $stmt->bind_param("dis", $override_amount, $is_override_enabled, $employee_id);
// $stmt->execute();

// // 2. Recalculate effective share (optional calculation)
// $stmt2 = $conn->prepare("
//     SELECT employee_share, override_employee_share, is_override_enabled
//     FROM {$table}
//     WHERE employee_id = ?
// ");
// $stmt2->bind_param("s", $employee_id);
// $stmt2->execute();
// $result = $stmt2->get_result();

// $response = ["success" => true, "message" => "Override updated successfully"];

// if ($row = $result->fetch_assoc()) {
//     $effective_share = ($row['is_override_enabled'] && $row['override_employee_share'] !== null)
//         ? (float)$row['override_employee_share']
//         : (float)$row['employee_share'];

//     $response["override_employee_share"] = $override_amount;
//     $response["is_override_enabled"] = $is_override_enabled;
//     $response["effective_share"] = $effective_share;
// }

// echo json_encode($response);
// $conn->close();
