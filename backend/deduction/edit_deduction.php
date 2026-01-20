<?php
// header("Access-Control-Allow-Origin: *");
// header("Access-Control-Allow-Methods: PUT, OPTIONS");
// header("Access-Control-Allow-Headers: Content-Type, Authorization");
// header("Content-Type: application/json; charset=UTF-8");
include("../server/cors.php");

include('../server/connection.php');

$data = json_decode(file_get_contents("php://input"), true);

if (isset($data['id']) && isset($data['start_time']) && isset($data['end_time']) && isset($data['deduction'])) {
    $id = $data['id'];
    $start_time = $data['start_time'];
    $end_time = $data['end_time'];
    $deduction = $data['deduction'];

    $sql = "UPDATE deduction_table SET start_time = ?, end_time = ?, deduction = ? WHERE id = ?";
    $stmt = $conn->prepare($sql);
    $stmt->bind_param("ssdi", $start_time, $end_time, $deduction, $id);

    if ($stmt->execute()) {
        if ($stmt->affected_rows > 0) {
            echo json_encode(["success" => true, "message" => "Deduction updated successfully."]);
        } else {
            echo json_encode(["success" => false, "message" => "No deduction found with that ID."]);
        }
    } else {
        echo json_encode(["success" => false, "message" => "Error updating deduction."]);
    }

    $stmt->close();
} else {
    echo json_encode(["success" => false, "message" => "Invalid input."]);
}

$conn->close();
?>