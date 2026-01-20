<?php
// delete_journal_entry.php
include '../server/connection.php';
include("../server/cors.php");
header("Content-Type: application/json; charset=UTF-8");

$data = json_decode(file_get_contents("php://input"), true);
if (!isset($data['journal_id'])) {
    echo json_encode(["success" => false, "message" => "Missing journal_id"]);
    exit;
}
$journal_id = intval($data['journal_id']);

$conn->begin_transaction();
try {
    // fetch entry
    $sel = $conn->prepare("SELECT * FROM loan_journal_entry WHERE journal_id = ? FOR UPDATE");
    $sel->bind_param("i", $journal_id);
    $sel->execute();
    $entry = $sel->get_result()->fetch_assoc();
    if (!$entry) throw new Exception("Journal entry not found");

    $loan_id = intval($entry['loan_id']);
    $entry_type = $entry['entry_type'];
    $amount = floatval($entry['amount']);

    // revert
    if ($entry_type === 'credit') {
        // add back credit to balance
        $rev = $conn->prepare("UPDATE loans SET balance = balance + ? WHERE loan_id = ?");
        $rev->bind_param("di", $amount, $loan_id);
        $rev->execute();
    } elseif ($entry_type === 'debit') {
        // remove the debit (reduce loan_amount or total_cost and reduce balance)
        $loan_sel = $conn->prepare("SELECT total_cost FROM loans WHERE loan_id = ? FOR UPDATE");
        $loan_sel->bind_param("i", $loan_id);
        $loan_sel->execute();
        $lr = $loan_sel->get_result()->fetch_assoc();
        $tc = $lr['total_cost'];
        if (is_null($tc)) {
            $upd = $conn->prepare("UPDATE loans SET loan_amount = GREATEST(0, loan_amount - ?), balance = GREATEST(0, balance - ?) WHERE loan_id = ?");
            $upd->bind_param("ddi", $amount, $amount, $loan_id);
            $upd->execute();
        } else {
            $upd = $conn->prepare("UPDATE loans SET total_cost = GREATEST(0, total_cost - ?), balance = GREATEST(0, balance - ?) WHERE loan_id = ?");
            $upd->bind_param("ddi", $amount, $amount, $loan_id);
            $upd->execute();
        }
    }

    // delete entry
    $del = $conn->prepare("DELETE FROM loan_journal_entry WHERE journal_id = ?");
    $del->bind_param("i", $journal_id);
    $del->execute();

    $conn->commit();
    echo json_encode(["success" => true, "message" => "Journal entry deleted and loan updated."]);
} catch (Exception $e) {
    $conn->rollback();
    echo json_encode(["success" => false, "message" => $e->getMessage()]);
}
