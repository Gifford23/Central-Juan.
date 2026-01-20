<?php
include '../server/connection.php';
include("../server/cors.php");

// header("Access-Control-Allow-Origin: *");
// header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
// header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");
// header("Content-Type: application/json; charset=UTF-8");

$data = json_decode(file_get_contents("php://input"), true);

if (!isset($data['skip_id'], $data['status'])) {
  echo json_encode(["success" => false, "message" => "Missing skip_id or status."]);
  exit;
}

try {
  $stmt = $conn->prepare("UPDATE loan_skip_requests SET status = ?, reviewed_at = NOW() WHERE skip_id = ?");
  $stmt->bind_param("si", $data['status'], $data['skip_id']); // status = pending|approved|rejected

  $stmt->execute();

  echo json_encode(["success" => true, "message" => "Skip request status updated."]);
} catch (Exception $e) {
  echo json_encode(["success" => false, "message" => $e->getMessage()]);
}
?>
