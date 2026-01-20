<?php
// CORS Headers
// header("Access-Control-Allow-Origin: *"); // Or use your frontend origin like http://localhost:5173
// header("Access-Control-Allow-Methods: POST, GET, OPTIONS");
// header("Access-Control-Allow-Headers: Content-Type, Authorization");

// // Handle preflight requests
// if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
//     http_response_code(200);
//     exit();
// }

// Continue with the update logic
include('../server/connection.php');
include("../server/cors.php");

$method = $_SERVER['REQUEST_METHOD'];

if ($method !== 'POST') {
    echo json_encode(["success" => false, "message" => "Only POST requests are allowed."]);
    exit;
}

// Collect input
$request_id = $_POST['id'] ?? null;
$status = $_POST['status'] ?? null;
$approved_by = $_POST['approved_by'] ?? null;

// Validate input
if (!$request_id || !$status) {
    echo json_encode(["success" => false, "message" => "Missing required fields."]);
    exit;
}

// Build SQL based on whether approved_by is provided
if ($status === "Rejected") {
    $approved_by = "Not approved yet";
}

$sql = "UPDATE employee_overtime_request SET status = ?, approved_by = ? WHERE request_id = ?";
$stmt = $conn->prepare($sql);
$stmt->bind_param("ssi", $status, $approved_by, $request_id);

if ($stmt->execute()) {
    // ✅ Apply multiplier and update attendance if approved
    if ($status === "Approved") {
        $fetch = $conn->prepare("SELECT employee_id, date_requested, hours_requested, multiplier_used FROM employee_overtime_request WHERE request_id = ?");
        $fetch->bind_param("i", $request_id);
        $fetch->execute();
        $res = $fetch->get_result();
        
        if ($res && $res->num_rows > 0) {
            $data = $res->fetch_assoc();
            $computed_overtime = round($data['hours_requested'] * $data['multiplier_used'], 4);

            $updateAttendance = $conn->prepare("UPDATE attendance SET overtime_request = ? WHERE employee_id = ? AND attendance_date = ?");
            $updateAttendance->bind_param("dss", $computed_overtime, $data['employee_id'], $data['date_requested']);
            $updateAttendance->execute();
            $updateAttendance->close();
        }

        $fetch->close();
    }

    echo json_encode(["success" => true, "message" => "Status updated successfully."]);
} else {
    echo json_encode(["success" => false, "message" => "Failed to update status."]);
}

$stmt->close();
$conn->close();
?>
