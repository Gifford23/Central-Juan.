<?php
// update_loan.php
include '../server/connection.php';
include("../server/cors.php");
header("Content-Type: application/json; charset=UTF-8");

$data = json_decode(file_get_contents("php://input"), true);
if (!$data || !isset($data['loan_id'])) {
    echo json_encode(["success" => false, "message" => "Missing loan_id"]);
    exit;
}

$loan_id = intval($data['loan_id']);

try {
    $fields = [];
    $types = "";
    $values = [];

    $allowed = [
      'employee_id','employee_name','loan_amount','date_start','description','loan_type','loan_reference_no',
      'reason','deduction_schedule','interest_type','interest_rate','terms','payable_per_term',
      'liability_type','quantity','unit_cost','total_cost','is_installment','created_by','approved_by',
      'approved_at','closed_at','status','meta','item_id'
    ];

    foreach ($allowed as $k) {
        if (isset($data[$k])) {
            $fields[] = "$k = ?";
            $values[] = $data[$k];
            // infer type
            if (in_array($k, ['loan_amount','interest_rate','payable_per_term','unit_cost','total_cost'])) $types .= "d";
            elseif (in_array($k, ['quantity','terms','item_id','is_installment'])) $types .= "i";
            else $types .= "s";
        }
    }

    if (empty($fields)) {
        echo json_encode(["success" => false, "message" => "No fields to update"]);
        exit;
    }

    $sql = "UPDATE loans SET " . implode(", ", $fields) . " WHERE loan_id = ?";
    $stmt = $conn->prepare($sql);
    // bind params dynamically
    $types .= "i";
    $values[] = $loan_id;

    $bind_names[] = $types;
    for ($i = 0; $i < count($values); $i++) {
        $bind_name = 'param' . $i;
        $$bind_name = $values[$i];
        $bind_names[] = &$$bind_name;
    }
    call_user_func_array([$stmt, 'bind_param'], $bind_names);

    if (!$stmt->execute()) throw new Exception("Update failed: " . $stmt->error);

    echo json_encode(["success" => true, "message" => "Loan updated."]);
} catch (Exception $e) {
    echo json_encode(["success" => false, "message" => $e->getMessage()]);
}
