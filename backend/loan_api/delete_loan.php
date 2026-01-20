<?php
// delete_loan.php
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
    $stmt = $conn->prepare("DELETE FROM loans WHERE loan_id = ?");
    $stmt->bind_param("i", $loan_id);
    if (!$stmt->execute()) throw new Exception($stmt->error);
    echo json_encode(["success" => true, "message" => "Loan deleted."]);
} catch (Exception $e) {
    echo json_encode(["success" => false, "message" => $e->getMessage()]);
}
