<?php
// // Allow cross-origin requests
// header("Access-Control-Allow-Origin: *");
// header("Access-Control-Allow-Methods: GET, OPTIONS");
// header("Access-Control-Allow-Headers: Content-Type, Authorization");
// header("Content-Type: application/json; charset=UTF-8");

// Include database connection
include('../server/connection.php');
include("../server/cors.php");

// Handle preflight request
// if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
//     http_response_code(200);
//     exit();
// }

// Get the date parameters from the query string
$date_from = $_GET['date_from'] ?? null;
$date_until = $_GET['date_until'] ?? null;

// Check if date fields are provided
if ($date_from && $date_until) {
    // Prepare SQL query to find overlapping payroll records
    $sql = "SELECT date_from, date_until FROM payroll WHERE (date_from <= ? AND date_until >= ?)";
    $stmt = $conn->prepare($sql);
    $stmt->bind_param("ss", $date_until, $date_from); // Check if the range overlaps
    $stmt->execute();
    $result = $stmt->get_result();

    $overlappingDates = [];
    while ($row = $result->fetch_assoc()) {
        // Generate the range of dates between date_from and date_until for each overlapping record
        $start = new DateTime($row['date_from']);
        $end = new DateTime($row['date_until']);
        $interval = new DateInterval('P1D'); // 1 day interval
        $dateRange = new DatePeriod($start, $interval, $end->modify('+1 day')); // Include end date

        foreach ($dateRange as $date) {
            $overlappingDates[] = $date->format('F j, Y'); // Format the date
        }
    }

    // Return whether the dates exist and the overlapping dates
    echo json_encode([
        "exists" => count($overlappingDates) > 0,
        "overlapping_dates" => array_unique($overlappingDates) // Remove duplicates
    ]);
} else {
    // If date fields are not provided, return an error
    echo json_encode(["exists" => false, "message" => "Date fields are required."]);
}

// Close the database connection
$conn->close();
?>