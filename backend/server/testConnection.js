//testConnection.js
import connection from '../synology/db.js';

connection.query('SELECT * FROM departments', (err, results) => {
  if (err) {
    console.error('Query error:', err);
    return;
  }
  console.log('Users table data:', results);
  connection.end();
});

