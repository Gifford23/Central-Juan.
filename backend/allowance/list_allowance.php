<?php
include("../server/cors.php");
include('../server/connection.php');

header('Content-Type: application/json');

$employee_id = isset($_GET['employee_id']) ? $_GET['employee_id'] : null;
$from = isset($_GET['from']) ? $_GET['from'] : null;
$until = isset($_GET['until']) ? $_GET['until'] : null;
$active = isset($_GET['active']) ? intval($_GET['active']) : null;

try {
    $sql = "SELECT allowance_id, employee_id, allowance_name, amount, amount_type, percent_of, frequency, prorate_if_partial, start_date, end_date, active, created_at, updated_at
            FROM employee_allowance
            WHERE 1=1 ";
    $params = [];
    $types = "";

    if ($employee_id) {
        $sql .= " AND employee_id = ?";
        $params[] = $employee_id; $types .= "s";
    }
    if ($active !== null) {
        $sql .= " AND active = ?";
        $params[] = $active; $types .= "i";
    }
    // If from/until provided filter allowances that overlap the period
    if ($from && $until) {
        $sql .= " AND (start_date IS NULL OR start_date <= ?) AND (end_date IS NULL OR end_date >= ?)";
        $params[] = $until; $types .= "s";
        $params[] = $from; $types .= "s";
    }

    $sql .= " ORDER BY employee_id, allowance_name";

    $stmt = $conn->prepare($sql);
    if ($params) {
        $stmt->bind_param($types, ...$params);
    }
    $stmt->execute();
    $res = $stmt->get_result();
    $rows = $res->fetch_all(MYSQLI_ASSOC);

    echo json_encode(['success' => true, 'data' => $rows]);
    $stmt->close();
    exit;
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Server error: '.$e->getMessage()]);
    exit;
}
