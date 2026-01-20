<?php
// read_journal_entries.php
include '../server/connection.php';
include("../server/cors.php");
header("Content-Type: application/json; charset=UTF-8");

$loan_id = isset($_GET['loan_id']) ? intval($_GET['loan_id']) : null;
$employee_id = isset($_GET['employee_id']) ? $conn->real_escape_string($_GET['employee_id']) : null;

try {
    if ($loan_id) {
        $sql = "SELECT * FROM loan_journal_entry WHERE loan_id = ? ORDER BY entry_date DESC";
        $stmt = $conn->prepare($sql);
        $stmt->bind_param("i", $loan_id);
    } elseif ($employee_id) {
        $sql = "SELECT * FROM loan_journal_entry WHERE employee_id = ? ORDER BY entry_date DESC";
        $stmt = $conn->prepare($sql);
        $stmt->bind_param("s", $employee_id);
    } else {
        // return recent entries if no filter provided
        $sql = "SELECT * FROM loan_journal_entry ORDER BY entry_date DESC LIMIT 200";
        $stmt = $conn->prepare($sql);
    }

    $stmt->execute();
    $res = $stmt->get_result();
    $entries = [];
    while ($row = $res->fetch_assoc()) $entries[] = $row;

    echo json_encode(["success" => true, "data" => $entries]);
} catch (Exception $e) {
    echo json_encode(["success" => false, "message" => $e->getMessage()]);
}
