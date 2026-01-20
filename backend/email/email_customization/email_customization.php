
<?php

include("../../server/cors.php");

include('../../server/connection.php');
$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET') {
    // ✅ Get all HR emails
    $sql = "SELECT * FROM email_settings ORDER BY id DESC";
    $result = $conn->query($sql);
    $emails = [];
    while ($row = $result->fetch_assoc()) {
        $emails[] = $row;
    }
    echo json_encode(["success" => true, "data" => $emails]);

} elseif ($method === 'POST') {
    // ✅ Add new HR email
    $data = json_decode(file_get_contents("php://input"), true);
    $email = $data['hr_email'];
    $label = $data['label'];

    $stmt = $conn->prepare("INSERT INTO email_settings (hr_email, label) VALUES (?, ?)");
    $stmt->bind_param("ss", $email, $label);
    if ($stmt->execute()) {
        echo json_encode(["success" => true, "message" => "Email added successfully"]);
    } else {
        echo json_encode(["success" => false, "message" => "Failed to add email"]);
    }
    $stmt->close();

} elseif ($method === 'PUT') {
    // ✅ Update HR email
    $data = json_decode(file_get_contents("php://input"), true);
    $id = $data['id'];
    $email = $data['hr_email'];
    $label = $data['label'];

    $stmt = $conn->prepare("UPDATE email_settings SET hr_email=?, label=? WHERE id=?");
    $stmt->bind_param("ssi", $email, $label, $id);
    if ($stmt->execute()) {
        echo json_encode(["success" => true, "message" => "Email updated successfully"]);
    } else {
        echo json_encode(["success" => false, "message" => "Failed to update email"]);
    }
    $stmt->close();

} elseif ($method === 'DELETE') {
    // ✅ Delete HR email
    $data = json_decode(file_get_contents("php://input"), true);
    $id = $data['id'];

    $stmt = $conn->prepare("DELETE FROM email_settings WHERE id=?");
    $stmt->bind_param("i", $id);
    if ($stmt->execute()) {
        echo json_encode(["success" => true, "message" => "Email deleted successfully"]);
    } else {
        echo json_encode(["success" => false, "message" => "Failed to delete email"]);
    }
    $stmt->close();
} else {
    echo json_encode(["success" => false, "message" => "Invalid request"]);
}

$conn->close();
?>