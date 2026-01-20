<?php
// header("Access-Control-Allow-Origin: *");
// header("Access-Control-Allow-Methods: GET, OPTIONS");
// header("Access-Control-Allow-Headers: Content-Type, Authorization");
// header("Content-Type: application/json; charset=UTF-8");

include('../server/connection.php');
include("../server/cors.php");

// Get query parameters
$employee_id = $_GET['employee_id'] ?? '';
$date_requested = $_GET['date_requested'] ?? '';

if (!$employee_id || !$date_requested) {
    echo json_encode(["success" => false, "message" => "Missing parameters."]);
    exit;
}

$sql = "SELECT * FROM employee_overtime_request WHERE employee_id = ? AND date_requested = ?";
$stmt = $conn->prepare($sql);
$stmt->bind_param("ss", $employee_id, $date_requested);
$stmt->execute();
$result = $stmt->get_result();

if ($result->num_rows > 0) {
    $row = $result->fetch_assoc();

    // Check for holiday on the requested date
    $holiday_sql = "SELECT * FROM holidays 
                    WHERE (holiday_date = ? OR (is_recurring = 1 AND DATE_FORMAT(holiday_date, '%m-%d') = DATE_FORMAT(?, '%m-%d')))
                    AND (extended_until IS NULL OR extended_until = '0000-00-00' OR extended_until >= ?)
                    LIMIT 1";
    $holiday_stmt = $conn->prepare($holiday_sql);
    $holiday_stmt->bind_param("sss", $date_requested, $date_requested, $date_requested);
    $holiday_stmt->execute();
    $holiday_result = $holiday_stmt->get_result();

    $multiplier_used = 1.00;

    if ($holiday_result && $holiday_result->num_rows > 0) {
        $holiday = $holiday_result->fetch_assoc();

        if (!empty($holiday['apply_multiplier']) && $holiday['apply_multiplier'] == 1) {
            if (!empty($holiday['ot_multiplier']) && $holiday['ot_multiplier'] > 0) {
                $multiplier_used = floatval($holiday['ot_multiplier']);
            } else {
                $multiplier_used = floatval($holiday['default_multiplier']);
            }
        }

        // Optionally attach holiday info
        $row['holiday_id'] = $holiday['holiday_id'];
        $row['holiday_name'] = $holiday['name'];
    }

    $holiday_stmt->close();

    // Compute computed_overtime based on hours_requested * multiplier_used
    $row['multiplier_used'] = $multiplier_used;
    $row['computed_overtime'] = round(floatval($row['hours_requested']) * $multiplier_used, 4);

    echo json_encode(["success" => true, "data" => $row]);
} else {
    echo json_encode(["success" => false, "message" => "No request found."]);
}

$stmt->close();
$conn->close();
?>
