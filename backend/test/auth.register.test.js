const request = require('supertest');
const app = require('../app');
const pool = require('../db/pool');
const { truncateAll } = require('./helpers');

beforeEach(() => truncateAll(pool));
afterAll(() => pool.end());

function base(overrides = {}) {
  return {
    name: 'Dr. Jane', email: 'jane@example.com', password: 'password123',
    role: 'doctor', license_number: 'LIC-1', affiliation: 'City Clinic',
    ...overrides,
  };
}

test('doctor registration: 202, pending, no token, no keypair', async () => {
  const res = await request(app).post('/api/auth/register').send(base());
  expect(res.status).toBe(202);
  expect(res.body.token).toBeUndefined();
  expect(res.body.message).toMatch(/admin/i);

  const row = await pool.query('SELECT status, public_key FROM users WHERE email = $1', ['jane@example.com']);
  expect(row.rows[0].status).toBe('pending');
  expect(row.rows[0].public_key).toBeNull();
});

test('pharmacist registration: 202, pending, no token', async () => {
  const res = await request(app).post('/api/auth/register').send(base({
    role: 'pharmacist', email: 'phil@example.com', pharmacy_name: 'City Pharmacy', affiliation: undefined,
  }));
  expect(res.status).toBe(202);
  expect(res.body.token).toBeUndefined();
  const row = await pool.query('SELECT status FROM users WHERE email = $1', ['phil@example.com']);
  expect(row.rows[0].status).toBe('pending');
});

test('role=admin in body is rejected with 400', async () => {
  const res = await request(app).post('/api/auth/register').send(base({ role: 'admin' }));
  expect(res.status).toBe(400);
});

test('missing license_number → 400', async () => {
  const res = await request(app).post('/api/auth/register').send(base({ license_number: undefined }));
  expect(res.status).toBe(400);
});

test('doctor missing affiliation → 400', async () => {
  const res = await request(app).post('/api/auth/register').send(base({ affiliation: undefined }));
  expect(res.status).toBe(400);
});

test('pharmacist missing pharmacy_name → 400', async () => {
  const res = await request(app).post('/api/auth/register').send(base({
    role: 'pharmacist', email: 'p2@example.com', affiliation: undefined,
  }));
  expect(res.status).toBe(400);
});

test('duplicate email → 409', async () => {
  await request(app).post('/api/auth/register').send(base());
  const res = await request(app).post('/api/auth/register').send(base());
  expect(res.status).toBe(409);
});
