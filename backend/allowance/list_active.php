<?php
// employee/list_active.php
include("../server/cors.php");
include('../server/connection.php');

header('Content-Type: application/json');

// Optional query params
$search = isset($_GET['search']) ? trim($_GET['search']) : null; // search by id or name
$limit = isset($_GET['limit']) ? intval($_GET['limit']) : 0;     // 0 = no limit
$offset = isset($_GET['offset']) ? intval($_GET['offset']) : 0;

try {
    // base query: active employees only
    $baseSql = "SELECT
                  employee_id,
                  first_name,
                  middle_name,
                  last_name,
                  CONCAT(first_name, ' ', IFNULL(NULLIF(middle_name,''), ''), ' ', last_name) AS full_name,
                  position_id,
                  department_id,
                  base_salary,
                  status,
                  branch_id,
                  branch_name
                FROM employees
                WHERE status = 'active'";

    $params = [];
    $types = "";

    if ($search !== null && $search !== '') {
        // search by employee_id or name (first/last)
        $baseSql .= " AND (employee_id LIKE ? OR first_name LIKE ? OR last_name LIKE ? OR CONCAT(first_name, ' ', last_name) LIKE ?)";
        $q = '%' . $search . '%';
        $params[] = $q; $params[] = $q; $params[] = $q; $params[] = $q;
        $types .= 'ssss';
    }

    $baseSql .= " ORDER BY last_name, first_name";

    if ($limit > 0) {
        $baseSql .= " LIMIT ?, ?";
        $params[] = $offset;
        $params[] = $limit;
        $types .= 'ii';
    }

    $stmt = $conn->prepare($baseSql);

    if ($params) {
        // bind params dynamically
        $bind_names[] = $types;
        for ($i=0; $i<count($params); $i++) {
            $bind_name = 'bind' . $i;
            $$bind_name = $params[$i];
            $bind_names[] = &$$bind_name;
        }
        call_user_func_array(array($stmt, 'bind_param'), $bind_names);
    }

    if (!$stmt->execute()) {
        throw new Exception('Execute failed: ' . $stmt->error);
    }

    $res = $stmt->get_result();
    $rows = $res->fetch_all(MYSQLI_ASSOC);
    $stmt->close();

    // normalize/trim full_name
    foreach ($rows as &$r) {
        $r['full_name'] = trim(preg_replace('/\s+/', ' ', $r['full_name']));
        // cast numeric fields
        $r['base_salary'] = isset($r['base_salary']) ? (float)$r['base_salary'] : 0.0;
    }
    unset($r);

    echo json_encode(['success' => true, 'data' => $rows]);
    exit;
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Server error: ' . $e->getMessage()]);
    exit;
}
