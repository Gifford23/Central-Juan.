<?php
// get_retro_for_employee.php
include('../server/connection.php');
include("../server/cors.php");

// Read query params (GET)
$employee_id = isset($_GET['employee_id']) ? trim($_GET['employee_id']) : null;
$date_until = isset($_GET['date_until']) && $_GET['date_until'] !== '' ? trim($_GET['date_until']) : null;

// Basic validation
if (!$employee_id) {
    echo json_encode(["success" => false, "message" => "Missing employee_id."]);
    exit();
}

// Build SQL for retrieving retro rows (both pending and applied)
// We'll return rows with status included and also totals for pending and applied separately.
$rows = [];
$total_pending = 0.0;
$total_applied = 0.0;

try {
    // 1) Fetch rows for employee where status IN ('pending','applied')
    if ($date_until) {
        $sql = "
            SELECT 
                retro_id,
                amount,
                description,
                effective_date,
                created_by,
                created_at,
                status,
                applied_in_payroll_id,
                applied_at
            FROM retro_adjustments
            WHERE employee_id = ?
              AND status IN ('pending','applied')
              AND (effective_date IS NULL OR effective_date <= ?)
            ORDER BY created_at ASC
        ";
        $stmt = $conn->prepare($sql);
        if (!$stmt) throw new Exception("Prepare failed: " . $conn->error);
        $stmt->bind_param("ss", $employee_id, $date_until);
    } else {
        $sql = "
            SELECT 
                retro_id,
                amount,
                description,
                effective_date,
                created_by,
                created_at,
                status,
                applied_in_payroll_id,
                applied_at
            FROM retro_adjustments
            WHERE employee_id = ?
              AND status IN ('pending','applied')
            ORDER BY created_at ASC
        ";
        $stmt = $conn->prepare($sql);
        if (!$stmt) throw new Exception("Prepare failed: " . $conn->error);
        $stmt->bind_param("s", $employee_id);
    }

    $stmt->execute();
    $result = $stmt->get_result();
    while ($r = $result->fetch_assoc()) {
        // normalize numeric and date types for frontend convenience
        $rows[] = [
            "retro_id" => (int)$r['retro_id'],
            "amount" => number_format((float)$r['amount'], 2, ".", ""),
            "description" => $r['description'],
            "effective_date" => $r['effective_date'] ?? null,
            "created_by" => $r['created_by'] ?? null,
            "created_at" => $r['created_at'] ?? null,
            "status" => $r['status'],
            "applied_in_payroll_id" => $r['applied_in_payroll_id'] !== null ? (int)$r['applied_in_payroll_id'] : null,
            "applied_at" => $r['applied_at'] ?? null
        ];
    }
    $stmt->close();

    // 2) Compute total pending & total applied (same filters)
    if ($date_until) {
        $sum_sql = "SELECT 
                        COALESCE(SUM(CASE WHEN status='pending' THEN amount END),0) AS total_pending,
                        COALESCE(SUM(CASE WHEN status='applied' THEN amount END),0) AS total_applied
                    FROM retro_adjustments
                    WHERE employee_id = ?
                      AND status IN ('pending','applied')
                      AND (effective_date IS NULL OR effective_date <= ?)";
        $sum_stmt = $conn->prepare($sum_sql);
        if (!$sum_stmt) throw new Exception("Prepare failed: " . $conn->error);
        $sum_stmt->bind_param("ss", $employee_id, $date_until);
    } else {
        $sum_sql = "SELECT 
                        COALESCE(SUM(CASE WHEN status='pending' THEN amount END),0) AS total_pending,
                        COALESCE(SUM(CASE WHEN status='applied' THEN amount END),0) AS total_applied
                    FROM retro_adjustments
                    WHERE employee_id = ?
                      AND status IN ('pending','applied')";
        $sum_stmt = $conn->prepare($sum_sql);
        if (!$sum_stmt) throw new Exception("Prepare failed: " . $conn->error);
        $sum_stmt->bind_param("s", $employee_id);
    }

    $sum_stmt->execute();
    $sum_stmt->bind_result($sum_pending_val, $sum_applied_val);
    if ($sum_stmt->fetch()) {
        $total_pending = floatval($sum_pending_val);
        $total_applied = floatval($sum_applied_val);
    }
    $sum_stmt->close();

    echo json_encode([
        "success" => true,
        "data" => $rows,
        "total_pending" => number_format($total_pending, 2, ".", ""),
        "total_applied" => number_format($total_applied, 2, ".", "")
    ]);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(["success" => false, "message" => "Server error: " . $e->getMessage()]);
}

$conn->close();
