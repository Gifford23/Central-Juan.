<?php
// create_loan.php (robust fallback — handles item_id strings and logs errors)
include '../server/connection.php';
include("../server/cors.php");
header("Content-Type: application/json; charset=UTF-8");

// quick helper to return JSON and optionally log
function fail($msg, $code = 500, $debug = null) {
    if ($debug) error_log("create_loan.php error: " . $debug);
    http_response_code($code);
    echo json_encode(["success" => false, "message" => $msg, "debug" => $debug ? $debug : null]);
    exit;
}

$raw = file_get_contents("php://input");
$data = json_decode($raw, true);

if (!$data) {
    fail("Invalid JSON input", 400, $raw);
}

try {
    // Normalize inputs
    $employee_id   = isset($data['employee_id']) ? $conn->real_escape_string($data['employee_id']) : null;
    $employee_name = isset($data['employee_name']) ? $conn->real_escape_string($data['employee_name']) : null;
    $liability_type = isset($data['liability_type']) ? $conn->real_escape_string($data['liability_type']) : ($data['loan_type'] ?? 'cash_loan');

    $loan_amount = isset($data['loan_amount']) && $data['loan_amount'] !== '' ? floatval($data['loan_amount']) : 0.00;

    $quantity = null;
    if (isset($data['quantity']) && $data['quantity'] !== '' && $data['quantity'] !== null) {
        if (is_numeric($data['quantity'])) $quantity = intval($data['quantity']);
    }

    $unit_cost = null;
    if (isset($data['unit_cost']) && $data['unit_cost'] !== '' && $data['unit_cost'] !== null) {
        if (is_numeric($data['unit_cost'])) $unit_cost = floatval($data['unit_cost']);
    }

    // item_id may come as string (user typed). Only accept numeric item id, otherwise null.
    $item_id = null;
    if (isset($data['item_id']) && $data['item_id'] !== '' && $data['item_id'] !== null) {
        if (is_numeric($data['item_id'])) {
            $item_id = intval($data['item_id']);
        } else {
            // Not numeric — store as NULL, but keep raw in meta if you want
            $item_id = null;
        }
    }

    $total_cost = null;
    if (isset($data['total_cost']) && $data['total_cost'] !== '' && $data['total_cost'] !== null) {
        if (is_numeric($data['total_cost'])) $total_cost = floatval($data['total_cost']);
    }

    $date_start = isset($data['date_start']) ? $conn->real_escape_string($data['date_start']) : date('Y-m-d');
    $description = isset($data['description']) ? $conn->real_escape_string($data['description']) : null;
    $deduction_schedule = isset($data['deduction_schedule']) ? $conn->real_escape_string($data['deduction_schedule']) : 'monthly';
    $interest_type = isset($data['interest_type']) ? $conn->real_escape_string($data['interest_type']) : 'none';
    $interest_rate = isset($data['interest_rate']) && $data['interest_rate'] !== '' ? floatval($data['interest_rate']) : 0.00;

    // === CHANGED: parse terms as float (allow decimal) instead of forcing int ===
    $terms = 1.0;
    if (isset($data['terms']) && $data['terms'] !== '' && $data['terms'] !== null) {
        $raw_terms = $data['terms'];
        // accept comma as decimal separator
        if (is_string($raw_terms)) {
            $raw_terms = str_replace(',', '.', $raw_terms);
        }
        if (is_numeric($raw_terms)) {
            $terms = floatval($raw_terms);
            if ($terms <= 0) {
                $terms = 1.0;
            }
        } else {
            // non-numeric input -> fallback to 1.0
            $terms = 1.0;
        }
    }
    // === end changes for terms ===

    $is_installment = isset($data['is_installment']) ? (int)$data['is_installment'] : 1;
    $reference_no = isset($data['loan_reference_no']) ? $conn->real_escape_string($data['loan_reference_no']) : null;
    $reason = isset($data['reason']) ? $conn->real_escape_string($data['reason']) : null;
    $created_by = isset($data['created_by']) ? $conn->real_escape_string($data['created_by']) : null;
    $loan_type_for_legacy = isset($data['loan_type']) ? $conn->real_escape_string($data['loan_type']) : 'company';
    $meta = isset($data['meta']) ? $data['meta'] : null;

    // compute total_cost fallback
    if ($total_cost === null) {
        if ($unit_cost !== null && $quantity !== null) {
            $total_cost = $unit_cost * $quantity;
        } else {
            $total_cost = $loan_amount;
        }
    }

    // === NEW: payable_mode support: 'auto' (default) or 'manual' ===
    $payable_mode = isset($data['payable_mode']) ? $conn->real_escape_string($data['payable_mode']) : 'auto';
    $payable_per_term = null;
    if ($payable_mode === 'manual') {
        // manual override if provided and numeric
        if (isset($data['payable_per_term']) && $data['payable_per_term'] !== '' && is_numeric($data['payable_per_term'])) {
            $payable_per_term = floatval($data['payable_per_term']);
        }
    }

    // payable per term logic (auto if not manual-provided)
    if ($payable_per_term === null) {
        $multiplier = ($deduction_schedule === 'semi-monthly') ? 2 : 1;
        $payable_per_term = ($terms > 0) ? round($total_cost / ($terms * $multiplier), 2) : 0.00;
    }
    // === end payable_mode support ===

    $initial_balance = $total_cost;
    $status = 'active';

    // meta: ensure JSON string or NULL
    if ($meta !== null && $meta !== '') {
        if (!is_string($meta)) {
            $meta = json_encode($meta);
        } else {
            json_decode($meta);
            if (json_last_error() !== JSON_ERROR_NONE) {
                $meta = json_encode(['raw' => $meta]);
            }
        }
        $meta_esc = $conn->real_escape_string($meta);
    } else {
        $meta_esc = null;
    }

    // Build column lists and values (use NULL for nulls)
    $cols = [
        'employee_id' => $employee_id !== null ? "'$employee_id'" : "NULL",
        'employee_name' => $employee_name !== null ? "'$employee_name'" : "NULL",
        'loan_amount' => (float)$loan_amount,
        'date_start' => "'".$conn->real_escape_string($date_start)."'",
        'description' => $description !== null ? "'$description'" : "NULL",
        'loan_type' => "'".$loan_type_for_legacy."'",
        'loan_reference_no' => $reference_no !== null ? "'$reference_no'" : "NULL",
        'reason' => $reason !== null ? "'$reason'" : "NULL",
        'deduction_schedule' => "'".$conn->real_escape_string($deduction_schedule)."'",
        'interest_type' => "'".$conn->real_escape_string($interest_type)."'",
        'interest_rate' => (float)$interest_rate,
        // === CHANGED: insert terms as float ===
        'terms' => (float)$terms,
        // === end change ===
        'payable_per_term' => (float)$payable_per_term,
        // store payable_mode so UI/updates can know if manual or auto
        'final_loan_deduction' => "NULL", // keep same placement as before (unchanged)
        'liability_type' => "'".$conn->real_escape_string($liability_type)."'",
        'quantity' => $quantity !== null ? (int)$quantity : "NULL",
        'unit_cost' => $unit_cost !== null ? (float)$unit_cost : "NULL",
        'total_cost' => (float)$total_cost,
        'is_installment' => (int)$is_installment,
        'created_by' => $created_by !== null ? "'$created_by'" : "NULL",
        'item_id' => $item_id !== null ? (int)$item_id : "NULL",
        'meta' => $meta_esc !== null ? "'$meta_esc'" : "NULL",
        'balance' => (float)$initial_balance,
        'status' => "'$status'"
    ];

    // Note: we store payable_mode in meta if you prefer not to alter DB schema.
    // To avoid schema changes, include payable_mode inside meta JSON:
    if ($meta_esc !== null) {
        // meta exists — decode then attach
        $meta_arr = json_decode(stripslashes($meta_esc), true);
        if (!is_array($meta_arr)) $meta_arr = ['raw' => stripslashes($meta_esc)];
        $meta_arr['payable_mode'] = $payable_mode;
        // also include manual override indicator when applicable
        if ($payable_mode === 'manual') $meta_arr['payable_per_term_manual'] = $payable_per_term;
        $meta = json_encode($meta_arr);
        $meta_esc = $conn->real_escape_string($meta);
        $cols['meta'] = "'$meta_esc'";
    } else {
        // meta null — create one storing payable_mode
        $meta_arr = ['payable_mode' => $payable_mode];
        if ($payable_mode === 'manual') $meta_arr['payable_per_term_manual'] = $payable_per_term;
        $meta = json_encode($meta_arr);
        $meta_esc = $conn->real_escape_string($meta);
        $cols['meta'] = "'$meta_esc'";
    }

    // If you plan to add a dedicated DB column for payable_mode later, replace storing in meta above.

    // Remove the earlier placeholder (we already set final_loan_deduction position earlier)
    // Rebuild consistent columns: ensure final_loan_deduction remains NULL unless supplied (kept above)
    // If your schema supports a payable_mode/payable_per_term column directly, prefer that instead of meta.

    $colNames = implode(", ", array_keys($cols));
    $colVals  = implode(", ", array_values($cols));

    $sql = "INSERT INTO loans ($colNames) VALUES ($colVals)";

    if (!$conn->query($sql)) {
        fail("Insert failed. See debug for DB error.", 500, $conn->error . " SQL: " . $sql);
    }

    $insert_id = $conn->insert_id;
    echo json_encode(["success" => true, "message" => "Loan created.", "loan_id" => $insert_id]);

} catch (Exception $e) {
    fail("Exception: " . $e->getMessage(), 500, $e->getMessage());
}
