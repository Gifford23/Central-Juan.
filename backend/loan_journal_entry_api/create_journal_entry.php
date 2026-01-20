<?php
// create_journal_entry.php
include '../server/connection.php';
include("../server/cors.php");
header("Content-Type: application/json; charset=UTF-8");

$data = json_decode(file_get_contents("php://input"), true);

$required = ['loan_id', 'employee_id', 'entry_type', 'amount', 'entry_date'];
foreach ($required as $r) {
    if (!isset($data[$r])) {
        echo json_encode(["success" => false, "message" => "Missing required field: $r"]);
        exit;
    }
}

$loan_id = intval($data['loan_id']);
$employee_id = $data['employee_id'];
$entry_type = $data['entry_type']; // 'debit' or 'credit'
$amount = floatval($data['amount']);
$description = isset($data['description']) ? $data['description'] : null;
$entry_date = $data['entry_date']; // expect YYYY-MM-DD or datetime
$origin = isset($data['origin']) ? $data['origin'] : null;
$reference_no = isset($data['reference_no']) ? $data['reference_no'] : null;
$payroll_cutoff = isset($data['payroll_cutoff']) ? $data['payroll_cutoff'] : null;

// Transaction
$conn->begin_transaction();

try {
    // 1) Insert journal entry
    $insert_sql = "INSERT INTO loan_journal_entry 
        (loan_id, employee_id, entry_type, amount, description, entry_date, origin, reference_no, payroll_cutoff)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)";
    $stmt = $conn->prepare($insert_sql);
    $stmt->bind_param("issdsssss",
        $loan_id,
        $employee_id,
        $entry_type,
        $amount,
        $description,
        $entry_date,
        $origin,
        $reference_no,
        $payroll_cutoff
    );
    if (!$stmt->execute()) throw new Exception("Failed to insert journal entry: " . $stmt->error);

    $journal_id = $conn->insert_id;

    // 2) Fetch current loan totals (use total_cost if present, else loan_amount)
    $loan_stmt = $conn->prepare("SELECT loan_amount, total_cost, balance, isnull(total_cost) as tc_is_null FROM loans WHERE loan_id = ? FOR UPDATE");
    $loan_stmt->bind_param("i", $loan_id);
    $loan_stmt->execute();
    $loan_row = $loan_stmt->get_result()->fetch_assoc();
    if (!$loan_row) throw new Exception("Loan not found");

    $loan_amount = floatval($loan_row['loan_amount'] ?? 0);
    $total_cost = isset($loan_row['total_cost']) ? floatval($loan_row['total_cost']) : null;
    $balance = floatval($loan_row['balance'] ?? 0);

    // Determine base_total: prefer total_cost for items, else loan_amount
    $base_total = is_null($total_cost) ? $loan_amount : $total_cost;

    if ($entry_type === 'credit') {
        // credit reduces balance
        $new_balance = max(0, $balance - $amount);
        $update_stmt = $conn->prepare("UPDATE loans SET balance = ? WHERE loan_id = ?");
        $update_stmt->bind_param("di", $new_balance, $loan_id);
        if (!$update_stmt->execute()) throw new Exception("Failed to update balance: " . $update_stmt->error);

        // if balance becomes 0 set status closed
        if ($new_balance <= 0) {
            $close_stmt = $conn->prepare("UPDATE loans SET status = 'closed', closed_at = NOW() WHERE loan_id = ?");
            $close_stmt->bind_param("i", $loan_id);
            $close_stmt->execute();
        }
    } elseif ($entry_type === 'debit') {
        // debit increases base_total (like releasing loan/more charge) and increases balance
        $new_base_total = $base_total + $amount;
        $new_balance = $balance + $amount;

        // update loan_amount or total_cost depending on what's in use
        if (is_null($total_cost)) {
            // update loan_amount
            $upd = $conn->prepare("UPDATE loans SET loan_amount = ?, balance = ? WHERE loan_id = ?");
            $upd->bind_param("ddi", $new_base_total, $new_balance, $loan_id);
        } else {
            // update total_cost
            $upd = $conn->prepare("UPDATE loans SET total_cost = ?, balance = ? WHERE loan_id = ?");
            $upd->bind_param("ddi", $new_base_total, $new_balance, $loan_id);
        }
        if (!$upd->execute()) throw new Exception("Failed to update loan after debit: " . $upd->error);
    } else {
        // unknown type; don't change loan
    }

    $conn->commit();

    // Return inserted journal
    $fetch = $conn->prepare("SELECT * FROM loan_journal_entry WHERE journal_id = ?");
    $fetch->bind_param("i", $journal_id);
    $fetch->execute();
    $created = $fetch->get_result()->fetch_assoc();

    echo json_encode(["success" => true, "journal" => $created, "message" => "Journal entry saved and loan updated"]);
} catch (Exception $e) {
    $conn->rollback();
    echo json_encode(["success" => false, "message" => $e->getMessage()]);
}
