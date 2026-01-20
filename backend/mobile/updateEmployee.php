<?php

include('../server/connection.php');
include("../server/cors.php");

// header("Access-Control-Allow-Origin: *");
// header("Content-Type: application/json; charset=UTF-8");
// header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");
// header("Access-Control-Allow-Headers: Content-Type, Authorization");
// Include the database connection

if ($_SERVER['REQUEST_METHOD'] == 'POST') {
    // Get the form data
    $employee_id = $_POST['employee_id'];
    $first_name = $_POST['first_name'];
    $last_name = $_POST['last_name'];
    $email = $_POST['email'];
    $contact_number = $_POST['contact_number'];
    $date_of_birth = $_POST['date_of_birth'];

    // Prepare the SQL update statement
    $stmt = $conn->prepare("UPDATE employees SET first_name = ?, last_name = ?, email = ?, contact_number = ?, date_of_birth = ? WHERE employee_id = ?");
    $stmt->bind_param("ssssss", $first_name, $last_name, $email, $contact_number, $date_of_birth, $employee_id);

    if ($stmt->execute()) {
        echo json_encode(['success' => true, 'message' => 'Employee data updated']);
    } else {
        echo json_encode(['success' => false, 'message' => 'Failed to update employee data']);
    }

    $stmt->close();
}

$conn->close();
?>
