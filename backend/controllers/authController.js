const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { generateKeyPairSync } = require('crypto');
const pool = require('../db/pool');

const SALT_ROUNDS = 12;

async function register(req, res) {
  const { name, email, password, role, pharmacy_name } = req.body;

  if (!name || !email || !password || !role) {
    return res.status(400).json({ error: 'name, email, password, and role are required' });
  }
  if (!['doctor', 'pharmacist'].includes(role)) {
    return res.status(400).json({ error: 'role must be doctor or pharmacist' });
  }
  if (role === 'pharmacist' && !pharmacy_name) {
    return res.status(400).json({ error: 'pharmacy_name is required for pharmacists' });
  }
  if (password.length < 8) {
    return res.status(400).json({ error: 'Password must be at least 8 characters' });
  }

  try {
    const existing = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
    if (existing.rows.length > 0) {
      return res.status(409).json({ error: 'Email already registered' });
    }

    const hashed = await bcrypt.hash(password, SALT_ROUNDS);

    let public_key = null;
    if (role === 'doctor') {
      const { publicKey } = generateKeyPairSync('rsa', {
        modulusLength: 2048,
        publicKeyEncoding: { type: 'spki', format: 'pem' },
        privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
      });
      public_key = publicKey;
    }

    const result = await pool.query(
      `INSERT INTO users (name, email, password, role, public_key, pharmacy_name)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, name, email, role, pharmacy_name, created_at`,
      [name, email, hashed, role, public_key, pharmacy_name || null]
    );

    const user = result.rows[0];
    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role, name: user.name },
      process.env.JWT_SECRET,
      { expiresIn: '8h' }
    );

    res.status(201).json({ token, user });
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ error: 'Registration failed' });
  }
}

async function login(req, res) {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'email and password are required' });
  }

  try {
    const result = await pool.query(
      'SELECT id, name, email, password, role, pharmacy_name FROM users WHERE email = $1',
      [email]
    );
    const user = result.rows[0];

    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role, name: user.name },
      process.env.JWT_SECRET,
      { expiresIn: '8h' }
    );

    res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        pharmacy_name: user.pharmacy_name,
      },
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Login failed' });
  }
}

module.exports = { register, login };
