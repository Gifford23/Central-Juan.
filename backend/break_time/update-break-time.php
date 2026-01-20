<?php
include("../server/cors.php");
include('../server/connection.php');

parse_str(file_get_contents("php://input"), $put_vars); // to read PUT body if form-encoded, else use json_decode

// try JSON body first
$input = json_decode(file_get_contents("php://input"), true);
if (!$input) $input = $put_vars;

$id = $_GET['id'] ?? null;
if (!$id) {
    echo json_encode(["success" => false, "message" => "Missing id parameter"]);
    exit;
}

$break_name = $input['break_name'] ?? null;
$break_start = $input['break_start'] ?? null;
$break_end = $input['break_end'] ?? null;
$valid_in_start = $input['valid_break_in_start'] ?? null;
$valid_in_end = $input['valid_break_in_end'] ?? null;
$valid_out_start = $input['valid_break_out_start'] ?? null;
$valid_out_end = $input['valid_break_out_end'] ?? null;
// after reading $input as you already do
$is_shift_split = isset($input['is_shift_split']) ? (int)$input['is_shift_split'] : 0;

try {
    // Very basic validation - add more as needed
    if (!$break_name || !$break_start || !$break_end) {
        throw new Exception("Required fields missing");
    }

    $stmt = $conn->prepare("UPDATE break_time SET break_name=?, break_start=?, break_end=?, valid_break_in_start=?, valid_break_in_end=?, valid_break_out_start=?, valid_break_out_end=?, is_shift_split=? WHERE id=?");
    // 7 strings, then is_shift_split (int), then id (int)
    $stmt->bind_param("sssssssii", $break_name, $break_start, $break_end, $valid_in_start, $valid_in_end, $valid_out_start, $valid_out_end, $is_shift_split, $id);
    $stmt->execute();

    if ($stmt->affected_rows >= 0) {
        echo json_encode(["success" => true, "message" => "Break updated"]);
    } else {
        echo json_encode(["success" => false, "message" => "No rows updated"]);
    }
} catch (Exception $e) {
    echo json_encode(["success" => false, "message" => $e->getMessage()]);
}
