<?php
include '../server/connection.php';
include("../server/cors.php");

// header("Access-Control-Allow-Origin: *");
// header("Access-Control-Allow-Methods: POST, OPTIONS");
// header("Access-Control-Allow-Headers: Content-Type, Authorization");
// header("Content-Type: application/json; charset=UTF-8");

$data = json_decode(file_get_contents("php://input"), true);

if (
    !isset($data['loan_id']) || 
    !isset($data['employee_id']) || 
    !isset($data['entry_type']) || 
    !isset($data['amount']) || 
    !isset($data['description']) || 
    !isset($data['entry_date'])   // ✅ must be provided
    ) {
        echo json_encode(["success" => false, "message" => "Missing required fields"]);
        exit;
    }

    $loan_id     = $data['loan_id'];
    $employee_id = $data['employee_id'];
    $entry_type  = $data['entry_type'];
    $amount      = floatval($data['amount']);
    $description = $data['description'];
    $entry_date  = $data['entry_date']; // ✅ use what frontend sends (YYYY-MM-DD)

    // Step 1: Insert journal entry
    $insert_sql = "INSERT INTO loan_journal_entry 
    (loan_id, employee_id, entry_type, amount, description, entry_date) 
    VALUES (?, ?, ?, ?, ?, ?)";
    $stmt = $conn->prepare($insert_sql);
    $stmt->bind_param("issdss", $loan_id, $employee_id, $entry_type, $amount, $description, $entry_date);
    if ($stmt->execute()) {

    // Step 2: Get current loan_amount
    $loan_stmt = $conn->prepare("SELECT loan_amount FROM loans WHERE loan_id = ?");
    $loan_stmt->bind_param("i", $loan_id);
    $loan_stmt->execute();
    $loan_result = $loan_stmt->get_result()->fetch_assoc();
    $loan_amount = floatval($loan_result['loan_amount'] ?? 0);

    // Step 3: Update loan_amount if entry is debit
    if ($entry_type === 'debit') {
        $loan_amount += $amount;

        $update_loan_amount = $conn->prepare("UPDATE loans SET loan_amount = ? WHERE loan_id = ?");
        $update_loan_amount->bind_param("di", $loan_amount, $loan_id);
        $update_loan_amount->execute();
    }

    // Step 4: Recalculate credit
    $credit_stmt = $conn->prepare("SELECT SUM(amount) AS total_credit FROM loan_journal_entry WHERE loan_id = ? AND entry_type = 'credit'");
    $credit_stmt->bind_param("i", $loan_id);
    $credit_stmt->execute();
    $credit_result = $credit_stmt->get_result()->fetch_assoc();
    $total_credit = floatval($credit_result['total_credit'] ?? 0);

    // Step 5: Update balance = loan_amount - credit
    $new_balance = max(0, $loan_amount - $total_credit);
    $update_stmt = $conn->prepare("UPDATE loans SET balance = ? WHERE loan_id = ?");
    $update_stmt->bind_param("di", $new_balance, $loan_id);
    $update_stmt->execute();

    echo json_encode(["success" => true, "message" => "Journal entry saved, loan amount updated (if debit), and balance recalculated"]);
} else {
    echo json_encode(["success" => false, "message" => "Failed to insert journal entry"]);
}
?>
