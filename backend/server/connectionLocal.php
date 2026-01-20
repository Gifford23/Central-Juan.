================================================================================================================================================================
 connectionLocal


<?php
// connection.php
$servername = "localhost";
$username = "root";
$password = "";
$dbname = "central_juan_hris";

// Create connection
$conn = new mysqli($servername, $username, $password, $dbname);

// Check connection
if ($conn->connect_error) {
    die(json_encode(["message" => "Database connection failed: " . $conn->connect_error]));
}
?>

================================================================================================================================================================

deployed

<?php
// connection.php

// Database credentials
$servername = "auth-db605.hstgr.io";
$username = "u274016928_JbaUW";
$password = "CJP@ssw0rd!";
$dbname = "u274016928_83TLZ";

// Create connection
$conn = new mysqli($servername, $username, $password, $dbname);

// Check connection
if ($conn->connect_error) {
    header('Content-Type: application/json');
    http_response_code(500); // Set HTTP status code 500 for server error
    echo json_encode([
        "status" => "error",
        "message" => "❌ Database connection failed: " . $conn->connect_error
    ]);
    exit; // Stop the script immediately after error
}

// No output if successful connection
?>

================================================================================================================================================================

deployed

verssion 2



<?php
// db.php - PHP MySQL Helper for HRIS

class Database {
    private $servername = "localhost";
    private $username   = "root";
    private $password   = "";
    private $dbname     = "central_juan_hris";
    private $conn       = null;

    // Constructor - automatically connect
    public function __construct() {
        $this->connect();
    }

    // Connect to database
    private function connect() {
        // Use persistent connection
        $this->conn = @new mysqli('p:' . $this->servername, $this->username, $this->password, $this->dbname);

        if ($this->conn->connect_errno) {
            error_log("Database connection failed: " . $this->conn->connect_error);
            header('Content-Type: application/json');
            http_response_code(500);
            echo json_encode([
                "status"  => "error",
                "message" => "❌ Database temporarily unavailable. Please try again later."
            ]);
            exit;
        }

        // Set charset
        $this->conn->set_charset("utf8");
    }

    // Execute SELECT queries safely
    public function query($sql, $params = []) {
        $stmt = $this->conn->prepare($sql);
        if ($stmt === false) {
            error_log("SQL prepare failed: " . $this->conn->error);
            return false;
        }

        // Bind parameters if provided
        if (!empty($params)) {
            $types = str_repeat('s', count($params)); // assume all strings
            $stmt->bind_param($types, ...$params);
        }

        if (!$stmt->execute()) {
            error_log("SQL execute failed: " . $stmt->error);
            return false;
        }

        $result = $stmt->get_result();
        $rows = $result ? $result->fetch_all(MYSQLI_ASSOC) : [];
        $stmt->close();
        return $rows;
    }

    // Execute INSERT/UPDATE/DELETE
    public function execute($sql, $params = []) {
        $stmt = $this->conn->prepare($sql);
        if ($stmt === false) {
            error_log("SQL prepare failed: " . $this->conn->error);
            return false;
        }

        if (!empty($params)) {
            $types = str_repeat('s', count($params)); // assume all strings
            $stmt->bind_param($types, ...$params);
        }

        $success = $stmt->execute();
        if (!$success) {
            error_log("SQL execute failed: " . $stmt->error);
        }

        $stmt->close();
        return $success;
    }

    // Close connection explicitly
    public function close() {
        if ($this->conn) {
            $this->conn->close();
        }
    }
}

// Usage example:
// $db = new Database();
// $users = $db->query("SELECT * FROM users WHERE status = ?", ["active"]);
// $db->execute("UPDATE users SET last_login = NOW() WHERE id = ?", [$user_id]);
?>
