const pool = require('../db/pool');
const seedAdmin = require('../db/seedAdmin');
const { truncateAll } = require('./helpers');

beforeEach(async () => {
  await truncateAll(pool);
  process.env.ADMIN_EMAIL = 'admin@example.com';
  process.env.ADMIN_PASSWORD = 'adminpass123';
});

afterAll(async () => {
  await pool.end();
});

test('inserts a single admin when none exists', async () => {
  await seedAdmin(pool);
  const res = await pool.query("SELECT id, email, role, status FROM users WHERE role = 'admin'");
  expect(res.rows).toHaveLength(1);
  expect(res.rows[0].email).toBe('admin@example.com');
  expect(res.rows[0].status).toBe('approved');
});

test('is idempotent — second call does not insert another admin', async () => {
  await seedAdmin(pool);
  await seedAdmin(pool);
  const res = await pool.query("SELECT id FROM users WHERE role = 'admin'");
  expect(res.rows).toHaveLength(1);
});
