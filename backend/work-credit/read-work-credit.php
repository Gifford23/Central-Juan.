<?php
include '../server/connection.php';
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");

$employee_id = $_GET['employee_id'] ?? null;
$work_date   = $_GET['work_date'] ?? null;

try {
    $sql = "SELECT * FROM attendance WHERE 1=1";

    if ($employee_id) {
        $sql .= " AND employee_id = ?";
    }

    if ($work_date) {
        $sql .= " AND work_date = ?";
    }

    $stmt = $conn->prepare($sql);

    if ($employee_id && $work_date) {
        $stmt->bind_param("is", $employee_id, $work_date);
    } elseif ($employee_id) {
        $stmt->bind_param("i", $employee_id);
    } elseif ($work_date) {
        $stmt->bind_param("s", $work_date);
    }

    $stmt->execute();
    $result = $stmt->get_result();
    $rows = $result->fetch_all(MYSQLI_ASSOC);

    echo json_encode([
        "success" => true,
        "data" => $rows
    ]);

} catch (Exception $e) {
    http_response_code(400);
    echo json_encode([
        "success" => false,
        "message" => $e->getMessage()
    ]);
}
?>
