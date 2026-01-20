<?php
include("../server/connection.php");
header("Content-Type: application/json");

try {
    // ✅ Step 1: Get latest payroll period
    $periodQuery = "SELECT date_from, date_until FROM payroll ORDER BY payroll_id DESC LIMIT 1";
    $periodResult = $conn->query($periodQuery);

    if (!$periodResult || $periodResult->num_rows === 0) {
        echo json_encode(["success" => false, "message" => "No payroll records found."]);
        exit;
    }

    $period = $periodResult->fetch_assoc();
    $date_from = $period['date_from'];
    $date_until = $period['date_until'];

    // ✅ Step 2: Get total late hours from attendance within payroll period
    $query = "
        SELECT 
            e.employee_id,
            e.first_name,
            e.last_name,
            e.salary_type,
            e.monthly_rate,
            IFNULL(SUM(a.total_hours_late), 0) AS total_late_hours
        FROM employees e
        LEFT JOIN attendance a 
            ON e.employee_id = a.employee_id 
            AND a.attendance_date BETWEEN '$date_from' AND '$date_until'
        WHERE e.salary_type = 'monthly'
        GROUP BY e.employee_id
    ";

    $result = $conn->query($query);
    if (!$result) {
        throw new Exception("Query failed: " . $conn->error);
    }

    $data = [];

    // ✅ Step 3: Calculate salary after deduction
    while ($row = $result->fetch_assoc()) {
        $monthly_salary = floatval($row['monthly_rate']);
        $total_late_hours = floatval($row['total_late_hours']);

        // DOLE divisor computation
        $annual_salary = $monthly_salary * 12;
        $daily_rate = $annual_salary / 365;
        $hourly_rate = $daily_rate / 8;

        // Late deduction
        $late_deduction = $hourly_rate * $total_late_hours;

        // Half month and total after deduction
        $half_month_salary = $monthly_salary / 2;
        $total_salary_after_late = $half_month_salary - $late_deduction;

        $data[] = [
            "employee_id" => $row["employee_id"],
            "name" => $row["first_name"] . " " . $row["last_name"],
            "salary_type" => $row["salary_type"],
            "monthly_salary" => round($monthly_salary, 2),
            "total_late_hours" => round($total_late_hours, 2),
            "late_deduction" => round($late_deduction, 2),
            "half_month_salary" => round($half_month_salary, 2),
            "total_salary" => round($total_salary_after_late, 2),
            "date_from" => $date_from,
            "date_until" => $date_until
        ];
    }

    echo json_encode([
        "success" => true,
        "period" => [
            "date_from" => $date_from,
            "date_until" => $date_until
        ],
        "data" => $data
    ]);

} catch (Exception $e) {
    echo json_encode([
        "success" => false,
        "message" => $e->getMessage()
    ]);
}
?>
