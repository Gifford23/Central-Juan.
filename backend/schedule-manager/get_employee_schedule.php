<?php
// get_employee_shift_window_fixed.php
// v2 - ensures break_time is always attempted via multiple strategies and adds a helper

include("../server/cors.php");
include("../server/connection.php"); // should provide $pdo (PDO) or $conn/$mysqli (mysqli)

header("Content-Type: application/json; charset=UTF-8");

try {
    if (!isset($_GET['employee_id']) || !isset($_GET['date'])) {
        throw new Exception("employee_id and date are required (date in YYYY-MM-DD)");
    }

    $employee_id = trim($_GET['employee_id']);
    $date = trim($_GET['date']);
    $debugMode = isset($_GET['debug']) && ($_GET['debug'] === '1' || strtolower($_GET['debug']) === 'true');
    $forceFallback = isset($_GET['force_fallback']) && ($_GET['force_fallback'] === '1' || strtolower($_GET['force_fallback']) === 'true');

    $dcheck = date_create_from_format('Y-m-d', $date);
    if (!$dcheck || $dcheck->format('Y-m-d') !== $date) {
        throw new Exception("date must be in YYYY-MM-DD format");
    }

    // Detect DB client
    $isPDO = (isset($pdo) && $pdo instanceof PDO);
    $isMysqli = false;
    if (isset($conn) && is_object($conn)) {
        $isMysqli = (get_class($conn) === 'mysqli') || ($conn instanceof mysqli);
    }
    if (!$isMysqli && isset($mysqli) && is_object($mysqli) && ($mysqli instanceof mysqli)) {
        $conn = $mysqli;
        $isMysqli = true;
    }
    if (!$isPDO && !$isMysqli) throw new Exception("No DB connection available. Provide $pdo or $conn/$mysqli in connection.php");

    // Helper to run read queries (same as before)
    function runQuery($sql, $params = []) {
        global $isPDO, $pdo, $conn, $isMysqli;
        $result = ['sql' => $sql, 'params' => $params, 'rows' => [], 'error' => null];
        try {
            if ($isPDO) {
                $stmt = $pdo->prepare($sql);
                if (!$stmt) {
                    $result['error'] = "PDO prepare failed: " . json_encode($pdo->errorInfo());
                    return $result;
                }
                $ok = $stmt->execute($params);
                if (!$ok) {
                    $result['error'] = "PDO execute failed: " . json_encode($stmt->errorInfo());
                    return $result;
                }
                $rows = $stmt->fetchAll(PDO::FETCH_ASSOC) ?: [];
                $result['rows'] = $rows;
                $stmt->closeCursor();
                return $result;
            }

            if ($isMysqli) {
                $stmt = $conn->prepare($sql);
                if ($stmt) {
                    if (!empty($params)) {
                        $types = '';
                        $refs = [];
                        foreach ($params as $i => $p) {
                            if (is_int($p) || is_numeric($p)) $types .= 'i'; else $types .= 's';
                            ${"bindvar_$i"} = $p;
                            $refs[] = &${"bindvar_$i"};
                        }
                        array_unshift($refs, $types);
                        if (!@call_user_func_array([$stmt, 'bind_param'], $refs)) {
                            $stmt->close();
                            throw new Exception('mysqli bind_param failed; will fallback to escaped query');
                        }
                    }

                    $ok = $stmt->execute();
                    if (!$ok) {
                        $result['error'] = "mysqli execute failed: " . $stmt->error;
                        $stmt->close();
                        return $result;
                    }
                    if (method_exists($stmt, 'get_result')) {
                        $res = $stmt->get_result();
                        $rows = $res ? $res->fetch_all(MYSQLI_ASSOC) : [];
                        if ($res) $res->free();
                        $result['rows'] = $rows;
                    } else {
                        $meta = $stmt->result_metadata();
                        if ($meta) {
                            $row = [];
                            $bindVars = [];
                            while ($f = $meta->fetch_field()) {
                                $row[$f->name] = null;
                                $bindVars[] = &$row[$f->name];
                            }
                            $meta->free();
                            if (!empty($bindVars)) {
                                call_user_func_array([$stmt, 'bind_result'], $bindVars);
                                while ($stmt->fetch()) {
                                    $assoc = [];
                                    foreach ($row as $k => $v) $assoc[$k] = $v;
                                    $result['rows'][] = $assoc;
                                }
                            }
                        }
                    }
                    $stmt->close();
                    return $result;
                }

                // fallback to escaped query
                $escapedSql = $sql;
                foreach ($params as $p) {
                    if (is_null($p)) $replacement = 'NULL';
                    else $replacement = "'" . $conn->real_escape_string((string)$p) . "'";
                    $escapedSql = preg_replace('/\?/', $replacement, $escapedSql, 1);
                }
                $res = $conn->query($escapedSql);
                if (!$res) {
                    $result['error'] = "mysqli query failed (fallback): " . $conn->error . " -- sql: " . $escapedSql;
                    return $result;
                }
                $rows = [];
                while ($r = $res->fetch_assoc()) $rows[] = $r;
                $result['rows'] = $rows;
                return $result;
            }

        } catch (Exception $ex) {
            $result['error'] = $ex->getMessage();
            return $result;
        }
        return $result;
    }

    // helper to fetch breaks by a set of strategies
    function fetch_breaks_for_work_time($wtId) {
        $result = ['breaks' => [], 'views' => []];
        if ($wtId === null) return $result;

        // 1) mapping table join (preferred)
        $q1 = "SELECT bt.* FROM work_time_break wtb JOIN break_time bt ON bt.id = wtb.break_id WHERE wtb.work_time_id = ? ORDER BY bt.break_start";
        $r1 = runQuery($q1, [$wtId]);
        $result['views']['join'] = $r1;
        if (empty($r1['error']) && !empty($r1['rows'])) {
            $result['breaks'] = $r1['rows'];
            return $result;
        }

        // 2) mapping table -> explicit IN(...) fallback
        $map = runQuery("SELECT break_id FROM work_time_break WHERE work_time_id = ?", [$wtId]);
        $result['views']['mapping'] = $map;
        if (empty($map['error']) && !empty($map['rows'])) {
            $ids = array_map(function($r){ return intval($r['break_id']); }, $map['rows']);
            $idsList = implode(',', $ids);
            if ($idsList !== '') {
                $q2 = "SELECT * FROM break_time WHERE id IN ($idsList) ORDER BY break_start";
                $r2 = runQuery($q2, []);
                $result['views']['in_fallback'] = $r2;
                if (empty($r2['error']) && !empty($r2['rows'])) {
                    $result['breaks'] = $r2['rows'];
                    return $result;
                }
            }
        }

        // 3) direct break_time.work_time_id (some systems populate this)
        $q3 = "SELECT * FROM break_time WHERE work_time_id = ? ORDER BY break_start";
        $r3 = runQuery($q3, [$wtId]);
        $result['views']['direct'] = $r3;
        if (empty($r3['error']) && !empty($r3['rows'])) {
            $result['breaks'] = $r3['rows'];
            return $result;
        }

        // 4) as a last resort: try to find breaks by matching time-window heuristics (optional)
        // For example, if work_time has start/end we can query break_time ranges inside that window.
        $wtRes = runQuery("SELECT start_time, end_time FROM work_time WHERE id = ? LIMIT 1", [$wtId]);
        $result['views']['work_time_row'] = $wtRes;
        if (empty($wtRes['error']) && !empty($wtRes['rows'])) {
            $st = $wtRes['rows'][0]['start_time'];
            $et = $wtRes['rows'][0]['end_time'];
            $heur = runQuery("SELECT * FROM break_time WHERE break_start >= ? AND break_end <= ? ORDER BY break_start", [$st, $et]);
            $result['views']['heuristic'] = $heur;
            if (empty($heur['error']) && !empty($heur['rows'])) {
                $result['breaks'] = $heur['rows'];
                return $result;
            }
        }

        return $result;
    }

    // 1) get candidate schedule(s)
    $sqlSchedules = "SELECT * FROM employee_shift_schedule WHERE employee_id = ? AND effective_date <= ? AND (end_date IS NULL OR end_date >= ?) AND (is_active = 1 OR is_active IS NULL) ORDER BY priority DESC, effective_date DESC";
    $schedRes = runQuery($sqlSchedules, [$employee_id, $date, $date]);
    $candidates = $schedRes['rows'];

    if (empty($candidates)) {
        $pw = runQuery("SELECT * FROM work_time WHERE is_default = 1 LIMIT 1");
        $resp = [
            'success' => true,
            'found' => false,
            'default_used' => !empty($pw['rows']),
            'default_work_time' => $pw['rows'][0] ?? null,
            'allowed_windows' => $pw['rows'][0] ? [
                'valid_in_start' => $pw['rows'][0]['valid_in_start'] ?? null,
                'valid_in_end' => $pw['rows'][0]['valid_in_end'] ?? null,
                'valid_out_start' => $pw['rows'][0]['valid_out_start'] ?? null,
                'valid_out_end' => $pw['rows'][0]['valid_out_end'] ?? null,
            ] : null,
            'breaks' => []
        ];
        if ($debugMode) $resp['debug'] = ['schedules_query' => $schedRes];
        echo json_encode($resp, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
        exit;
    }

    $selectedSchedule = $candidates[0];
    $wtId = isset($selectedSchedule['work_time_id']) ? intval($selectedSchedule['work_time_id']) : null;

    // fetch work_time
    $wt = null;
    $wtRes = null;
    if ($wtId !== null) {
        $wtRes = runQuery("SELECT * FROM work_time WHERE id = ? LIMIT 1", [$wtId]);
        $wt = $wtRes['rows'][0] ?? null;
    }

    // Use the helper to fetch breaks via multiple strategies
    $breakFetch = fetch_breaks_for_work_time($wtId);
    $breaks = $breakFetch['breaks'];

    // If forced fallback parameter is present, include mapping rows too
    $mapRes = runQuery("SELECT * FROM work_time_break WHERE work_time_id = ?", [$wtId]);

    $resp = [
        'success' => true,
        'found' => true,
        'schedule' => $selectedSchedule,
        'work_time' => $wt,
        'allowed_windows' => $wt ? [
            'valid_in_start' => $wt['valid_in_start'] ?? null,
            'valid_in_end' => $wt['valid_in_end'] ?? null,
            'valid_out_start' => $wt['valid_out_start'] ?? null,
            'valid_out_end' => $wt['valid_out_end'] ?? null
        ] : null,
        'breaks' => $breaks
    ];

    if ($debugMode) {
        $resp['debug'] = [
            'schedules_query' => $schedRes,
            'work_time_query' => $wtRes,
            'work_time_break_rows' => $mapRes,
            'break_fetch_views' => $breakFetch['views'],
            'conn' => runQuery('SELECT DATABASE() AS db, @@hostname AS host, @@port AS port, VERSION() AS version', [])
        ];
        if (!empty($mapRes['error'])) $resp['debug']['work_time_break_error'] = $mapRes['error'];
    }

    // if forceFallback requested, attach the mapping rows object for deeper inspection
    if ($forceFallback) $resp['mapping_rows'] = $mapRes['rows'];

    // write a small server-side debug file (optional) to /tmp for quick server inspection
    if ($debugMode) @file_put_contents('/tmp/get_employee_shift_window_debug.json', json_encode($resp, JSON_PRETTY_PRINT|JSON_UNESCAPED_UNICODE|JSON_UNESCAPED_SLASHES));

    echo json_encode($resp, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;

} catch (Exception $e) {
    http_response_code(500);
    $out = ['success' => false, 'error' => $e->getMessage()];
    if (isset($debugMode) && $debugMode) $out['trace'] = $e->getTraceAsString();
    echo json_encode($out, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}
