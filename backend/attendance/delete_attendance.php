<?php
include("../server/cors.php");
include "../server/connection.php";
header("Content-Type: application/json; charset=UTF-8");

// Expect DELETE (many clients allow body on DELETE). If you prefer POST, adjust client/server accordingly.
if ($_SERVER['REQUEST_METHOD'] !== 'DELETE') {
    echo json_encode(["success" => false, "message" => "Invalid request method. Use DELETE."]);
    exit;
}

// parse body (actor info fallback)
$raw = json_decode(file_get_contents("php://input"), true);

// get id from query or body
$attendance_id = null;
if (isset($_GET['id']) && is_numeric($_GET['id'])) {
    $attendance_id = intval($_GET['id']);
} elseif (!empty($raw['id']) && is_numeric($raw['id'])) {
    $attendance_id = intval($raw['id']);
}

if (!$attendance_id) {
    echo json_encode(["success" => false, "message" => "Invalid attendance ID."]);
    exit;
}

// fetch row BEFORE clearing for logging/ audit
$old_row = null;
$sel = $conn->prepare("
    SELECT attendance_id, employee_id, employee_name, attendance_date,
           time_in_morning, time_out_morning, time_in_afternoon, time_out_afternoon, days_credited
    FROM attendance
    WHERE attendance_id = ?
    LIMIT 1
");
if ($sel) {
    $sel->bind_param("i", $attendance_id);
    if ($sel->execute()) {
        $res = $sel->get_result();
        if ($res && ($r = $res->fetch_assoc())) {
            $old_row = $r;
        }
    } else {
        error_log("clear_attendance SELECT execute failed: " . $sel->error);
    }
    $sel->close();
} else {
    error_log("clear_attendance prepare failed: " . $conn->error);
}

// get actor info from session (or fallback to body)
if (session_status() !== PHP_SESSION_ACTIVE) session_start();

$user_full_name = null;
$user_role = null;
if (!empty($_SESSION['full_name'])) $user_full_name = (string)$_SESSION['full_name'];
if (empty($user_full_name) && !empty($_SESSION['user_full_name'])) $user_full_name = (string)$_SESSION['user_full_name'];
if (empty($user_full_name) && !empty($_SESSION['name'])) $user_full_name = (string)$_SESSION['name'];

if (!empty($_SESSION['user_role'])) $user_role = (string)$_SESSION['user_role'];
if (empty($user_role) && !empty($_SESSION['role'])) $user_role = (string)$_SESSION['role'];

// fallback to JSON body (less secure)
if (empty($user_full_name) && !empty($raw['full_name'])) $user_full_name = (string)$raw['full_name'];
if (empty($user_role) && !empty($raw['user_role'])) $user_role = (string)$raw['user_role'];

if (empty($user_full_name)) $user_full_name = "UNAUTHENTICATED / NO ACTOR";
if (empty($user_role)) $user_role = "UNSET";

// helper: friendly time formatting (returns null if empty)
function fmt_time_friendly_single($t) {
    if (empty($t) || $t === "00:00:00" || $t === "00:00") return null;
    $d = DateTime::createFromFormat('H:i:s', $t);
    if ($d) return $d->format('g:i A');
    $d2 = DateTime::createFromFormat('H:i', $t);
    if ($d2) return $d2->format('g:i A');
    return $t;
}

// helper: build "old -> *cleared label*" text
function cleared_arrow($old_val, $label) {
    $old_text = fmt_time_friendly_single($old_val);
    $old_display = ($old_text !== null) ? $old_text : "—";
    $new_display = "*" . "cleared " . $label . "*";
    return $old_display . " -> " . $new_display;
}

// build message using values from $old_row
$emp_id = $old_row['employee_id'] ?? "N/A";
$emp_name = $old_row['employee_name'] ?? "N/A";
$attendance_date_text = "N/A";
if (!empty($old_row['attendance_date'])) {
    $ts = strtotime($old_row['attendance_date']);
    if ($ts !== false) $attendance_date_text = date("M. j, Y", $ts);
}

$old_am_in  = $old_row['time_in_morning'] ?? null;
$old_am_out = $old_row['time_out_morning'] ?? null;
$old_pm_in  = $old_row['time_in_afternoon'] ?? null;
$old_pm_out = $old_row['time_out_afternoon'] ?? null;

$am_in_change  = cleared_arrow($old_am_in,  "time in AM");
$am_out_change = cleared_arrow($old_am_out, "time out AM");
$pm_in_change  = cleared_arrow($old_pm_in,  "time in PM");
$pm_out_change = cleared_arrow($old_pm_out, "time out PM");

$action_msg = sprintf(
    "Cleared attendance for employee %s (%s) for %s. Time in AM: in %s | Time out AM: %s.  Time in PM: %s | Time out PM: %s.",
    $conn->real_escape_string($emp_id),
    $conn->real_escape_string($emp_name),
    $attendance_date_text,
    $am_in_change,
    $am_out_change,
    $pm_in_change,
    $pm_out_change
);

// Logging (best-effort)
$ins_sql = "INSERT INTO logs (user_full_name, user_role, action) VALUES (?, ?, ?)";
$lstmt = $conn->prepare($ins_sql);
if ($lstmt) {
    $lstmt->bind_param("sss", $user_full_name, $user_role, $action_msg);
    if (!$lstmt->execute()) {
        error_log("logs insert failed (clear_attendance): " . $lstmt->error);
    }
    $lstmt->close();
} else {
    error_log("logs prepare failed (clear_attendance): " . $conn->error);
}

/* ---------- perform CLEAR (set columns to NULL / 0) ---------- */
/* Fields to NULL/zero:
   - time_in_morning, time_out_morning, time_in_afternoon, time_out_afternoon -> NULL
   - days_credited, deducted_days, total_rendered_hours, overtime_hours, overtime_request -> 0.00
   - net_work_minutes, actual_rendered_minutes, total_minutes_late -> 0
   - late_deduction_id -> NULL
   - late_deduction_value -> 0.0000
   - (keep attendance row & attendance_id)
*/
$upd = $conn->prepare("
    UPDATE attendance SET
      time_in_morning = NULL,
      time_out_morning = NULL,
      time_in_afternoon = NULL,
      time_out_afternoon = NULL,
      days_credited = 0.00,
      deducted_days = 0.00,
      total_rendered_hours = 0.00,
      overtime_hours = 0.00,
      overtime_request = 0.00,
      net_work_minutes = 0,
      actual_rendered_minutes = 0,
      total_minutes_late = 0,
      late_deduction_id = NULL,
      late_deduction_value = 0.0000
    WHERE attendance_id = ?
    LIMIT 1
");
if (!$upd) {
    echo json_encode(["success" => false, "message" => "Prepare failed: " . $conn->error]);
    exit;
}
$upd->bind_param("i", $attendance_id);
if ($upd->execute()) {
    echo json_encode(["success" => true]);
} else {
    echo json_encode(["success" => false, "message" => "Failed to clear attendance record."]);
}
$upd->close();
$conn->close();
?>
