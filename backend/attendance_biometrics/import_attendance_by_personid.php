<?php
include("../server/cors.php");
include("../server/connection.php");

header("Content-Type: application/json");

// Fetch all users once
$users = [];
$res = $conn->query("SELECT user_id, username FROM users WHERE status = 'active'");
while ($row = $res->fetch_assoc()) {
    $users[intval($row["user_id"])] = $row["username"];
}

// Fetch biometric logs
$logs = $conn->query("
    SELECT person_id, time_log, attendance_status
    FROM tbl_biometrics_logs
    WHERE person_id IS NOT NULL
      AND time_log IS NOT NULL
      AND attendance_status IS NOT NULL
    ORDER BY person_id, time_log
");

if (!$logs) {
    echo json_encode(["status"=>"error","message"=>$conn->error]);
    exit;
}

$map = [
    "Check-in"   => "time_in_morning",
    "Break-Out"  => "time_out_morning",
    "Break-In"   => "time_in_afternoon",
    "Check-out"  => "time_out_afternoon",
];

$groups = [];

while ($r = $logs->fetch_assoc()) {
    if (!isset($map[$r["attendance_status"]])) continue;

    $person_id = intval($r["person_id"]);
    if (!isset($users[$person_id])) continue;

    $username = $users[$person_id];

    $dt = date("Y-m-d H:i:s", strtotime($r["time_log"]));
    $date = substr($dt, 0, 10);
    $time = substr($dt, 11);

    $key = $username . "|" . $date;

    if (!isset($groups[$key])) {
        $groups[$key] = [
            "username" => $username,
            "employee_name" => $username,
            "date" => $date,
            "time_in_morning" => null,
            "time_out_morning" => null,
            "time_in_afternoon" => null,
            "time_out_afternoon" => null
        ];
    }

    $column = $map[$r["attendance_status"]];

    if ($groups[$key][$column] === null || $time < $groups[$key][$column]) {
        $groups[$key][$column] = $time;
    }
}

/* Prepare UPSERT */
$stmt = $conn->prepare("
INSERT INTO attendance
(employee_id, employee_name, attendance_date,
 time_in_morning, time_out_morning,
 time_in_afternoon, time_out_afternoon)
VALUES (?,?,?,?,?,?,?)
ON DUPLICATE KEY UPDATE
 time_in_morning     = COALESCE(VALUES(time_in_morning), time_in_morning),
 time_out_morning    = COALESCE(VALUES(time_out_morning), time_out_morning),
 time_in_afternoon   = COALESCE(VALUES(time_in_afternoon), time_in_afternoon),
 time_out_afternoon  = COALESCE(VALUES(time_out_afternoon), time_out_afternoon)
");

$inserted = 0;
$updated = 0;

foreach ($groups as $g) {
    $stmt->bind_param(
        "sssssss",
        $g["username"],
        $g["employee_name"],
        $g["date"],
        $g["time_in_morning"],
        $g["time_out_morning"],
        $g["time_in_afternoon"],
        $g["time_out_afternoon"]
    );

    if ($stmt->execute()) {
        $stmt->affected_rows === 1 ? $inserted++ : $updated++;
    } else {
        echo json_encode(["status"=>"error","message"=>$stmt->error]);
        $stmt->close();
        $conn->close();
        exit;
    }
}

$stmt->close();

// Only truncate if everything succeeded
$truncate = $conn->query("TRUNCATE TABLE tbl_biometrics_logs");
if (!$truncate) {
    echo json_encode(["status"=>"error","message"=>"Attendance imported but failed to truncate logs: " . $conn->error]);
    $conn->close();
    exit;
}

$conn->close();

echo json_encode([
    "status" => "success",
    "groups" => count($groups),
    "inserted" => $inserted,
    "updated" => $updated,
    "logs_cleared" => true
]);
