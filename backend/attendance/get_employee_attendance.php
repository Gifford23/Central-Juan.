<?php
// header("Access-Control-Allow-Origin: *");
// header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");
// header("Access-Control-Allow-Headers: Content-Type, Authorization");
include("../server/cors.php");
include "../server/connection.php";

// Get the employee ID, month, and year from the query parameters
$employee_id = $_GET['employee_id'] ?? null;
$month = $_GET['month'] ?? null;
$year = $_GET['year'] ?? null;

if ($employee_id && $month && $year) {
    // Prepare the SQL query to fetch attendance records for the specified employee, month, and year
    $sql = "SELECT * FROM attendance WHERE employee_id = ? AND MONTH(attendance_date) = ? AND YEAR(attendance_date) = ?";
    $stmt = $conn->prepare($sql);
    $stmt->bind_param("sii", $employee_id, $month, $year);
    $stmt->execute();
    $result = $stmt->get_result();

    $records = [];
    while ($row = $result->fetch_assoc()) {
        $records[] = $row; // Add each record to the array
    }

    echo json_encode(["success" => true, "records" => $records]);
} else {
    echo json_encode(["success" => false, "message" => "Invalid input data."]);
}

$conn->close();
?>