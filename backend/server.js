require('dotenv').config();
const express = require('express');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { initDB } = require('./db');
const { GoogleGenerativeAI } = require('@google/generative-ai');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*' }
});

app.use(cors());
app.use(express.json());

const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret_key';

let db;
initDB().then(database => {
  db = database;
  console.log('Database initialized');
});

// Middleware for auth
const authenticate = (req, res, next) => {
  const token = req.header('Authorization');
  if (!token) return res.status(401).json({ error: 'Access denied' });
  try {
    const verified = jwt.verify(token.replace('Bearer ', ''), JWT_SECRET);
    req.user = verified;
    next();
  } catch (err) {
    res.status(400).json({ error: 'Invalid token' });
  }
};

// Routes
app.post('/api/auth/register', async (req, res) => {
  try {
    const { username, password } = req.body;
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    const result = await db.run('INSERT INTO users (username, password) VALUES (?, ?)', [username, hashedPassword]);
    res.status(201).json({ id: result.lastID, username });
  } catch (error) {
    res.status(400).json({ error: 'User already exists or invalid data' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    const user = await db.get('SELECT * FROM users WHERE username = ?', [username]);
    if (!user) return res.status(400).json({ error: 'Invalid credentials' });

    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) return res.status(400).json({ error: 'Invalid credentials' });

    const token = jwt.sign({ id: user.id }, JWT_SECRET, { expiresIn: '1h' });
    res.json({ token, user: { id: user.id, username: user.username } });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

app.get('/api/health', authenticate, async (req, res) => {
  const logs = await db.all('SELECT * FROM health_logs WHERE user_id = ? ORDER BY date DESC', [req.user.id]);
  res.json(logs);
});

app.post('/api/health', authenticate, async (req, res) => {
  const { steps, calories, water, date } = req.body;
  const logDate = date || new Date().toISOString();
  try {
    const result = await db.run(
      'INSERT INTO health_logs (user_id, steps, calories, water, date) VALUES (?, ?, ?, ?, ?)',
      [req.user.id, steps, calories, water, logDate]
    );
    const newLog = await db.get('SELECT * FROM health_logs WHERE id = ?', [result.lastID]);
    res.status(201).json(newLog);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// AI Prediction Route
app.post('/api/ai/predict-calories', authenticate, async (req, res) => {
  const { steps, activeMinutes, age, weight } = req.body;
  try {
    // If API key is not present, use a simple fallback heuristic
    if (!process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY === 'your_api_key_here') {
      const estimated = (steps * 0.04) + (activeMinutes * 5);
      return res.json({
        recommendation: `Based on a simple heuristic (since no API key was provided), you burned approximately ${estimated.toFixed(0)} calories today. Keep moving!`
      });
    }

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
    const prompt = `I am ${age} years old and weigh ${weight}kg. Today I took ${steps} steps and was active for ${activeMinutes} minutes. Can you estimate the calories I burned and give me a short, encouraging health tip? Keep it under 2 sentences.`;

    const result = await model.generateContent(prompt);
    res.json({ recommendation: result.response.text() });
  } catch (error) {
    console.error('AI Error:', error);
    res.status(500).json({ error: 'Failed to generate AI prediction' });
  }
});

// WebSockets for Real-time step counter updates
io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  socket.on('update_steps', (data) => {
    // In a real app, verify user token here too
    // Broadcast the update (or just acknowledge back for demonstration)
    socket.emit('steps_updated', { message: 'Steps synchronized!', steps: data.steps });
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});

const PORT = process.env.PORT || 5001;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
