<?php
// allowance/exception.php
include("../server/cors.php");
include('../server/connection.php');

header('Content-Type: application/json');

// Allow POST (create) and DELETE (delete by exception_id).
$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'POST') {
    // create a single exception
    $input = json_decode(file_get_contents('php://input'), true);
    if (!$input) $input = $_POST;

    $payroll_id = isset($input['payroll_id']) ? intval($input['payroll_id']) : null;
    $employee_id = $input['employee_id'] ?? null;
    // allowance_id can be null (means exclude all allowances for the employee)
    $allowance_id = array_key_exists('allowance_id', $input) && $input['allowance_id'] !== '' ? $input['allowance_id'] : null;
    $reason = $input['reason'] ?? null;
    $created_by = $input['created_by'] ?? null;

    if (!$payroll_id || !$employee_id) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'payroll_id and employee_id are required']);
        exit;
    }

    // prevent duplicate: check if an identical exception already exists
    try {
        if ($allowance_id === null) {
            $stmt = $conn->prepare("SELECT exception_id FROM payroll_allowance_exceptions WHERE payroll_id = ? AND employee_id = ? AND allowance_id IS NULL LIMIT 1");
            $stmt->bind_param("is", $payroll_id, $employee_id);
        } else {
            $aid = intval($allowance_id);
            $stmt = $conn->prepare("SELECT exception_id FROM payroll_allowance_exceptions WHERE payroll_id = ? AND employee_id = ? AND allowance_id = ? LIMIT 1");
            $stmt->bind_param("isi", $payroll_id, $employee_id, $aid);
        }
        $stmt->execute();
        $res = $stmt->get_result();
        if ($res->num_rows > 0) {
            $row = $res->fetch_assoc();
            echo json_encode(['success' => true, 'message' => 'Exception already exists', 'exception_id' => $row['exception_id']]);
            $stmt->close();
            exit;
        }
        $stmt->close();

        // insert
        $sql = "INSERT INTO payroll_allowance_exceptions (payroll_id, employee_id, allowance_id, reason, created_by) VALUES (?, ?, ?, ?, ?)";
        $stmtIns = $conn->prepare($sql);
        // allowance_id may be null -> bind as NULL-able integer
        if ($allowance_id === null) {
            // bind NULL (as i => 0 then set to NULL via passing null var) — easiest is to use dynamic query with NULL placeholder
            $stmtIns->bind_param("issss", $payroll_id, $employee_id, $allowance_id, $reason, $created_by);
            // However mysqli doesn't accept null for integer type via bind if string used; to avoid complexity, we use prepared statement and pass NULL as NULL via param cast:
            // Simplest approach: use a small conditional SQL:
            $stmtIns->close();
            $stmtIns = $conn->prepare("INSERT INTO payroll_allowance_exceptions (payroll_id, employee_id, allowance_id, reason, created_by) VALUES (?, ?, NULL, ?, ?)");
            $stmtIns->bind_param("isss", $payroll_id, $employee_id, $reason, $created_by);
        } else {
            $aid = intval($allowance_id);
            $stmtIns->bind_param("isis", $payroll_id, $employee_id, $aid, $reason);
            // above types must match count; adjust to correct binding below instead of relying on ambiguous binds
        }

        // we'll use safe query building to avoid binding complexity:
        $payroll_e = intval($payroll_id);
        $employee_e = $conn->real_escape_string($employee_id);
        $reason_e = $reason !== null ? $conn->real_escape_string($reason) : '';
        $created_by_e = $created_by !== null ? $conn->real_escape_string($created_by) : '';

        if ($allowance_id === null) {
            $sql2 = "INSERT INTO payroll_allowance_exceptions (payroll_id, employee_id, allowance_id, reason, created_by) VALUES ({$payroll_e}, '{$employee_e}', NULL, '{$reason_e}', '{$created_by_e}')";
        } else {
            $aid = intval($allowance_id);
            $sql2 = "INSERT INTO payroll_allowance_exceptions (payroll_id, employee_id, allowance_id, reason, created_by) VALUES ({$payroll_e}, '{$employee_e}', {$aid}, '{$reason_e}', '{$created_by_e}')";
        }

        if (!$conn->query($sql2)) {
            throw new Exception("Insert failed: " . $conn->error);
        }
        $newId = $conn->insert_id;
        echo json_encode(['success' => true, 'message' => 'Exception created', 'exception_id' => $newId]);
        exit;
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => 'Server error: ' . $e->getMessage()]);
        exit;
    }
} elseif ($method === 'DELETE') {
    // delete by exception_id
    // client must send JSON { exception_id: N } or send as form-data
    $input = json_decode(file_get_contents('php://input'), true);
    if (!$input) $input = $_POST;

    $exception_id = isset($input['exception_id']) ? intval($input['exception_id']) : null;
    if (!$exception_id) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'exception_id required']);
        exit;
    }

    try {
        $stmt = $conn->prepare("DELETE FROM payroll_allowance_exceptions WHERE exception_id = ? LIMIT 1");
        $stmt->bind_param("i", $exception_id);
        if (!$stmt->execute()) {
            throw new Exception($stmt->error);
        }
        $affected = $stmt->affected_rows;
        $stmt->close();
        if ($affected > 0) {
            echo json_encode(['success' => true, 'message' => 'Exception removed']);
        } else {
            echo json_encode(['success' => false, 'message' => 'Exception not found']);
        }
        exit;
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => 'Server error: ' . $e->getMessage()]);
        exit;
    }
} else {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Method not allowed']);
    exit;
}
