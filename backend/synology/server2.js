import express from 'express';
import connection from './db.js';

const app = express();
const PORT = 5001;

// Middleware to parse JSON data
app.use(express.json());

// Root endpoint to check server status
app.get('/', (req, res) => {
  res.send('Server is up and running!');
});

// Users endpoint to fetch users from the database
app.get('/users', (req, res) => {
  const query = 'SELECT * FROM users';
  connection.query(query, (err, results) => {
    if (err) {
      console.error('Error fetching users:', err);
      res.status(500).send('Error fetching users');
      return;
    }
    res.json(results);
  });
});

// Start listening on all network interfaces
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running at http://10.0.254.219:${PORT}`);
});
