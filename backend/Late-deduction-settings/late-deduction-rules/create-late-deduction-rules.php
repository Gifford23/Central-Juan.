<?php
// create-late-deduction-rules.php
include '../../server/connection.php';
include "../../server/cors.php";

header("Content-Type: application/json; charset=UTF-8");

$data = json_decode(file_get_contents("php://input"), true);
if (!$data) { echo json_encode(["success" => false, "message" => "Invalid JSON"]); exit; }

// required fields
$required = ['tier_id', 'min_minutes', 'deduction_type', 'deduction_value'];
foreach ($required as $r) {
    if (!isset($data[$r]) || $data[$r] === '') {
        echo json_encode(["success" => false, "message" => "Missing required field: $r"]);
        exit;
    }
}

// sanitize / normalize
$tier_id = intval($data['tier_id']);
$min_minutes = intval($data['min_minutes']);
$max_minutes = (isset($data['max_minutes']) && $data['max_minutes'] !== '') ? intval($data['max_minutes']) : null;
$deduction_type = trim(strtolower($data['deduction_type']));
$deduction_value = floatval($data['deduction_value']);
$description = isset($data['description']) ? trim($data['description']) : null;

// basic validations
$allowed_types = ['credit', 'fixed', 'percent'];
if (!in_array($deduction_type, $allowed_types)) {
    echo json_encode(["success" => false, "message" => "Invalid deduction_type. Allowed: " . implode(", ", $allowed_types)]);
    exit;
}
if ($min_minutes < 0) {
    echo json_encode(["success" => false, "message" => "min_minutes must be >= 0"]);
    exit;
}
if ($max_minutes !== null && $max_minutes < $min_minutes) {
    echo json_encode(["success" => false, "message" => "max_minutes must be >= min_minutes"]);
    exit;
}

// type-specific validation
if ($deduction_type === 'credit') {
    if ($deduction_value < 0 || $deduction_value > 1) {
        echo json_encode(["success" => false, "message" => "For 'credit' deduction_value must be between 0 and 1 (fraction of shift)"]);
        exit;
    }
} elseif ($deduction_type === 'percent') {
    if ($deduction_value < 0 || $deduction_value > 100) {
        echo json_encode(["success" => false, "message" => "For 'percent' deduction_value must be between 0 and 100"]);
        exit;
    }
} else { // fixed
    if ($deduction_value < 0) {
        echo json_encode(["success" => false, "message" => "For 'fixed' deduction_value must be >= 0"]);
        exit;
    }
}

/* -------- Overlap detection --------
   Overlap condition between intervals A(minA,maxA) and B(minB,maxB):
   NOT (A.max < B.min OR B.max < A.min)
   Note: treat NULL max as +INF
*/
$overlap_found = false;
$overlap_row = null;

if ($max_minutes === null) {
    // new interval is [min, +INF) -> it overlaps any existing interval whose max >= min OR whose max IS NULL
    $sql = "SELECT id, min_minutes, max_minutes FROM late_deduction
            WHERE tier_id = ? AND (max_minutes IS NULL OR NOT (max_minutes < ?))
            LIMIT 1";
    $st = $conn->prepare($sql);
    if ($st) {
        $st->bind_param("ii", $tier_id, $min_minutes);
        $st->execute();
        $res = $st->get_result();
        if ($row = $res->fetch_assoc()) {
            $overlap_found = true;
            $overlap_row = $row;
        }
        $st->close();
    }
} else {
    // new interval is [min, max] -> overlap exists if NOT (existing.max < new.min OR new.max < existing.min)
    $sql = "SELECT id, min_minutes, max_minutes FROM late_deduction
            WHERE tier_id = ?
              AND NOT (
                  (max_minutes IS NOT NULL AND max_minutes < ?)
                  OR (? < min_minutes)
              )
            LIMIT 1";
    $st = $conn->prepare($sql);
    if ($st) {
        $st->bind_param("iii", $tier_id, $min_minutes, $max_minutes);
        $st->execute();
        $res = $st->get_result();
        if ($row = $res->fetch_assoc()) {
            $overlap_found = true;
            $overlap_row = $row;
        }
        $st->close();
    }
}

if ($overlap_found) {
    echo json_encode([
        "success" => false,
        "message" => "Overlap detected with existing rule for this tier",
        "conflict" => $overlap_row
    ]);
    exit;
}

/* -------- Insert (safe) -------- */
$insert_sql = "INSERT INTO late_deduction (tier_id, min_minutes, max_minutes, deduction_type, deduction_value, description)
               VALUES (?, ?, ?, ?, ?, ?)";
$ins = $conn->prepare($insert_sql);
if (!$ins) {
    echo json_encode(["success" => false, "message" => "Prepare failed: " . $conn->error]);
    exit;
}

// types: tier_id(i), min(i), max(i or NULL), deduction_type(s), deduction_value(d), description(s)
// bind string is "iiisds"  -> i i i s d s
$ins->bind_param("iiisds", $tier_id, $min_minutes, $max_minutes, $deduction_type, $deduction_value, $description);

if ($ins->execute()) {
    echo json_encode(["success" => true, "id" => $ins->insert_id]);
} else {
    echo json_encode(["success" => false, "message" => $ins->error]);
}
$ins->close();
$conn->close();
