<?php
// backend/departments/get_departments.php
include('../server/connection.php');
include('../server/cors.php');

header('Content-Type: application/json; charset=utf-8');

try {
    $sql = "SELECT department_id, department_name FROM departments ORDER BY department_name ASC";
    $result = $conn->query($sql);

    $rows = [];
    if ($result) {
        while ($r = $result->fetch_assoc()) {
            // ensure consistent keys
            $rows[] = [
                'department_id' => $r['department_id'],
                'department_name' => $r['department_name']
            ];
        }
        $result->free();
    }

    echo json_encode([
        'success' => true,
        'data' => $rows
    ]);
    exit;
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Server error: ' . $e->getMessage()
    ]);
    exit;
} finally {
    if ($conn) $conn->close();
}
?>
