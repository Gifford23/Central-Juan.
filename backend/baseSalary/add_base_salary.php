<?php
// add_base_salary.php
// header('Access-Control-Allow-Origin: *');
// header('Access-Control-Allow-Methods: POST');
// header('Content-Type: application/json');
include("../server/cors.php");
require_once '../server/connection.php';

$data = json_decode(file_get_contents("php://input"), true);

if (isset($data['employee_id']) && isset($data['employee_name']) && isset($data['basic_salary'])) {
    $employee_id = $data['employee_id'];
    $employee_name = $data['employee_name'];
    $basic_salary = $data['basic_salary'];

    $sql = "INSERT INTO base_salary (employee_id, employee_name, basic_salary) VALUES ('$employee_id', '$employee_name', '$basic_salary')";

    if ($conn->query($sql) === TRUE) {
        echo json_encode(["success" => true, "message" => "Base salary added successfully."]);
    } else {
        echo json_encode(["success" => false, "message" => "Error: " . $conn->error]);
    }
} else {
    echo json_encode(["success" => false, "message" => "Incomplete data."]);
}

$conn->close();
?>
