<?php
// commission_per_employee/commission.php
// PURPOSE:
// - Show ALL commission records per payroll cutoff
// - SAME employee can repeat across different date ranges
// - NO collapsing, NO LIMIT 1, NO "latest only" logic

include("../server/cors.php");
include("../server/connection.php");

header("Content-Type: application/json; charset=utf-8");

try {

    $sql = "
        SELECT
            p.payroll_id,
            p.employee_id,
            p.name,
            p.department_id,
            p.position_id,
            p.date_from   AS payroll_date_from,
            p.date_until  AS payroll_date_until,
            p.total_days,
            p.basic_salary,
            p.total_basic_salary,
            p.total_salary,
            p.commission_based,

            c.commission_id,
            c.date_from   AS commission_date_from,
            c.date_until  AS commission_date_until,
            c.basic_salary AS commission_basic_salary,
            c.commission,
            c.total        AS commission_total,
            c.salary       AS commission_salary,
            c.created_at   AS commission_created_at

        FROM payroll p
        INNER JOIN commission_per_employee c
            ON c.employee_id = p.employee_id
           AND NOT (
                p.date_until < c.date_from
                OR p.date_from > c.date_until
           )

        WHERE COALESCE(p.commission_based, 'no') = 'yes'

        ORDER BY
            p.date_from DESC,
            c.date_from DESC,
            p.payroll_id DESC
    ";

    $result = $conn->query($sql);

    if ($result === false) {
        throw new Exception($conn->error);
    }

    $rows = [];

    while ($row = $result->fetch_assoc()) {

        // compute base gross (per payroll)
        $basic_salary = (float)($row['basic_salary'] ?? 0);
        $total_days   = (float)($row['total_days'] ?? 0);
        $base_gross   = $basic_salary * $total_days;

        $commission = (float)($row['commission'] ?? 0);

        $row['computed_base_gross'] = number_format($base_gross, 2, '.', '');
        $row['commission_override_applied'] = ($commission > $base_gross) ? 1 : 0;

        // normalize money fields
        $row['commission'] = number_format($commission, 2, '.', '');
        $row['commission_total'] = number_format((float)($row['commission_total'] ?? 0), 2, '.', '');
        $row['commission_salary'] = number_format((float)($row['commission_salary'] ?? 0), 2, '.', '');

        $rows[] = $row;
    }

    echo json_encode([
        "success" => true,
        "data" => $rows
    ]);

    $conn->close();
    exit;

} catch (Throwable $e) {

    http_response_code(500);
    echo json_encode([
        "success" => false,
        "message" => "Failed to load commission payroll data",
        "error" => $e->getMessage()
    ]);

    if (isset($conn)) {
        $conn->close();
    }
    exit;
}
