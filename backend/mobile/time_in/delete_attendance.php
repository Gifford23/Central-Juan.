<?php

//http://localhost/central_juan/backend/mobile/time_in/delete_attendance.php
// header("Access-Control-Allow-Origin: *");
// header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");
// header("Access-Control-Allow-Headers: Content-Type, Authorization");

include "../../server/connection.php";
include("../../server/cors.php");

if (isset($_GET['id'])) {
    $attendance_id = $_GET['id'];

    $sql = "DELETE FROM attendance WHERE attendance_id=?";
    $stmt = $conn->prepare($sql);
    $stmt->bind_param("i", $attendance_id);

    if ($stmt->execute()) {
        echo json_encode(["success" => true]);
    } else {
        echo json_encode(["success" => false, "message" => "Failed to delete record."]);
    }

    $stmt->close();
} else {
    echo json_encode(["success" => false, "message" => "Invalid request."]);
}

$conn->close();
?>
