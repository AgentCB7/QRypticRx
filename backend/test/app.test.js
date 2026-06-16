const request = require('supertest');
const app = require('../app');
const pool = require('../db/pool');
const { truncateAll, insertUser, makeToken } = require('./helpers');

beforeEach(() => truncateAll(pool));
afterAll(() => pool.end());

test('GET /health → 200 with expected body', async () => {
  const res = await request(app).get('/health');
  expect(res.status).toBe(200);
  expect(res.body).toEqual({ status: 'ok', service: 'QRypticRx API' });
});

test('unknown route → 404 with error message', async () => {
  const res = await request(app).get('/api/does-not-exist');
  expect(res.status).toBe(404);
  expect(res.body.error).toBe('Not found');
});

test('doctor token on admin route → 403', async () => {
  const doc = await insertUser(pool, { email: 'doc@example.com', role: 'doctor', status: 'approved' });
  const res = await request(app)
    .get('/api/admin/applications')
    .set('Authorization', `Bearer ${makeToken(doc)}`);
  expect(res.status).toBe(403);
});
