<?php
include('./server/connection.php');

// CORS Headers
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Headers: Content-Type, Authorization");
header("Access-Control-Allow-Methods: POST, OPTIONS");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

$data = json_decode(file_get_contents("php://input"), true);
$user_id = $data['username'] ?? '';
$pass = $data['password'] ?? '';

// Step 1: Check if user exists (join with employees for full_name)
$sql = "
    SELECT 
        u.*, 
        CONCAT(e.first_name, ' ', COALESCE(e.middle_name,''), ' ', e.last_name) AS full_name
    FROM users u
    LEFT JOIN employees e ON e.employee_id = u.username
    WHERE u.username = ?
";
$stmt = $conn->prepare($sql);
$stmt->bind_param("s", $user_id);
$stmt->execute();
$result = $stmt->get_result();

if ($result->num_rows > 0) {
    $row = $result->fetch_assoc();

    // Step 2: Check if user is disabled
    if (isset($row['status']) && $row['status'] === 'disabled') {
        echo json_encode([
            "status" => "error",
            "message" => "Your account is disabled. Please contact the admin."
        ]);
    } else {
        // Step 3: Verify password
        $hashed_input_password = hash('sha256', $pass);
        if ($row['password'] === $hashed_input_password) {
            echo json_encode([
                "status" => "success",
                "message" => "Login successful",
                "user_id" => $row['user_id'],
                "username" => $row['username'],
                "role" => $row['role'],
                "status" => $row['status'],
                "full_name" => $row['full_name'] ?? $row['username']  // ✅ send full name
            ]);
        }
        else {
            echo json_encode([
                "status" => "error",
                "message" => "Invalid username or password"
            ]);
        }
    }
} else {
    echo json_encode([
        "status" => "error",
        "message" => "Invalid username or password"
    ]);
}

$stmt->close();
$conn->close();
?>
