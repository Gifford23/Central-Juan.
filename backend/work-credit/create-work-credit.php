<?php
include '../server/connection.php';

// Full CORS Headers
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");
header("Content-Type: application/json; charset=UTF-8");

// Get POST data
$data = json_decode(file_get_contents("php://input"), true);

// Example fields: employee_id, work_date, time_in, time_out
$employee_id = $data['employee_id'] ?? null;
$work_date   = $data['work_date'] ?? null;
$time_in     = $data['time_in'] ?? null;
$time_out    = $data['time_out'] ?? null;

try {
    if (!$employee_id || !$work_date || !$time_in || !$time_out) {
        throw new Exception("Missing required fields.");
    }

    // =============================
    // TODO: 1. Fetch assigned shift (work_time) for this employee/date
    // =============================

    // =============================
    // TODO: 2. Fetch all assigned breaks (from break_time / work_time_break)
    // =============================

    // =============================
    // TODO: 3. Compute actual rendered minutes
    // actual_rendered_minutes = TIMESTAMPDIFF(MINUTE, time_in, time_out)
    // =============================

    // =============================
    // TODO: 4. Compute total break minutes
    // =============================

    // =============================
    // TODO: 5. Calculate net work minutes
    // net_work_minutes = work_minutes - break_minutes
    // =============================

    // =============================
    // TODO: 6. Calculate work credit
    // work_credit = actual_rendered_minutes / net_work_minutes (cap at 1.00)
    // =============================

    // =============================
    // TODO: 7. Check early out / undertime
    // early_out_minutes = GREATEST(0, net_work_minutes - actual_rendered_minutes)
    // =============================

    // =============================
    // TODO: 8. Apply late deduction rules
    // =============================

    // =============================
    // TODO: 9. Insert attendance record into your attendance table
    // =============================

    echo json_encode([
        "success" => true,
        "message" => "Attendance record inserted successfully."
    ]);

} catch (Exception $e) {
    http_response_code(400);
    echo json_encode([
        "success" => false,
        "message" => $e->getMessage()
    ]);
}
?>
