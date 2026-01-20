import express from 'express';
import cors from 'cors';
import { createClient } from '@supabase/supabase-js';
import bcrypt from 'bcryptjs';
import bodyParser from 'body-parser';

const app = express();
const port = 3000;

// Supabase client
const supabaseUrl = 'https://kyudhyavnaudqwvrktlg.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt5dWRoeWF2bmF1ZHF3dnJrdGxnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDI0NjIwOTMsImV4cCI6MjA1ODAzODA5M30.ea1Uk1nJy_dxdLRFTfpkEGnzOfri3beW4IQHi0bRSFc';
const supabase = createClient(supabaseUrl, supabaseKey);

app.use(cors());
app.use(bodyParser.json());

// User registration endpoint
app.post('/register', async (req, res) => {
  const { username, password, role } = req.body;
  const hashedPassword = await bcrypt.hash(password, 10);

  const { data, error } = await supabase
    .from('users')
    .insert([{ username, password: hashedPassword, role }]);

  if (error) return res.status(400).json({ error: error.message });
  res.status(201).json({ message: 'User  registered successfully' });
});

// User login endpoint
app.post('/login', async (req, res) => {
  const { username, password } = req.body;

  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('username', username)
    .single();

  if (error || !data) {
    return res.status(401).json({ error: 'Invalid username or password' });
  }

  const isMatch = await bcrypt.compare(password, data.password);
  if (!isMatch) {
    return res.status(401).json({ error: 'Invalid username or password' });
  }

  // Return user data (omit password)
  const { password: _, ...user } = data;
  res.json(user);
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});