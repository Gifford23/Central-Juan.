<?php
// update_employee.php
include("../server/cors.php");
include('../server/connection.php');

header('Content-Type: application/json; charset=utf-8');

$response = [];

if ($_SERVER['REQUEST_METHOD'] !== 'PUT') {
    http_response_code(405);
    echo json_encode(['status'=>'error','message'=>'Only PUT allowed']);
    exit;
}

$input = json_decode(file_get_contents('php://input'), true);
if ($input === null) {
    echo json_encode(['status'=>'error','message'=>'Invalid JSON input']);
    exit;
}

if (!isset($input['employee_id']) || empty($input['employee_id'])) {
    echo json_encode(['status' => 'error', 'message' => 'Invalid or missing employee_id.']);
    exit;
}

$employee_id      = $input['employee_id'];
$first_name       = $input['first_name'] ?? null;
$middle_name      = $input['middle_name'] ?? null;
$last_name        = $input['last_name'] ?? null;
$email            = $input['email'] ?? null;
$contact_number   = $input['contact_number'] ?? null;
$date_of_birth    = $input['date_of_birth'] ?? null;
$department_id    = $input['department_id'] ?? null;
$position_id      = $input['position_id'] ?? null;
$base_salary      = $input['base_salary'] ?? null;
$monthly_rate     = $input['monthly_rate'] ?? null;
$hourly_rate      = $input['hourly_rate'] ?? null;
$salary_type      = $input['salary_type'] ?? null;
$employee_type    = $input['employee_type'] ?? null;
$branch_name      = $input['branch_name'] ?? null;
$custom_user_id   = isset($input['custom_user_id']) && is_numeric($input['custom_user_id']) ? intval($input['custom_user_id']) : null;

$currentUser = $input['current_user'] ?? [];
$userFullName = $currentUser['full_name'] ?? 'Unknown User';
$userRole     = $currentUser['role'] ?? 'GUEST';

// --- VALIDATIONS ---
if ($base_salary !== null && $base_salary !== "" && !is_numeric($base_salary)) {
    echo json_encode(['status' => 'error', 'message' => 'Invalid base salary format.']);
    exit;
}
if ($monthly_rate !== null && $monthly_rate !== "" && !is_numeric($monthly_rate)) {
    echo json_encode(['status' => 'error', 'message' => 'Invalid monthly_rate format.']);
    exit;
}
if ($hourly_rate !== null && $hourly_rate !== "" && !is_numeric($hourly_rate)) {
    echo json_encode(['status' => 'error', 'message' => 'Invalid hourly_rate format.']);
    exit;
}
if ($salary_type !== null && $salary_type !== "") {
    $allowedSalaryTypes = ['daily', 'monthly'];
    if (!in_array(strtolower($salary_type), $allowedSalaryTypes, true)) {
        echo json_encode(['status' => 'error', 'message' => 'Invalid salary_type.']);
        exit;
    }
}

// --- CHECK EMPLOYEE EXISTS ---
$checkStmt = $conn->prepare("SELECT * FROM employees WHERE employee_id = ?");
$checkStmt->bind_param("s", $employee_id);
$checkStmt->execute();
$result = $checkStmt->get_result();

if ($result->num_rows === 0) {
    echo json_encode(['status' => 'error', 'message' => 'Employee not found.']);
    exit;
}

$oldEmployee = $result->fetch_assoc();
$checkStmt->close();

// --- SALARY COMPUTATION ---
if ($salary_type === 'monthly' && $monthly_rate !== null && is_numeric($monthly_rate)) {
    // DOLE 313-DAY DIVISOR FORMULA
    $hourly_rate = round(($monthly_rate * 12) / 365 / 8, 2);
    $base_salary = round($monthly_rate / 26, 2);
} elseif ($salary_type === 'daily' && $base_salary !== null && is_numeric($base_salary)) {
    $hourly_rate = round($base_salary / 8, 2);
    $monthly_rate = round($base_salary * 26, 2);
} else {
    $hourly_rate = $hourly_rate ?? null;
}

// --- BUILD DYNAMIC UPDATE ---
$fields = [];
$params = [];
$types  = "";

$updatableFields = [
    "first_name"     => $first_name,
    "middle_name"    => $middle_name,
    "last_name"      => $last_name,
    "email"          => $email,
    "contact_number" => $contact_number,
    "date_of_birth"  => $date_of_birth,
    "department_id"  => $department_id,
    "position_id"    => $position_id,
    "base_salary"    => $base_salary,
    "monthly_rate"   => $monthly_rate,
    "hourly_rate"    => $hourly_rate,
    "salary_type"    => $salary_type,
    "employee_type"  => $employee_type,
    "branch_name"    => $branch_name,
];

