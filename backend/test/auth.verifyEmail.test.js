const request = require('supertest');
const app = require('../app');
const pool = require('../db/pool');
const { truncateAll } = require('./helpers');
const { outbox } = require('../lib/mailer');

beforeEach(async () => { await truncateAll(pool); outbox.length = 0; });
afterAll(() => pool.end());

function reg(overrides = {}) {
  return {
    name: 'Dr. Jane', email: 'jane@example.com', password: 'password123',
    role: 'doctor', license_number: 'LIC-1', affiliation: 'City Clinic',
    ...overrides,
  };
}

function lastCode() {
  return outbox[outbox.length - 1].text.match(/(\d{6})/)[1];
}

test('correct code flips status unverified → pending', async () => {
  await request(app).post('/api/auth/register').send(reg());
  const code = lastCode();
  const res = await request(app).post('/api/auth/verify-email').send({ email: 'jane@example.com', code });
  expect(res.status).toBe(200);
  const row = await pool.query('SELECT status FROM users WHERE email = $1', ['jane@example.com']);
  expect(row.rows[0].status).toBe('pending');
});

test('wrong code → 400 and account stays unverified', async () => {
  await request(app).post('/api/auth/register').send(reg());
  const code = lastCode();
  const wrong = code === '000000' ? '111111' : '000000';
  const res = await request(app).post('/api/auth/verify-email').send({ email: 'jane@example.com', code: wrong });
  expect(res.status).toBe(400);
  const row = await pool.query('SELECT status FROM users WHERE email = $1', ['jane@example.com']);
  expect(row.rows[0].status).toBe('unverified');
});

test('verifying an already-pending account → 400', async () => {
  await request(app).post('/api/auth/register').send(reg());
  const code = lastCode();
  await request(app).post('/api/auth/verify-email').send({ email: 'jane@example.com', code });
  const res = await request(app).post('/api/auth/verify-email').send({ email: 'jane@example.com', code });
  expect(res.status).toBe(400);
});

test('resend-otp within cooldown → 429', async () => {
  await request(app).post('/api/auth/register').send(reg());
  const res = await request(app).post('/api/auth/resend-otp').send({ email: 'jane@example.com', purpose: 'email_verify' });
  expect(res.status).toBe(429);
});

test('resend-otp for unknown email → 200 generic (no enumeration)', async () => {
  const res = await request(app).post('/api/auth/resend-otp').send({ email: 'nobody@example.com', purpose: 'email_verify' });
  expect(res.status).toBe(200);
});
