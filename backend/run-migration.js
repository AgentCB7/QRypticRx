require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

(async () => {
  const fileArg = process.argv[2] || '001_admin_approval.sql';
  const file = path.join(__dirname, 'db', 'migrations', fileArg);
  const sql = fs.readFileSync(file, 'utf8');
  try {
    await pool.query(sql);
    console.log(`Migration applied successfully: ${fileArg}`);
  } catch (e) {
    console.error('Migration FAILED:', e.message);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
})();
