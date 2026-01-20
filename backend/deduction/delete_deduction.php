<?php
// header("Access-Control-Allow-Origin: *");
// header("Access-Control-Allow-Methods: DELETE, OPTIONS");
// header("Access-Control-Allow-Headers: Content-Type, Authorization");
// header("Content-Type: application/json; charset=UTF-8");
include("../server/cors.php");

include('../server/connection.php');

$data = json_decode(file_get_contents("php://input"), true);

if (isset($data['id'])) {
    $id = $data['id'];

    $sql = "DELETE FROM deduction_table WHERE id = ?";
    $stmt = $conn->prepare($sql);
    $stmt->bind_param("i", $id);

    if ($stmt->execute()) {
        if ($stmt->affected_rows > 0) {
            echo json_encode(["success" => true, "message" => "Deduction deleted successfully."]);
        } else {
            echo json_encode(["success" => false, "message" => "No deduction found with that ID."]);
        }
    } else {
        echo json_encode(["success" => false, "message" => "Error deleting deduction."]);
    }

    $stmt->close();
} else {
    echo json_encode(["success" => false, "message" => "Invalid input."]);
}

$conn->close();
?>