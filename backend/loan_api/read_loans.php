<?php
// read_loans.php
include '../server/connection.php';
include("../server/cors.php");
header("Content-Type: application/json; charset=UTF-8");

$loan_id = isset($_GET['loan_id']) ? intval($_GET['loan_id']) : null;
$loan_ids = isset($_GET['loan_ids']) ? $_GET['loan_ids'] : null; // comma separated
$employee_id = isset($_GET['employee_id']) ? $conn->real_escape_string($_GET['employee_id']) : null;

try {
    if ($loan_id) {
        $stmt = $conn->prepare("SELECT * FROM loans WHERE loan_id = ? ORDER BY loan_id DESC");
        $stmt->bind_param("i", $loan_id);
        $stmt->execute();
        $res = $stmt->get_result()->fetch_all(MYSQLI_ASSOC);
    } elseif ($loan_ids) {
        // sanitize and build IN clause
        $ids = array_filter(array_map('intval', explode(',', $loan_ids)));
        if (count($ids) === 0) {
            echo json_encode(["success" => true, "data" => []]);
            exit;
        }
        $placeholders = implode(',', array_fill(0, count($ids), '?'));
        $types = str_repeat('i', count($ids));
        $sql = "SELECT * FROM loans WHERE loan_id IN ($placeholders) ORDER BY FIELD(loan_id," . implode(',', $ids) . ")";
        // Use prepared stmt with dynamic bind (mysqli requires call_user_func_array)
        $stmt = $conn->prepare($sql);
        $bind_names[] = $types;
        for ($i = 0; $i < count($ids); $i++) {
            $bind_name = 'bind' . $i;
            $$bind_name = $ids[$i];
            $bind_names[] = &$$bind_name;
        }
        call_user_func_array(array($stmt, 'bind_param'), $bind_names);
        $stmt->execute();
        $res = $stmt->get_result()->fetch_all(MYSQLI_ASSOC);
    } elseif ($employee_id) {
        $stmt = $conn->prepare("SELECT * FROM loans WHERE employee_id = ? ORDER BY loan_id DESC");
        $stmt->bind_param("s", $employee_id);
        $stmt->execute();
        $res = $stmt->get_result()->fetch_all(MYSQLI_ASSOC);
    } else {
        $stmt = $conn->prepare("SELECT * FROM loans ORDER BY loan_id DESC LIMIT 1000");
        $stmt->execute();
        $res = $stmt->get_result()->fetch_all(MYSQLI_ASSOC);
    }

    echo json_encode(["success" => true, "data" => $res]);
} catch (Exception $e) {
    echo json_encode(["success" => false, "message" => $e->getMessage()]);
}
