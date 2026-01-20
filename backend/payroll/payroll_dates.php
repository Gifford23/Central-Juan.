<?php
// header("Access-Control-Allow-Origin: *");
// header("Access-Control-Allow-Methods: POST, OPTIONS");
// header("Access-Control-Allow-Headers: Content-Type, Authorization");
// header("Content-Type: application/json; charset=UTF-8");

include('../server/connection.php');
include("../server/cors.php");

// if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
//     http_response_code(200);
//     exit();
// }

$data = json_decode(file_get_contents("php://input"), true);

if (isset($data['action']) && $data['action'] === 'update_all_dates') {
    $date_from = $data['date_from'];
    $date_until = $data['date_until'];

    if (empty($date_from) || empty($date_until)) {
        echo json_encode(["success" => false, "message" => "Both dates are required."]);
        exit();
    }

    // Convert to MySQL format
    $date_from = date('Y-m-d', strtotime($date_from));
    $date_until = date('Y-m-d', strtotime($date_until));

    $start = new DateTime($date_from);
    $end = new DateTime($date_until);
    $total_days = $start->diff($end)->days + 1;

    // Get all payroll IDs first
    $query = "SELECT payroll_id FROM payroll";
    $result = $conn->query($query);

    if ($result->num_rows > 0) {
        $stmt = $conn->prepare("UPDATE payroll SET date_from=?, date_until=?, total_days=? WHERE payroll_id=?");

        while ($row = $result->fetch_assoc()) {
            $payroll_id = $row['payroll_id'];
            $stmt->bind_param("ssii", $date_from, $date_until, $total_days, $payroll_id);
            $stmt->execute();
        }

        $stmt->close();
        echo json_encode(["success" => true, "message" => "Payroll records updated successfully."]);
    } else {
        echo json_encode(["success" => false, "message" => "No payroll records found."]);
    }
} else {
    echo json_encode(["success" => false, "message" => "Invalid request."]);
}

$conn->close();
?>
