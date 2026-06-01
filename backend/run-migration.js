require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

(async () => {
  const file = path.join(__dirname, 'db', 'migrations', '001_admin_approval.sql');
  const sql = fs.readFileSync(file, 'utf8');
  try {
    await pool.query(sql);
    const cols = await pool.query(
      "SELECT column_name FROM information_schema.columns WHERE table_name='users' AND column_name IN ('status','license_number','affiliation','applicant_note','rejection_reason','reviewed_by','reviewed_at') ORDER BY column_name"
    );
    const statuses = await pool.query('SELECT status, count(*)::int AS n FROM users GROUP BY status ORDER BY status');
    console.log('Migration applied successfully.');
    console.log('New columns present:', cols.rows.map(r => r.column_name).join(', ') || '(none)');
    console.log('User status counts:', JSON.stringify(statuses.rows));
  } catch (e) {
    console.error('Migration FAILED:', e.message);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
})();
