<?php
// header("Access-Control-Allow-Origin: *");
// header("Access-Control-Allow-Methods: POST, OPTIONS");
// header("Access-Control-Allow-Headers: Content-Type, Authorization");

// if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
//     http_response_code(200);
//     exit();
// }

require_once '../server/connection.php';
include("../server/cors.php");

$data = json_decode(file_get_contents("php://input"));

if (isset($data->request_ids) && is_array($data->request_ids)) {
    $request_ids = $data->request_ids;
    
    // Ensure that request_ids is an array and has elements
    if (count($request_ids) > 0) {
        // Prepare query to delete selected late attendance requests
        $placeholders = implode(",", array_fill(0, count($request_ids), "?"));
        $sql = "DELETE FROM late_attendance_requests WHERE request_id IN ($placeholders)";
        
        if ($stmt = $conn->prepare($sql)) {
            // Bind parameters dynamically
            $stmt->bind_param(str_repeat('i', count($request_ids)), ...$request_ids);

            if ($stmt->execute()) {
                echo json_encode(["success" => true, "message" => "Requests deleted successfully."]);
            } else {
                echo json_encode(["success" => false, "message" => "Failed to delete requests."]);
            }
            $stmt->close();
        } else {
            echo json_encode(["success" => false, "message" => "Failed to prepare the delete query."]);
        }
    } else {
        echo json_encode(["success" => false, "message" => "No request IDs provided."]);
    }
} else {
    echo json_encode(["success" => false, "message" => "Invalid input data."]);
}

$conn->close();
