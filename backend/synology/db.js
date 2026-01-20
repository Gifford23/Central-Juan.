//db.js

import mysql from 'mysql2';

// Create the connection to the Synology MySQL server
const connection = mysql.createConnection({
  host: '10.0.254.219', // Synology server IP
  port: 3306,           // MySQL default port
  user: 'root', // Username you set in PHPMyAdmin
  password: 'CJP@ssw0rd!', // Your MySQL password
  database: 'central_juan_hris' // Your database name
});

connection.connect((err) => {
  if (err) {
    console.error('Error connecting to the database:', err);
    return;
  }
  console.log('Connected to the MySQL database');
});

export default connection;
