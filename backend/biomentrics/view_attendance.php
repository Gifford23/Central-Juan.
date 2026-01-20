<?php
include('../server/connection.php');
// include("../server/cors.php");

// Fetch all records from the correct table
$sql = "SELECT * FROM `attendance_record` ORDER BY `Person ID`, `Time`";
$result = $conn->query($sql);

// Prepare structured data
$attendance = [];
while ($row = $result->fetch_assoc()) {
    $person = $row['Person ID'];
    $name   = $row['Name'];
    $date   = date('Y-m-d', strtotime($row['Time']));
    $time   = strtotime($row['Time']);

    if (!isset($attendance[$person][$date])) {
        $attendance[$person][$date] = [
            'name'          => $name,
            'morning_in'    => null,
            'morning_out'   => null,
            'afternoon_in'  => null,
            'afternoon_out' => null,
        ];
    }

    // Morning In: 08:30 - 10:00 (take first entry)
    if ($time >= strtotime("$date 08:30:00") && $time <= strtotime("$date 10:00:00")) {
        if (!$attendance[$person][$date]['morning_in']) {
            $attendance[$person][$date]['morning_in'] = $row['Time'];
        }
    }

    // Morning Out: 11:00 - 12:30 (take first entry)
    if ($time >= strtotime("$date 11:00:00") && $time <= strtotime("$date 12:30:00")) {
        if (!$attendance[$person][$date]['morning_out']) {
            $attendance[$person][$date]['morning_out'] = $row['Time'];
        }
    }

    // Afternoon In: 12:30 - 14:00 (take first entry)
    if ($time >= strtotime("$date 12:30:00") && $time <= strtotime("$date 14:00:00")) {
        if (!$attendance[$person][$date]['afternoon_in']) {
            $attendance[$person][$date]['afternoon_in'] = $row['Time'];
        }
    }

    // Afternoon Out: 15:30 - 18:30 (take first entry)
    if ($time >= strtotime("$date 15:30:00") && $time <= strtotime("$date 18:30:00")) {
        if (!$attendance[$person][$date]['afternoon_out']) {
            $attendance[$person][$date]['afternoon_out'] = $row['Time'];
        }
    }
}


// ✅ Handle insert button
if (isset($_POST['insert_attendance'])) {
    foreach ($attendance as $person => $days) {
        foreach ($days as $date => $data) {
            // Get user_id based on person_id
            $stmt = $conn->prepare("SELECT user_id FROM users WHERE person_id = ?");
            $stmt->bind_param("i", $person);
            $stmt->execute();
            $res = $stmt->get_result();
            $user = $res->fetch_assoc();

            if ($user) {
                $employee_id = $user['user_id'];

                // Insert into attendance table
                $insert = $conn->prepare("
                    INSERT INTO attendance 
                    (employee_id, employee_name, attendance_date, time_in_morning, time_out_morning, time_in_afternoon, time_out_afternoon)
                    VALUES (?, ?, ?, ?, ?, ?, ?)
                ");
                $insert->bind_param(
                    "issssss",
                    $employee_id,
                    $data['name'],
                    $date,
                    $data['morning_in'],
                    $data['morning_out'],
                    $data['afternoon_in'],
                    $data['afternoon_out']
                );
                $insert->execute();
            }
        }
    }
    echo "<p style='color:green;font-weight:bold;'>✅ Filtered attendance inserted into attendance table successfully!</p>";
}


?>
<!DOCTYPE html>
<html>
<head>
    <title>Attendance Records</title>
    <style>
        table { border-collapse: collapse; width: 100%; }
        th, td { border: 1px solid #ccc; padding: 8px; text-align: center; }
        th { background: #f4f4f4; }
        .insert-btn { margin-top: 15px; padding: 8px 15px; font-size: 14px; }
    </style>
</head>
<body>
    <h2>Filtered Attendance Records</h2>
    <a href="index.php">⬅ Back to Upload Page</a>

    <form method="post">
        <button type="submit" name="insert_attendance" class="insert-btn">Insert Filtered Attendance → Attendance Table</button>
    </form>

    <table>
        <thead>
            <tr>
                <th>Person ID</th>
                <th>Name</th>
                <th>Date</th>
                <th>Morning In</th>
                <th>Morning Out</th>
                <th>Afternoon In</th>
                <th>Afternoon Out</th>
            </tr>
        </thead>
        <tbody>
            <?php foreach ($attendance as $person => $days): ?>
                <?php foreach ($days as $date => $data): ?>
                    <tr>
                        <td><?php echo $person; ?></td>
                        <td><?php echo $data['name']; ?></td>
                        <td><?php echo date('F j, Y', strtotime($date)); ?></td>
                        <td><?php echo $data['morning_in']    ? date('h:i A', strtotime($data['morning_in']))    : '-'; ?></td>
                        <td><?php echo $data['morning_out']   ? date('h:i A', strtotime($data['morning_out']))   : '-'; ?></td>
                        <td><?php echo $data['afternoon_in']  ? date('h:i A', strtotime($data['afternoon_in']))  : '-'; ?></td>
                        <td><?php echo $data['afternoon_out'] ? date('h:i A', strtotime($data['afternoon_out'])) : '-'; ?></td>
                    </tr>
                <?php endforeach; ?>
            <?php endforeach; ?>
        </tbody>
    </table>

</body>
</html>
