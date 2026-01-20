<?php
include("../server/cors.php");
include("../server/connection.php");


$debug = [];

$data = json_decode(file_get_contents("php://input"), true);

if (!isset($data["records"]) || empty($data["records"])) {
    echo json_encode([
        "status" => "error",
        "message" => "No records received",
        "debug" => ["raw_input" => $data]
    ]);
    exit;
}

$records = $data["records"];
$debug[] = "Total records received: " . count($records);

$inserted = 0;
$failed = 0;
$errors = [];

/**
 * Normalize incoming date/time strings to MySQL DATETIME
 */
function normalize_datetime($raw) {
    if ($raw === null) return null;
    $raw = trim($raw);
    if ($raw === '') return null;

    $formats = [
        'd/m/Y H:i:s','d/m/Y H:i',
        'd-m-Y H:i:s','d-m-Y H:i',
        'Y-m-d H:i:s','Y-m-d H:i',
        'd M Y H:i','d M Y g:i A','M j, Y g:i A'
    ];

    foreach ($formats as $fmt) {
        $dt = DateTime::createFromFormat($fmt, $raw);
        if ($dt !== false) return $dt->format('Y-m-d H:i:s');
    }

    $ts = strtotime($raw);
    return ($ts !== false) ? date('Y-m-d H:i:s', $ts) : null;
}

/* --- Ensure attendance_status column exists --- */
$colCheck = $conn->query("
    SELECT COUNT(*) cnt
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'tbl_biometrics_logs'
      AND COLUMN_NAME = 'attendance_status'
");
if ($colCheck && $colCheck->fetch_assoc()['cnt'] == 0) {
    if (!$conn->query("ALTER TABLE tbl_biometrics_logs ADD COLUMN attendance_status VARCHAR(50) DEFAULT NULL")) {
        $debug[] = "FAILED to add attendance_status column: " . $conn->error;
    } else {
        $debug[] = "attendance_status column added";
    }
}

/* --- TRUNCATE TABLE --- */
if (!$conn->query("TRUNCATE TABLE tbl_biometrics_logs")) {
    echo json_encode([
        "status" => "error",
        "message" => "Failed to truncate table",
        "db_error" => $conn->error
    ]);
    exit;
}

$debug[] = "tbl_biometrics_logs truncated";

/* --- Prepare insert --- */
$stmt = $conn->prepare("
    INSERT INTO tbl_biometrics_logs
    (person_id, name, department, time_log, attendance_status)
    VALUES (?, ?, ?, ?, ?)
");

if (!$stmt) {
    echo json_encode([
        "status" => "error",
        "message" => "Prepare failed",
        "db_error" => $conn->error
    ]);
    exit;
}

/* --- Import rows --- */
foreach ($records as $idx => $r) {

    $person_id = $r["Person ID"] ?? $r["person_id"] ?? $r["ID"] ?? null;
    $name = $r["Name"] ?? "";
    $department = $r["Department"] ?? "";
    $time_raw = $r["Time"] ?? $r["Time Log"] ?? null;

    // IMPORTANT: read status AS-IS
    $status =
        $r["Attendance Status"] ??
        $r["attendance_status"] ??
        $r["Status"] ??
        $r["Type"] ??
        null;

    if (empty($person_id)) {
        $failed++;
        $errors[] = ["row" => $idx + 1, "reason" => "missing person_id"];
        continue;
    }

    $time_log = normalize_datetime($time_raw);
    if ($time_log === null) {
        $failed++;
        $errors[] = ["row" => $idx + 1, "reason" => "invalid time", "raw" => $time_raw];
        continue;
    }

    $debug[] = [
        "row" => $idx + 1,
        "person_id" => $person_id,
        "time_log" => $time_log,
        "attendance_status" => $status
    ];

    $stmt->bind_param(
        "issss",
        $person_id,
        $name,
        $department,
        $time_log,
        $status
    );

    if ($stmt->execute()) {
        $inserted++;
    } else {
        $failed++;
        $errors[] = [
            "row" => $idx + 1,
            "reason" => "insert_failed",
            "db_error" => $stmt->error
        ];
    }
}

$stmt->close();
$conn->close();

echo json_encode([
    "status" => "success",
    "inserted" => $inserted,
    "failed" => $failed,
    "errors_sample" => array_slice($errors, 0, 50),
    "debug" => $debug   // 👈 view this in browser / console
]);
?>
