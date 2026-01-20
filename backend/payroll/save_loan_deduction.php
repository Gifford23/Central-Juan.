<?php
// header("Access-Control-Allow-Origin: *");
// header("Access-Control-Allow-Methods: POST, OPTIONS");
// header("Access-Control-Allow-Headers: Content-Type, Authorization");
// header("Content-Type: application/json");

include('../server/connection.php');
include("../server/cors.php");

$data = json_decode(file_get_contents("php://input"), true);

$employee_id = $data['employee_id'] ?? null;
$loan_id = $data['loan_id'] ?? null;
$final_loan_deduction = $data['final_loan_deduction'] ?? null;

if (!$employee_id || !$loan_id || !$final_loan_deduction) {
    echo json_encode(["success" => false, "message" => "Missing required fields"]);
    exit;
}

$stmt = $conn->prepare("UPDATE loans SET final_loan_deduction = ? WHERE loan_id = ? AND employee_id = ?");
$stmt->bind_param("dis", $final_loan_deduction, $loan_id, $employee_id);

if ($stmt->execute()) {
    echo json_encode(["success" => true, "message" => "Loan deduction saved successfully."]);
} else {
    echo json_encode(["success" => false, "message" => "Failed to save loan deduction."]);
}

$stmt->close();
$conn->close();
