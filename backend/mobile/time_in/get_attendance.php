<?php
// header("Access-Control-Allow-Origin: *");
// header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");
// header("Access-Control-Allow-Headers: Content-Type, Authorization");

include "../../server/connection.php";
include("../../server/cors.php");

$conn = new mysqli($servername, $username, $password, $dbname);
if ($conn->connect_error) {
    die(json_encode(['success' => false, 'message' => 'Database connection failed: ' . $conn->connect_error]));
}

$employee_id = isset($_GET['employee_id']) ? $_GET['employee_id'] : null;
$month = isset($_GET['month']) ? (int)$_GET['month'] : null;
$year = isset($_GET['year']) ? (int)$_GET['year'] : null;
$specific_date = isset($_GET['date']) ? $_GET['date'] : null;

if (!$employee_id) {
    echo json_encode(['success' => false, 'message' => 'Invalid parameters.']);
    exit;
}

if ($specific_date) {
    // Search by exact date
    $sql = "SELECT * FROM attendance WHERE employee_id = ? AND attendance_date = ?";
    $stmt = $conn->prepare($sql);
    $stmt->bind_param("ss", $employee_id, $specific_date);
} elseif ($month && $year) {
    // Fallback: Search by month/year
    $sql = "SELECT * FROM attendance WHERE employee_id = ? AND MONTH(attendance_date) = ? AND YEAR(attendance_date) = ?";
    $stmt = $conn->prepare($sql);
    $stmt->bind_param("sii", $employee_id, $month, $year);
} else {
    echo json_encode(['success' => false, 'message' => 'Insufficient parameters.']);
    exit;
}

if (!$stmt->execute()) {
    echo json_encode(['success' => false, 'message' => 'SQL execute error: ' . $stmt->error]);
    exit;
}

$result = $stmt->get_result();
$attendance_records = [];
while ($row = $result->fetch_assoc()) {
    $attendance_records[] = $row;
}

$stmt->close();
$conn->close();

echo json_encode(['success' => true, 'data' => $attendance_records]);
?>
