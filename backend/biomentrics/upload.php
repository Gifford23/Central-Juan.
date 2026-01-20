<?php
include('../server/connection.php');
// include("../server/cors.php");

// Allow larger CSVs if needed
ini_set('auto_detect_line_endings', TRUE);

if (isset($_POST["import"])) {
    if (isset($_FILES["file"]) && $_FILES["file"]["error"] === UPLOAD_ERR_OK) {
        $fileTmpPath = $_FILES["file"]["tmp_name"];
        $fileName = $_FILES["file"]["name"];
        $fileSize = $_FILES["file"]["size"];
        $fileType = $_FILES["file"]["type"];

        // Validate file extension
        $allowedExtensions = ['csv'];
        $fileExtension = strtolower(pathinfo($fileName, PATHINFO_EXTENSION));

        if (!in_array($fileExtension, $allowedExtensions)) {
            die("❌ Invalid file type. Only CSV files are allowed.");
        }

        if ($fileSize <= 0) {
            die("❌ The uploaded file is empty.");
        }

        // Open the file
        if (($handle = fopen($fileTmpPath, "r")) !== FALSE) {
            // Skip header row
            fgetcsv($handle);

            // Prepare insert statement
            $stmt = $conn->prepare("
                INSERT INTO attendance_record 
                (`Person ID`, `Name`, `Department`, `Time`, `Attendance Status`, 
                `Custom Name`, `Attendance Check Point`, `Data Source`, `Handling Type`, 
                `Temperature`, `Abnormal`) 
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ");

            if (!$stmt) {
                die("❌ Prepare failed: " . $conn->error);
            }

            // Bind variables
            $stmt->bind_param(
                "sssssssssss",
                $person_id, $name, $department, $time, $attendance_status,
                $custom_name, $attendance_checkpoint, $data_source, 
                $handling_type, $temperature, $abnormal
            );

            $rowCount = 0;
            $errorCount = 0;

            while (($row = fgetcsv($handle, 1000, ",")) !== FALSE) {
                // Skip empty rows
                if (empty($row) || count($row) < 4) {
                    continue;
                }

                $person_id             = trim($row[0]);
                $name                  = trim($row[1]);
                $department            = trim($row[2]);
                $time                  = date("Y-m-d H:i:s", strtotime($row[3]));
                $attendance_status     = $row[4] ?? null;
                $custom_name           = $row[5] ?? null;
                $attendance_checkpoint = $row[6] ?? null;
                $data_source           = $row[7] ?? null;
                $handling_type         = $row[8] ?? null;
                $temperature           = $row[9] ?? null;
                $abnormal              = $row[10] ?? null;

                if (!$stmt->execute()) {
                    $errorCount++;
                } else {
                    $rowCount++;
                }
            }

            fclose($handle);
            $stmt->close();
            $conn->close();

            echo "✅ Import complete! <br>";
            echo "✔️ Successfully inserted: <b>$rowCount</b> rows <br>";
            echo "⚠️ Failed to insert: <b>$errorCount</b> rows <br>";
            echo "<a href='index.php'>Go Back</a>";
        } else {
            echo "❌ Could not open uploaded file.";
        }
    } else {
        echo "❌ File upload error.";
    }
}
?>
