process.env.AUTH_RATE_LIMIT_MAX = '3';
const request = require('supertest');
const app = require('../app');
const pool = require('../db/pool');

afterAll(() => pool.end());

test('auth endpoints return 429 after exceeding the limit', async () => {
  let last;
  for (let i = 0; i < 5; i++) {
    last = await request(app).post('/api/auth/login').send({ email: 'x@example.com', password: 'nope' });
  }
  expect(last.status).toBe(429);
});
