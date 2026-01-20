<?php
// holiday_list_get.php

// header('Access-Control-Allow-Origin: *');
// header('Access-Control-Allow-Methods: GET, OPTIONS');
// header('Access-Control-Allow-Headers: Content-Type, Authorization');

require_once '../server/connection.php';
include("../server/cors.php");


// Added holiday_year to SELECT
$sql = "SELECT holiday_id, holiday_name, holiday_date, credit_day, holiday_type, holiday_year FROM holidays_list";
$result = $conn->query($sql);

$response = [];

if ($result && $result->num_rows > 0) {
    $holidays = [];
    while ($row = $result->fetch_assoc()) {
        $holidays[] = [
            "holiday_id" => (int)$row["holiday_id"],
            "holiday_name" => $row["holiday_name"],
            "holiday_date" => $row["holiday_date"],
            "credit_day" => (float)$row["credit_day"],
            "holiday_type" => $row["holiday_type"],
            // holiday_year might be NULL, so cast to int or null accordingly
            "holiday_year" => $row["holiday_year"] !== null ? (int)$row["holiday_year"] : null
        ];
    }
    $response = ["success" => true, "data" => $holidays];
} else {
    $response = ["success" => false, "message" => "No holidays found."];
}

echo json_encode($response);

$conn->close();
?>