foreach ($updatableFields as $field => $value) {
    if ($value !== null) {
        $fields[] = "$field = ?";
        $params[] = (string)$value;
        $types   .= "s";
    }
}

if (empty($fields)) {
    echo json_encode(['status' => 'error', 'message' => 'No valid fields provided to update.']);
    exit;
}

$sql = "UPDATE employees SET " . implode(", ", $fields) . " WHERE employee_id = ?";
$params[] = $employee_id;
$types   .= "s";

// Begin transaction for atomicity (employees update + possible users changes)
$conn->begin_transaction();

try {
    $updateStmt = $conn->prepare($sql);
    if (!$updateStmt) {
        throw new Exception('Prepare failed: '.$conn->error);
    }
    $updateStmt->bind_param($types, ...$params);

    if (!$updateStmt->execute()) {
        $err = $updateStmt->error;
        $updateStmt->close();
        throw new Exception("Error updating employee: " . $err);
    }
    $affected = $updateStmt->affected_rows;
    $updateStmt->close();

    // --- LOGGING ---
    $changes = [];
    foreach ($updatableFields as $field => $value) {
        if ($value !== null && ($oldEmployee[$field] ?? null) != $value) {
            $oldVal = $oldEmployee[$field] ?? '';
            $changes[] = "$field: '{$oldVal}' → '$value'";
        }
    }
    $changeSummary = !empty($changes) ? implode(", ", $changes) : "No changes";
    $action = "Updated employee (ID: {$employee_id}). Changes: $changeSummary";

    $logStmt = $conn->prepare("INSERT INTO logs (user_full_name, user_role, action) VALUES (?, ?, ?)");
    if (!$logStmt) throw new Exception("Prepare logs failed: " . $conn->error);
    $logStmt->bind_param("sss", $userFullName, $userRole, $action);
    $logStmt->execute();
    $logStmt->close();

    // --- CHECK / CREATE OR UPDATE USER RECORD ---
    $userCreated = false;
    $createdUsername = null;
    $createdPlainPassword = null;
    $createdUserId = null;
    $userIdUpdated = false;
    $userIdOld = null;
    $userIdNew = null;
    $warnings = [];

    // Look for existing user with username = employee_id
    $ucheck = $conn->prepare("SELECT user_id FROM users WHERE username = ?");
    if (!$ucheck) throw new Exception("Prepare ucheck failed: " . $conn->error);
    $ucheck->bind_param("s", $employee_id);
    $ucheck->execute();
    $uRes = $ucheck->get_result();

    if ($uRes->num_rows === 0) {
        // compute next user_id (default)
        $mxRes = $conn->query("SELECT IFNULL(MAX(user_id), 0) AS mx FROM users");
        if (!$mxRes) throw new Exception("Failed to query max user_id: " . $conn->error);
        $mxRow = $mxRes->fetch_assoc();
        $maxId = (int)$mxRow['mx'];
        $nextId = ($maxId < 100) ? 100 : ($maxId + 1);

        // if custom_user_id provided and numeric, prefer it (if available)
        if ($custom_user_id !== null) {
            // check if that custom id already exists
            $ccheck = $conn->prepare("SELECT 1 FROM users WHERE user_id = ?");
            if (!$ccheck) throw new Exception("Prepare ccheck failed: " . $conn->error);
            $ccheck->bind_param("i", $custom_user_id);
            $ccheck->execute();
            $cres = $ccheck->get_result();

            if ($cres->num_rows === 0) {
                $nextId = $custom_user_id;
            } else {
                $warnings[] = "custom_user_id {$custom_user_id} already exists, using next available id {$nextId}";
            }
            $ccheck->close();
        }

        // choose plaintext password (here: employee_id) - adjust policy if needed
        $plainPwd = $employee_id;
        $hashedPwd = hash('sha256', $plainPwd);

        $role = "employee";
        $statusUser = "active";

        $uins = $conn->prepare("INSERT INTO users (user_id, username, password, role, status) VALUES (?, ?, ?, ?, ?)");
        if ($uins) {
            $uins->bind_param("issss", $nextId, $employee_id, $hashedPwd, $role, $statusUser);
            if ($uins->execute()) {
                $userCreated = true;
                $createdUsername = $employee_id;
                $createdPlainPassword = $plainPwd;
                $createdUserId = $nextId;
            } else {
                $warnings[] = "Failed to insert user: " . $uins->error;
            }
            $uins->close();
        } else {
            $warnings[] = "Prepare for user insert failed: " . $conn->error;
        }
    } else {
        // user exists - possibly update its user_id if custom_user_id provided
        $row = $uRes->fetch_assoc();
        $existingUserId = (int)$row['user_id'];
        $userIdOld = $existingUserId;

        if ($custom_user_id !== null && $custom_user_id !== $existingUserId) {
            // verify custom_user_id not taken
            $cc = $conn->prepare("SELECT 1 FROM users WHERE user_id = ?");
            if (!$cc) throw new Exception("Prepare ccheck2 failed: " . $conn->error);
            $cc->bind_param("i", $custom_user_id);
            $cc->execute();
            $cres2 = $cc->get_result();
            if ($cres2->num_rows > 0) {
                $warnings[] = "custom_user_id {$custom_user_id} already exists - cannot change existing user's id.";
                $cc->close();
            } else {
                $cc->close();

                // Find referencing foreign key columns to users.user_id in current database
                $refStmt = $conn->prepare("
                    SELECT TABLE_NAME, COLUMN_NAME
                    FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
                    WHERE REFERENCED_TABLE_NAME = 'users'
                      AND REFERENCED_COLUMN_NAME = 'user_id'
                      AND TABLE_SCHEMA = DATABASE()
                ");
                if (!$refStmt) throw new Exception("Prepare refStmt failed: " . $conn->error);
                $refStmt->execute();
                $refRes = $refStmt->get_result();
                $refs = [];
                while ($r = $refRes->fetch_assoc()) {
                    // skip direct users table (we update it separately)
                    if ($r['TABLE_NAME'] === 'users') continue;
                    $refs[] = $r;
                }
                $refStmt->close();

                // Temporarily disable FK checks, update referencing tables, and update users.user_id
                // We are already inside a transaction
                $conn->query("SET FOREIGN_KEY_CHECKS = 0");

                // Update referencing tables
                foreach ($refs as $r) {
                    $tbl = $r['TABLE_NAME'];
                    $col = $r['COLUMN_NAME'];
                    $sql = "UPDATE `{$tbl}` SET `{$col}` = ? WHERE `{$col}` = ?";
                    $u = $conn->prepare($sql);
                    if (!$u) throw new Exception("Prepare failed for {$tbl}.{$col}: " . $conn->error);
                    $u->bind_param("ii", $custom_user_id, $existingUserId);
                    if (!$u->execute()) {
                        $u->close();
                        throw new Exception("Failed updating {$tbl}.{$col}: " . $u->error);
                    }
                    $u->close();
                }

                // Update users PK
                $u2 = $conn->prepare("UPDATE users SET user_id = ? WHERE user_id = ?");
                if (!$u2) throw new Exception("Prepare failed for users update: " . $conn->error);
                $u2->bind_param("ii", $custom_user_id, $existingUserId);
                if (!$u2->execute()) {
                    $u2->close();
                    throw new Exception("Failed updating users.user_id: " . $u2->error);
                }
                $u2->close();

                // Re-enable FK checks after update
                $conn->query("SET FOREIGN_KEY_CHECKS = 1");

                $userIdUpdated = true;
                $userIdNew = $custom_user_id;
            }
        }
    }

    $ucheck->close();

    // Commit transaction
    $conn->commit();

    // Prepare response
    $resp = [
        'status' => 'success',
        'message' => 'Employee updated successfully.',
        'changes' => $changeSummary
    ];

    if (!empty($warnings)) $resp['warnings'] = $warnings;
    if ($userCreated) {
        $resp['user_created'] = true;
        $resp['username'] = $createdUsername;
        $resp['password'] = $createdPlainPassword; // frontend: send securely via email
        $resp['user_id'] = $createdUserId;
        $resp['employee_id'] = $employee_id;
        $resp['email'] = $email ?? $oldEmployee['email'] ?? null;
    }
    if ($userIdUpdated) {
        $resp['user_id_updated'] = true;
        $resp['user_id_old'] = $userIdOld;
        $resp['user_id_new'] = $userIdNew;
        $resp['username'] = $employee_id;
    }

    echo json_encode($resp);
    exit;
} catch (Exception $ex) {
    // rollback and attempt to restore FK checks
    $conn->rollback();
    $conn->query("SET FOREIGN_KEY_CHECKS = 1");
    echo json_encode(['status'=>'error','message'=>$ex->getMessage()]);
    exit;
}
?>
