<?php
// get_breaks_by_work_time.php
// Returns break_time rows for a given work_time_id using multiple strategies and some helpful computed_* fields.
// Usage: GET ?work_time_id=4[&debug=1]

include('../server/cors.php');
include('../server/connection.php'); // must provide $pdo (PDO) or $conn/$mysqli

header('Content-Type: application/json; charset=UTF-8');

try {
    if (!isset($_GET['work_time_id'])) throw new Exception('work_time_id is required');
    $wtId = intval($_GET['work_time_id']);
    $debug = isset($_GET['debug']) && ($_GET['debug'] === '1' || strtolower($_GET['debug']) === 'true');

    // Detect DB client (PDO preferred)
    $isPDO = (isset($pdo) && $pdo instanceof PDO);
    $isMysqli = false;
    if (isset($conn) && is_object($conn)) {
        $isMysqli = (get_class($conn) === 'mysqli') || ($conn instanceof mysqli);
    }
    if (!$isPDO && !$isMysqli) throw new Exception('No DB connection available. Provide $pdo or $conn/$mysqli in connection.php');

    // simple runQuery helper (PDO/mysqli)
    function runQuery($sql, $params = []) {
        global $isPDO, $pdo, $isMysqli, $conn;
        $out = ['sql' => $sql, 'params' => $params, 'rows' => [], 'error' => null];
        try {
            if ($isPDO) {
                $stmt = $pdo->prepare($sql);
                if (!$stmt) { $out['error'] = json_encode($pdo->errorInfo()); return $out; }
                $ok = $stmt->execute($params);
                if (!$ok) { $out['error'] = json_encode($stmt->errorInfo()); return $out; }
                $out['rows'] = $stmt->fetchAll(PDO::FETCH_ASSOC) ?: [];
                $stmt->closeCursor();
                return $out;
            }
            // mysqli
            $stmt = $conn->prepare($sql);
            if ($stmt) {
                if (!empty($params)) {
                    $types = '';
                    $refs = [];
                    foreach ($params as $i => $p) {
                        $types .= (is_int($p) || is_numeric($p)) ? 'i' : 's';
                        ${"bv$i"} = $p;
                        $refs[] = &${"bv$i"};
                    }
                    array_unshift($refs, $types);
                    @call_user_func_array([$stmt, 'bind_param'], $refs);
                }
                if (!$stmt->execute()) { $out['error'] = $stmt->error; $stmt->close(); return $out; }
                if (method_exists($stmt, 'get_result')) {
                    $res = $stmt->get_result();
                    $out['rows'] = $res ? $res->fetch_all(MYSQLI_ASSOC) : [];
                    if ($res) $res->free();
                } else {
                    // fetch metadata fallback
                    $meta = $stmt->result_metadata();
                    if ($meta) {
                        $row = []; $bindVars = [];
                        while ($f = $meta->fetch_field()) { $row[$f->name] = null; $bindVars[] = &$row[$f->name]; }
                        $meta->free();
                        if (!empty($bindVars)) {
                            call_user_func_array([$stmt, 'bind_result'], $bindVars);
                            while ($stmt->fetch()) {
                                $assoc = [];
                                foreach ($row as $k => $v) $assoc[$k] = $v;
                                $out['rows'][] = $assoc;
                            }
                        }
                    }
                }
                $stmt->close();
                return $out;
            }
            // prepare failed -> fallback to escaped query
            $escapedSql = $sql;
            foreach ($params as $p) {
                $replacement = is_null($p) ? 'NULL' : "'" . $conn->real_escape_string((string)$p) . "'";
                $escapedSql = preg_replace('/\\?/', $replacement, $escapedSql, 1);
            }
            $res = $conn->query($escapedSql);
            if (!$res) { $out['error'] = $conn->error . ' -- ' . $escapedSql; return $out;}
            while ($r = $res->fetch_assoc()) $out['rows'][] = $r;
            return $out;
        } catch (Exception $ex) {
            $out['error'] = $ex->getMessage();
            return $out;
        }
    }

    // Strategy 1: join mapping -> break_time
    $qJoin = "SELECT bt.* FROM work_time_break wtb JOIN break_time bt ON bt.id = wtb.break_id WHERE wtb.work_time_id = ? ORDER BY bt.break_start";
    $rJoin = runQuery($qJoin, [$wtId]);

    // Strategy 2: explicit IN(...) using mapping table (fallback)
    $rMap = runQuery("SELECT break_id FROM work_time_break WHERE work_time_id = ?", [$wtId]);
    $rIn = ['rows' => [], 'error' => null];
    if (empty($rJoin['rows']) && empty($rJoin['error']) && !empty($rMap['rows'])) {
        $ids = array_map(function($x){ return intval($x['break_id']); }, $rMap['rows']);
        if (!empty($ids)) {
            $idsList = implode(',', $ids);
            $rIn = runQuery("SELECT * FROM break_time WHERE id IN ($idsList) ORDER BY break_start", []);
        }
    }

    // Strategy 3: direct break_time.work_time_id column
    $rDirect = ['rows' => [], 'error' => null];
    if (empty($rJoin['rows']) && empty($rIn['rows'])) {
        $rDirect = runQuery("SELECT * FROM break_time WHERE work_time_id = ? ORDER BY break_start", [$wtId]);
    }

    // Collate: prefer rJoin > rIn > rDirect
    $breakRows = [];
    if (!empty($rJoin['rows'])) $breakRows = $rJoin['rows'];
    elseif (!empty($rIn['rows'])) $breakRows = $rIn['rows'];
    elseif (!empty($rDirect['rows'])) $breakRows = $rDirect['rows'];

    // Add helpful computed fields for client convenience
    foreach ($breakRows as &$b) {
        $b['break_start'] = $b['break_start'] ?? null;
        $b['break_end'] = $b['break_end'] ?? null;
        // computed defaults
        $bs_ts = $b['break_start'] ? strtotime($b['break_start']) : null;
        $be_ts = $b['break_end'] ? strtotime($b['break_end']) : null;

        $b['computed_break_minutes'] = isset($b['break_minutes']) ? intval($b['break_minutes']) : ($bs_ts && $be_ts ? intval(($be_ts - $bs_ts) / 60) : null);

        // computed valid-break-in defaults: start = break_start + 30 min, end = break_end
        $b['computed_valid_break_in_start'] = $b['valid_break_in_start'] ?? ($bs_ts ? date('H:i:s', $bs_ts + 30*60) : null);
        $b['computed_valid_break_in_end']   = $b['valid_break_in_end']   ?? ($b['break_end'] ?? null);

        // computed valid-break-out defaults: start = break_start, end = break_start + 29 min
        $b['computed_valid_break_out_start'] = $b['valid_break_out_start'] ?? ($b['break_start'] ?? null);
        $b['computed_valid_break_out_end']   = $b['valid_break_out_end']   ?? ($bs_ts ? date('H:i:s', $bs_ts + 29*60) : null);

        // normalize some flags
        $b['is_shift_split'] = isset($b['is_shift_split']) ? (int)$b['is_shift_split'] : 0;
    }
    unset($b);

    $out = [
        'success' => true,
        'work_time_id' => $wtId,
        'breaks' => $breakRows
    ];

    if ($debug) {
        $out['debug'] = [
            'join' => $rJoin,
            'mapping' => $rMap,
            'in_fallback' => $rIn,
            'direct' => $rDirect
        ];
        // connection info
        $out['debug']['conn'] = runQuery('SELECT DATABASE() AS db, @@hostname AS host, @@port AS port, VERSION() AS version', []);
    }

    echo json_encode($out, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => $e->getMessage()], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}
