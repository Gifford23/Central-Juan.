<?php
// Enable error reporting for debugging (remove in production)
error_reporting(E_ALL);
ini_set('display_errors', 1);

// header("Access-Control-Allow-Origin: *");
// header("Access-Control-Allow-Methods: PUT, OPTIONS");
// header("Access-Control-Allow-Headers: Content-Type");
include("../server/cors.php");

include('../server/connection.php');

if ($_SERVER['REQUEST_METHOD'] === 'PUT') {
    $data = json_decode(file_get_contents("php://input"), true);

    // Validate input data
    if (isset($data['department_id']) && isset($data['department_name'])) {
        $department_id = $conn->real_escape_string($data['department_id']);
        $department_name = $conn->real_escape_string($data['department_name']);

        $sql = "UPDATE departments SET department_name = ? WHERE department_id = ?";
        $stmt = $conn->prepare($sql);

        if ($stmt) {
            $stmt->bind_param("ss", $department_name, $department_id); // Bind both as strings
            $stmt->execute();

            if ($stmt->affected_rows > 0) {
                echo json_encode(["success" => true, "message" => "Department updated successfully"]);
            } else {
                echo json_encode(["success" => false, "message" => "No rows affected or invalid department ID"]);
            }

            $stmt->close();
        } else {
            echo json_encode(["success" => false, "message" => "Error preparing statement: " . $conn->error]);
        }
    } else {
        echo json_encode(["success" => false, "message" => "Invalid department data"]);
    }
} else {
    echo json_encode(["success" => false, "message" => "Invalid request method"]);
}

$conn->close();
?>
