<?php
include '../server/connection.php';
include("../server/cors.php");
header('Content-Type: application/json');

/*
  Enhanced read_loans.php
  Supports: employee_id, loan_id, loan_ids (csv), active_only, include_journal
  Returns: { success: true, data: [ { loan fields..., journal_entries: [...]? } ] }
*/

try {
    // Read params
    $employee_id = isset($_GET['employee_id']) ? trim($_GET['employee_id']) : null;
    $loan_id = isset($_GET['loan_id']) ? intval($_GET['loan_id']) : null;
    $loan_ids_raw = isset($_GET['loan_ids']) ? trim($_GET['loan_ids']) : null; // e.g. "1,2,3"
    $active_only = isset($_GET['active_only']) && ($_GET['active_only'] === 'true' || $_GET['active_only'] === '1');
    $include_journal = isset($_GET['include_journal']) && ($_GET['include_journal'] === 'true' || $_GET['include_journal'] === '1');

    // Build base query and params
    $where = [];
    $types = '';
    $params = [];

    if ($loan_id) {
        $where[] = "loan_id = ?";
        $types .= 'i';
        $params[] = $loan_id;
    } elseif ($loan_ids_raw) {
        // sanitize loan_ids list to ints
        $parts = array_filter(array_map('trim', explode(',', $loan_ids_raw)), function($v){ return $v !== ''; });
        $ids = array_map('intval', $parts);
        $ids = array_values(array_unique($ids));
        if (count($ids) === 0) {
            echo json_encode(["success" => true, "data" => []]);
            exit;
        }
        // We'll use an IN (...) clause; it's safe because we converted to ints
        $in_list = implode(',', $ids);
        $where[] = "loan_id IN ($in_list)";
    } elseif ($employee_id) {
        $where[] = "employee_id = ?";
        $types .= 's';
        $params[] = $employee_id;
    }

    if ($active_only) {
        $where[] = "IFNULL(balance,0) > 0";
    }

    $where_sql = count($where) ? 'WHERE ' . implode(' AND ', $where) : '';

    $sql = "SELECT * FROM loans $where_sql ORDER BY loan_id DESC";
    $stmt = $conn->prepare($sql);
    if ($stmt === false) {
        // If we used IN(...) with no params, prepare may still succeed; but check
        $res = $conn->query($sql);
        if ($res === false) {
            throw new Exception($conn->error);
        }
        $loans = [];
        while ($row = $res->fetch_assoc()) $loans[] = $row;
    } else {
        if (!empty($params)) {
            // bind params dynamically
            $bind_names[] = $types;
            for ($i = 0; $i < count($params); $i++) {
                $bind_name = 'bind' . $i;
                $$bind_name = $params[$i];
                $bind_names[] = &$$bind_name;
            }
            call_user_func_array([$stmt, 'bind_param'], $bind_names);
        }
        $stmt->execute();
        $result = $stmt->get_result();
        $loans = [];
        while ($row = $result->fetch_assoc()) $loans[] = $row;
        $stmt->close();
    }

    // If include_journal and we have loans, fetch journal entries in one query and group by loan_id
    if ($include_journal && count($loans) > 0) {
        $loanIds = array_map(function($l){ return intval($l['loan_id']); }, $loans);
        $in = implode(',', $loanIds);
        $q = "SELECT * FROM loan_journal_entry WHERE loan_id IN ($in) ORDER BY entry_date DESC";
        $r = $conn->query($q);
        $journalMap = [];
        while ($jr = $r->fetch_assoc()) {
            $lid = intval($jr['loan_id']);
            if (!isset($journalMap[$lid])) $journalMap[$lid] = [];
            $journalMap[$lid][] = $jr;
        }
        // attach to loans array
        foreach ($loans as &$ln) {
            $lid = intval($ln['loan_id']);
            $ln['journal_entries'] = $journalMap[$lid] ?? [];
        }
        unset($ln);
    }

    echo json_encode(["success" => true, "data" => $loans]);
    exit;
} catch (Exception $e) {
    echo json_encode(["success" => false, "message" => $e->getMessage()]);
    exit;
}
?>
