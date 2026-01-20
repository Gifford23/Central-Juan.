<?php
include '../server/connection.php';
include("../server/cors.php");

header('Content-Type: application/json');

try {
    $query = "
        SELECT 
            u.user_id, 
            u.username, 
            u.role, 
            u.status,
            CONCAT(e.first_name, ' ', COALESCE(e.middle_name,''), ' ', e.last_name) AS full_name
        FROM users u
        LEFT JOIN employees e 
            ON e.employee_id = u.username
    "; 

    $stmt = $conn->prepare($query);
    $stmt->execute();
    $result = $stmt->get_result();

    $users = [];
    while ($row = $result->fetch_assoc()) {
        $users[] = $row;
    }

    echo json_encode([
        "success" => true,
        "data" => $users
    ]);
} catch (Exception $e) {
    echo json_encode([
        "success" => false,
        "message" => $e->getMessage()
    ]);
}
?>
