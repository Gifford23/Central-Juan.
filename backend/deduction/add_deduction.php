<?php
// header("Access-Control-Allow-Origin: *");
// header("Access-Control-Allow-Methods: POST, OPTIONS");
// header("Access-Control-Allow-Headers: Content-Type, Authorization");
// header("Content-Type: application/json; charset=UTF-8");
include("../server/cors.php");

include('../server/connection.php');

$data = json_decode(file_get_contents("php://input"), true);

if (isset($data['start_time']) && isset($data['end_time']) && isset($data['deduction'])) {
    $start_time = $data['start_time'];
    $end_time = $data['end_time'];
    $deduction = $data['deduction'];

    $sql = "INSERT INTO deduction_table (start_time, end_time, deduction) VALUES (?, ?, ?)";
    $stmt = $conn->prepare($sql);
    $stmt->bind_param("ssi", $start_time, $end_time, $deduction);

    if ($stmt->execute()) {
        echo json_encode(["success" => true, "message" => "Deduction added successfully."]);
    } else {
        echo json_encode(["success" => false, "message" => "Error adding deduction."]);
    }

    $stmt->close();
} else {
    echo json_encode(["success" => false, "message" => "Invalid input."]);
}

$conn->close();
?>