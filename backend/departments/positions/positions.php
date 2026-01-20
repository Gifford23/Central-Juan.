<?php
// header("Access-Control-Allow-Origin: *");
// header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
// header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");
// header("Content-Type: application/json");

include('../../server/connection.php');
include("../../server/cors.php");


// if ($_SERVER['REQUEST_METHOD'] == 'OPTIONS') {
//     http_response_code(200);
//     exit();
// }

$departmentId = $_GET['department_id'] ?? '';

if (empty($departmentId)) {
    echo json_encode(["success" => false, "message" => "Department ID is required"]);
    exit;
}

try {
    $stmt = $conn->prepare("SELECT position_id, position_name FROM positions WHERE department_id = ?");
    $stmt->bind_param("s", $departmentId);

    if ($stmt->execute()) {
        $result = $stmt->get_result();
        $positions = $result->fetch_all(MYSQLI_ASSOC);

        echo json_encode(["success" => true, "data" => $positions ?: []]);
    } else {
        echo json_encode(["success" => false, "message" => "Query failed", "error" => $stmt->error]);
    }

    $stmt->close();
    $conn->close();
} catch (Exception $e) {
    echo json_encode(["success" => false, "message" => $e->getMessage()]);
}
?>
