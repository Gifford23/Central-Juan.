<?php
//delete_journal_entry
include '../server/connection.php';
include("../server/cors.php");

$data = json_decode(file_get_contents("php://input"), true);

if (!isset($data['journal_id'])) {
  echo json_encode(["success" => false, "message" => "Missing journal_id."]);
  exit;
}

$journal_id = $data['journal_id'];

try {
  // Step 1: Get the entry details before deleting
  $select_stmt = $conn->prepare("SELECT loan_id, entry_type, amount FROM loan_journal_entry WHERE journal_id = ?");
  $select_stmt->bind_param("i", $journal_id);
  $select_stmt->execute();
  $entry = $select_stmt->get_result()->fetch_assoc();

  if (!$entry) {
    echo json_encode(["success" => false, "message" => "Journal entry not found."]);
    exit;
  }

  $loan_id    = $entry['loan_id'];
  $entry_type = $entry['entry_type'];
  $amount     = floatval($entry['amount']);

  // Step 2: Delete the journal entry
  $delete_stmt = $conn->prepare("DELETE FROM loan_journal_entry WHERE journal_id = ?");
  $delete_stmt->bind_param("i", $journal_id);
  $delete_stmt->execute();

  // Step 3: Get current loan amount
  $loan_stmt = $conn->prepare("SELECT loan_amount FROM loans WHERE loan_id = ?");
  $loan_stmt->bind_param("i", $loan_id);
  $loan_stmt->execute();
  $loan_result = $loan_stmt->get_result()->fetch_assoc();
  $loan_amount = floatval($loan_result['loan_amount'] ?? 0);

  // Step 4: Adjust loan_amount if debit was deleted
  if ($entry_type === 'debit') {
    $loan_amount = max(0, $loan_amount - $amount);
    $update_stmt = $conn->prepare("UPDATE loans SET loan_amount = ? WHERE loan_id = ?");
    $update_stmt->bind_param("di", $loan_amount, $loan_id);
    $update_stmt->execute();
  }

  // Step 5: Recalculate total credits after deletion
  $credit_stmt = $conn->prepare("SELECT SUM(amount) AS total_credit 
                                 FROM loan_journal_entry 
                                 WHERE loan_id = ? AND entry_type = 'credit'");
  $credit_stmt->bind_param("i", $loan_id);
  $credit_stmt->execute();
  $credit_result = $credit_stmt->get_result()->fetch_assoc();
  $total_credit = floatval($credit_result['total_credit'] ?? 0);

  // Step 6: Update balance = loan_amount - total_credit
  $new_balance = max(0, $loan_amount - $total_credit);
  $update_balance = $conn->prepare("UPDATE loans SET balance = ? WHERE loan_id = ?");
  $update_balance->bind_param("di", $new_balance, $loan_id);
  $update_balance->execute();

  echo json_encode([
    "success" => true,
    "message" => "Journal entry deleted and loan adjusted.",
    "loan_amount" => $loan_amount,
    "balance" => $new_balance
  ]);

} catch (Exception $e) {
  echo json_encode(["success" => false, "message" => $e->getMessage()]);
}
?>
