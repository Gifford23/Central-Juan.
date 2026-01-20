<?php
// update_base_salary.php
// header('Access-Control-Allow-Origin: *');
// header('Access-Control-Allow-Methods: PUT, POST, GET, DELETE, OPTIONS');
// header('Access-Control-Allow-Headers: Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With');
// header('Content-Type: application/json');
include("../server/cors.php");

require_once '../server/connection.php';

$data = json_decode(file_get_contents("php://input"), true);

if (isset($data['base_salary_id']) && isset($data['employee_id']) && isset($data['first_name']) && isset($data['last_name']) && isset($data['basic_salary'])) {
    $base_salary_id = $data['base_salary_id'];
    $employee_id = $data['employee_id'];
    $first_name = $data['first_name'];
    $middle_name = isset($data['middle_name']) ? $data['middle_name'] : null;
    $last_name = $data['last_name'];
    $basic_salary = $data['basic_salary'];

    $sql = "UPDATE base_salary 
            SET employee_id = '$employee_id', first_name = '$first_name', middle_name = '$middle_name', last_name = '$last_name', basic_salary = '$basic_salary' 
            WHERE base_salary_id = '$base_salary_id'";

    if ($conn->query($sql) === TRUE) {
        echo json_encode(["success" => true, "message" => "Base salary updated successfully."]);
    } else {
        echo json_encode(["success" => false, "message" => "Error: " . $conn->error]);
    }
} else {
    echo json_encode(["success" => false, "message" => "Incomplete data."]);
}

$conn->close();
?>
