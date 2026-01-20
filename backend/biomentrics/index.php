<?php 
include('../server/connection.php');
// include("../server/cors.php");

?>


<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>CSV Import</title>
  <style>
    body {
      margin: 0;
      font-family: Arial, sans-serif;
      background: #f3f4f6;
      display: flex;
      justify-content: center;
      align-items: center;
      height: 100vh;
    }
    .card {
      background: #fff;
      padding: 2rem;
      border-radius: 16px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.1);
      max-width: 400px;
      width: 100%;
      text-align: center;
    }
    h2 {
      font-size: 1.5rem;
      color: #4f46e5;
      margin-bottom: 1.5rem;
    }
    input[type="file"] {
      display: block;
      width: 100%;
      padding: 10px;
      border: 1px solid #ccc;
      border-radius: 8px;
      margin-bottom: 1rem;
      cursor: pointer;
      font-size: 0.9rem;
    }
    button {
      width: 100%;
      padding: 10px;
      border: none;
      border-radius: 8px;
      font-size: 1rem;
      cursor: pointer;
      transition: 0.3s;
    }
    .btn-upload {
      background: #4f46e5;
      color: #fff;
    }
    .btn-upload:hover {
      background: #3730a3;
    }
    .btn-green {
      background: #16a34a;
      color: #fff;
      margin-top: 1rem;
    }
    .btn-green:hover {
      background: #15803d;
    }
    .btn-gray {
      background: #6b7280;
      color: #fff;
      margin-top: 0.5rem;
    }
    .btn-gray:hover {
      background: #4b5563;
    }
    hr {
      margin: 2rem 0;
      border: 0;
      border-top: 1px solid #e5e7eb;
    }
  </style>
</head>
<body>

  <div class="card">
    <h2>📂 Import CSV to MySQL</h2>

    <!-- CSV Upload Form -->
    <form action="upload.php" method="post" enctype="multipart/form-data">
      <input type="file" name="file" accept=".csv" required>
      <button type="submit" name="import" class="btn-upload">Upload & Import</button>
    </form>

    <hr>

    <!-- Navigation Buttons -->
    <form action="view_attendance.php" method="get">
      <button type="submit" class="btn-green">View Filtered Attendance Records</button>
    </form>

    <form action="unfiltered_attendance.php" method="get">
      <button type="submit" class="btn-gray">View Unfiltered Attendance Records</button>
    </form>
  </div>

</body>
</html>
