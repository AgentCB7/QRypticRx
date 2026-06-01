const request = require('supertest');
const app = require('../app');
const pool = require('../db/pool');
const { truncateAll, insertUser } = require('./helpers');
const { outbox } = require('../lib/mailer');

beforeEach(async () => { await truncateAll(pool); outbox.length = 0; });
afterAll(() => pool.end());

function lastCode() {
  return outbox[outbox.length - 1].text.match(/(\d{6})/)[1];
}

test('approved login sends a code and returns otpRequired without a token', async () => {
  const u = await insertUser(pool, { email: 'ok@example.com', status: 'approved' });
  const res = await request(app).post('/api/auth/login').send({ email: u.email, password: u.plainPassword });
  expect(res.status).toBe(200);
  expect(res.body.otpRequired).toBe(true);
  expect(res.body.token).toBeUndefined();
  expect(outbox).toHaveLength(1);
});

test('login/verify with the correct code returns a JWT and user', async () => {
  const u = await insertUser(pool, { email: 'ok2@example.com', status: 'approved' });
  await request(app).post('/api/auth/login').send({ email: u.email, password: u.plainPassword });
  const code = lastCode();
  const res = await request(app).post('/api/auth/login/verify').send({ email: u.email, code });
  expect(res.status).toBe(200);
  expect(res.body.token).toBeDefined();
  expect(res.body.user.email).toBe(u.email);
});

test('login/verify with a wrong code → 401 and no token', async () => {
  const u = await insertUser(pool, { email: 'ok3@example.com', status: 'approved' });
  await request(app).post('/api/auth/login').send({ email: u.email, password: u.plainPassword });
  const code = lastCode();
  const wrong = code === '000000' ? '111111' : '000000';
  const res = await request(app).post('/api/auth/login/verify').send({ email: u.email, code: wrong });
  expect(res.status).toBe(401);
  expect(res.body.token).toBeUndefined();
});

test('login/verify cannot be reused (code consumed)', async () => {
  const u = await insertUser(pool, { email: 'ok4@example.com', status: 'approved' });
  await request(app).post('/api/auth/login').send({ email: u.email, password: u.plainPassword });
  const code = lastCode();
  await request(app).post('/api/auth/login/verify').send({ email: u.email, code });
  const res = await request(app).post('/api/auth/login/verify').send({ email: u.email, code });
  expect(res.status).toBe(401);
});

test('unverified user login → 403 status:unverified', async () => {
  const u = await insertUser(pool, { email: 'unv@example.com', status: 'unverified' });
  const res = await request(app).post('/api/auth/login').send({ email: u.email, password: u.plainPassword });
  expect(res.status).toBe(403);
  expect(res.body.status).toBe('unverified');
});
