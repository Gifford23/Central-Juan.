<?php
include '../server/connection.php';
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: DELETE, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");
header("Content-Type: application/json; charset=UTF-8");

$data = json_decode(file_get_contents("php://input"), true);
$attendance_id = $data['attendance_id'] ?? null;

try {
    if (!$attendance_id) {
        throw new Exception("Attendance ID is required.");
    }

    $stmt = $conn->prepare("DELETE FROM attendance WHERE id = ?");
    $stmt->bind_param("i", $attendance_id);
    $stmt->execute();

    echo json_encode([
        "success" => true,
        "message" => "Attendance record deleted successfully."
    ]);

} catch (Exception $e) {
    http_response_code(400);
    echo json_encode([
        "success" => false,
        "message" => $e->getMessage()
    ]);
}
?>
