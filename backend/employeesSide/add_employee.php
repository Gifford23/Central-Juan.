<?php
require __DIR__ . '/../server/cors.php';
require __DIR__ . '/../server/connection.php';

header("Content-Type: application/json; charset=UTF-8");

use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\Exception;

require '../email/PHPMailer/src/Exception.php';
require '../email/PHPMailer/src/PHPMailer.php';
require '../email/PHPMailer/src/SMTP.php';

$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'POST') {
    $data = json_decode(file_get_contents("php://input"));

    if (
        isset(
            $data->employee_id, $data->first_name, $data->middle_name, $data->last_name,
            $data->email, $data->contact_number, $data->date_of_birth,
            $data->department_id, $data->position_id
        )
    ) {
        // Basic fields
        $employee_id    = $data->employee_id;
        $first_name     = $data->first_name;
        $middle_name    = $data->middle_name;
        $last_name      = $data->last_name;
        $email          = $data->email;
        $contact_number = $data->contact_number;
        $date_of_birth  = $data->date_of_birth;
        $department_id  = $data->department_id;
        $position_id    = $data->position_id;

        // Salary Info
        $input_salary   = isset($data->base_salary) ? floatval($data->base_salary) : 0;
        $salary_type    = strtolower($data->salary_type ?? 'daily'); // daily | monthly
        $employee_type  = $data->employee_type ?? 'Regular';

        // Branch Info (frontend may send branch_id or branch_name or both)
        $branch_id_input  = isset($data->branch_id) ? $data->branch_id : null;
        $branch_name_input = isset($data->branch_name) ? $data->branch_name : '';

        // If branch_id provided but branch_name empty, try to fetch branch_name
        $branch_id = null;
        $branch_name = '';

        if ($branch_id_input !== null && $branch_id_input !== '') {
            // normalize to int if possible
            $branch_id = intval($branch_id_input);

            // fetch the branch row (do not assume column names)
            $bstmt = $conn->prepare("SELECT * FROM branches WHERE branch_id = ? LIMIT 1");
            if ($bstmt) {
                $bstmt->bind_param("i", $branch_id);
                $bstmt->execute();
                $bres = $bstmt->get_result();
                if ($bres && $bres->num_rows) {
                    $brow = $bres->fetch_assoc();
                    // pick the best candidate for branch name: prefer 'name', then 'branch_name', then other common keys
                    if (isset($brow['name']) && $brow['name'] !== '') {
                        $branch_name = $brow['name'];
                    } elseif (isset($brow['branch_name']) && $brow['branch_name'] !== '') {
                        $branch_name = $brow['branch_name'];
                    } elseif (isset($brow['branch']) && $brow['branch'] !== '') {
                        $branch_name = $brow['branch'];
                    } else {
                        // fallback: take the first non-empty string value
                        foreach ($brow as $colVal) {
                            if (is_string($colVal) && trim($colVal) !== '') {
                                $branch_name = $colVal;
                                break;
                            }
                        }
                    }
                }
                $bstmt->close();
            }
        }


        // if branch_name still empty, use whatever frontend sent (could be manual)
        if (empty($branch_name) && !empty($branch_name_input)) {
            $branch_name = $branch_name_input;
        }

        // Salary computation constants
        $hours_per_day   = 8;
        $monthly_divisor = 26;

        $daily_rate = 0.00;
        $monthly_rate = 0.00;
        $hourly_rate = 0.00;

        if ($salary_type === 'monthly') {
            $monthly_rate = $input_salary;
            $daily_rate   = round($monthly_rate / $monthly_divisor, 2);
            $hourly_rate  = round($daily_rate / $hours_per_day, 2);
        } else {
            $daily_rate   = $input_salary;
            $monthly_rate = round($daily_rate * $monthly_divisor, 2);
            $hourly_rate  = round($daily_rate / $hours_per_day, 2);
        }

        // Insert employee (include branch_id + branch_name and rates)
        $stmt = $conn->prepare("
            INSERT INTO employees 
            (employee_id, first_name, middle_name, last_name, email, contact_number, 
             date_of_birth, department_id, position_id, base_salary, employee_type, 
             branch_id, branch_name, salary_type, monthly_rate, hourly_rate)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ");

        if (!$stmt) {
            echo json_encode(['status' => 'error', 'message' => 'Prepare failed', 'error' => $conn->error]);
            exit;
        }

        // prepare branch_id for binding: use NULL if no branch selected
        // mysqli bind_param accepts NULL values if the variable is NULL
        $branch_id_for_bind = ($branch_id !== null && $branch_id !== '') ? $branch_id : null;

        $bindTypes = "ssssssssdissdd"; 
        // Explanation of types order:
        // s:employee_id, s:first_name, s:middle_name, s:last_name, s:email, s:contact_number, s:date_of_birth, 
        // s:department_id, s:position_id, d:base_salary (daily), s:employee_type,
        // i:branch_id, s:branch_name, s:salary_type, d:monthly_rate, d:hourly_rate
        // Note: some MySQL drivers accept NULL for 'i' when variable is null.

        // Because bind_param requires variables, create them:
        $emp_id_v = $employee_id;
        $fn_v = $first_name;
        $mn_v = $middle_name;
        $ln_v = $last_name;
        $email_v = $email;
        $contact_v = $contact_number;
        $dob_v = $date_of_birth;
        $dept_v = $department_id;
        $pos_v = $position_id;
        $daily_v = $daily_rate;
        $etype_v = $employee_type;
        $branch_id_v = $branch_id_for_bind; // may be null
        $branch_name_v = $branch_name;
        $salary_type_v = $salary_type;
        $monthly_v = $monthly_rate;
        $hourly_v = $hourly_rate;

        // bind (note: if your PHP/MariaDB version has trouble binding NULL to an 'i', you can set branch_id_v = 0 instead)
        if (!$stmt->bind_param(
            "sssssssssdsissdd",
            $emp_id_v, $fn_v, $mn_v, $ln_v,
            $email_v, $contact_v, $dob_v, $dept_v, $pos_v,
            $daily_v, $etype_v, $branch_id_v, $branch_name_v, $salary_type_v, $monthly_v, $hourly_v
        )) {
            echo json_encode(['status' => 'error', 'message' => 'Bind failed', 'error' => $stmt->error]);
            exit;
        }

        if ($stmt->execute()) {
            // Build a full log message with all employee details
            $logDetails = sprintf(
                "Added new employee: [ID: %s] %s %s %s | Email: %s | Contact: %s | DOB: %s | Dept ID: %s | Position ID: %s | Employee Type: %s | Branch: %s (ID: %s) | Salary Type: %s | Daily: ₱%.2f | Monthly: ₱%.2f | Hourly: ₱%.2f",
                $employee_id,
                $first_name,
                $middle_name,
                $last_name,
                $email,
                $contact_number,
                $date_of_birth,
                $department_id,
                $position_id,
                $employee_type,
                ($branch_name ?: 'N/A'),
                ($branch_id !== null ? $branch_id : 'N/A'),
                ucfirst($salary_type),
                $daily_rate,
                $monthly_rate,
                $hourly_rate
            );

            // insert log
            $currentUser = $data->current_user ?? null;
            $userFullName = $currentUser->full_name ?? $currentUser->username ?? 'Unknown User';
            $userRole = $currentUser->role ?? 'GUEST';

            $logStmt = $conn->prepare("INSERT INTO logs (user_full_name, user_role, action) VALUES (?, ?, ?)");
            if ($logStmt) {
                $logStmt->bind_param("sss", $userFullName, $userRole, $logDetails);
                $logStmt->execute();
                $logStmt->close();
            }

            // Optional: send welcome email (kept same)
            $email_status = "Skipped (no data)";
            if (!empty($email)) {
                $mail = new PHPMailer(true);
                try {
                    $mail->isSMTP();
                    $mail->Host       = 'smtp.gmail.com';
                    $mail->SMTPAuth   = true;
                    $mail->Username   = 'atacadorragheil@gmail.com';
                    $mail->Password   = 'zgjh uxek mxus lqpt';
                    $mail->SMTPSecure = 'tls';
                    $mail->Port       = 587;

                    $mail->setFrom('atacadorragheil@gmail.com', 'HRIS System');
                    $mail->addAddress($email);

                    $mail->isHTML(true);
                    $mail->Subject = 'Your HRIS Account Credentials';

                    define('EMAIL_URL', 'https://hris.centraljuan.com');
                    $reset_link = EMAIL_URL . "/reset-password?email=" . urlencode($email);

                    $full_name = trim("{$first_name} {$middle_name} {$last_name}");
                    $assigned_branch = !empty($branch_name) ? $branch_name : 'Main Office';

                    $mail->Body = "
                    <html>
                    <head>
                        <style>
                        body {
                            font-family: 'Segoe UI', Arial, sans-serif;
                            background-color: #f7f9fc;
                            margin: 0;
                            padding: 0;
                        }
                        .email-container {
                            max-width: 600px;
                            margin: 30px auto;
                            background: #ffffff;
                            border-radius: 10px;
                            box-shadow: 0 4px 10px rgba(0,0,0,0.05);
                            overflow: hidden;
                        }
                        .header {
                            background: linear-gradient(90deg, #1e3a8a, #2563eb);
                            color: white;
                            padding: 20px;
                            text-align: center;
                        }
                        .header h2 {
                            margin: 0;
                            font-size: 22px;
                            letter-spacing: 0.5px;
                        }
                        .content {
                            padding: 25px;
                            color: #334155;
                        }
                        .content h3 {
                            color: #1e3a8a;
                            margin-top: 0;
                        }
                        .content p {
                            line-height: 1.6;
                        }
                        .info-box {
                            background-color: #f1f5f9;
                            border-left: 4px solid #2563eb;
                            padding: 12px 16px;
                            border-radius: 6px;
                            margin: 20px 0;
                        }
                        .info-box strong {
                            color: #1e40af;
                        }
                        .btn {
                            display: inline-block;
                            padding: 10px 20px;
                            margin-top: 10px;
                            background-color: #2563eb;
                            color: #ffffff !important;
                            text-decoration: none;
                            border-radius: 6px;
                            font-weight: 500;
                        }
                        .footer {
                            font-size: 12px;
                            color: #64748b;
                            text-align: center;
                            padding: 15px;
                            border-top: 1px solid #e2e8f0;
                            background-color: #f8fafc;
                        }
                        </style>
                    </head>
                    <body>
                        <div class='email-container'>
                        <div class='header'>
                            <h2>Welcome to Central Juan HRIS</h2>
                        </div>
                        <div class='content'>
                            <h3>Hello {$full_name},</h3>
                            <p>We’re excited to welcome you to <strong>Central Juan Human Resource Information System (HRIS)</strong>.</p>
                            
                            <div class='info-box'>
                            <p><strong>Employee ID:</strong> {$employee_id}</p>
                            <p><strong>Assigned Branch:</strong> {$assigned_branch}</p>
                            <p><strong>Registered Email:</strong> {$email}</p>
                            </div>

                            <p>Your HRIS account has been created by our HR department. As this is your <strong>first login</strong>, you must set a new password to activate your account.</p>

                            <p>Click the button below to securely create your new password:</p>
                            <p><a class='btn' href='{$reset_link}' target='_blank'>Set My New Password</a></p>

                            <p>If the button doesn’t work, you can copy and paste this link into your browser:</p>
                            <p style='font-size: 13px; color: #2563eb;'>{$reset_link}</p>

                            <p>Once you’ve reset your password, log in using your <strong>Employee ID</strong> and your newly set password.</p>
                        </div>
                        <div class='footer'>
                            <p>This email was sent automatically by Central Juan HRIS System. Please do not reply.</p>
                            <p>&copy; " . date('Y') . " Central Juan HRIS. All rights reserved.</p>
                        </div>
                        </div>
                    </body>
                    </html>
                    ";


                    $mail->send();
                    $email_status = "✅ Sent to {$email}";
                } catch (Exception $e) {
                    $email_status = "❌ " . $mail->ErrorInfo;
                }
            }

            echo json_encode([
                'status' => 'success',
                'message' => "Employee {$first_name} {$last_name} added successfully.",
                'log' => $logDetails,
                'salary_type' => $salary_type,
                'daily_rate' => number_format($daily_rate, 2),
                'monthly_rate' => number_format($monthly_rate, 2),
                'hourly_rate' => number_format($hourly_rate, 2),
                'email_status' => $email_status
            ]);
        } else {
            echo json_encode([
                'status'  => 'error',
                'message' => 'Error adding employee.',
                'error'   => $stmt->error
            ]);
        }

        $stmt->close();
    } else {
        echo json_encode(['status' => 'error', 'message' => 'Invalid or missing input data.']);
    }
} else {
    echo json_encode(['status' => 'error', 'message' => 'Unsupported request method.']);
}

$conn->close();
