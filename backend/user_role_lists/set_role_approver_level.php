<?php
// set_role_approver_level.php
include('../server/cors.php');
include '../server/connection.php';
header('Content-Type: application/json; charset=utf-8');

// Read JSON body
$raw = file_get_contents("php://input");
$data = json_decode($raw, true);
if ($data === null || !is_array($data)) {
    http_response_code(400);
    echo json_encode(["success" => false, "message" => "Invalid JSON payload."]);
    $conn->close();
    exit;
}

$role_id = isset($data['role_id']) ? intval($data['role_id']) : null;
// approver_level: 1 or 2 to set, null or empty to clear
$approver_level = array_key_exists('approver_level', $data) && $data['approver_level'] !== null && $data['approver_level'] !== ''
    ? intval($data['approver_level']) : null;

// Accept updated_by in multiple shapes for compatibility
// updated_by_id is preferred (could be user id or employee id), updated_by_name is optional human name
$updated_by_id = null;
$updated_by_name = null;

// legacy single field 'updated_by'
if (isset($data['updated_by'])) {
    // if it's numeric-looking, keep as string; we'll store as string regardless
    $updated_by_id = is_scalar($data['updated_by']) ? trim((string)$data['updated_by']) : null;
}
if (isset($data['updated_by_id'])) {
    $updated_by_id = is_scalar($data['updated_by_id']) ? trim((string)$data['updated_by_id']) : $updated_by_id;
}
if (isset($data['updated_by_name'])) {
    $updated_by_name = is_scalar($data['updated_by_name']) ? trim((string)$data['updated_by_name']) : null;
}

// Basic validation
if (!$role_id) {
    http_response_code(400);
    echo json_encode(["success" => false, "message" => "Missing role_id."]);
    $conn->close();
    exit;
}
if ($approver_level !== null && !in_array($approver_level, [1,2], true)) {
    http_response_code(400);
    echo json_encode(["success" => false, "message" => "approver_level must be 1, 2, or null."]);
    $conn->close();
    exit;
}

/**
 * OPTIONAL: Add authorization check here.
 * Example:
 * session_start();
 * if (!isset($_SESSION['user']) || $_SESSION['user']['role_name'] !== 'ADMIN') {
 *   http_response_code(403);
 *   echo json_encode(["success" => false, "message" => "Forbidden"]);
 *   $conn->close();
 *   exit;
 * }
 */

// helper to test column existence (safe: no prepared param for LIKE)
function columnExists($conn, $table, $column) {
    $tableEsc = $conn->real_escape_string($table);
    $columnEsc = $conn->real_escape_string($column);
    $res = $conn->query("SHOW COLUMNS FROM `{$tableEsc}` LIKE '{$columnEsc}'");
    return ($res && $res->num_rows > 0);
}

$table = 'role_approver_levels';
$hasUpdatedByCol = columnExists($conn, $table, 'updated_by');
$hasUpdatedByNameCol = columnExists($conn, $table, 'updated_by_name');

