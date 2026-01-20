<?php
// get_attendance.php (replace existing file)

// Allow CORS preflight and requests
// Note: in production restrict Access-Control-Allow-Origin to your front-end domain
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");
header("Content-Type: application/json; charset=UTF-8");

// Handle OPTIONS preflight quickly
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    echo json_encode(['success' => true, 'message' => 'OK (preflight)']);
    exit;
}

include("../server/connection.php"); // assumes this sets $servername, $username, $password, $dbname
include("../server/cors.php"); // optional, ok if it duplicates headers

// Create connection
$conn = new mysqli($servername, $username, $password, $dbname);
if ($conn->connect_error) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Database connection failed: ' . $conn->connect_error]);
    exit;
}

// Accept parameters from GET or POST (JSON body not required here)
$employee_id = null;
$month = null;
$year = null;

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    // support JSON body
    $raw = file_get_contents('php://input');
    $data = json_decode($raw, true);
    if (is_array($data)) {
        if (isset($data['employee_id'])) $employee_id = $data['employee_id'];
        if (isset($data['month'])) $month = (int)$data['month'];
        if (isset($data['year'])) $year = (int)$data['year'];
    }
    // also fall back to $_POST
    if (!$employee_id && isset($_POST['employee_id'])) $employee_id = $_POST['employee_id'];
    if (!$month && isset($_POST['month'])) $month = (int)$_POST['month'];
    if (!$year && isset($_POST['year'])) $year = (int)$_POST['year'];
} else {
    if (isset($_GET['employee_id'])) $employee_id = $_GET['employee_id'];
    if (isset($_GET['month'])) $month = (int)$_GET['month'];
    if (isset($_GET['year'])) $year = (int)$_GET['year'];
}

// Validate params more carefully
$errors = [];
if (empty($employee_id)) $errors[] = "employee_id is required";
if (!is_int($month) || $month < 1 || $month > 12) $errors[] = "month must be integer 1-12";
if (!is_int($year) || $year < 1970 || $year > 2100) $errors[] = "year must be a reasonable integer";

if (!empty($errors)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Invalid parameters.', 'errors' => $errors]);
    exit;
}

// Prepare SQL
$sql = "
SELECT 
  a.*, 
  COALESCE(o.hours_requested, '0.00') AS hours_requested
FROM 
  attendance a
LEFT JOIN 
  employee_overtime_request o 
ON 
  a.employee_id = o.employee_id 
  AND a.attendance_date = o.date_requested 
  AND o.status = 'Approved'
WHERE 
  a.employee_id = ? 
  AND MONTH(a.attendance_date) = ? 
  AND YEAR(a.attendance_date) = ?
ORDER BY a.attendance_date ASC
";

$stmt = $conn->prepare($sql);
if (!$stmt) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'SQL prepare error: ' . $conn->error]);
    exit;
}

$stmt->bind_param("sii", $employee_id, $month, $year);

if (!$stmt->execute()) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'SQL execute error: ' . $stmt->error]);
    exit;
}

$result = $stmt->get_result();

$attendance_records = [];
while ($row = $result->fetch_assoc()) {
    // Convert NULL times explicitly to empty strings (so front-end won't get unexpected nulls)
    $row['time_in_morning']   = isset($row['time_in_morning'])   ? $row['time_in_morning']   : "";
    $row['time_out_morning']  = isset($row['time_out_morning'])  ? $row['time_out_morning']  : "";
    $row['time_in_afternoon'] = isset($row['time_in_afternoon']) ? $row['time_in_afternoon'] : "";
    $row['time_out_afternoon']= isset($row['time_out_afternoon'])? $row['time_out_afternoon']: "";
    $row['hours_requested']   = isset($row['hours_requested'])   ? $row['hours_requested']   : '0.00';

    $attendance_records[] = $row;
}

$stmt->close();
$conn->close();

echo json_encode(['success' => true, 'data' => $attendance_records]);
exit;
