<?php
// /shift-management/get_shifts.php
include("../server/cors.php");
include("../server/connection.php"); // should provide either $pdo (PDO) or $conn / $mysqli (mysqli)

try {
    // Helper for PDO
    $pdoFetchAll = function ($pdo, $sql) {
        $stmt = $pdo->prepare($sql);
        $stmt->execute();
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    };

    // Helper for mysqli
    $mysqliFetchAll = function ($mysqli, $sql) {
        $result = $mysqli->query($sql);
        if ($result === false) {
            throw new Exception("MySQL error: " . $mysqli->error);
        }
        // fetch_all requires mysqlnd; fallback to manual fetch if not available
        if (method_exists($result, 'fetch_all')) {
            $rows = $result->fetch_all(MYSQLI_ASSOC);
        } else {
            $rows = [];
            while ($r = $result->fetch_assoc()) $rows[] = $r;
        }
        $result->free();
        return $rows;
    };

    // decide which DB client we have
    $isPDO = (isset($pdo) && is_object($pdo) && ($pdo instanceof PDO));
    $isMysqli = false;

    if (isset($conn) && is_object($conn)) {
        // common name $conn
        $isMysqli = ($conn instanceof mysqli);
        if (!$isMysqli && get_class($conn) === 'mysqli') $isMysqli = true;
    }

    // Also check for $mysqli variable (some connection files name it that)
    if (!$isMysqli && isset($mysqli) && is_object($mysqli) && ($mysqli instanceof mysqli)) {
        $conn = $mysqli;
        $isMysqli = true;
    }

    if (!$isPDO && !$isMysqli) {
        throw new Exception("No supported DB connection found. Provide \$pdo (PDO) or \$conn/\$mysqli (mysqli) in connection.php");
    }

    // SQLs to run
    $sqls = [
        'work_times' => "SELECT * FROM work_time ORDER BY id",
        'breaks' => "SELECT * FROM break_time ORDER BY id",
        'work_time_break' => "SELECT * FROM work_time_break ORDER BY id",
        'late_tiers' => "SELECT * FROM late_deduction_tier ORDER BY id",
        'late_rules' => "SELECT * FROM late_deduction ORDER BY id",
        'work_time_late_deduction' => "SELECT * FROM work_time_late_deduction ORDER BY id",
    ];

    $result = [];

    if ($isPDO) {
        foreach ($sqls as $key => $sql) {
            $result[$key] = $pdoFetchAll($pdo, $sql);
        }
    } else {
        // using mysqli ($conn)
        foreach ($sqls as $key => $sql) {
            $result[$key] = $mysqliFetchAll($conn, $sql);
        }
    }

    echo json_encode(array_merge(['success' => true], $result), JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
    exit;
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => $e->getMessage()], JSON_UNESCAPED_UNICODE);
    exit;
}
