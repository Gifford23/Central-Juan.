<?php
// backend/positions/get_positions.php
include('../server/connection.php');
include('../server/cors.php');

header('Content-Type: application/json; charset=utf-8');

try {
    // optional filter by department_id: /get_positions.php?department_id=DEP-001
    $department_id = isset($_GET['department_id']) ? $conn->real_escape_string($_GET['department_id']) : null;

    if ($department_id && $department_id !== '') {
        $sql = "SELECT position_id, position_name, department_id FROM positions WHERE department_id = ? ORDER BY position_name ASC";
        $stmt = $conn->prepare($sql);
        $stmt->bind_param("s", $department_id);
        $stmt->execute();
        $res = $stmt->get_result();
        $rows = [];
        while ($r = $res->fetch_assoc()) {
            $rows[] = [
                'position_id' => $r['position_id'],
                'position_name' => $r['position_name'],
                'department_id' => $r['department_id']
            ];
        }
        $stmt->close();
    } else {
        // return all positions
        $sql = "SELECT position_id, position_name, department_id FROM positions ORDER BY position_name ASC";
        $result = $conn->query($sql);
        $rows = [];
        if ($result) {
            while ($r = $result->fetch_assoc()) {
                $rows[] = [
                    'position_id' => $r['position_id'],
                    'position_name' => $r['position_name'],
                    'department_id' => $r['department_id']
                ];
            }
            $result->free();
        }
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
