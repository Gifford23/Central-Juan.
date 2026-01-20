<?php
// update_commission_based.php
header('Content-Type: application/json; charset=utf-8');

// keep errors out of JSON responses; log to PHP error log instead
ini_set('display_errors', 0);
ini_set('log_errors', 1);
error_reporting(E_ALL);

include("../server/cors.php");
include('../server/connection.php');

// Read JSON input (PUT / POST)
$raw = file_get_contents('php://input');
$input = json_decode($raw, true);
if ($input === null && !empty($_POST)) $input = $_POST;

if (!is_array($input)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'status' => 'error', 'message' => 'Invalid JSON payload']);
    exit;
}

$payroll_id = isset($input['payroll_id']) ? intval($input['payroll_id']) : null;
$employee_id = trim($input['employee_id'] ?? '');
$commission_raw = $input['commission_based'] ?? null;
// allow sending explicit null to trigger auto-compute
$provided_total_commission = array_key_exists('total_commission', $input) ? $input['total_commission'] : null;
$total_commission = isset($provided_total_commission) ? (float)$provided_total_commission : null;
$date_from = $input['date_from'] ?? null;
$date_until = $input['date_until'] ?? null;
$current_user = $input['current_user'] ?? null;

if ($employee_id === '' && !$payroll_id) {
    http_response_code(400);
    echo json_encode(['success' => false, 'status' => 'error', 'message' => 'employee_id or payroll_id is required']);
    exit;
}

// Normalize commission value → yes | no
$commission_based = 'no';
if ($commission_raw === true || $commission_raw === 1 || $commission_raw === '1' || strtolower((string)$commission_raw) === 'yes') {
    $commission_based = 'yes';
}

