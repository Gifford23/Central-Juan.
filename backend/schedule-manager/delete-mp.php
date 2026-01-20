<?php
include '../server/connection.php';
include("../server/cors.php");
$data = json_decode(file_get_contents("php://input"), true);
$schedule_id = $data['schedule_id'];

$delete_sql = "DELETE FROM employee_shift_schedule WHERE schedule_id=?";
$stmt = $conn->prepare($delete_sql);
$stmt->bind_param("i", $schedule_id);

if($stmt->execute()){
    echo json_encode(["success"=>true, "message"=>"Schedule deleted"]);
} else {
    echo json_encode(["success"=>false, "message"=>"Failed to delete schedule"]);
}
?>
