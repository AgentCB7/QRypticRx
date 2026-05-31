require('dotenv').config();
const app = require('./app');
const pool = require('./db/pool');
const seedAdmin = require('./db/seedAdmin');

const PORT = process.env.PORT || 3000;

for (const key of ['ADMIN_EMAIL', 'ADMIN_PASSWORD']) {
  if (!process.env[key]) {
    console.error(`FATAL: ${key} environment variable is not set`);
    process.exit(1);
  }
}

seedAdmin(pool)
  .then(() => {
    app.listen(PORT, () => {
      console.log(`QRypticRx API running on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error('FATAL: admin bootstrap failed:', err);
    process.exit(1);
  });
