<?php
require __DIR__ . '/../server/cors.php';
require __DIR__ . '/../server/connection.php';

header("Content-Type: application/json; charset=UTF-8");

$sql = "
    SELECT 
        e.employee_id,
        CONCAT(e.first_name, ' ', e.last_name) AS employee_name,
        e.first_name,
        e.middle_name,
        e.last_name,
        e.email,
        e.contact_number,
        e.date_of_birth,
        e.base_salary,
        e.monthly_rate,
        e.hourly_rate,
        e.employee_type,
        e.status,
        e.image,

        e.branch_id,
        e.branch_name,

        e.department_id,
        d.department_name,

        e.position_id,
        p.position_name,

        u.user_id,
        u.username,
        u.role,
        u.status AS user_status
    FROM employees e
    LEFT JOIN users u ON u.username = e.employee_id
    LEFT JOIN departments d ON d.department_id = e.department_id
    LEFT JOIN positions p ON p.position_id = e.position_id
";

$result = $conn->query($sql);

$rows = [];
while ($row = $result->fetch_assoc()) {
    $rows[] = [
        "employee_id" => $row["employee_id"],

        "first_name" => $row["first_name"],
        "middle_name" => $row["middle_name"],
        "last_name" => $row["last_name"],
        "employee_name" => $row["employee_name"],

        "email" => $row["email"],
        "contact_number" => $row["contact_number"],
        "date_of_birth" => $row["date_of_birth"],

        "department_id" => $row["department_id"],
        "department_name" => $row["department_name"],

        "position_id" => $row["position_id"],
        "position_name" => $row["position_name"],

        "base_salary" => $row["base_salary"],
        "monthly_rate" => $row["monthly_rate"],
        "hourly_rate" => $row["hourly_rate"],

        "employee_type" => $row["employee_type"],
        "status" => $row["status"],

        "branch_id" => $row["branch_id"],
        "branch_name" => $row["branch_name"],

        "image" => $row["image"],

        "user" => $row["user_id"] ? [
            "user_id" => $row["user_id"],
            "username" => $row["username"],
            "role" => $row["role"],
            "status" => $row["user_status"],
        ] : null
    ];
}

echo json_encode(["success" => true, "data" => $rows]);
$conn->close();
