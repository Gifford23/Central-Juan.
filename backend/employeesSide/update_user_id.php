<?php
// update_user_id.php
include("../server/cors.php");
include('../server/connection.php');

header('Content-Type: application/json; charset=utf-8');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['status'=>'error','message'=>'Only POST allowed']);
    exit;
}

$input = json_decode(file_get_contents('php://input'), true);
if (!$input) {
    echo json_encode(['status'=>'error','message'=>'Invalid JSON']);
    exit;
}

$oldId = isset($input['old_id']) ? intval($input['old_id']) : null;
$newId = isset($input['new_id']) ? intval($input['new_id']) : null;

if (!$oldId || !$newId) {
    echo json_encode(['status'=>'error','message'=>'old_id and new_id are required and must be numbers']);
    exit;
}

if ($oldId === $newId) {
    echo json_encode(['status'=>'error','message'=>'old_id and new_id are the same']);
    exit;
}

// check old exists
$chk = $conn->prepare("SELECT user_id, username FROM users WHERE user_id = ?");
$chk->bind_param("i", $oldId);
$chk->execute();
$res = $chk->get_result();
if ($res->num_rows === 0) {
    echo json_encode(['status'=>'error','message'=>"User with id {$oldId} not found"]);
    $chk->close();
    exit;
}
$oldRow = $res->fetch_assoc();
$oldUsername = $oldRow['username'];
$chk->close();

// check new not exists
$chk2 = $conn->prepare("SELECT user_id FROM users WHERE user_id = ?");
$chk2->bind_param("i", $newId);
$chk2->execute();
$res2 = $chk2->get_result();
if ($res2->num_rows > 0) {
    echo json_encode(['status'=>'error','message'=>"Target user_id {$newId} already exists"]);
    $chk2->close();
    exit;
}
$chk2->close();

// find referencing FK columns (same database)
$refStmt = $conn->prepare("
    SELECT TABLE_NAME, COLUMN_NAME
    FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
    WHERE REFERENCED_TABLE_NAME = 'users'
      AND REFERENCED_COLUMN_NAME = 'user_id'
      AND TABLE_SCHEMA = DATABASE()
");
$refStmt->execute();
$refRes = $refStmt->get_result();
$refs = [];
while ($r = $refRes->fetch_assoc()) {
    // skip self-reference in users table (we'll update users separately)
    if ($r['TABLE_NAME'] === 'users') continue;
    $refs[] = $r;
}
$refStmt->close();

// Begin transaction
$conn->begin_transaction();

$fkDisabled = false;
try {
    if (!empty($refs)) {
        // Temporarily disable FK checks so we can mass-update referencing tables
        // NOTE: this affects the entire connection - we do it inside the transaction
        $conn->query("SET FOREIGN_KEY_CHECKS = 0");
        $fkDisabled = true;

        foreach ($refs as $r) {
            $tbl = $r['TABLE_NAME'];
            $col = $r['COLUMN_NAME'];
            // build and execute update for referencing table
            $sql = "UPDATE `{$tbl}` SET `{$col}` = ? WHERE `{$col}` = ?";
            $u = $conn->prepare($sql);
            if (!$u) {
                throw new Exception("Prepare failed for {$tbl}.{$col}: " . $conn->error);
            }
            $u->bind_param("ii", $newId, $oldId);
            if (!$u->execute()) {
                $u->close();
                throw new Exception("Failed updating {$tbl}.{$col}: " . $u->error);
            }
            $u->close();
        }
    }

    // Update users PK
    $u2 = $conn->prepare("UPDATE users SET user_id = ? WHERE user_id = ?");
    if (!$u2) throw new Exception("Prepare failed for users update: " . $conn->error);
    $u2->bind_param("ii", $newId, $oldId);
    if (!$u2->execute()) {
        $u2->close();
        throw new Exception("Failed updating users.user_id: " . $conn->error);
    }
    $affected = $u2->affected_rows;
    $u2->close();

    // Commit
    $conn->commit();

    if ($fkDisabled) {
        $conn->query("SET FOREIGN_KEY_CHECKS = 1");
    }

    echo json_encode([
        'status'=>'success',
        'message'=>"user_id updated from {$oldId} to {$newId}",
        'old_id'=>$oldId,
        'new_id'=>$newId,
        'updated_rows' => $affected
    ]);
    exit;
} catch (Exception $ex) {
    $conn->rollback();
    if ($fkDisabled) {
        // attempt to re-enable
        $conn->query("SET FOREIGN_KEY_CHECKS = 1");
    }
    echo json_encode(['status'=>'error','message'=>$ex->getMessage()]);
    exit;
}
?>
