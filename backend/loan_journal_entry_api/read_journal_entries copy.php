<?php
include '../server/connection.php';
include("../server/cors.php");

// header("Access-Control-Allow-Origin: *");
// header("Access-Control-Allow-Methods: GET");
// header("Access-Control-Allow-Headers: Content-Type");
// header("Content-Type: application/json; charset=UTF-8");

if (!isset($_GET['loan_id'])) {
    echo json_encode(["success" => false, "message" => "Missing loan_id"]);
    exit;
}

$loan_id = intval($_GET['loan_id']);

$sql = "SELECT * FROM loan_journal_entry WHERE loan_id = ? ORDER BY entry_date DESC";
$stmt = $conn->prepare($sql);
$stmt->bind_param("i", $loan_id);
$stmt->execute();
$result = $stmt->get_result();

$entries = [];
while ($row = $result->fetch_assoc()) {
    $entries[] = $row;
}

echo json_encode(["success" => true, "data" => $entries]);
