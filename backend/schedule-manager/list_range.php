<?php
// employee_leaves/list_range.php
header('Content-Type: application/json; charset=utf-8');

include '../server/connection.php';
include("../server/cors.php");

$start  = $_GET['start_date'] ?? $_GET['start'] ?? null;
$end    = $_GET['end_date'] ?? $_GET['end'] ?? null;
$branch = $_GET['branch_id'] ?? null;

if (!$start || !$end) {
  echo json_encode(['success' => false, 'message' => 'start_date and end_date are required']);
  exit;
}

// Normalize params
$start = trim($start);
$end   = trim($end);
$branch = ($branch === null) ? null : trim($branch);

try {
  // Detect PDO vs mysqli (common variable names: $pdo, $conn, $con, $mysqli)
  $isPDO = (isset($pdo) && $pdo instanceof PDO);
  $mysqli = null;
  if (!$isPDO) {
    if (isset($conn) && $conn instanceof mysqli) $mysqli = $conn;
    elseif (isset($con) && $con instanceof mysqli) $mysqli = $con;
    elseif (isset($mysqli) && $mysqli instanceof mysqli) $mysqli = $mysqli;
  }

  if ($isPDO) {
    if ($branch !== null && $branch !== '') {
      $sql = "SELECT l.* 
              FROM employee_leaves l
              LEFT JOIN employees e ON e.employee_id = l.employee_id
              WHERE l.date_from <= :end_date
                AND l.date_until >= :start_date
                AND l.status = 'approved'
                AND (
                      (:branch = 'unassigned' AND (e.branch_id IS NULL OR e.branch_id = '' OR e.branch_id = 0))
                      OR (:branch <> 'unassigned' AND e.branch_id = :branch)
                    )
              ORDER BY l.employee_id, l.date_from";
      $stmt = $pdo->prepare($sql);
      $stmt->execute([':start_date' => $start, ':end_date' => $end, ':branch' => $branch]);
    } else {
      $sql = "SELECT l.* 
              FROM employee_leaves l
              WHERE l.date_from <= :end_date
                AND l.date_until >= :start_date
                AND l.status = 'approved'
              ORDER BY l.employee_id, l.date_from";
      $stmt = $pdo->prepare($sql);
      $stmt->execute([':start_date' => $start, ':end_date' => $end]);
    }
    $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
  } elseif ($mysqli) {
    // Use mysqli prepared statements. We'll use get_result() (requires mysqlnd)
    if ($branch !== null && $branch !== '') {
      $sql = "SELECT l.* 
              FROM employee_leaves l
              LEFT JOIN employees e ON e.employee_id = l.employee_id
              WHERE l.date_from <= ?
                AND l.date_until >= ?
                AND l.status = 'approved'
                AND (
                      (? = 'unassigned' AND (e.branch_id IS NULL OR e.branch_id = '' OR e.branch_id = 0))
                      OR (? <> 'unassigned' AND e.branch_id = ?)
                    )
              ORDER BY l.employee_id, l.date_from";
      $stmt = $mysqli->prepare($sql);
      if ($stmt === false) throw new Exception("Prepare failed: " . $mysqli->error);
      // params: end_date, start_date, branch, branch, branch
      if (!$stmt->bind_param('sssss', $end, $start, $branch, $branch, $branch)) {
        throw new Exception("bind_param failed: " . $stmt->error);
      }
    } else {
      $sql = "SELECT l.* 
              FROM employee_leaves l
              WHERE l.date_from <= ?
                AND l.date_until >= ?
                AND l.status = 'approved'
              ORDER BY l.employee_id, l.date_from";
      $stmt = $mysqli->prepare($sql);
      if ($stmt === false) throw new Exception("Prepare failed: " . $mysqli->error);
      if (!$stmt->bind_param('ss', $end, $start)) {
        throw new Exception("bind_param failed: " . $stmt->error);
      }
    }
    if (!$stmt->execute()) {
      throw new Exception("Execute failed: " . $stmt->error);
    }
    // fetch all rows as associative array (requires mysqlnd)
    $result = $stmt->get_result();
    if ($result === false) {
      // fallback: build from bound results (rare), but we expect get_result to work in XAMPP
      throw new Exception("get_result() failed: " . $stmt->error);
    }
    $rows = $result->fetch_all(MYSQLI_ASSOC);
    $stmt->close();
  } else {
    throw new Exception("No database connection found. Ensure connection.php defines \$pdo (PDO) or \$conn/\$con/\$mysqli (mysqli).");
  }

  // Normalize types & strings
  $rows = array_map(function($r){
    $r['employee_id'] = isset($r['employee_id']) ? (string)$r['employee_id'] : '';
    $r['leave_id'] = isset($r['leave_id']) ? (int)$r['leave_id'] : null;
    return $r;
  }, $rows);

  echo json_encode(['success' => true, 'data' => $rows]);
  exit;
} catch (Exception $e) {
  http_response_code(500);
  echo json_encode(['success' => false, 'message' => $e->getMessage()]);
  exit;
}
