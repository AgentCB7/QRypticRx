const bcrypt = require('bcryptjs');

const SALT_ROUNDS = 12;

async function seedAdmin(pool) {
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;

  const hashed = await bcrypt.hash(password, SALT_ROUNDS);

  const existing = await pool.query("SELECT id FROM users WHERE role = 'admin' LIMIT 1");
  if (existing.rows.length > 0) {
    await pool.query(
      'UPDATE users SET email = $1, password = $2 WHERE id = $3',
      [email, hashed, existing.rows[0].id]
    );
    console.log(`Admin account updated: ${email}`);
    return;
  }

  await pool.query(
    `INSERT INTO users (name, email, password, role, status)
     VALUES ($1, $2, $3, 'admin', 'approved')`,
    ['Administrator', email, hashed]
  );
  console.log(`Admin account seeded: ${email}`);
}

module.exports = seedAdmin;
