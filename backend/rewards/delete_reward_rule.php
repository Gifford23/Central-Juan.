<?php
include('../server/connection.php');
include("../server/cors.php");

header('Content-Type: application/json; charset=utf-8');

// Accept JSON body or form-encoded
$bodyRaw = file_get_contents('php://input');
$body = json_decode($bodyRaw, true);
if (!$body) {
    // try POST form data fallback
    $body = $_POST;
}

$ruleId = isset($body['reward_rule_id']) ? intval($body['reward_rule_id']) : 0;
if ($ruleId <= 0) {
    http_response_code(400);
    echo json_encode(["success" => false, "message" => "reward_rule_id is required."]);
    exit;
}

try {
    // Option A: Hard delete
    $stmt = $conn->prepare("DELETE FROM reward_rules WHERE reward_rule_id = ?");
    $stmt->bind_param("i", $ruleId);
    if (!$stmt->execute()) {
        throw new Exception($stmt->error);
    }

    if ($stmt->affected_rows === 0) {
        echo json_encode(["success" => false, "message" => "No rule found with that id."]);
        exit;
    }

    echo json_encode(["success" => true, "message" => "Rule deleted."]);
    exit;
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(["success" => false, "message" => "Server error: " . $e->getMessage()]);
    exit;
}
