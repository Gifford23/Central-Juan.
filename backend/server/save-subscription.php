<?php
// Allow CORS
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

// ✅ Handle preflight request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

require_once '../server/connection.php';

// Continue with normal POST logic
$data = json_decode(file_get_contents("php://input"), true);

if (!isset($data['endpoint'])) {
    http_response_code(400);
    exit('Invalid subscription data');
}

// Save to file (for testing; replace with DB insert in production)
$file = 'subscriptions.json';

// Optional: Load existing and merge
$subscriptions = file_exists($file) ? json_decode(file_get_contents($file), true) : [];
$subscriptions[] = $data;

file_put_contents($file, json_encode($subscriptions, JSON_PRETTY_PRINT));
echo json_encode(["success" => true]);
?>
