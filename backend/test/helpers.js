const jwt = require('jsonwebtoken');

async function truncateAll(pool) {
  await pool.query('TRUNCATE users, prescriptions, audit_logs RESTART IDENTITY CASCADE');
}

async function insertUser(pool, overrides = {}) {
  const bcrypt = require('bcryptjs');
  const u = {
    name: 'Test User',
    email: `user_${Math.random().toString(36).slice(2)}@example.com`,
    password: 'password123',
    role: 'doctor',
    status: 'approved',
    pharmacy_name: null,
    license_number: 'LIC-1',
    affiliation: 'Test Clinic',
    public_key: null,
    ...overrides,
  };
  const hashed = await bcrypt.hash(u.password, 4);
  const res = await pool.query(
    `INSERT INTO users (name, email, password, role, status, pharmacy_name, license_number, affiliation, public_key)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
     RETURNING id, name, email, role, status`,
    [u.name, u.email, hashed, u.role, u.status, u.pharmacy_name, u.license_number, u.affiliation, u.public_key]
  );
  return { ...res.rows[0], plainPassword: u.password };
}

function makeToken(user) {
  return jwt.sign(
    { id: user.id, email: user.email, role: user.role, name: user.name },
    process.env.JWT_SECRET,
    { expiresIn: '1h' }
  );
}

module.exports = { truncateAll, insertUser, makeToken };
