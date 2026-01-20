<?php
include '../server/connection.php';
include("../server/cors.php");

// header("Access-Control-Allow-Origin: *");
// header("Access-Control-Allow-Methods: POST, OPTIONS");
// header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");
// header("Content-Type: application/json; charset=UTF-8");

// if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
//     http_response_code(200);
//     exit();
// }

try {
    // Update all payrolls with matching loan deductions
    $sql = "
        UPDATE payroll p
        JOIN (
            SELECT 
                lje.employee_id,
                SUM(lje.amount) AS total_deduction,
                MIN(p2.payroll_id) as matched_payroll_id
            FROM loan_journal_entry lje
            JOIN payroll p2 ON 
                lje.employee_id = p2.employee_id 
                AND DATE(lje.entry_date) BETWEEN p2.date_from AND p2.date_until
            WHERE lje.entry_type = 'credit'
            GROUP BY lje.employee_id, p2.date_from, p2.date_until
        ) AS j 
        ON p.payroll_id = j.matched_payroll_id
        SET p.loan_deduction_applied = j.total_deduction
    ";

    $stmt = $conn->prepare($sql);
    $stmt->execute();

    echo json_encode([
        "success" => true,
        "message" => "Loan deduction applied successfully updated in payroll table."
    ]);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        "success" => false,
        "message" => "Error updating loan deduction.",
        "error" => $e->getMessage()
    ]);
}
?>
