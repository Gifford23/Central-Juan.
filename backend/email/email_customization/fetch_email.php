<?php
include("../../server/cors.php");
include("../../server/connection.php");

$sql = "SELECT id, hr_email, label, is_active, created_at
        FROM email_settings
        ORDER BY (id = 1) DESC, id ASC";

$result = $conn->query($sql);

$emails = [];
while ($row = $result->fetch_assoc()) {
    $emails[] = $row;
}

if (count($emails) > 0) {
    echo json_encode(["success" => true, "data" => $emails]);
} else {
    echo json_encode(["success" => false, "message" => "No records found."]);
}

$conn->close();
