<?php
// // // Enable CORS
// // header("Access-Control-Allow-Origin: *");
// // header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");
// // header("Access-Control-Allow-Headers: Content-Type, Authorization");

// // // Handle preflight OPTIONS request
// // if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
// //     http_response_code(204);
// //     exit;
// // }

// include("../server/cors.php");
// include('../server/connection.php');

// if ($_SERVER['REQUEST_METHOD'] === 'DELETE') {
//     if (!empty($_GET['id'])) {
//         $employee_id = $_GET['id'];

//         $stmt = $conn->prepare("DELETE FROM employees WHERE employee_id = ?");
//         $stmt->bind_param("s", $employee_id);

//         if ($stmt->execute() && $stmt->affected_rows > 0) {
//             echo json_encode(['success' => true, 'message' => "Employee with ID {$employee_id} deleted."]);
//         } else {
//             echo json_encode(['success' => false, 'message' => 'Employee not found or deletion failed.']);
//         }
//         $stmt->close();
//     } else {
//         echo json_encode(['success' => false, 'message' => 'Invalid employee ID.']);
//     }
//     $conn->close();
// }
// 






include("../server/cors.php");
include('../server/connection.php');

header("Content-Type: application/json; charset=UTF-8");

if ($_SERVER['REQUEST_METHOD'] === 'DELETE') {
    if (!empty($_GET['id'])) {
        $employee_id = $_GET['id'];

        // ✅ Capture current user from headers or request payload
        $userFullName = $_GET['full_name'] ?? 'Unknown User';
        $userRole     = $_GET['role'] ?? 'GUEST';

        // ✅ Optional: fetch employee full name before deletion for logs
        $empRes = $conn->prepare("SELECT first_name, last_name FROM employees WHERE employee_id = ?");
        $empRes->bind_param("s", $employee_id);
        $empRes->execute();
        $empResult = $empRes->get_result()->fetch_assoc();
        $empFullName = $empResult ? "{$empResult['first_name']} {$empResult['last_name']}" : "Unknown Employee";
        $empRes->close();

        // ✅ Delete employee
        $stmt = $conn->prepare("DELETE FROM employees WHERE employee_id = ?");
        $stmt->bind_param("s", $employee_id);

        if ($stmt->execute() && $stmt->affected_rows > 0) {
            // ✅ Insert log
            $action = "Deleted employee: {$empFullName} (ID: {$employee_id})";
            $logStmt = $conn->prepare("INSERT INTO logs (user_full_name, user_role, action) VALUES (?, ?, ?)");
            $logStmt->bind_param("sss", $userFullName, $userRole, $action);
            $logStmt->execute();
            $logStmt->close();

            echo json_encode(['success' => true, 'message' => "Employee with ID {$employee_id} deleted."]);
        } else {
            echo json_encode(['success' => false, 'message' => 'Employee not found or deletion failed.']);
        }
        $stmt->close();
    } else {
        echo json_encode(['success' => false, 'message' => 'Invalid employee ID.']);
    }

    $conn->close();
}
?>