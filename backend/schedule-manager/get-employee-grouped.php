<?php
// schedule-manager/get-employees-grouped.php
// Returns employees grouped by position (ONLY active employees)

include('../server/connection.php');
include("../server/cors.php");

header('Content-Type: application/json; charset=UTF-8');

if (!$conn) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Database connection failed']);
    exit;
}

try {
    $sql = "
        SELECT
            e.employee_id,
            e.first_name,
            e.middle_name,
            e.last_name,
            e.status,
            pos.position_id,
            pos.position_name,
            dep.department_id,
            dep.department_name
        FROM employees e
        LEFT JOIN positions pos ON e.position_id = pos.position_id
        LEFT JOIN departments dep ON pos.department_id = dep.department_id
        WHERE e.status = 'active'
        ORDER BY COALESCE(pos.position_name, ''), e.last_name, e.first_name
    ";

    $result = $conn->query($sql);
    if (!$result) {
        throw new Exception("Query failed: " . $conn->error);
    }

    $rows = $result->fetch_all(MYSQLI_ASSOC);

    $groups = [];
    foreach ($rows as $r) {
        $posKey = $r['position_id'] ?? 'no_position';
        if (!isset($groups[$posKey])) {
            $groups[$posKey] = [
                'position_id' => $r['position_id'] ?? null,
                'position_name' => $r['position_name'] ?? 'Unassigned',
                'department_id' => $r['department_id'] ?? null,
                'department_name' => $r['department_name'] ?? null,
                'employees' => []
            ];
        }

        $groups[$posKey]['employees'][] = [
            'employee_id' => $r['employee_id'],
            'first_name'  => $r['first_name'],
            'middle_name' => $r['middle_name'],
            'last_name'   => $r['last_name'],
            'status'      => $r['status']  // included for clarity (will always be 'active' here)
        ];
    }

    echo json_encode(['success' => true, 'data' => array_values($groups)]);
    exit;
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
    exit;
}
