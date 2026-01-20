<?php
include '../server/connection.php';
include("../server/cors.php");
header("Content-Type: application/json; charset=UTF-8");

try {
    // Get JSON or form data
    $input = json_decode(file_get_contents("php://input"), true);
    if (!$input) $input = $_POST;

    if (!isset($input['loan_id'])) {
        echo json_encode(["success" => false, "message" => "Missing loan_id"]);
        exit;
    }

    $loan_id = intval($input['loan_id']);

    // All editable fields
    $loan_type = $input['loan_type'] ?? null;
    $loan_amount = $input['loan_amount'] ?? 0;
    $total_cost = $input['total_cost'] ?? $loan_amount;
    $payable_per_term = $input['payable_per_term'] ?? 0;
    $terms = $input['terms'] ?? 1;
    $deduction_schedule = $input['deduction_schedule'] ?? 'semimonthly';
    $start_date = $input['start_date'] ?? null;
    $status = $input['status'] ?? 'active';
    $balance = $input['balance'] ?? $loan_amount;
    $employee_id = $input['employee_id'] ?? null;
    $employee_name = $input['employee_name'] ?? null;
    $loan_reference_no = $input['loan_reference_no'] ?? null;
    $liability_type = $input['liability_type'] ?? 'cash_loan';
    $remarks = $input['remarks'] ?? null;

    // Debug log (optional)
    // file_put_contents("update_log.txt", print_r($input, true), FILE_APPEND);

    // Ensure record exists
    $checkStmt = $conn->prepare("SELECT COUNT(*) as cnt FROM loans WHERE loan_id = ?");
    $checkStmt->bind_param("i", $loan_id);
    $checkStmt->execute();
    $exists = $checkStmt->get_result()->fetch_assoc()['cnt'] ?? 0;

    if (!$exists) {
        echo json_encode(["success" => false, "message" => "Loan not found"]);
        exit;
    }

    // Prepare SQL for full update
    $sql = "UPDATE loans 
            SET loan_type = ?, 
                loan_amount = ?, 
                total_cost = ?, 
                payable_per_term = ?, 
                terms = ?, 
                deduction_schedule = ?, 
                start_date = ?, 
                status = ?, 
                balance = ?, 
                employee_id = ?, 
                employee_name = ?, 
                loan_reference_no = ?, 
                liability_type = ?, 
                remarks = ?
            WHERE loan_id = ?";

    $stmt = $conn->prepare($sql);
    if (!$stmt) {
        echo json_encode(["success" => false, "message" => "Prepare failed: " . $conn->error]);
        exit;
    }

    $stmt->bind_param(
        "sddiisssdsssssi",
        $loan_type,
        $loan_amount,
        $total_cost,
        $payable_per_term,
        $terms,
        $deduction_schedule,
        $start_date,
        $status,
        $balance,
        $employee_id,
        $employee_name,
        $loan_reference_no,
        $liability_type,
        $remarks,
        $loan_id
    );

    if ($stmt->execute()) {
        echo json_encode([
            "success" => true,
            "message" => "Loan updated successfully",
            "loan_id" => $loan_id,
            "updated_fields" => [
                "loan_amount" => $loan_amount,
                "payable_per_term" => $payable_per_term,
                "total_cost" => $total_cost,
                "terms" => $terms,
                "balance" => $balance,
                "status" => $status
            ]
        ]);
    } else {
        echo json_encode(["success" => false, "message" => "Execute failed: " . $stmt->error]);
    }

    $stmt->close();
    $conn->close();

} catch (Exception $e) {
    echo json_encode(["success" => false, "message" => $e->getMessage()]);
}
?>
