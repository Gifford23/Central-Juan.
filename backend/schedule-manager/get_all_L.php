<?php
// leave_types/get_all.php
header('Content-Type: application/json; charset=utf-8');

include '../server/connection.php';
include("../server/cors.php");

try {
  $isPDO = (isset($pdo) && $pdo instanceof PDO);
  $mysqli = null;
  if (!$isPDO) {
    if (isset($conn) && $conn instanceof mysqli) $mysqli = $conn;
    elseif (isset($con) && $con instanceof mysqli) $mysqli = $con;
    elseif (isset($mysqli) && $mysqli instanceof mysqli) $mysqli = $mysqli;
  }

  if ($isPDO) {
    $sql = "SELECT leave_type_id, leave_name, is_paid, leave_limit, default_days, description FROM leave_types ORDER BY leave_type_id ASC";
    $stmt = $pdo->prepare($sql);
    $stmt->execute();
    $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
  } elseif ($mysqli) {
    $sql = "SELECT leave_type_id, leave_name, is_paid, leave_limit, default_days, description FROM leave_types ORDER BY leave_type_id ASC";
    $stmt = $mysqli->prepare($sql);
    if ($stmt === false) throw new Exception("Prepare failed: " . $mysqli->error);
    if (!$stmt->execute()) throw new Exception("Execute failed: " . $stmt->error);
    $result = $stmt->get_result();
    if ($result === false) throw new Exception("get_result failed: " . $stmt->error);
    $rows = $result->fetch_all(MYSQLI_ASSOC);
    $stmt->close();
  } else {
    throw new Exception("No database connection found. Ensure connection.php defines \$pdo (PDO) or \$conn/\$con/\$mysqli (mysqli).");
  }

  echo json_encode(['success' => true, 'data' => $rows]);
  exit;
} catch (Exception $e) {
  http_response_code(500);
  echo json_encode(['success' => false, 'message' => $e->getMessage()]);
  exit;
}
