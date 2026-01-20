<?php
include('../server/connection.php');
// include("../server/cors.php");

// Fetch all records (no filter at all)
$sql = "SELECT * FROM attendance_record ORDER BY `Time` ASC";
$result = $conn->query($sql);
?>
<!DOCTYPE html>
<html>
<head>
    <title>Unfiltered Attendance Records</title>
    <style>
        table {
            border-collapse: collapse;
            width: 100%;
        }
        th, td {
            border: 1px solid #ddd;
            padding: 8px;
        }
        th {
            background: #f2f2f2;
        }   
    </style>
</head>
<body>
    <h2>Unfiltered Attendance Records</h2>
     <br>
    <a href="index.php">⬅ Back to Upload Page</a>
     <br>
    <table>
        <thead>
            <tr>
                <th>Person ID</th>
                <th>Name</th>
                <th>Department</th>
                <th>Time</th>
                <th>Attendance Status</th>
                <th>Custom Name</th>
                <th>Attendance Check Point</th>
                <th>Data Source</th>
                <th>Handling Type</th>
                <th>Temperature</th>
                <th>Abnormal</th>
            </tr>
        </thead>
        <tbody>
            <?php if ($result->num_rows > 0): ?>
                <?php while($row = $result->fetch_assoc()): ?>
                    <tr>
                        <td><?= htmlspecialchars($row["Person ID"]) ?></td>
                        <td><?= htmlspecialchars($row["Name"]) ?></td>
                        <td><?= htmlspecialchars($row["Department"]) ?></td>
                        <td><?= htmlspecialchars($row["Time"]) ?></td>
                        <td><?= htmlspecialchars($row["Attendance Status"]) ?></td>
                        <td><?= htmlspecialchars($row["Custom Name"]) ?></td>
                        <td><?= htmlspecialchars($row["Attendance Check Point"]) ?></td>
                        <td><?= htmlspecialchars($row["Data Source"]) ?></td>
                        <td><?= htmlspecialchars($row["Handling Type"]) ?></td>
                        <td><?= htmlspecialchars($row["Temperature"]) ?></td>
                        <td><?= htmlspecialchars($row["Abnormal"]) ?></td>
                    </tr>
                <?php endwhile; ?>
            <?php else: ?>
                <tr><td colspan="11">No records found</td></tr>
            <?php endif; ?>
        </tbody>
    </table>

   
</body>
</html>
