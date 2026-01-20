<?php
// unassign_employee.php
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

require_once '../server/connection.php'; // adjust path

// Read JSON body if present, otherwise fallback to form data
$inputJSON = file_get_contents('php://input');
$input = json_decode($inputJSON, true);
if (!is_array($input)) {
    // fallback to $_POST
    $input = $_POST;
}

// Normalize employee_ids to array
$employee_ids = [];
if (isset($input['employee_id'])) {
    if (is_array($input['employee_id'])) {
        $employee_ids = $input['employee_id'];
    } else {
        $employee_ids = [ (string)$input['employee_id'] ];
    }
} elseif (isset($input['employee_ids'])) {
    if (is_array($input['employee_ids'])) $employee_ids = $input['employee_ids'];
}

// optional branch_id to guard updates
$branch_id = isset($input['branch_id']) && $input['branch_id'] !== '' ? $input['branch_id'] : null;

if (empty($employee_ids)) {
    echo json_encode([
        'success' => false,
        'message' => 'No employee_id provided.'
    ]);
    exit;
}

// sanitize: keep only non-empty strings
$employee_ids = array_values(array_filter(array_map('strval', $employee_ids), function($v){ return $v !== ''; }));

if (empty($employee_ids)) {
    echo json_encode([
        'success' => false,
        'message' => 'No valid employee_id provided.'
    ]);
    exit;
}

try {
    $conn->begin_transaction();

    $results = [
        'succeeded' => [],
        'failed' => []
    ];

    // Prepared statement to clear branch_id on employee(s).
    // We'll update per employee to keep prepared statements simple and to capture per-employee failures.
    $stmtUpdateEmp = $conn->prepare(
        $branch_id
            ? "UPDATE employees SET branch_id = NULL WHERE employee_id = ? AND branch_id = ?"
            : "UPDATE employees SET branch_id = NULL WHERE employee_id = ?"
    );
    if (!$stmtUpdateEmp) throw new Exception("Prepare failed: " . $conn->error);

    // Prepared stmt to clear assigned_employee_id on branches where this employee was set as manager
    $stmtClearBranchAssigned = $conn->prepare(
        $branch_id
            ? "UPDATE branches SET assigned_employee_id = NULL WHERE assigned_employee_id = ? AND branch_id = ?"
            : "UPDATE branches SET assigned_employee_id = NULL WHERE assigned_employee_id = ?"
    );
    if (!$stmtClearBranchAssigned) throw new Exception("Prepare failed: " . $conn->error);

    foreach ($employee_ids as $empId) {
        // 1) Update employee
        if ($branch_id) {
            $stmtUpdateEmp->bind_param('ss', $empId, $branch_id);
        } else {
            $stmtUpdateEmp->bind_param('s', $empId);
        }
        if (!$stmtUpdateEmp->execute()) {
            $results['failed'][] = ['employee_id' => $empId, 'error' => $stmtUpdateEmp->error];
            continue;
        }

        // check affected rows (if you used branch_id as guard it ensures we don't clear if not assigned to that branch)
        if ($stmtUpdateEmp->affected_rows >= 0) {
            // 2) If this employee was the assigned_employee for any branch, clear it (optionally only for the branch_id)
            if ($branch_id) {
                $stmtClearBranchAssigned->bind_param('ss', $empId, $branch_id);
            } else {
                $stmtClearBranchAssigned->bind_param('s', $empId);
            }
            if (!$stmtClearBranchAssigned->execute()) {
                // Branch update failure is non-fatal for employee unassign but report it
                $results['failed'][] = ['employee_id' => $empId, 'error' => $stmtClearBranchAssigned->error];
                continue;
            }
            $results['succeeded'][] = $empId;
        } else {
            // If no rows affected on employees update, still treat as succeeded if employee exists but branch not matched; 
            // here we check if employee exists
            $chk = $conn->prepare("SELECT employee_id FROM employees WHERE employee_id = ? LIMIT 1");
            $chk->bind_param('s', $empId);
            $chk->execute();
            $chk->store_result();
            if ($chk->num_rows > 0) {
                // employee exists but maybe branch mismatch — still consider as succeeded (idempotent)
                $results['succeeded'][] = $empId;
            } else {
                $results['failed'][] = ['employee_id' => $empId, 'error' => 'employee_not_found'];
            }
            $chk->close();
        }
    }

    $stmtUpdateEmp->close();
    $stmtClearBranchAssigned->close();

    $conn->commit();

    echo json_encode([
        'success' => true,
        'succeeded' => $results['succeeded'],
        'failed' => $results['failed'],
        'message' => count($results['succeeded']) . ' unassigned, ' . count($results['failed']) . ' failed.'
    ]);
    exit;
} catch (Exception $ex) {
    if ($conn->errno) $conn->rollback();
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Server error: ' . $ex->getMessage()
    ]);
    exit;
}
