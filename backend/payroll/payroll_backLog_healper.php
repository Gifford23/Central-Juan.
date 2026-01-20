<?php
// payroll_backLog_healper.php
// Helper to build simple WHERE filter fragment for payroll.php
// Returns a string like " WHERE p.employee_id = 'E123' AND p.date_from = '2025-10-01' AND p.date_until = '2025-10-15' "
// NOTE: uses $conn->real_escape_string to sanitize incoming GET values.

if (!function_exists('payrollBacklogFilter')) {
    function payrollBacklogFilter($conn, $params = []) {
        // default empty
        $filter = "";

        // employee_id filter (string)
        if (isset($params['employee_id']) && $params['employee_id'] !== '') {
            $emp = $conn->real_escape_string($params['employee_id']);
            $filter = " WHERE p.employee_id = '" . $emp . "' ";
        }

        // date range filter (expects YYYY-MM-DD)
        if (isset($params['date_from']) && isset($params['date_until']) && $params['date_from'] !== '' && $params['date_until'] !== '') {
            $df = $conn->real_escape_string($params['date_from']);
            $du = $conn->real_escape_string($params['date_until']);
            if (stripos($filter, 'where') !== false) {
                $filter .= " AND p.date_from = '" . $df . "' AND p.date_until = '" . $du . "' ";
            } else {
                $filter = " WHERE p.date_from = '" . $df . "' AND p.date_until = '" . $du . "' ";
            }
        }

        // optional payroll_id filter (integer) - useful when logs reference payroll_id
        if (isset($params['payroll_id']) && $params['payroll_id'] !== '') {
            // cast to int for safety
            $pid = intval($params['payroll_id']);
            if ($pid > 0) {
                if (stripos($filter, 'where') !== false) {
                    $filter .= " AND p.payroll_id = " . $pid . " ";
                } else {
                    $filter = " WHERE p.payroll_id = " . $pid . " ";
                }
            }
        }

        return $filter;
    }
}
