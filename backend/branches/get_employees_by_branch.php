<?php
// get_employees_by_branch.php
include("../server/cors.php");
require_once '../server/connection.php';
header('Content-Type: application/json; charset=utf-8');

try {
    // Accept branch_id as GET param; if missing => return all employees that have a branch assigned
    $branch_id = null;
    if (isset($_GET['branch_id']) && $_GET['branch_id'] !== '') {
        $branch_id = (int) $_GET['branch_id'];
        if ($branch_id <= 0) {
            $branch_id = null; // treat invalid/0 as not provided
        }
    }

    if ($branch_id === null) {
        // return employees that have any branch assigned
        $sql = "
            SELECT
                e.employee_id,
                e.image,
                e.first_name,
                e.middle_name,
                e.last_name,
                e.status,
                e.email,
                e.contact_number,
                e.department_id,
                COALESCE(d.department_name, '') AS department_name,
                e.position_id,
                COALESCE(p.position_name, '') AS position_name,
                e.branch_id,
                COALESCE(b.name, '') AS branch_name
            FROM employees e
            LEFT JOIN branches b ON e.branch_id = b.branch_id
            LEFT JOIN departments d ON e.department_id = d.department_id
            LEFT JOIN positions p ON e.position_id = p.position_id
            WHERE e.branch_id IS NOT NULL
            ORDER BY b.branch_id, e.last_name, e.first_name
        ";
        $stmt = $conn->prepare($sql);
    } else {
        $sql = "
            SELECT
                e.employee_id,
                e.image,
                e.first_name,
                e.middle_name,
                e.last_name,
                e.status,
                e.email,
                e.contact_number,
                e.department_id,
                COALESCE(d.department_name, '') AS department_name,
                e.position_id,
                COALESCE(p.position_name, '') AS position_name,
                e.branch_id,
                COALESCE(b.name, '') AS branch_name
            FROM employees e
            LEFT JOIN branches b ON e.branch_id = b.branch_id
            LEFT JOIN departments d ON e.department_id = d.department_id
            LEFT JOIN positions p ON e.position_id = p.position_id
            WHERE e.branch_id = ?
            ORDER BY e.last_name, e.first_name
        ";
        $stmt = $conn->prepare($sql);
        $stmt->bind_param('i', $branch_id);
    }

    if (!$stmt) {
        throw new Exception("Prepare failed: " . $conn->error);
    }

    if (!$stmt->execute()) {
        throw new Exception("Execute failed: " . $stmt->error);
    }

    $res = $stmt->get_result();
    $rows = [];
    while ($row = $res->fetch_assoc()) {
        // normalize returned data if you prefer (e.g. combine name)
        $row['full_name'] = trim($row['first_name'] . ' ' . ($row['middle_name'] ? $row['middle_name'] . ' ' : '') . $row['last_name']);
        $rows[] = $row;
    }

    echo json_encode(["success" => true, "data" => $rows], JSON_UNESCAPED_UNICODE);

    $stmt->close();
    $conn->close();
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(["success" => false, "message" => $e->getMessage()]);
    if (isset($stmt) && $stmt) $stmt->close();
    if (isset($conn) && $conn) $conn->close();
}
?>
