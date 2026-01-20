<?php
// update_journal_entry.php
include '../server/connection.php';
include("../server/cors.php");
header("Content-Type: application/json; charset=UTF-8");

$data = json_decode(file_get_contents("php://input"), true);
if (!$data || !isset($data['journal_id'])) {
    echo json_encode(["success" => false, "message" => "Missing journal_id"]);
    exit;
}

$journal_id = intval($data['journal_id']);
$new_loan_id = isset($data['loan_id']) ? intval($data['loan_id']) : null;
$new_employee_id = isset($data['employee_id']) ? $data['employee_id'] : null;
$new_entry_type = isset($data['entry_type']) ? $data['entry_type'] : null;
$new_amount = isset($data['amount']) ? floatval($data['amount']) : null;
$new_description = isset($data['description']) ? $data['description'] : null;
$new_entry_date = isset($data['entry_date']) ? $data['entry_date'] : null;
$new_origin = isset($data['origin']) ? $data['origin'] : null;
$new_reference_no = isset($data['reference_no']) ? $data['reference_no'] : null;
$new_payroll_cutoff = isset($data['payroll_cutoff']) ? $data['payroll_cutoff'] : null;

$conn->begin_transaction();
try {
    // fetch existing entry
    $sel = $conn->prepare("SELECT * FROM loan_journal_entry WHERE journal_id = ? FOR UPDATE");
    $sel->bind_param("i", $journal_id);
    $sel->execute();
    $old = $sel->get_result()->fetch_assoc();
    if (!$old) throw new Exception("Journal entry not found");

    $old_loan_id = intval($old['loan_id']);
    $old_type = $old['entry_type'];
    $old_amount = floatval($old['amount']);

    // compute reverse effect from old entry (undo)
    if ($old_type === 'credit') {
        // add back credit to balance
        $stmt = $conn->prepare("UPDATE loans SET balance = balance + ? WHERE loan_id = ?");
        $stmt->bind_param("di", $old_amount, $old_loan_id);
        if (!$stmt->execute()) throw new Exception("Failed to revert old credit: " . $stmt->error);
    } elseif ($old_type === 'debit') {
        // remove previously added debit
        // find whether loan used total_cost or loan_amount
        $loan_sel = $conn->prepare("SELECT total_cost FROM loans WHERE loan_id = ? FOR UPDATE");
        $loan_sel->bind_param("i", $old_loan_id);
        $loan_sel->execute();
        $lr = $loan_sel->get_result()->fetch_assoc();
        $tc = $lr['total_cost'];
        if (is_null($tc)) {
            // loan_amount decreased
            $upd = $conn->prepare("UPDATE loans SET loan_amount = GREATEST(0, loan_amount - ?), balance = GREATEST(0, balance - ?) WHERE loan_id = ?");
            $upd->bind_param("ddi", $old_amount, $old_amount, $old_loan_id);
            $upd->execute();
        } else {
            $upd = $conn->prepare("UPDATE loans SET total_cost = GREATEST(0, total_cost - ?), balance = GREATEST(0, balance - ?) WHERE loan_id = ?");
            $upd->bind_param("ddi", $old_amount, $old_amount, $old_loan_id);
            $upd->execute();
        }
    }

    // apply new entry effect (to possibly different loan)
    $target_loan_id = $new_loan_id ?? $old_loan_id;
    $apply_type = $new_entry_type ?? $old_type;
    $apply_amount = $new_amount ?? $old_amount;

    if ($apply_type === 'credit') {
        $stmt2 = $conn->prepare("UPDATE loans SET balance = GREATEST(0, balance - ?) WHERE loan_id = ?");
        $stmt2->bind_param("di", $apply_amount, $target_loan_id);
        if (!$stmt2->execute()) throw new Exception("Failed to apply new credit: " . $stmt2->error);

        // close if zero
        $chk = $conn->prepare("SELECT balance FROM loans WHERE loan_id = ?");
        $chk->bind_param("i", $target_loan_id);
        $chk->execute();
        $brow = $chk->get_result()->fetch_assoc();
        if ($brow && floatval($brow['balance']) <= 0) {
            $close = $conn->prepare("UPDATE loans SET status = 'closed', closed_at = NOW() WHERE loan_id = ?");
            $close->bind_param("i", $target_loan_id);
            $close->execute();
        }
    } elseif ($apply_type === 'debit') {
        // add to base total and increase balance
        $loan_sel2 = $conn->prepare("SELECT total_cost FROM loans WHERE loan_id = ? FOR UPDATE");
        $loan_sel2->bind_param("i", $target_loan_id);
        $loan_sel2->execute();
        $lr2 = $loan_sel2->get_result()->fetch_assoc();
        $tc2 = $lr2['total_cost'];
        if (is_null($tc2)) {
            $upd2 = $conn->prepare("UPDATE loans SET loan_amount = loan_amount + ?, balance = balance + ? WHERE loan_id = ?");
            $upd2->bind_param("ddi", $apply_amount, $apply_amount, $target_loan_id);
        } else {
            $upd2 = $conn->prepare("UPDATE loans SET total_cost = total_cost + ?, balance = balance + ? WHERE loan_id = ?");
            $upd2->bind_param("ddi", $apply_amount, $apply_amount, $target_loan_id);
        }
        $upd2->execute();
    }

    // update journal entry record
    $upd_j = $conn->prepare("UPDATE loan_journal_entry SET loan_id = ?, employee_id = ?, entry_type = ?, amount = ?, description = ?, entry_date = ?, origin = ?, reference_no = ?, payroll_cutoff = ? WHERE journal_id = ?");
    $upd_j->bind_param("issdsssssi",
        $target_loan_id,
        $new_employee_id ?? $old['employee_id'],
        $apply_type,
        $apply_amount,
        $new_description ?? $old['description'],
        $new_entry_date ?? $old['entry_date'],
        $new_origin ?? $old['origin'],
        $new_reference_no ?? $old['reference_no'],
        $new_payroll_cutoff ?? $old['payroll_cutoff'],
        $journal_id
    );
    if (!$upd_j->execute()) throw new Exception("Failed to update journal: " . $upd_j->error);

    $conn->commit();
    echo json_encode(["success" => true, "message" => "Journal updated and loans adjusted."]);
} catch (Exception $e) {
    $conn->rollback();
    echo json_encode(["success" => false, "message" => $e->getMessage()]);
}
