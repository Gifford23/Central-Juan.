<?php
// uploadImage.php
require __DIR__ . '/../server/cors.php';      // <- MUST be before any output
require __DIR__ . '/../server/connection.php';

header('Content-Type: application/json; charset=UTF-8');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    echo json_encode(['success'=>false, 'message'=>'Unsupported request method']);
    exit;
}

if (!isset($_POST['employee_id'])) {
    echo json_encode(['success'=>false, 'message'=>'Missing employee_id']);
    exit;
}

$employee_id = $_POST['employee_id'];

// Determine upload dir (target: C:\xampp\htdocs\central_juan\dist\images)
// __DIR__ = ...\backend\mobile -> go up two levels to project root then /dist/images
$upload_dir = realpath(__DIR__ . '/../../dist/images');
if ($upload_dir === false) {
    // fallback: create relative path
    $upload_dir = __DIR__ . '/../../dist/images';
}

// Normalize to full path
$upload_dir = rtrim($upload_dir, DIRECTORY_SEPARATOR) . DIRECTORY_SEPARATOR;

// Create dir if missing
if (!is_dir($upload_dir)) {
    if (!mkdir($upload_dir, 0777, true)) {
        echo json_encode(['success'=>false, 'message'=>'Failed to create upload directory', 'path'=>$upload_dir]);
        exit;
    }
}

// Validate file
if (!isset($_FILES['image'])) {
    echo json_encode(['success'=>false, 'message'=>'No file provided']);
    exit;
}

$file = $_FILES['image'];
if ($file['error'] !== UPLOAD_ERR_OK) {
    echo json_encode(['success'=>false, 'message'=>'Upload error: ' . $file['error']]);
    exit;
}

// Generate safe unique filename
$ext = pathinfo($file['name'], PATHINFO_EXTENSION);
$safeName = time() . '-' . bin2hex(random_bytes(6)) . ($ext ? '.' . $ext : '');
$destination = $upload_dir . $safeName;

if (!move_uploaded_file($file['tmp_name'], $destination)) {
    echo json_encode(['success'=>false, 'message'=>'Failed to move uploaded file', 'dest'=>$destination]);
    exit;
}

// Build public URL to access the uploaded image from browser.
// If your local site is accessible via http://localhost/central_juan/ then:
$publicBase = (isset($_SERVER['HTTP_HOST']) ? (isset($_SERVER['HTTPS']) ? 'https://' : 'http://') . $_SERVER['HTTP_HOST'] : 'http://localhost') . '/central_juan/dist/images/';

// You can hardcode if needed:
// $publicBase = 'http://localhost/central_juan/dist/images/';

$image_url = $publicBase . rawurlencode($safeName);

// Update DB (optional)
$stmt = $conn->prepare("UPDATE employees SET image = ? WHERE employee_id = ?");
if ($stmt) {
    $stmt->bind_param("ss", $image_url, $employee_id);
    $stmt->execute();
    $stmt->close();
}

echo json_encode(['success'=>true, 'imageUrl'=>$image_url]);
$conn->close();
exit;