try {
    // ---------------------------
    // Only fallback to latest payroll_logs IF the frontend DID NOT provide dates
    // ---------------------------
    $datesProvidedByFrontend = array_key_exists('date_from', $input) && array_key_exists('date_until', $input);

    if (!$datesProvidedByFrontend && (empty($date_from) || empty($date_until))) {
        $logq = $conn->query("SELECT id, date_from, date_until FROM payroll_logs ORDER BY id DESC LIMIT 1");
        if ($logq && $row = $logq->fetch_assoc()) {
            if (empty($date_from)) $date_from = $row['date_from'];
            if (empty($date_until)) $date_until = $row['date_until'];
        }
    }

    // ---------------------------
    // If total_commission not provided -> compute from payroll rows for EXACT date range
    // Use exact match: date_from = ? AND date_until = ?
    // ---------------------------
    if ($total_commission === null) {
        if (!empty($employee_id) && !empty($date_from) && !empty($date_until)) {
            $calcStmt = $conn->prepare("
                SELECT COALESCE(SUM(COALESCE(total_commission,0)),0) AS sum_comm
                FROM payroll
                WHERE employee_id = ?
                  AND date_from = ?
                  AND date_until = ?
            ");
            if ($calcStmt) {
                $calcStmt->bind_param('sss', $employee_id, $date_from, $date_until);
                $calcStmt->execute();
                $cres = $calcStmt->get_result();
                $sumRow = $cres->fetch_assoc();
                $computed = isset($sumRow['sum_comm']) ? (float)$sumRow['sum_comm'] : 0.0;
                $total_commission = $computed;
                $calcStmt->close();
            } else {
                // prepare failed - fallback to 0.0
                error_log("Warning: failed to prepare commission sum query: " . $conn->error);
                $total_commission = 0.0;
            }
        } else {
            // not enough data to compute -> default to 0
            $total_commission = 0.0;
        }
    }

    // ---------------------------
    // 1) ALWAYS update payroll(s) (by payroll_id if given; otherwise by employee_id)
    // ---------------------------
    $val_comm = (float)$total_commission;

    if ($payroll_id) {
        $stmt = $conn->prepare("UPDATE payroll SET commission_based = ?, total_commission = ? WHERE payroll_id = ?");
        if (!$stmt) throw new Exception($conn->error);
        $stmt->bind_param('sdi', $commission_based, $val_comm, $payroll_id);
        if (!$stmt->execute()) throw new Exception($stmt->error);
        $affected = $stmt->affected_rows;
        $stmt->close();

        // ensure fallback values for commission upsert are present
        if (empty($employee_id)) {
            $r = $conn->prepare("SELECT employee_id, name, basic_salary, date_from, date_until FROM payroll WHERE payroll_id = ? LIMIT 1");
            if ($r) {
                $r->bind_param('i', $payroll_id);
                $r->execute();
                $res = $r->get_result();
                if ($row = $res->fetch_assoc()) {
                    $employee_id = $row['employee_id'];
                    if (empty($date_from)) $date_from = $row['date_from'];
                    if (empty($date_until)) $date_until = $row['date_until'];
                    $payroll_name = $row['name'];
                    $basic_salary_value = (float)$row['basic_salary'];
                }
                $r->close();
            }
        }
    } else {
        // update all payroll rows for that employee (existing behavior)
        $stmt = $conn->prepare("UPDATE payroll SET commission_based = ?, total_commission = ? WHERE employee_id = ?");
        if (!$stmt) throw new Exception($conn->error);
        $stmt->bind_param('sds', $commission_based, $val_comm, $employee_id);
        if (!$stmt->execute()) throw new Exception($stmt->error);
        $affected = $stmt->affected_rows;
        $stmt->close();

        // get a sample payroll row for fallback values
        $r = $conn->prepare("SELECT payroll_id, name, basic_salary, date_from, date_until FROM payroll WHERE employee_id = ? ORDER BY payroll_id DESC LIMIT 1");
        if ($r) {
            $r->bind_param('s', $employee_id);
            $r->execute();
            $res = $r->get_result();
            if ($row = $res->fetch_assoc()) {
                $payroll_id = (int)$row['payroll_id'];
                if (empty($date_from)) $date_from = $row['date_from'];
                if (empty($date_until)) $date_until = $row['date_until'];
                $payroll_name = $row['name'];
                $basic_salary_value = (float)$row['basic_salary'];
            }
            $r->close();
        }
    }

    // ---------------------------
    // 2) Attempt commission_per_employee upsert (do NOT rollback payroll if this fails)
    // ---------------------------
    $commissionUpsertOk = true;
    $commissionWarning = null;

    $canInsertCommission =
        $commission_based === 'yes' &&
        $val_comm >= 0 &&
        !empty($employee_id) &&
        !empty($date_from) &&
        !empty($date_until);

    if ($canInsertCommission) {
        try {
            // fill missing payroll_name/basic_salary if needed
            if (!isset($payroll_name) || !isset($basic_salary_value)) {
                $q = $conn->prepare("SELECT name, basic_salary FROM payroll WHERE payroll_id = ? LIMIT 1");
                if ($q) {
                    $q->bind_param('i', $payroll_id);
                    $q->execute();
                    $r = $q->get_result();
                    if ($rr = $r->fetch_assoc()) {
                        $payroll_name = $rr['name'];
                        $basic_salary_value = (float)$rr['basic_salary'];
                    }
                    $q->close();
                }
            }

            // find existing commission row for same employee + date range
            $finder = $conn->prepare("SELECT commission_id FROM commission_per_employee WHERE employee_id = ? AND date_from = ? AND date_until = ? LIMIT 1");
            if (!$finder) throw new Exception($conn->error);
            $finder->bind_param('sss', $employee_id, $date_from, $date_until);
            if (!$finder->execute()) throw new Exception($finder->error);
            $resf = $finder->get_result();

            $total_val = (float)$val_comm;
            $salary_val = isset($basic_salary_value) ? (float)$basic_salary_value : 0.00;

            if ($rowf = $resf->fetch_assoc()) {
                // update existing
                $commission_id = (int)$rowf['commission_id'];

                // correct bind types: s d d d d i  => 'sddddi'
                $upd = $conn->prepare("UPDATE commission_per_employee SET name = ?, basic_salary = ?, commission = ?, total = ?, salary = ? WHERE commission_id = ?");
                if (!$upd) throw new Exception($conn->error);
                $upd->bind_param('sddddi', $payroll_name, $basic_salary_value, $total_val, $total_val, $salary_val, $commission_id);
                if (!$upd->execute()) throw new Exception($upd->error);
                $upd->close();
            } else {
                // insert new
                $ins = $conn->prepare("INSERT INTO commission_per_employee (employee_id, name, date_from, date_until, basic_salary, commission, total, salary) VALUES (?, ?, ?, ?, ?, ?, ?, ?)");
                if (!$ins) throw new Exception($conn->error);
                $ins->bind_param('ssssdddd', $employee_id, $payroll_name, $date_from, $date_until, $basic_salary_value, $total_val, $total_val, $salary_val);
                if (!$ins->execute()) throw new Exception($ins->error);
                $ins->close();
            }

            $finder->close();
        } catch (Exception $ce) {
            // Log the commission error but do NOT rollback payroll update
            $commissionUpsertOk = false;
            $commissionWarning = $ce->getMessage();
            error_log("commission_per_employee upsert failed for employee_id={$employee_id} date_from={$date_from} date_until={$date_until} : " . $commissionWarning);
        }
    }

    // ---------------------------
    // 3) Return latest payroll row to frontend
    // ---------------------------
    $payrollRow = null;
    $get = $conn->prepare("SELECT * FROM payroll WHERE payroll_id = ? LIMIT 1");
    if ($get) {
        $get->bind_param('i', $payroll_id);
        $get->execute();
        $gres = $get->get_result();
        $payrollRow = $gres->fetch_assoc() ?: null;
        $get->close();
    }

    $response = [
        'success' => true,
        'status' => 'success',
        'message' => 'Commission and payroll updated',
        'commission_based' => $commission_based,
        'payroll' => $payrollRow,
        'rows_updated' => $affected ?? 0
    ];

    if (!$commissionUpsertOk) {
        $response['commission_warning'] = $commissionWarning;
    }

    echo json_encode($response);
    exit;
} catch (Exception $e) {
    // If payroll update itself failed, return error
    http_response_code(500);
    error_log("update_commission_based failed: " . $e->getMessage());
    echo json_encode(['success' => false, 'status' => 'error', 'message' => 'Failed to update payroll', 'error' => $e->getMessage()]);
    exit;
}
