<?php
include '../../server/connection.php';
include "../../server/cors.php";

$data = json_decode(file_get_contents("php://input"), true);

if (isset($data['id'])) {
    $id = $data['id'];

    $sql = "DELETE FROM late_deduction WHERE id = ?";
    $stmt = $conn->prepare($sql);
    $stmt->bind_param("i", $id);

    if ($stmt->execute()) {
        echo json_encode(["success" => true]);
    } else {
        echo json_encode(["success" => false, "message" => $stmt->error]);
    }
} else {
    echo json_encode(["success" => false, "message" => "Missing rule ID"]);
}
?>
