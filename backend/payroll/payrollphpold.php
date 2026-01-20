

<?php
//7/23/2025 old code for payroll backup

// header("Access-Control-Allow-Origin: *");
// header("Access-Control-Allow-Methods: GET, OPTIONS");
// header("Access-Control-Allow-Headers: Content-Type, Authorization");
// header("Content-Type: application/json; charset=UTF-8");

include('../server/connection.php');
include("../server/cors.php");

// SQL to get payroll info
$sql = "
    SELECT 
        p.*, 
        bs.basic_salary,
        pos.position_name, 
        dept.department_name,
        e.employee_type, -- ✅ JOIN employee type
        ph.employee_share AS philhealth_employee_share, 
        s.employee_share AS sss_employee_share, 
        pg.employee_share AS pagibig_employee_share,
        COALESCE(ph.employee_share, 0) + COALESCE(s.employee_share, 0) + COALESCE(pg.employee_share, 0) AS total_deductions,
        COALESCE(SUM(a.overtime_request), 0.00) AS total_overtime_request
    FROM 
        payroll p
    LEFT JOIN 
        employees e ON p.employee_id = e.employee_id -- ✅ JOIN to access employee_type
    LEFT JOIN 
        philhealth_contribution ph ON p.employee_id = ph.employee_id
    LEFT JOIN 
        sss_contribution s ON p.employee_id = s.employee_id
    LEFT JOIN 
        pagibig_contribution pg ON p.employee_id = pg.employee_id
    LEFT JOIN 
        positions pos ON p.position_id = pos.position_id
    LEFT JOIN 
        departments dept ON pos.department_id = dept.department_id
    LEFT JOIN 
        attendance a ON a.employee_id = p.employee_id AND a.attendance_date BETWEEN p.date_from AND p.date_until
    LEFT JOIN 
        base_salary bs ON p.employee_id = bs.employee_id
    GROUP BY 
        p.employee_id, p.date_from, p.date_until, p.position_id, p.department_id, bs.basic_salary
";

$result = $conn->query($sql);

if ($result->num_rows > 0) {
    $payrollData = [];
    while ($row = $result->fetch_assoc()) {

        $employee_id = $row['employee_id'];
        $date_from = $row['date_from'];
        $date_until = $row['date_until'];

        // Fetch attendance
        $attendance_sql = "
            SELECT attendance_date, time_in_morning, time_out_morning, time_in_afternoon, time_out_afternoon, days_credited 
            FROM attendance 
            WHERE employee_id = ? AND attendance_date BETWEEN ? AND ? 
            ORDER BY attendance_date ASC
        ";
        $attendance_stmt = $conn->prepare($attendance_sql);
        $attendance_stmt->bind_param("sss", $employee_id, $date_from, $date_until);
        $attendance_stmt->execute();
        $attendance_result = $attendance_stmt->get_result();

        $attendance_data = [];
        while ($att_row = $attendance_result->fetch_assoc()) {
            $attendance_data[] = $att_row;
        }
        $attendance_stmt->close();

        $row['attendance_records'] = $attendance_data;

        // Format values
        $row['total_overtime_request'] = number_format((float)$row['total_overtime_request'], 2, '.', '');
        $row['basic_salary'] = isset($row['basic_salary']) ? number_format((float)$row['basic_salary'], 2, '.', '') : '0.00';

        // ✅ Disable contributions if not Regular
        $nonRegularTypes = ['part-time', 'ojt', 'contractual'];
        if (in_array(strtolower($row['employee_type']), $nonRegularTypes)) {
            $row['philhealth_employee_share'] = '0.00';
            $row['sss_employee_share'] = '0.00';
            $row['pagibig_employee_share'] = '0.00';
            $row['total_deductions'] = '0.00';
        }

        // ✅ Loan Deduction Logic
        $loan_deduction = 0.00;
        $active_loans = []; // ⬅️ Optional: Include active loan details in response

        $loan_sql = "
            SELECT loan_id, balance, deduction_schedule, payable_per_term, employee_id 
            FROM loans 
            WHERE employee_id = ? AND balance > 0
        ";
        $loan_stmt = $conn->prepare($loan_sql);
        $loan_stmt->bind_param("s", $employee_id);
        $loan_stmt->execute();
        $loan_result = $loan_stmt->get_result();

        while ($loan = $loan_result->fetch_assoc()) {
            $loan_id = $loan['loan_id'];
            $payable_per_term = (float)$loan['payable_per_term'];

            // ✅ Check for approved skip request
            $skip_sql = "
                SELECT * FROM loan_skip_requests 
                WHERE loan_id = ? AND payroll_cutoff = ? AND status = 'approved'
            ";
            $skip_stmt = $conn->prepare($skip_sql);
            $skip_stmt->bind_param("is", $loan_id, $date_until);
            $skip_stmt->execute();
            $skip_result = $skip_stmt->get_result();

            if ($skip_result->num_rows === 0) {
                // ✅ If not skipped, check if already deducted this cutoff
                $deducted_sql = "
                    SELECT SUM(amount) AS total 
                    FROM loan_journal_entry 
                    WHERE loan_id = ? AND employee_id = ? AND entry_type = 'debit' AND DATE(entry_date) = ?
                ";
                $deducted_stmt = $conn->prepare($deducted_sql);
                $deducted_stmt->bind_param("iss", $loan_id, $employee_id, $date_until);
                $deducted_stmt->execute();
                $deducted_result = $deducted_stmt->get_result();
                $deducted_row = $deducted_result->fetch_assoc();
                $already_deducted = (float)($deducted_row['total'] ?? 0.00);

$final_deduction = isset($loan['final_loan_deduction']) && $loan['final_loan_deduction'] > 0 
    ? (float)$loan['final_loan_deduction'] 
    : $payable_per_term;

if ($already_deducted == 0 && $final_deduction > 0) {
    $loan_deduction += $final_deduction;
}


                $deducted_stmt->close();
            }

            $active_loans[] = [
                "loan_id" => $loan_id,
                "deduction_schedule" => $loan['deduction_schedule'],
                "payable_per_term" => number_format($payable_per_term, 2, '.', ''),
                "balance" => number_format((float)$loan['balance'], 2, '.', '')
            ];

            $skip_stmt->close();
        }

        $loan_stmt->close();

        $row['loan_deduction'] = number_format($loan_deduction, 2, '.', '');
        $row['loans'] = $active_loans; // ⬅️ Attach to frontend

        $payrollData[] = $row;
    }

    echo json_encode(["success" => true, "data" => $payrollData]);
} else {
    echo json_encode(["success" => true, "data" => []]);
}

$conn->close();
?>
