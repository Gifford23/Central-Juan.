<?php

// header("Access-Control-Allow-Origin: *");
// header("Access-Control-Allow-Methods: POST, OPTIONS");
// header("Access-Control-Allow-Headers: Content-Type, Authorization");
// header("Content-Type: application/json; charset=UTF-8");

include('../server/connection.php');
include("../server/cors.php");

// Get the JSON input
$data = json_decode(file_get_contents("php://input"), true);

if (isset($data['payroll_id'])) {
    $payroll_id = $data['payroll_id'];

    $sql = "DELETE FROM payroll WHERE payroll_id = ?";
    $stmt = $conn->prepare($sql);
    $stmt->bind_param("i", $payroll_id);

    if ($stmt->execute()) {
        echo json_encode(["success" => true, "message" => "Payroll record deleted successfully."]);
    } else {
        echo json_encode(["success" => false, "message" => "Error deleting record: " . $stmt->error]);
    }

    $stmt->close();
} else {
    echo json_encode(["success" => false, "message" => "Invalid request."]);
}

$conn->close();
?>
