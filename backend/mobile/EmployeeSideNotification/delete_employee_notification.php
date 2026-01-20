<?php
// header("Access-Control-Allow-Origin: *");
// header("Access-Control-Allow-Methods: DELETE, OPTIONS");
// header("Access-Control-Allow-Headers: Content-Type, Authorization");
// header("Content-Type: application/json; charset=UTF-8");

// if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
//     http_response_code(200);
//     exit();
// }

include('../../server/connection.php');
include("../../server/cors.php");


$input = json_decode(file_get_contents("php://input"), true);

if (!isset($input['id'])) {
    echo json_encode(["success" => false, "message" => "Missing ID"]);
    exit;
}

$id = $input['id'];

$sql = "DELETE FROM your_notification_table WHERE id = ?";
$stmt = $conn->prepare($sql);
$stmt->bind_param("i", $id);

if ($stmt->execute()) {
    echo json_encode(["success" => true, "message" => "Notification deleted"]);
} else {
    echo json_encode(["success" => false, "message" => "Delete failed"]);
}

$stmt->close();
$conn->close();
?>
