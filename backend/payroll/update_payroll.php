<?php
include('../server/connection.php');
include("../server/cors.php");

// Read input
$data = json_decode(file_get_contents("php://input"), true);

// Validate required ID
if (!isset($data['payroll_id'])) {
    echo json_encode(["success" => false, "message" => "Missing payroll_id."]);
    exit();
}

$payroll_id = $data['payroll_id'];
$payroll_type = isset($data['payroll_type']) ? $data['payroll_type'] : null;
$contribution_deduction_type = isset($data['contribution_deduction_type']) ? $data['contribution_deduction_type'] : null;

// ✅ NEW: Optional incentives
$total_incentives = isset($data['total_incentives']) ? $data['total_incentives'] : null;
$incentive_remarks = isset($data['incentive_remarks']) ? $data['incentive_remarks'] : null;

// ✅ NEW: Retro inputs (optional) - will be APPROVED/APPLIED immediately
$retro_amount = isset($data['retro_amount']) ? $data['retro_amount'] : null; // numeric
$retro_description = isset($data['retro_description']) ? $data['retro_description'] : null;
$retro_effective_date = isset($data['retro_effective_date']) ? $data['retro_effective_date'] : null; // optional date string
$retro_created_by = isset($data['created_by']) ? $data['created_by'] : null;

// ✅ NEW: Cancel pending retro (keeps existing cancel path)
$cancel_retro_id = isset($data['cancel_retro_id']) ? $data['cancel_retro_id'] : null;

// Optional: Validate values if needed
$validTypes = ['monthly', 'semi-monthly'];
if ($contribution_deduction_type && !in_array($contribution_deduction_type, $validTypes)) {
    echo json_encode(["success" => false, "message" => "Invalid contribution_deduction_type."]);
    exit();
}
if ($payroll_type && !in_array($payroll_type, $validTypes)) {
    echo json_encode(["success" => false, "message" => "Invalid payroll_type."]);
    exit();
}

// Fetch payroll row to get employee_id and date_until (for retro scoping & validation)
$employee_id = null;
$payroll_date_until = null;
$select_sql = "SELECT employee_id, date_until FROM payroll WHERE payroll_id = ?";
$sel_stmt = $conn->prepare($select_sql);
if ($sel_stmt) {
    $sel_stmt->bind_param("i", $payroll_id);
    $sel_stmt->execute();
    $sel_stmt->bind_result($f_employee_id, $f_date_until);
    if ($sel_stmt->fetch()) {
        $employee_id = $f_employee_id;
        $payroll_date_until = $f_date_until;
    }
    $sel_stmt->close();
}

// If we couldn't get employee_id, we still allow updates of payroll fields,
// but retro operations will be blocked (we need employee context).
if (!$employee_id && ($retro_amount !== null || $cancel_retro_id !== null)) {
    echo json_encode(["success" => false, "message" => "Unable to determine employee for payroll. Retro operations aborted."]);
    exit();
}

// ------------------ Build dynamic UPDATE for payroll (existing behavior) ------------------
$fields = [];
$params = [];
$types = "";

// Always update payroll_type and contribution_deduction_type (keep current logic)
$fields[] = "payroll_type = ?";
$params[] = $payroll_type;
$types .= "s";

$fields[] = "contribution_deduction_type = ?";
$params[] = $contribution_deduction_type;
$types .= "s";

// Add incentives if provided
if ($total_incentives !== null) {
    $fields[] = "total_incentives = ?";
    $params[] = $total_incentives;
    $types .= "d";
}

if ($incentive_remarks !== null) {
    $fields[] = "incentive_remarks = ?";
    $params[] = $incentive_remarks;
    $types .= "s";
}

// Optionally update total_salary to include incentives (keeps your previous behavior)
if ($total_incentives !== null) {
    // Note: This increments total_salary by the incentive amount.
    $fields[] = "total_salary = total_salary + ?";
    $params[] = $total_incentives;
    $types .= "d";
}

// Add the WHERE condition
$fields_str = implode(", ", $fields);
$sql = "UPDATE payroll SET $fields_str WHERE payroll_id = ?";
$params[] = $payroll_id;
$types .= "i";

$stmt = $conn->prepare($sql);
if (!$stmt) {
    echo json_encode(["success" => false, "message" => "Prepare failed: " . $conn->error]);
    exit();
}

// bind params dynamically
$bind_params = [];
$bind_params[] = $types;
foreach ($params as $k => $v) {
    $bind_params[] = &$params[$k];
}
call_user_func_array([$stmt, 'bind_param'], $bind_params);

$update_ok = $stmt->execute();
$stmt->close();

if (!$update_ok) {
    echo json_encode(["success" => false, "message" => "Execution failed: " . $conn->error]);
    exit();
}

