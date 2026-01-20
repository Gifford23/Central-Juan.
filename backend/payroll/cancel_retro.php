<?php
// cancel_retro.php
// Supports:
// - default (conservative): pending => hard-delete, applied => mark 'cancelled' (soft)
// - if JSON body includes force_delete = true => hard-delete the row regardless of status
//
// Returns JSON { success: bool, message: string, total_pending: "0.00", total_applied: "0.00" }

include('../server/connection.php');
include("../server/cors.php");

$input_raw = file_get_contents('php://input');
$input = json_decode($input_raw, true);
if (!is_array($input)) {
    $input = $_POST;
}

$retro_id = isset($input['retro_id']) ? trim($input['retro_id']) : null;
$force_delete = false;
if (isset($input['force_delete'])) {
    // accept booleans or string 'true'/'1'
    $fd = $input['force_delete'];
    $force_delete = ($fd === true || $fd === 1 || $fd === '1' || strtolower(trim((string)$fd)) === 'true');
}

if (!$retro_id) {
    echo json_encode(["success" => false, "message" => "Missing retro_id."]);
    exit();
}

$retro_id_int = intval($retro_id);

try {
    $conn->begin_transaction();

    // fetch status & employee_id
    $sel = $conn->prepare("SELECT status, employee_id FROM retro_adjustments WHERE retro_id = ?");
    if (!$sel) throw new Exception("Prepare failed (select): " . $conn->error);
    $sel->bind_param("i", $retro_id_int);
    $sel->execute();
    $res = $sel->get_result();
    if ($res->num_rows === 0) {
        $sel->close();
        $conn->rollback();
        echo json_encode(["success" => false, "message" => "Retro adjustment not found."]);
        exit();
    }
    $row = $res->fetch_assoc();
    $current_status = strtolower($row['status']);
    $employee_id = $row['employee_id'] ?? null;
    $sel->close();

    if ($force_delete) {
        // Hard-delete regardless of status
        $del = $conn->prepare("DELETE FROM retro_adjustments WHERE retro_id = ?");
        if (!$del) throw new Exception("Prepare failed (force delete): " . $conn->error);
        $del->bind_param("i", $retro_id_int);
        $del->execute();
        $affected = $del->affected_rows;
        $del->close();

        if ($affected <= 0) {
            $conn->rollback();
            echo json_encode(["success" => false, "message" => "Could not delete retro adjustment (no rows affected)."]);
            exit();
        }
        $conn->commit();
        $message = "Retro adjustment permanently deleted.";
    } else {
        // Conservative behavior: pending => delete, applied => mark cancelled
        if ($current_status === 'pending') {
            $del = $conn->prepare("DELETE FROM retro_adjustments WHERE retro_id = ?");
            if (!$del) throw new Exception("Prepare failed (delete pending): " . $conn->error);
            $del->bind_param("i", $retro_id_int);
            $del->execute();
            $affected = $del->affected_rows;
            $del->close();

            if ($affected <= 0) {
                $conn->rollback();
                echo json_encode(["success" => false, "message" => "Could not delete pending retro adjustment."]);
                exit();
            }
            $conn->commit();
            $message = "Pending retro adjustment deleted.";
        } else {
            // applied or other -> soft-cancel (status = 'cancelled')
            // try to set cancelled_at if available, else only status
            $updated = false;

            $upd_sql = "UPDATE retro_adjustments SET status = 'cancelled', cancelled_at = NOW() WHERE retro_id = ?";
            $upd = $conn->prepare($upd_sql);
            if ($upd) {
                $upd->bind_param("i", $retro_id_int);
                $upd->execute();
                if ($upd->affected_rows > 0) {
                    $updated = true;
                }
                $upd->close();
            }

            if (!$updated) {
                $upd_f = $conn->prepare("UPDATE retro_adjustments SET status = 'cancelled' WHERE retro_id = ?");
                if (!$upd_f) {
                    $conn->rollback();
                    throw new Exception("Prepare failed (update fallback): " . $conn->error);
                }
                $upd_f->bind_param("i", $retro_id_int);
                $upd_f->execute();
                if ($upd_f->affected_rows > 0) {
                    $updated = true;
                }
                $upd_f->close();
            }

            if (!$updated) {
                $conn->rollback();
                echo json_encode(["success" => false, "message" => "Could not cancel retro adjustment (no rows updated)."]);
                exit();
            }
            $conn->commit();
            $message = "Retro adjustment marked cancelled.";
        }
    }

    // recompute totals (pending & applied) for employee if available
    $total_pending = 0.0;
    $total_applied = 0.0;

    if ($employee_id) {
        $sum_sql = "SELECT 
                        COALESCE(SUM(CASE WHEN status='pending' THEN amount END),0) AS total_pending,
                        COALESCE(SUM(CASE WHEN status='applied' THEN amount END),0) AS total_applied
                    FROM retro_adjustments
                    WHERE employee_id = ?
                      AND status IN ('pending','applied')";
        $sum_stmt = $conn->prepare($sum_sql);
        if ($sum_stmt) {
            $sum_stmt->bind_param("s", $employee_id);
            $sum_stmt->execute();
            $sum_stmt->bind_result($sum_pending_val, $sum_applied_val);
            if ($sum_stmt->fetch()) {
                $total_pending = floatval($sum_pending_val);
                $total_applied = floatval($sum_applied_val);
            }
            $sum_stmt->close();
        }
    } else {
        $sum_sql = "SELECT 
                        COALESCE(SUM(CASE WHEN status='pending' THEN amount END),0) AS total_pending,
                        COALESCE(SUM(CASE WHEN status='applied' THEN amount END),0) AS total_applied
                    FROM retro_adjustments
                    WHERE status IN ('pending','applied')";
        $sum_res = $conn->query($sum_sql);
        if ($sum_res) {
            $vals = $sum_res->fetch_row();
            $total_pending = floatval($vals[0] ?? 0);
            $total_applied = floatval($vals[1] ?? 0);
            $sum_res->close();
        }
    }

    echo json_encode([
        "success" => true,
        "message" => $message,
        "total_pending" => number_format($total_pending, 2, ".", ""),
        "total_applied" => number_format($total_applied, 2, ".", "")
    ]);
    exit();

} catch (Exception $e) {
    @($conn->rollback());
    http_response_code(500);
    echo json_encode(["success" => false, "message" => "Server error: " . $e->getMessage()]);
    exit();
}
