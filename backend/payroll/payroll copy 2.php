<?php

    // header("Access-Control-Allow-Origin: *");
    // header("Access-Control-Allow-Methods: GET, OPTIONS");
    // header("Access-Control-Allow-Headers: Content-Type, Authorization");
    // header("Content-Type: application/json; charset=UTF-8");
    include("../server/cors.php");
    include('../server/connection.php');

    // -----------------------
    $employeeFilter = "";
    if (isset($_GET['employee_id']) && !empty($_GET['employee_id'])) {
        $emp = $conn->real_escape_string($_GET['employee_id']);
        $employeeFilter = " WHERE p.employee_id = '" . $emp . "' ";
    }
    // -----------------------

    $sql = "
        SELECT 
            p.*, 
            bs.basic_salary,
            p.contribution_deduction_type,
            pos.position_name, 
            dept.department_name,
            e.employee_type,
            e.status, 

            ph.is_override_enabled AS philhealth_override_enabled,
            s.is_override_enabled AS sss_override_enabled,
            pg.is_override_enabled AS pagibig_override_enabled,

            CASE 
                WHEN ph.is_override_enabled = 1 AND ph.override_employee_share IS NOT NULL
                THEN ph.override_employee_share
                ELSE ph.employee_share
            END AS philhealth_employee_share,

            CASE 
                WHEN s.is_override_enabled = 1 AND s.override_employee_share IS NOT NULL
                THEN s.override_employee_share
                ELSE s.employee_share
            END AS sss_employee_share,

            CASE 
                WHEN pg.is_override_enabled = 1 AND pg.override_employee_share IS NOT NULL 
                THEN pg.override_employee_share 
                ELSE pg.employee_share 
            END AS pagibig_employee_share,

            COALESCE(
                CASE 
                    WHEN ph.is_override_enabled = 1 AND ph.override_employee_share IS NOT NULL
                    THEN ph.override_employee_share
                    ELSE ph.employee_share
                END, 0
            ) 
            + COALESCE(
                CASE 
                    WHEN s.is_override_enabled = 1 AND s.override_employee_share IS NOT NULL
                    THEN s.override_employee_share
                    ELSE s.employee_share
                END, 0
            )
            + COALESCE(
                CASE 
                    WHEN pg.is_override_enabled = 1 AND pg.override_employee_share IS NOT NULL 
                    THEN pg.override_employee_share 
                    ELSE pg.employee_share 
                END, 0
            ) AS total_deductions,

            COALESCE(SUM(a.overtime_request), 0.00) AS total_overtime_request
        FROM payroll p
        LEFT JOIN employees e ON p.employee_id = e.employee_id
        LEFT JOIN philhealth_contribution ph ON p.employee_id = ph.employee_id
        LEFT JOIN sss_contribution s ON p.employee_id = s.employee_id
        LEFT JOIN pagibig_contribution pg ON p.employee_id = pg.employee_id
        LEFT JOIN positions pos ON p.position_id = pos.position_id
        LEFT JOIN departments dept ON pos.department_id = dept.department_id
        LEFT JOIN attendance a 
            ON a.employee_id = p.employee_id 
            AND a.attendance_date BETWEEN p.date_from AND p.date_until
        LEFT JOIN base_salary bs ON p.employee_id = bs.employee_id
        " 
        . $employeeFilter .
        " GROUP BY p.employee_id, p.date_from, p.date_until, p.position_id, p.department_id, bs.basic_salary
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
                SELECT attendance_date, time_in_morning, time_out_morning, time_in_afternoon, time_out_afternoon, days_credited, total_rendered_hours 
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

            // ✅ SAFE total_rendered_hours calculation
            $total_rendered_hours = 0;
            foreach ($attendance_data as $att) {
                $total_rendered_hours += isset($att['total_rendered_hours']) ? (float)$att['total_rendered_hours'] : 0;
            }
            $row['total_rendered_hours'] = number_format($total_rendered_hours, 2, '.', '');
            // ✅ END ADDITION

            $row['attendance_records'] = $attendance_data;

            // --- leave section ---
            $leave_sql = "
                SELECT 
                    el.leave_id,
                    el.employee_id,
                    el.leave_type_id,
                    el.date_from,
                    el.date_until,
                    el.total_days,
                    lt.leave_name,
                    lt.is_paid,
                    lb.leave_limit,
                    lb.leave_used,
                    lb.leave_balance
                FROM employee_leaves el
                INNER JOIN leave_types lt ON el.leave_type_id = lt.leave_type_id
                INNER JOIN employee_leave_balances lb 
                    ON el.employee_id = lb.employee_id 
                    AND el.leave_type_id = lb.leave_type_id
                WHERE el.employee_id = ?
                AND el.status = 'approved'
                AND (
                    (el.date_from BETWEEN ? AND ?)
                    OR (el.date_until BETWEEN ? AND ?)
                    OR (? BETWEEN el.date_from AND el.date_until)
                    OR (? BETWEEN el.date_from AND el.date_until)
                )
            ";
            $leave_stmt = $conn->prepare($leave_sql);
            $leave_stmt->bind_param("sssssss", $employee_id, $date_from, $date_until, $date_from, $date_until, $date_from, $date_until);
            $leave_stmt->execute();
            $leave_result = $leave_stmt->get_result();

            $leaves_data = [];
            $total_paid_leaves = 0;
            $total_unpaid_leaves = 0;

            while ($leave = $leave_result->fetch_assoc()) {
                $leave_start = max(strtotime($leave['date_from']), strtotime($date_from));
                $leave_end   = min(strtotime($leave['date_until']), strtotime($date_until));
                $overlap_days = ($leave_end >= $leave_start) 
                    ? ((($leave_end - $leave_start) / 86400) + 1) 
                    : 0;

                $usable_days = min($overlap_days, (float)$leave['leave_balance']);

                if ((int)$leave['is_paid'] === 1) {
                    $total_paid_leaves += $usable_days;
                } else {
                    $total_unpaid_leaves += $usable_days;
                }

                $leaves_data[] = [
                    "leave_id"          => $leave['leave_id'],
                    "leave_type"        => $leave['leave_name'],
                    "is_paid"           => (bool)$leave['is_paid'],
                    "leave_limit"       => (float)$leave['leave_limit'],
                    "leave_used"        => (float)$leave['leave_used'],
                    "leave_balance"     => (float)$leave['leave_balance'],
                    "leave_days_cutoff" => $usable_days
                ];
            }
            $leave_stmt->close();

            $row['leaves'] = $leaves_data;
            $row['total_paid_leaves'] = $total_paid_leaves;
            $row['total_unpaid_leaves'] = $total_unpaid_leaves;

            $row['total_overtime_request'] = number_format((float)$row['total_overtime_request'], 2, '.', '');
            $row['basic_salary'] = isset($row['basic_salary']) ? number_format((float)$row['basic_salary'], 2, '.', '') : '0.00';

            $nonRegularTypes = [ 'ojt', 'project-based'];
            if (in_array(strtolower($row['employee_type']), $nonRegularTypes)) {
                $row['philhealth_employee_share'] = '0.00';
                $row['sss_employee_share'] = '0.00';
                $row['pagibig_employee_share'] = '0.00';
                $row['total_deductions'] = '0.00';
            }

            // --- Loan Deduction Logic (unchanged) ---
            $loan_deduction_total = 0.00;
            $loan_deduction_actual_total = 0.00;
            $active_loans = [];

            $loan_sql = "
                SELECT 
                    loan_id, 
                    balance, 
                    deduction_schedule, 
                    payable_per_term, 
                    employee_id, 
                    loan_amount,
                    loan_type,
                    description,
                    loan_reference_no,
                    terms
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

                $skip_sql = "
                    SELECT 1 FROM loan_skip_requests 
                    WHERE loan_id = ? AND payroll_cutoff = ? AND status = 'approved'
                ";
                $skip_stmt = $conn->prepare($skip_sql);
                $skip_stmt->bind_param("is", $loan_id, $date_until);
                $skip_stmt->execute();
                $skip_result = $skip_stmt->get_result();

                $actual_deduction = 0.00;
                $journal_entries = [];

                if ($skip_result->num_rows === 0) {
                    $journal_sql = "
                        SELECT journal_id, amount, entry_type, entry_date 
                        FROM loan_journal_entry
                        WHERE loan_id = ?
                          AND employee_id = ?
                          AND entry_type = 'credit'
                          AND DATE(entry_date) BETWEEN ? AND ?
                        ORDER BY entry_date ASC
                    ";
                    $journal_stmt = $conn->prepare($journal_sql);
                    $journal_stmt->bind_param("isss", $loan_id, $employee_id, $date_from, $date_until);
                    $journal_stmt->execute();
                    $journal_result = $journal_stmt->get_result();

                    while ($j = $journal_result->fetch_assoc()) {
                        $amt = (float)$j['amount'];
                        $actual_deduction += $amt;
                        $journal_entries[] = [
                            "journal_id" => $j['journal_id'],
                            "amount"     => number_format($amt, 2, '.', ''),
                            "entry_type" => $j['entry_type'],
                            "entry_date" => $j['entry_date']
                        ];
                    }
                    $journal_stmt->close();

                    if (count($journal_entries) === 0) {
                        $extended_until = date('Y-m-d', strtotime($date_until . ' +7 days'));

                        $journal_sql2 = "
                            SELECT journal_id, amount, entry_type, entry_date 
                            FROM loan_journal_entry
                            WHERE loan_id = ?
                              AND employee_id = ?
                              AND entry_type = 'credit'
                              AND DATE(entry_date) BETWEEN ? AND ?
                            ORDER BY entry_date ASC
                        ";
                        $journal_stmt2 = $conn->prepare($journal_sql2);
                        $journal_stmt2->bind_param("isss", $loan_id, $employee_id, $date_from, $extended_until);
                        $journal_stmt2->execute();
                        $journal_result2 = $journal_stmt2->get_result();

                        while ($j2 = $journal_result2->fetch_assoc()) {
                            $amt2 = (float)$j2['amount'];
                            $actual_deduction += $amt2;
                            $journal_entries[] = [
                                "journal_id" => $j2['journal_id'],
                                "amount"     => number_format($amt2, 2, '.', ''),
                                "entry_type" => $j2['entry_type'],
                                "entry_date" => $j2['entry_date']
                            ];
                        }
                        $journal_stmt2->close();
                    }

                    if ($actual_deduction <= 0 && count($journal_entries) === 0) {
                        $actual_deduction = null;
                    }
                }

                $loan_deduction_total += $payable_per_term;
                $loan_deduction_actual_total += (is_null($actual_deduction) ? 0.00 : $actual_deduction);

                $active_loans[] = [
                    "loan_id"            => $loan_id,
                    "deduction_schedule" => $loan['deduction_schedule'],
                    "loan_amount"        => number_format((float)$loan['loan_amount'], 2, '.', ''),
                    "payable_per_term"   => number_format($payable_per_term, 2, '.', ''),
                    "balance"            => number_format((float)$loan['balance'], 2, '.', ''),
                    "deduction_actual"   => is_null($actual_deduction) ? "" : number_format($actual_deduction, 2, '.', ''),
                    "journal_entries"    => $journal_entries,
                    "loan_type"          => $loan['loan_type'] ?? "",
                    "description"        => $loan['description'] ?? "",
                    "loan_reference_no"  => $loan['loan_reference_no'] ?? "",
                    "terms"              => $loan['terms'] ?? null
                ];

                $skip_stmt->close();
            }

            $loan_stmt->close();

            $row['loan_deduction'] = number_format($loan_deduction_total, 2, '.', '');
            $row['loan_deduction_actual'] = number_format($loan_deduction_actual_total, 2, '.', '');
            $row['loans'] = $active_loans;

            $payrollData[] = $row;
        }

        echo json_encode(["success" => true, "data" => $payrollData]);
    } else {
        echo json_encode(["success" => true, "data" => []]);
    }

    $conn->close();
?>
