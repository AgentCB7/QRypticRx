const request = require('supertest');
const app = require('../app');
const pool = require('../db/pool');
const { truncateAll, insertDoctorWithKeys, makeToken } = require('./helpers');

let doctor, token;

beforeEach(async () => {
  await truncateAll(pool);
  doctor = await insertDoctorWithKeys(pool, { email: 'doc@example.com' });
  token = makeToken(doctor);
});
afterAll(() => pool.end());

function rxBody(overrides = {}) {
  return {
    patient_name: 'Jane Doe',
    patient_ic: '900101-01-1234',
    medication: 'Amoxicillin',
    dosage: '500mg 3x daily',
    valid_until: new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString(),
    ...overrides,
  };
}

test('doctor creates a prescription and gets a signed row + qr payload', async () => {
  const res = await request(app)
    .post('/api/prescriptions')
    .set('Authorization', `Bearer ${token}`)
    .send(rxBody());
  expect(res.status).toBe(201);
  expect(res.body.prescription.signature).toBeTruthy();
  const qr = JSON.parse(res.body.qr_payload);
  expect(qr.id).toBe(res.body.prescription.id);
  expect(qr.hash).toBe(res.body.prescription.hash);
});

test('create fails cleanly if the doctor has no signing key', async () => {
  const { insertUser } = require('./helpers');
  const keyless = await insertUser(pool, { email: 'nokey@example.com', role: 'doctor', status: 'approved' });
  const res = await request(app)
    .post('/api/prescriptions')
    .set('Authorization', `Bearer ${makeToken(keyless)}`)
    .send(rxBody());
  expect(res.status).toBe(409);
});

async function createRx(overrides = {}) {
  const res = await request(app)
    .post('/api/prescriptions')
    .set('Authorization', `Bearer ${token}`)
    .send(rxBody(overrides));
  return res.body;
}

async function pharmacistToken() {
  const { insertUser } = require('./helpers');
  const ph = await insertUser(pool, { email: `ph_${Math.random().toString(36).slice(2)}@example.com`, role: 'pharmacist', status: 'approved', pharmacy_name: 'Rx One', affiliation: null });
  return makeToken(ph);
}

test('verify returns valid for an untampered prescription', async () => {
  const created = await createRx();
  const ptoken = await pharmacistToken();
  const res = await request(app)
    .post('/api/prescriptions/verify')
    .set('Authorization', `Bearer ${ptoken}`)
    .send({ id: created.prescription.id, hash: created.prescription.hash });
  expect(res.status).toBe(200);
  expect(res.body.valid).toBe(true);
});

test('verify masks patient_ic and omits signature/hash', async () => {
  const created = await createRx();
  const ptoken = await pharmacistToken();
  const res = await request(app)
    .post('/api/prescriptions/verify')
    .set('Authorization', `Bearer ${ptoken}`)
    .send({ id: created.prescription.id, hash: created.prescription.hash });
  const ic = '900101-01-1234';
  expect(res.body.prescription.patient_ic).toBe('*'.repeat(ic.length - 4) + ic.slice(-4));
  expect(res.body.prescription.patient_ic).not.toContain('900101');
  expect(res.body.prescription.signature).toBeUndefined();
  expect(res.body.prescription.hash).toBeUndefined();
});

test('verify flags DB-tampered data', async () => {
  const created = await createRx();
  await pool.query('UPDATE prescriptions SET medication = $1 WHERE id = $2', ['Tampered', created.prescription.id]);
  const ptoken = await pharmacistToken();
  const res = await request(app)
    .post('/api/prescriptions/verify')
    .set('Authorization', `Bearer ${ptoken}`)
    .send({ id: created.prescription.id, hash: created.prescription.hash });
  expect(res.body.valid).toBe(false);
  expect(res.body.reason).toMatch(/tampered/i);
});

test('verify flags a broken signature', async () => {
  const created = await createRx();
  const bad = Buffer.from('not-a-real-signature').toString('base64');
  await pool.query('UPDATE prescriptions SET signature = $1, hash = $2 WHERE id = $3',
    [bad, created.prescription.hash, created.prescription.id]);
  const ptoken = await pharmacistToken();
  const res = await request(app)
    .post('/api/prescriptions/verify')
    .set('Authorization', `Bearer ${ptoken}`)
    .send({ id: created.prescription.id, hash: created.prescription.hash });
  expect(res.body.valid).toBe(false);
  expect(res.body.reason).toMatch(/signature/i);
});

test('dispense marks dispensed and writes an audit log', async () => {
  const created = await createRx();
  const ptoken = await pharmacistToken();
  const res = await request(app)
    .post(`/api/prescriptions/${created.prescription.id}/dispense`)
    .set('Authorization', `Bearer ${ptoken}`);
  expect(res.status).toBe(200);
  const audit = await pool.query("SELECT action FROM audit_logs WHERE prescription_id = $1 AND action = 'dispensed'", [created.prescription.id]);
  expect(audit.rows).toHaveLength(1);
});

test('concurrent dispense yields exactly one success and one 409', async () => {
  const created = await createRx();
  const ptoken = await pharmacistToken();
  const url = `/api/prescriptions/${created.prescription.id}/dispense`;
  const [a, b] = await Promise.all([
    request(app).post(url).set('Authorization', `Bearer ${ptoken}`),
    request(app).post(url).set('Authorization', `Bearer ${ptoken}`),
  ]);
  const codes = [a.status, b.status].sort();
  expect(codes).toEqual([200, 409]);
  const audit = await pool.query("SELECT id FROM audit_logs WHERE prescription_id = $1 AND action = 'dispensed'", [created.prescription.id]);
  expect(audit.rows).toHaveLength(1);
});

test('rejects valid_until more than 365 days out', async () => {
  const farFuture = new Date(Date.now() + 400 * 24 * 3600 * 1000).toISOString();
  const res = await request(app)
    .post('/api/prescriptions')
    .set('Authorization', `Bearer ${token}`)
    .send(rxBody({ valid_until: farFuture }));
  expect(res.status).toBe(400);
  expect(res.body.error).toMatch(/365 days/);
});
