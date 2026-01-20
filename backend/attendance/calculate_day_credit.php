<?php
// header("Access-Control-Allow-Origin: *");
// header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");
// header("Access-Control-Allow-Headers: Content-Type, Authorization");
include("../server/cors.php");
include "../server/connection.php";

function computeHours($in, $out) {
    if (!$in || !$out) return 0;

    $start = new DateTime($in);
    $end = new DateTime($out);
    $interval = $start->diff($end);
    return $interval->h + ($interval->i / 60);
}

function calculateCreditDay($morningIn, $morningOut, $afternoonIn, $afternoonOut) {
    $morningHours = computeHours($morningIn, $morningOut);
    $afternoonHours = computeHours($afternoonIn, $afternoonOut);

    $totalHours = $morningHours + $afternoonHours;

    // Convert to credit day (8 hrs = 1.0 day)
    $creditDay = round($totalHours / 8, 2);

    return [$totalHours, $creditDay];
}

// Let's assume you're passing an attendance ID
$attendanceId = $_GET['id'];

$sql = "SELECT time_in_morning, time_out_morning, time_in_afternoon, time_out_afternoon FROM attendance WHERE attendance_id = ?";
$stmt = $conn->prepare($sql);
$stmt->bind_param("i", $attendanceId);
$stmt->execute();
$result = $stmt->get_result();

if ($row = $result->fetch_assoc()) {
    list($totalHours, $creditDay) = calculateCreditDay(
        $row['time_in_morning'],
        $row['time_out_morning'],
        $row['time_in_afternoon'],
        $row['time_out_afternoon']
    );

    // Update table
    $update = $conn->prepare("UPDATE attendance SET days_credited = ?, deducted_days = ? WHERE attendance_id = ?");
    $deducted = round(1 - $creditDay, 2); // Optional logic
    $update->bind_param("ddi", $creditDay, $deducted, $attendanceId);
    $update->execute();

    echo json_encode([
        'worked_hours' => round($totalHours, 2),
        'days_credited' => $creditDay,
        'deducted_days' => $deducted
    ]);
} else {
    echo json_encode(['error' => 'Attendance not found']);
}
