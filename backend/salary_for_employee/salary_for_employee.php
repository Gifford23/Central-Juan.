<?php
// header("Access-Control-Allow-Origin: *");
// header("Content-Type: application/json; charset=UTF-8");

include('../server/connection.php'); // Include your database connection file
include("../server/cors.php");

// Fetch data from the salary_for_employee table with a join to salary_grades
$sql = "
    SELECT 
        sfe.salary_id,
        sfe.employee_id,
        sfe.employee_name,
        sfe.department_name,
        sg.PositionLevel,  -- Get PositionLevel from salary_grades
        sfe.step,
        sfe.salary,
        sfe.semi_monthly_salary
    FROM 
        salary_for_employee sfe
    JOIN 
        salary_grades sg ON sfe.position_level = sg.GradeID
";

$result = mysqli_query($conn, $sql);

$data = array();
if ($result) {
    while ($row = mysqli_fetch_assoc($result)) {
        $data[] = $row; // Add each row to the data array
    }
    echo json_encode(["success" => true, "data" => $data]); // Return success response with data
} else {
    echo json_encode(["success" => false, "message" => "Error fetching data: " . mysqli_error($conn)]);
}

mysqli_close($conn); // Close the database connection
?>