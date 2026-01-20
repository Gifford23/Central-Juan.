<?php
// allowance/exception_bulk_create.php
include("../server/cors.php");
include('../server/connection.php');

header('Content-Type: application/json');

$input = json_decode(file_get_contents('php://input'), true);
if (!$input) $input = $_POST;

$exceptions = $input['exceptions'] ?? null;
$created_by = $input['created_by'] ?? null;

if (!is_array($exceptions) || count($exceptions) === 0) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'exceptions array required']);
    exit;
}

try {
    $conn->begin_transaction();

    $inserted = [];
    $skipped = [];

    foreach ($exceptions as $ex) {
        $payroll_id = isset($ex['payroll_id']) ? intval($ex['payroll_id']) : null;
        $employee_id = $ex['employee_id'] ?? null;
        $allowance_id = array_key_exists('allowance_id', $ex) && $ex['allowance_id'] !== '' ? $ex['allowance_id'] : null;
        $reason = $ex['reason'] ?? null;

        if (!$payroll_id || !$employee_id) {
            // skip invalid
            $skipped[] = ['reason' => 'missing payroll_id or employee_id', 'item' => $ex];
            continue;
        }

        // check duplicate
        if ($allowance_id === null) {
            $stmtCheck = $conn->prepare("SELECT exception_id FROM payroll_allowance_exceptions WHERE payroll_id = ? AND employee_id = ? AND allowance_id IS NULL LIMIT 1");
            $stmtCheck->bind_param("is", $payroll_id, $employee_id);
        } else {
            $aid = intval($allowance_id);
            $stmtCheck = $conn->prepare("SELECT exception_id FROM payroll_allowance_exceptions WHERE payroll_id = ? AND employee_id = ? AND allowance_id = ? LIMIT 1");
            $stmtCheck->bind_param("isi", $payroll_id, $employee_id, $aid);
        }
        $stmtCheck->execute();
        $res = $stmtCheck->get_result();
        if ($res->num_rows > 0) {
            $row = $res->fetch_assoc();
            $skipped[] = ['reason' => 'already exists', 'exception_id' => $row['exception_id'], 'item' => $ex];
            $stmtCheck->close();
            continue;
        }
        $stmtCheck->close();

        // safe insert
        $payroll_e = intval($payroll_id);
        $employee_e = $conn->real_escape_string($employee_id);
        $reason_e = $reason !== null ? $conn->real_escape_string($reason) : '';
        $created_by_e = $created_by !== null ? $conn->real_escape_string($created_by) : '';

        if ($allowance_id === null) {
            $sql = "INSERT INTO payroll_allowance_exceptions (payroll_id, employee_id, allowance_id, reason, created_by) VALUES ({$payroll_e}, '{$employee_e}', NULL, '{$reason_e}', '{$created_by_e}')";
        } else {
            $aid = intval($allowance_id);
            $sql = "INSERT INTO payroll_allowance_exceptions (payroll_id, employee_id, allowance_id, reason, created_by) VALUES ({$payroll_e}, '{$employee_e}', {$aid}, '{$reason_e}', '{$created_by_e}')";
        }
        if (!$conn->query($sql)) {
            throw new Exception("Insert failed: " . $conn->error);
        }
        $newId = $conn->insert_id;
        $inserted[] = ['exception_id' => $newId, 'item' => $ex];
    }

    $conn->commit();

    echo json_encode(['success' => true, 'inserted' => $inserted, 'skipped' => $skipped, 'message' => 'Bulk create processed']);
    exit;
} catch (Exception $e) {
    $conn->rollback();
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Server error: ' . $e->getMessage()]);
    exit;
}
