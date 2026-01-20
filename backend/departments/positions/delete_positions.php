<?php
error_reporting(E_ALL);
ini_set('display_errors', 1);

// Set headers to handle CORS
// header("Access-Control-Allow-Origin: *");
// header("Access-Control-Allow-Methods: POST, GET, DELETE, OPTIONS");
// header("Access-Control-Allow-Headers: Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With");

// // Handle preflight requests   
// if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
//     http_response_code(200);
//     exit;
// }
include("../../server/cors.php");


include('../../server/connection.php');

$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'DELETE') {
    // Parse the query parameter for the position ID
    $position_id = $_GET['id'] ?? null;

    if ($position_id) {
        $position_id = $conn->real_escape_string($position_id);
        $sql = "DELETE FROM positions WHERE position_id = '$position_id'";

        if ($conn->query($sql) === TRUE) {
            echo json_encode(["status" => "success", "message" => "Position deleted successfully"]);
        } else {
            echo json_encode(["status" => "error", "message" => "Error: " . $conn->error]);
        }
    } else {
        echo json_encode(["status" => "error", "message" => "Invalid position ID"]);
    }
} else {
    echo json_encode(["status" => "error", "message" => "Invalid request method"]);
}

$conn->close();
?>