// ------------------ Retro: Insert AND mark as applied immediately ------------------
$retro_inserted_id = null;
$retro_applied = false;
if ($retro_amount !== null) {
    // basic validation
    $retro_amount_num = floatval($retro_amount);
    if ($retro_amount_num == 0.0) {
        // reject zero
        echo json_encode(["success" => false, "message" => "retro_amount cannot be zero."]);
        exit();
    }
    if (!$retro_description || strlen(trim($retro_description)) < 3) {
        echo json_encode(["success" => false, "message" => "retro_description is required (min 3 chars)."]);
        exit();
    }

    // Insert into retro_adjustments table with status='applied' and applied_in_payroll_id set
    $ins_sql = "INSERT INTO retro_adjustments 
        (employee_id, amount, description, effective_date, created_by, status, applied_in_payroll_id, applied_at, created_at)
        VALUES (?, ?, ?, ?, ?, 'applied', ?, NOW(), NOW())";
    $ins_stmt = $conn->prepare($ins_sql);
    if ($ins_stmt) {
        $eff_date = ($retro_effective_date && strtotime($retro_effective_date) !== false) ? $retro_effective_date : null;
        $created_by = $retro_created_by ? $retro_created_by : 'system';

        // bind: employee_id (s), amount (d), description (s), effective_date (s|null), created_by (s), applied_in_payroll_id (i)
        $ins_stmt->bind_param("sdsssi",
            $employee_id,
            $retro_amount_num,
            $retro_description,
            $eff_date,
            $created_by,
            $payroll_id
        );

        if ($ins_stmt->execute()) {
            $retro_inserted_id = $ins_stmt->insert_id;
            $retro_applied = true;
        } else {
            echo json_encode(["success" => false, "message" => "Failed to insert retro_adjustment: " . $ins_stmt->error]);
            $ins_stmt->close();
            $conn->close();
            exit();
        }
        $ins_stmt->close();
    } else {
        echo json_encode(["success" => false, "message" => "Prepare failed (retro insert): " . $conn->error]);
        $conn->close();
        exit();
    }

    // Also increment payroll.total_salary by retro amount (so payroll reflects the retro immediately)
    $inc_sql = "UPDATE payroll SET total_salary = total_salary + ? WHERE payroll_id = ?";
    $inc_stmt = $conn->prepare($inc_sql);
    if ($inc_stmt) {
        $inc_stmt->bind_param("di", $retro_amount_num, $payroll_id);
        $inc_stmt->execute();
        $inc_stmt->close();
    } // if it fails, we don't abort — the retro row exists and is applied; but you can log/alert as needed
}

// ------------------ Cancel pending retro (if requested) ------------------
$cancelled = false;
if ($cancel_retro_id !== null) {
    // Ensure the retro belongs to the same employee and is pending
    $check_sql = "SELECT retro_id FROM retro_adjustments WHERE retro_id = ? AND employee_id = ? AND status = 'pending' LIMIT 1";
    $chk_stmt = $conn->prepare($check_sql);
    if ($chk_stmt) {
        $chk_stmt->bind_param("is", $cancel_retro_id, $employee_id);
        $chk_stmt->execute();
        $chk_stmt->store_result();
        if ($chk_stmt->num_rows === 1) {
            // proceed to cancel
            $upd_sql = "UPDATE retro_adjustments SET status = 'cancelled' WHERE retro_id = ? AND status = 'pending'";
            $upd_stmt = $conn->prepare($upd_sql);
            if ($upd_stmt) {
                $upd_stmt->bind_param("i", $cancel_retro_id);
                if ($upd_stmt->execute()) {
                    $cancelled = true;
                }
                $upd_stmt->close();
            }
        }
        $chk_stmt->close();
    }
}

// ------------------ Return updated pending retro total for this employee & payroll cutoff ------------------
// Use effective_date <= payroll.date_until to match UI logic
$total_pending = 0.0;
$pending_sql = "SELECT COALESCE(SUM(amount),0) FROM retro_adjustments WHERE employee_id = ? AND status = 'pending' AND (effective_date IS NULL OR effective_date <= ?)";
$pend_stmt = $conn->prepare($pending_sql);
if ($pend_stmt) {
    $pend_stmt->bind_param("ss", $employee_id, $payroll_date_until);
    $pend_stmt->execute();
    $pend_stmt->bind_result($sum_pending);
    if ($pend_stmt->fetch()) {
        $total_pending = floatval($sum_pending);
    }
    $pend_stmt->close();
}

// Respond success and include relevant info
$response = [
    "success" => true,
    "message" => "Payroll updated successfully.",
    "data" => [
        "payroll_id" => $payroll_id,
        "payroll_type" => $payroll_type,
        "contribution_deduction_type" => $contribution_deduction_type,
        "total_incentives" => $total_incentives,
        "incentive_remarks" => $incentive_remarks,
        "retro_inserted_id" => $retro_inserted_id,
        "retro_applied" => $retro_applied,
        "total_retro_pending" => number_format($total_pending, 2, ".", ""),
        "retro_cancelled" => $cancelled ? true : false
    ]
];

echo json_encode($response);

$conn->close();
?>
