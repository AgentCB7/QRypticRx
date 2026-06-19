const request = require('supertest');
const app = require('../app');
const pool = require('../db/pool');
const { truncateAll, insertUser, insertDoctorWithKeys, makeToken } = require('./helpers');

beforeEach(() => truncateAll(pool));
afterAll(() => pool.end());

test('register: password shorter than 8 chars → 400', async () => {
  const res = await request(app)
    .post('/api/auth/register')
    .send({
      name: 'Dr Short',
      email: 'short@test.com',
      password: 'abc',
      role: 'doctor',
      license_number: 'LIC-99',
      affiliation: 'Test Clinic',
    });
  expect(res.status).toBe(400);
  expect(res.body.error).toMatch(/8 characters/i);
});

test('login: non-existent email returns 401 (same as wrong password — no enumeration)', async () => {
  const res = await request(app)
    .post('/api/auth/login')
    .send({ email: 'nobody@test.com', password: 'somepassword' });
  expect(res.status).toBe(401);
  expect(res.body.error).toBe('Invalid email or password');
});

test('admin: filter applications by status=approved returns only approved users', async () => {
  const admin = await insertUser(pool, { email: 'admin@test.com', role: 'admin', status: 'approved' });
  await insertUser(pool, { email: 'pending@test.com', role: 'doctor', status: 'pending' });
  await insertUser(pool, { email: 'approved@test.com', role: 'doctor', status: 'approved' });
  const res = await request(app)
    .get('/api/admin/applications?status=approved')
    .set('Authorization', `Bearer ${makeToken(admin)}`);
  expect(res.status).toBe(200);
  expect(res.body.applications.every(a => a.status === 'approved')).toBe(true);
  expect(res.body.applications.some(a => a.email === 'approved@test.com')).toBe(true);
  expect(res.body.applications.some(a => a.email === 'pending@test.com')).toBe(false);
});

test('create prescription: valid_until in the past → 400', async () => {
  const doc = await insertDoctorWithKeys(pool, { email: 'doc@test.com' });
  const yesterday = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
  const res = await request(app)
    .post('/api/prescriptions')
    .set('Authorization', `Bearer ${makeToken(doc)}`)
    .send({
      patient_name: 'Test Patient',
      patient_phone: '+8801712345678',
      valid_until: yesterday,
      medicines: [{ medication: 'Aspirin', dosage: '1 tablet', duration_days: 3 }],
    });
  expect(res.status).toBe(400);
});

test('sequential re-dispense of the same item → second call returns 409', async () => {
  const doc = await insertDoctorWithKeys(pool, { email: 'doc@test.com' });
  const ph = await insertUser(pool, {
    email: 'ph@test.com', role: 'pharmacist', status: 'approved',
    pharmacy_name: 'Rx One', affiliation: null,
  });
  const tomorrow = new Date(Date.now() + 24 * 3600 * 1000).toISOString();
  const created = await request(app)
    .post('/api/prescriptions')
    .set('Authorization', `Bearer ${makeToken(doc)}`)
    .send({
      patient_name: 'Test Patient',
      patient_phone: '+8801712345678',
      valid_until: tomorrow,
      medicines: [{ medication: 'Aspirin', dosage: '1 tablet', duration_days: 3 }],
    });
  expect(created.status).toBe(201);
  const rxId = created.body.prescription.id;
  const itemId = created.body.items[0].id;
  const pToken = makeToken(ph);
  const url = `/api/prescriptions/${rxId}/items/${itemId}/dispense`;

  const first = await request(app).post(url).set('Authorization', `Bearer ${pToken}`);
  expect(first.status).toBe(200);

  const second = await request(app).post(url).set('Authorization', `Bearer ${pToken}`);
  expect(second.status).toBe(409);
});
