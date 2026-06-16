const request = require('supertest');
const app = require('../app');
const pool = require('../db/pool');
const { truncateAll, insertUser, insertDoctorWithKeys, makeToken } = require('./helpers');

beforeEach(() => truncateAll(pool));
afterAll(() => pool.end());

const tomorrow = () => new Date(Date.now() + 24 * 3600 * 1000).toISOString();

function rxBody(overrides = {}) {
  return {
    patient_name: 'Test Patient',
    patient_ic: '900101-01-0001',
    valid_until: tomorrow(),
    medicines: [{ medication: 'Aspirin', dosage: '1 tablet', duration_days: 3 }],
    ...overrides,
  };
}

test('pharmacist cannot create a prescription → 403', async () => {
  const ph = await insertUser(pool, {
    email: 'ph@test.com', role: 'pharmacist', status: 'approved',
    pharmacy_name: 'Rx One', affiliation: null,
  });
  const res = await request(app)
    .post('/api/prescriptions')
    .set('Authorization', `Bearer ${makeToken(ph)}`)
    .send(rxBody());
  expect(res.status).toBe(403);
});

test('doctor cannot call the verify endpoint → 403', async () => {
  const doc = await insertDoctorWithKeys(pool, { email: 'doc@test.com' });
  const res = await request(app)
    .post('/api/prescriptions/verify')
    .set('Authorization', `Bearer ${makeToken(doc)}`)
    .send({ id: 'fake-id', hash: 'fake-hash' });
  expect(res.status).toBe(403);
});

test('unauthenticated GET /api/prescriptions → 401', async () => {
  const res = await request(app).get('/api/prescriptions');
  expect(res.status).toBe(401);
});

test('doctor A cannot view doctor B prescription → 404', async () => {
  const docA = await insertDoctorWithKeys(pool, { email: 'doca@test.com' });
  const docB = await insertDoctorWithKeys(pool, { email: 'docb@test.com' });
  const created = await request(app)
    .post('/api/prescriptions')
    .set('Authorization', `Bearer ${makeToken(docB)}`)
    .send(rxBody());
  expect(created.status).toBe(201);
  const rxId = created.body.prescription.id;
  const res = await request(app)
    .get(`/api/prescriptions/${rxId}`)
    .set('Authorization', `Bearer ${makeToken(docA)}`);
  expect(res.status).toBe(404);
});

test('GET /api/prescriptions with no prescriptions → 200 []', async () => {
  const doc = await insertDoctorWithKeys(pool, { email: 'doc@test.com' });
  const res = await request(app)
    .get('/api/prescriptions')
    .set('Authorization', `Bearer ${makeToken(doc)}`);
  expect(res.status).toBe(200);
  expect(res.body.prescriptions).toEqual([]);
});

test('GET /api/prescriptions/:nonexistentId → 404', async () => {
  const doc = await insertDoctorWithKeys(pool, { email: 'doc@test.com' });
  const res = await request(app)
    .get('/api/prescriptions/00000000-0000-0000-0000-000000000000')
    .set('Authorization', `Bearer ${makeToken(doc)}`);
  expect(res.status).toBe(404);
});

test('create prescription with missing patient_name → 400', async () => {
  const doc = await insertDoctorWithKeys(pool, { email: 'doc@test.com' });
  const body = rxBody();
  delete body.patient_name;
  const res = await request(app)
    .post('/api/prescriptions')
    .set('Authorization', `Bearer ${makeToken(doc)}`)
    .send(body);
  expect(res.status).toBe(400);
});
