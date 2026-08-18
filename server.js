const express = require('express');
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
const jwt = require('jwt-simple');
const cors = require('cors');

const app = express();
app.use(express.json());
app.use(cors());

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgres://user:password@localhost:5432/pool_db'
});

const JWT_SECRET = 'your_jwt_secret_key';

// Middleware to verify JWT token
const authenticate = (req, res, next) => {
  const token = req.headers['authorization'];
  if (!token) return res.status(401).json({ error: 'Access denied' });
  try {
    const decoded = jwt.decode(token.replace('Bearer ', ''), JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    res.status(400).json({ error: 'Invalid token' });
  }
};

// 1. Auth API
app.post('/api/auth/signup', async (req, res) => {
  const { name, email, password, role, gender, age } = req.body;
  const hash = await bcrypt.hash(password, 10);
  try {
    const result = await pool.query(
      'INSERT INTO users (name, email, password_hash, role, gender, age) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id, role',
      [name, email, hash, role || 'player', gender, age]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(400).json({ error: 'User already exists or bad data' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
  if (result.rows.length === 0) return res.status(404).json({ error: 'User not found' });

  const user = result.rows[0];
  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) return res.status(400).json({ error: 'Invalid password' });

  const token = jwt.encode({ id: user.id, role: user.role }, JWT_SECRET);
  res.json({ token, user: { id: user.id, name: user.name, role: user.role } });
});

// 2. Tournament Coordinator Banking Details
app.post('/api/tc/banking', authenticate, async (req, res) => {
  const { bank_name, account_number, branch_code, account_holder } = req.body;
  await pool.query(
    `INSERT INTO banking_details (user_id, bank_name, account_number, branch_code, account_holder)
     VALUES ($1, $2, $3, $4, $5)`,
    [req.user.id, bank_name, account_number, branch_code, account_holder]
  );
  res.json({ message: 'Banking details updated successfully' });
});

// 3. Create Tournament (TC or Player)
app.post('/api/tournaments', authenticate, async (req, res) => {
  const { title, game_type, entry_fee, race_to, format, is_day_pass } = req.body;
  const user = (await pool.query('SELECT * FROM users WHERE id = $1', [req.user.id])).rows[0];

  // Logic: TC needs monthly subscription, Player pays R100/day pass
  if (!is_day_pass && (!user.tc_subscription_active && user.role !== 'both' && user.role !== 'tournament_coordinator')) {
     return res.status(403).json({ error: 'TC subscription required (R1000/pm)' });
  }

  const result = await pool.query(
    `INSERT INTO tournaments (creator_id, title, game_type, entry_fee, race_to, format, is_day_pass)
     VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
    [req.user.id, title, game_type, entry_fee, race_to, format, is_day_pass || false]
  );
  res.json(result.rows[0]);
});

// 4. Join Tournament Waitlist
app.post('/api/tournaments/:id/join', authenticate, async (req, res) => {
  try {
    await pool.query(
      'INSERT INTO tournament_participants (tournament_id, player_id, payment_status) VALUES ($1, $2, $3)',
      [req.params.id, req.user.id, 'pending']
    );
    res.json({ message: 'Added to waitlist. Pending payment verification by TC.' });
  } catch (err) {
    res.status(400).json({ error: 'Already joined' });
  }
});

// 5. Update Match Score
app.post('/api/matches/:id/score', authenticate, async (req, res) => {
  const { player1_score, player2_score, winner_id } = req.body;
  const status = winner_id ? 'completed' : 'in_progress';

  const result = await pool.query(
    `UPDATE matches SET player1_score = $1, player2_score = $2, winner_id = $3, status = $4
     WHERE id = $5 RETURNING *`,
    [player1_score, player2_score, winner_id, status, req.params.id]
  );
  res.json(result.rows[0]);
});

// 6. Create Social Game (Player vs Player)
app.post('/api/social-games', authenticate, async (req, res) => {
  const { opponent_id, game_type, race_to } = req.body;
  const result = await pool.query(
    `INSERT INTO social_games (creator_id, opponent_id, game_type, race_to)
     VALUES ($1, $2, $3, $4) RETURNING *`,
    [req.user.id, opponent_id, game_type, race_to]
  );
  res.json(result.rows[0]);
});

app.listen(5000, () => console.log('Server running on port 5000'));