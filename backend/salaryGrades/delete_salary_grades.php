<?php
// header("Access-Control-Allow-Origin: *");
// header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");
// header("Access-Control-Allow-Headers: Content-Type, Authorization");

include('../server/connection.php'); // Include your database connection
include("../server/cors.php");

// if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
//     // Handle preflight request
//     header("HTTP/1.1 200 OK");
//     exit;
// }

if ($_SERVER['REQUEST_METHOD'] === 'DELETE') {
    // Access the ID from the query parameters
    if (isset($_GET['id'])) {
        $gradeId = $_GET['id'];

        // Log the GradeID being deleted
        error_log("Attempting to delete GradeID: " . $gradeId);

        // Prepare and execute the delete statement
        $stmt = $conn->prepare("DELETE FROM salary_grades WHERE GradeID = ?");
        $stmt->bind_param("s", $gradeId);

        if ($stmt->execute()) {
            echo json_encode(['success' => true]);
        } else {
            // Log the error message
            error_log("SQL Error: " . $stmt->error);
            echo json_encode(['success' => false, 'message' => 'Failed to delete record: ' . $stmt->error]);
        }

        $stmt->close();
    } else {
        echo json_encode(['success' => false, 'message' => 'ID not provided.']);
    }

    $conn->close();
} else {
    error_log("Received request method: " . $_SERVER['REQUEST_METHOD']);
    echo json_encode(['success' => false, 'message' => 'Invalid request method.']);
}
?>