<?php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");

// Handle preflight OPTIONS request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit();
}

$data = json_decode(file_get_contents("php://input"), true);

if (!isset($data['endpoint'])) {
    http_response_code(400);
    exit("Invalid endpoint");
}

// Path to subscription file (adjust as needed)
$file = '../push/subscriptions.json';

if (!file_exists($file)) {
    file_put_contents($file, json_encode([])); // create empty file
}

$subscriptions = json_decode(file_get_contents($file), true) ?: [];

// Filter out unsubscribed endpoint
$subscriptions = array_filter($subscriptions, function ($sub) use ($data) {
    return $sub['endpoint'] !== $data['endpoint'];
});

// Save updated list
file_put_contents($file, json_encode(array_values($subscriptions), JSON_PRETTY_PRINT));

echo json_encode(["success" => true]);
?>
