<?php
// header("Access-Control-Allow-Origin: *");
// header("Access-Control-Allow-Methods: DELETE, OPTIONS");
// header("Access-Control-Allow-Headers: Content-Type");
include("../server/cors.php");

include('../server/connection.php');

$department_id = $_GET['id'] ?? null;

if ($department_id) {
    // Use single quotes for VARCHAR types in SQL
    $sql = "DELETE FROM `departments` WHERE `department_id` = '$department_id'";

    if ($conn->query($sql) === TRUE) {
        echo json_encode(["status" => "success", "message" => "Department deleted successfully"]);
    } else {
        echo json_encode(["status" => "error", "message" => "Error deleting department: " . $conn->error]);
    }
} else {
    echo json_encode(["status" => "error", "message" => "Department ID missing"]);
}

$conn->close();
?>
