const request = require('supertest');
const app = require('../app');
const pool = require('../db/pool');
const { truncateAll, insertUser } = require('./helpers');

beforeEach(() => truncateAll(pool));
afterAll(() => pool.end());

test('approved user + correct password → 200 otpRequired, no token', async () => {
  const u = await insertUser(pool, { email: 'ok@example.com', status: 'approved' });
  const res = await request(app).post('/api/auth/login').send({ email: u.email, password: u.plainPassword });
  expect(res.status).toBe(200);
  expect(res.body.otpRequired).toBe(true);
  expect(res.body.token).toBeUndefined();
});

test('pending user + correct password → 403 status:pending', async () => {
  const u = await insertUser(pool, { email: 'pend@example.com', status: 'pending' });
  const res = await request(app).post('/api/auth/login').send({ email: u.email, password: u.plainPassword });
  expect(res.status).toBe(403);
  expect(res.body.status).toBe('pending');
  expect(res.body.token).toBeUndefined();
});

test('rejected user + correct password → 403 status:rejected with reason', async () => {
  const u = await insertUser(pool, { email: 'rej@example.com', status: 'rejected' });
  await pool.query("UPDATE users SET rejection_reason = $1 WHERE id = $2", ['Invalid license', u.id]);
  const res = await request(app).post('/api/auth/login').send({ email: u.email, password: u.plainPassword });
  expect(res.status).toBe(403);
  expect(res.body.status).toBe('rejected');
  expect(res.body.reason).toBe('Invalid license');
});

test('wrong password → 401 with no status field (enumeration protection)', async () => {
  const u = await insertUser(pool, { email: 'pend2@example.com', status: 'pending' });
  const res = await request(app).post('/api/auth/login').send({ email: u.email, password: 'wrongpass' });
  expect(res.status).toBe(401);
  expect(res.body.status).toBeUndefined();
});
