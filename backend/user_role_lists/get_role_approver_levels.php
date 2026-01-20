<?php
// get_role_approver_levels.php
include('../server/cors.php');
include '../server/connection.php';
header('Content-Type: application/json; charset=utf-8');

/**
 * Helper: fetch roles JSON from the existing get_roles.php endpoint.
 * Tries file_get_contents first, then cURL fallback.
 */
function fetchRolesFromEndpoint() {
    // Adjust this path if your app isn't in /central_juan/
    // We try to build a sensible URL from the server host.
    $protocol = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') ? 'https' : 'http';
    $host = $_SERVER['HTTP_HOST'] ?? '127.0.0.1';
    $pathCandidates = [
        // Common deployment: /central_juan/backend/user_role_lists/get_roles.php
        "$protocol://$host/central_juan/backend/user_role_lists/get_roles.php",
        // Fallback: relative to the current script using localhost (useful in dev)
        "http://127.0.0.1/central_juan/backend/user_role_lists/get_roles.php",
    ];

    $json = false;
    foreach ($pathCandidates as $url) {
        // try file_get_contents
        if (ini_get('allow_url_fopen')) {
            $opts = ['http' => ['timeout' => 5]];
            $ctx = stream_context_create($opts);
            $result = @file_get_contents($url, false, $ctx);
            if ($result && ($decoded = json_decode($result, true)) !== null) {
                // expected shape: { success: true, data: [...] } or raw array
                return $decoded;
            }
        }

        // try cURL fallback
        if (function_exists('curl_version')) {
            $ch = curl_init($url);
            curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
            curl_setopt($ch, CURLOPT_CONNECTTIMEOUT, 5);
            curl_setopt($ch, CURLOPT_TIMEOUT, 8);
            // optional: if using self-signed certs in dev, you may need to disable peer verify:
            // curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
            $result = curl_exec($ch);
            $err = curl_error($ch);
            curl_close($ch);
            if ($result && ($decoded = json_decode($result, true)) !== null) {
                return $decoded;
            }
        }
    }

    return null;
}

// 1) get roles from existing endpoint
$rolesResponse = fetchRolesFromEndpoint();
if ($rolesResponse === null) {
    http_response_code(500);
    echo json_encode([
        "success" => false,
        "message" => "Failed to load roles from existing endpoint. Make sure /backend/user_role_lists/get_roles.php is reachable from this server. Check allow_url_fopen or enable cURL."
    ]);
    $conn->close();
    exit;
}

// normalize roles array: endpoint may return { success:true, data:[...] } or raw array
if (is_array($rolesResponse) && isset($rolesResponse['success']) && isset($rolesResponse['data'])) {
    $rolesArr = is_array($rolesResponse['data']) ? $rolesResponse['data'] : [];
} elseif (is_array($rolesResponse)) {
    // if it's already an indexed array of roles
    $rolesArr = $rolesResponse;
} else {
    $rolesArr = [];
}

// Build a map by role_id for easy merge
$roleMap = [];
foreach ($rolesArr as $r) {
    // roles from your get_roles.php look like { "role_id": "1", "role_name": "ADMIN" }
    $id = isset($r['role_id']) ? (string)$r['role_id'] : null;
    $name = $r['role_name'] ?? ($r['name'] ?? null);
    if ($id !== null) {
        $roleMap[$id] = [
            "role_id" => (string)$id,
            "role_name" => $name ?? "",
            "approver_level" => null,
            "updated_by" => null,
            "updated_at" => null
        ];
    }
}

// 2) fetch mapping rows from role_approver_levels (if table exists)
$tableCheck = $conn->query("SHOW TABLES LIKE 'role_approver_levels'");
if (!$tableCheck || $tableCheck->num_rows === 0) {
    // table not present: return roles but note mapping missing
    $rows = array_values($roleMap);
    echo json_encode([
        "success" => true,
        "data" => $rows,
        "warning" => "role_approver_levels table does not exist. Create it to assign approver levels."
    ]);
    $conn->close();
    exit;
}

// read mappings
$sql = "SELECT role_id, approver_level, updated_by, updated_at FROM role_approver_levels";
$stmt = $conn->prepare($sql);
if (!$stmt) {
    http_response_code(500);
    echo json_encode(["success" => false, "message" => "Prepare failed: " . $conn->error]);
    $conn->close();
    exit;
}
if (!$stmt->execute()) {
    http_response_code(500);
    echo json_encode(["success" => false, "message" => "Execute failed: " . $stmt->error]);
    $stmt->close();
    $conn->close();
    exit;
}
$res = $stmt->get_result();
while ($r = $res->fetch_assoc()) {
    $rid = (string)$r['role_id'];
    if (!isset($roleMap[$rid])) {
        // role not present in roles source — still include it (use role_id as name)
        $roleMap[$rid] = [
            "role_id" => $rid,
            "role_name" => "Role {$rid}",
            "approver_level" => $r['approver_level'] !== null ? intval($r['approver_level']) : null,
            "updated_by" => $r['updated_by'] ?? null,
            "updated_at" => $r['updated_at'] ?? null
        ];
    } else {
        $roleMap[$rid]['approver_level'] = $r['approver_level'] !== null ? intval($r['approver_level']) : null;
        $roleMap[$rid]['updated_by'] = $r['updated_by'] ?? null;
        $roleMap[$rid]['updated_at'] = $r['updated_at'] ?? null;
    }
}

$stmt->close();
$conn->close();

// final array sorted by role_name
$rows = array_values($roleMap);
usort($rows, function($a, $b) {
    return strcasecmp($a['role_name'] ?? '', $b['role_name'] ?? '');
});

echo json_encode(["success" => true, "data" => $rows]);
exit;
