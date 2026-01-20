<?php
include("../server/cors.php");
include("../server/connection.php");

header('Content-Type: application/json; charset=utf-8');

try {
    $sql = "
        SELECT 
            id,
            date_from,
            date_until,
            created_at
        FROM payroll_logs
        ORDER BY created_at DESC
    ";

    $result = $conn->query($sql);

    if ($result === false) {
        throw new Exception($conn->error);
    }

    $rows = [];
    while ($row = $result->fetch_assoc()) {
        $rows[] = [
            "id" => (int)$row["id"],
            "date_from" => $row["date_from"],
            "date_until" => $row["date_until"],
        ];
    }

    echo json_encode([
        "success" => true,
        "data" => $rows
    ]);

    $conn->close();
    exit;

} catch (Throwable $e) {
    http_response_code(500);
    echo json_encode([
        "success" => false,
        "message" => "Failed to load payroll periods",
        "error" => $e->getMessage()
    ]);
}
