<?php
// header("Access-Control-Allow-Origin: *");
// header("Access-Control-Allow-Methods: GET, OPTIONS");
// header("Access-Control-Allow-Headers: Content-Type, Authorization");
// header("Content-Type: application/json; charset=UTF-8");
// Include the database connection
include('../server/connection.php');
include("../server/cors.php");


// SQL query to count positions per department
$sql = "SELECT d.department_name AS department, COUNT(p.position_id) AS position_count
        FROM departments d
        LEFT JOIN positions p ON d.department_id = p.department_id
        GROUP BY d.department_id";

$result = $conn->query($sql);

$data = [];
if ($result->num_rows > 0) {
    while ($row = $result->fetch_assoc()) {
        $data[] = $row;
    }
}

// Close the database connection
$conn->close();

// Return the data as JSON
echo json_encode($data);
?>