<?php
// attendance_requests.php
// Unified endpoint for attendance requests management
require_once '../server/connection.php';
include("../server/cors.php");
header("Content-Type: application/json; charset=UTF-8");

// Get HTTP method
$method = $_SERVER['REQUEST_METHOD'];

// Parse input for PUT/POST requests
$input = json_decode(file_get_contents('php://input'), true);

switch ($method) {
    case 'GET':
        // Fetch attendance requests with optional status filter
        $status = isset($_GET['status']) ? $_GET['status'] : 'all';
        
        $sql = "SELECT 
                    r.request_id as id,
                    r.employee_id,
                    r.employee_name,
                    r.attendance_date as request_date,
                    r.requested_time_in_morning,
                    r.requested_time_out_morning,
                    r.requested_time_in_afternoon,
                    r.requested_time_out_afternoon,
                    r.reason,
                    r.status,
                    r.requested_at,
                    r.reviewed_at,
                    r.reviewed_by,
                    e.department,
                    e.image,
                    a.time_in_morning AS current_time_in_morning,
                    a.time_out_morning AS current_time_out_morning,
                    a.time_in_afternoon AS current_time_in_afternoon,
                    a.time_out_afternoon AS current_time_out_afternoon
                FROM late_attendance_requests r
                LEFT JOIN employees e ON r.employee_id = e.employee_id
                LEFT JOIN attendance a ON r.employee_id = a.employee_id AND r.attendance_date = a.attendance_date";
        
        // Add status filter if not 'all'
        if ($status !== 'all') {
            $sql .= " WHERE r.status = '" . $conn->real_escape_string($status) . "'";
        }
        
        $sql .= " ORDER BY r.requested_at DESC";
        
        $result = $conn->query($sql);
        
        if ($result && $result->num_rows > 0) {
            $attendanceData = [];
            
            while ($row = $result->fetch_assoc()) {
                // Normalize status to lowercase
                $row['status'] = strtolower($row['status']);
                
                // Determine request type based on what's being requested
                $request_type = 'correction';
                if ($row['requested_time_in_morning'] || $row['requested_time_out_morning'] || 
                    $row['requested_time_in_afternoon'] || $row['requested_time_out_afternoon']) {
                    $request_type = 'correction';
                }
                $row['request_type'] = $request_type;
                
                $attendanceData[] = $row;
            }
            
            echo json_encode([
                "success" => true,
                "data" => $attendanceData
            ]);
        } else {
            echo json_encode([
                "success" => true,
                "data" => []
            ]);
        }
        break;
        
    case 'PUT':
        // Update request status (approve/reject)
        if (!isset($input['id']) || !isset($input['status'])) {
            echo json_encode([
                "success" => false,
                "message" => "Missing required fields: id and status"
            ]);
            break;
        }
        
        $id = $conn->real_escape_string($input['id']);
        $status = $conn->real_escape_string($input['status']);
        $reviewed_by = isset($input['reviewed_by']) ? $conn->real_escape_string($input['reviewed_by']) : 'Admin';
        
        // Validate status
        if (!in_array($status, ['approved', 'rejected'])) {
            echo json_encode([
                "success" => false,
                "message" => "Invalid status. Must be 'approved' or 'rejected'"
            ]);
            break;
        }
        
        // Update the request
        $sql = "UPDATE late_attendance_requests 
                SET status = ?, reviewed_at = NOW(), reviewed_by = ? 
                WHERE request_id = ?";
        
        $stmt = $conn->prepare($sql);
        $stmt->bind_param("ssi", $status, $reviewed_by, $id);
        
        if ($stmt->execute()) {
            // If approved, update the attendance record
            if ($status === 'approved') {
                // Get the request details
                $request_sql = "SELECT * FROM late_attendance_requests WHERE request_id = ?";
                $request_stmt = $conn->prepare($request_sql);
                $request_stmt->bind_param("i", $id);
                $request_stmt->execute();
                $request_result = $request_stmt->get_result();
                $request_data = $request_result->fetch_assoc();
                
                if ($request_data) {
                    // Update or insert attendance record
                    $attendance_sql = "INSERT INTO attendance (
                        employee_id, attendance_date, time_in_morning, time_out_morning,
                        time_in_afternoon, time_out_afternoon, days_credited, overtime_hours
                    ) VALUES (?, ?, ?, ?, ?, ?, 1, 0)
                    ON DUPLICATE KEY UPDATE
                    time_in_morning = VALUES(time_in_morning),
                    time_out_morning = VALUES(time_out_morning),
                    time_in_afternoon = VALUES(time_in_afternoon),
                    time_out_afternoon = VALUES(time_out_afternoon)";
                    
                    $att_stmt = $conn->prepare($attendance_sql);
                    $att_stmt->bind_param(
                        "isssss",
                        $request_data['employee_id'],
                        $request_data['attendance_date'],
                        $request_data['requested_time_in_morning'],
                        $request_data['requested_time_out_morning'],
                        $request_data['requested_time_in_afternoon'],
                        $request_data['requested_time_out_afternoon']
                    );
                    $att_stmt->execute();
                }
            }
            
            echo json_encode([
                "success" => true,
                "message" => "Request " . $status . " successfully"
            ]);
        } else {
            echo json_encode([
                "success" => false,
                "message" => "Failed to update request: " . $conn->error
            ]);
        }
        break;
        
    case 'POST':
        // Create new attendance request
        if (!isset($input['employee_id']) || !isset($input['attendance_date']) || !isset($input['reason'])) {
            echo json_encode([
                "success" => false,
                "message" => "Missing required fields: employee_id, attendance_date, reason"
            ]);
            break;
        }
        
        $employee_id = $conn->real_escape_string($input['employee_id']);
        $attendance_date = $conn->real_escape_string($input['attendance_date']);
        $reason = $conn->real_escape_string($input['reason']);
        $time_in_morning = isset($input['time_in_morning']) ? $conn->real_escape_string($input['time_in_morning']) : null;
        $time_out_morning = isset($input['time_out_morning']) ? $conn->real_escape_string($input['time_out_morning']) : null;
        $time_in_afternoon = isset($input['time_in_afternoon']) ? $conn->real_escape_string($input['time_in_afternoon']) : null;
        $time_out_afternoon = isset($input['time_out_afternoon']) ? $conn->real_escape_string($input['time_out_afternoon']) : null;
        
        // Get employee name
        $emp_sql = "SELECT employee_name FROM employees WHERE employee_id = ?";
        $emp_stmt = $conn->prepare($emp_sql);
        $emp_stmt->bind_param("s", $employee_id);
        $emp_stmt->execute();
        $emp_result = $emp_stmt->get_result();
        $employee_data = $emp_result->fetch_assoc();
        $employee_name = $employee_data['employee_name'] ?? 'Unknown';
        
        // Insert the request
        $sql = "INSERT INTO late_attendance_requests (
            employee_id, employee_name, attendance_date, 
            requested_time_in_morning, requested_time_out_morning,
            requested_time_in_afternoon, requested_time_out_afternoon,
            reason, status, requested_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending', NOW())";
        
        $stmt = $conn->prepare($sql);
        $stmt->bind_param(
            "sssssss",
            $employee_id,
            $employee_name,
            $attendance_date,
            $time_in_morning,
            $time_out_morning,
            $time_in_afternoon,
            $time_out_afternoon,
            $reason
        );
        
        if ($stmt->execute()) {
            echo json_encode([
                "success" => true,
                "message" => "Attendance request created successfully",
                "request_id" => $conn->insert_id
            ]);
        } else {
            echo json_encode([
                "success" => false,
                "message" => "Failed to create request: " . $conn->error
            ]);
        }
        break;
        
    default:
        echo json_encode([
            "success" => false,
            "message" => "Method not allowed"
        ]);
        break;
}

$conn->close();
?>