try {
    if ($approver_level === null) {
        // clear mapping (delete)
        $del = $conn->prepare("DELETE FROM role_approver_levels WHERE role_id = ?");
        if (!$del) throw new Exception("Prepare failed (delete): " . $conn->error);
        $del->bind_param("i", $role_id);
        if (!$del->execute()) throw new Exception("Delete failed: " . $del->error);
        $del->close();

        echo json_encode(["success" => true, "message" => "Approver mapping cleared for role.", "role_id" => $role_id]);
        $conn->close();
        exit;
    } else {
        // Build upsert SQL dynamically depending on available columns
        if ($hasUpdatedByCol && $hasUpdatedByNameCol) {
            // store both updated_by (id) and updated_by_name
            $sql = "INSERT INTO role_approver_levels (role_id, approver_level, updated_by, updated_by_name) VALUES (?, ?, ?, ?)
                    ON DUPLICATE KEY UPDATE approver_level = VALUES(approver_level), updated_by = VALUES(updated_by), updated_by_name = VALUES(updated_by_name), updated_at = NOW()";
            $stmt = $conn->prepare($sql);
            if (!$stmt) throw new Exception("Prepare failed (upsert): " . $conn->error);

            // fallback values if missing
            $bind_updated_by = $updated_by_id ?? ($updated_by_name ?? null);
            $bind_updated_by_name = $updated_by_name ?? ($updated_by_id ?? null);

            // ensure strings (mysqli requires variables)
            $s_updated_by = $bind_updated_by !== null ? (string)$bind_updated_by : null;
            $s_updated_by_name = $bind_updated_by_name !== null ? (string)$bind_updated_by_name : null;

            $stmt->bind_param("iiss", $role_id, $approver_level, $s_updated_by, $s_updated_by_name);
        } elseif ($hasUpdatedByCol) {
            // no updated_by_name column — store updated_by (use id or name)
            $sql = "INSERT INTO role_approver_levels (role_id, approver_level, updated_by) VALUES (?, ?, ?)
                    ON DUPLICATE KEY UPDATE approver_level = VALUES(approver_level), updated_by = VALUES(updated_by), updated_at = NOW()";
            $stmt = $conn->prepare($sql);
            if (!$stmt) throw new Exception("Prepare failed (upsert): " . $conn->error);

            $bind_updated_by = $updated_by_id ?? ($updated_by_name ?? null);
            $s_updated_by = $bind_updated_by !== null ? (string)$bind_updated_by : null;
            $stmt->bind_param("iis", $role_id, $approver_level, $s_updated_by);
        } else {
            // No updated_by column — insert/update only role_id & approver_level (and updated_at if exists)
            // Attempt to detect updated_at column; if exists, include in update clause; otherwise simple upsert
            $hasUpdatedAt = columnExists($conn, $table, 'updated_at');
            if ($hasUpdatedAt) {
                $sql = "INSERT INTO role_approver_levels (role_id, approver_level) VALUES (?, ?)
                        ON DUPLICATE KEY UPDATE approver_level = VALUES(approver_level), updated_at = NOW()";
            } else {
                $sql = "INSERT INTO role_approver_levels (role_id, approver_level) VALUES (?, ?)
                        ON DUPLICATE KEY UPDATE approver_level = VALUES(approver_level)";
            }
            $stmt = $conn->prepare($sql);
            if (!$stmt) throw new Exception("Prepare failed (upsert minimal): " . $conn->error);
            $stmt->bind_param("ii", $role_id, $approver_level);
        }

        if (!$stmt->execute()) throw new Exception("Execute failed: " . $stmt->error);
        $stmt->close();

        // fetch and return the saved row (if present)
        $selectCols = "role_id, approver_level";
        if ($hasUpdatedByCol) $selectCols .= ", updated_by";
        if ($hasUpdatedByNameCol) $selectCols .= ", updated_by_name";
        if (columnExists($conn, $table, 'updated_at')) $selectCols .= ", updated_at";

        $stmt2 = $conn->prepare("SELECT {$selectCols} FROM role_approver_levels WHERE role_id = ? LIMIT 1");
        if ($stmt2) {
            $stmt2->bind_param("i", $role_id);
            if ($stmt2->execute()) {
                $res = $stmt2->get_result();
                $row = $res && $res->num_rows ? $res->fetch_assoc() : null;
                $stmt2->close();

                echo json_encode(["success" => true, "message" => "Approver level set.", "data" => $row]);
                $conn->close();
                exit;
            } else {
                // query failed but upsert succeeded — return success without row
                $stmt2->close();
                echo json_encode(["success" => true, "message" => "Approver level set (could not fetch row).", "role_id" => $role_id, "approver_level" => $approver_level]);
                $conn->close();
                exit;
            }
        } else {
            // can't prepare select, but upsert succeeded
            echo json_encode(["success" => true, "message" => "Approver level set.", "role_id" => $role_id, "approver_level" => $approver_level]);
            $conn->close();
            exit;
        }
    }
} catch (Exception $ex) {
    http_response_code(500);
    echo json_encode(["success" => false, "message" => "Failed to set approver level: " . $ex->getMessage()]);
    $conn->close();
    exit;
}
?>
