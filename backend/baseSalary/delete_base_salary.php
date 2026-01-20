<?php
// delete_base_salary.php
// header('Access-Control-Allow-Origin: *');
// header('Access-Control-Allow-Methods: DELETE, POST, GET, OPTIONS');
// header('Access-Control-Allow-Headers: Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With');
// header('Content-Type: application/json');
include("../server/cors.php");

require_once '../server/connection.php';

$data = json_decode(file_get_contents("php://input"), true);

if (isset($data['base_salary_id'])) {
    $base_salary_id = $data['base_salary_id'];

    $sql = "DELETE FROM base_salary WHERE base_salary_id = '$base_salary_id'";

    if ($conn->query($sql) === TRUE) {
        echo json_encode(["success" => true, "message" => "Base salary deleted successfully."]);
    } else {
        echo json_encode(["success" => false, "message" => "Error: " . $conn->error]);
    }
} else {
    echo json_encode(["success" => false, "message" => "Incomplete data."]);
}

$conn->close();
?>
