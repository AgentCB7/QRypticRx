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
    patient_phone: '+8801712345678',
    valid_until: new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString(),
    medicines: [
      { medication: 'Amoxicillin', dosage: '1+0+1 tablet', duration_days: 7, notes: 'after food' },
      { medication: 'Paracetamol', dosage: '0+0+1 tablet', duration_days: 3, notes: '' },
    ],
    ...overrides,
  };
}

test('doctor creates a prescription with items and gets a signed row + qr payload', async () => {
  const res = await request(app)
    .post('/api/prescriptions')
    .set('Authorization', `Bearer ${token}`)
    .send(rxBody());
  expect(res.status).toBe(201);
  expect(res.body.prescription.signature).toBeTruthy();
  expect(res.body.items).toHaveLength(2);
  expect(res.body.items[0].position).toBe(0);
  expect(res.body.items[1].position).toBe(1);
  const qr = JSON.parse(res.body.qr_payload);
  expect(qr.id).toBe(res.body.prescription.id);
  expect(qr.hash).toBe(res.body.prescription.hash);
});

test('create rejects an empty medicines array', async () => {
  const res = await request(app)
    .post('/api/prescriptions')
    .set('Authorization', `Bearer ${token}`)
    .send(rxBody({ medicines: [] }));
  expect(res.status).toBe(400);
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

test('get returns the prescription with its items ordered by position', async () => {
  const created = await createRx();
  const res = await request(app)
    .get(`/api/prescriptions/${created.prescription.id}`)
    .set('Authorization', `Bearer ${token}`);
  expect(res.status).toBe(200);
  expect(res.body.prescription.items).toHaveLength(2);
  expect(res.body.prescription.items.map(i => i.medication)).toEqual(['Amoxicillin', 'Paracetamol']);
});

test('list returns each prescription with an items array', async () => {
  await createRx();
  const res = await request(app)
    .get('/api/prescriptions')
    .set('Authorization', `Bearer ${token}`);
  expect(res.status).toBe(200);
  expect(res.body.prescriptions[0].items).toHaveLength(2);
});

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

test('verify masks patient_phone, returns medicines, and omits signature/hash', async () => {
  const created = await createRx();
  const ptoken = await pharmacistToken();
  const res = await request(app)
    .post('/api/prescriptions/verify')
    .set('Authorization', `Bearer ${ptoken}`)
    .send({ id: created.prescription.id, hash: created.prescription.hash });
  const phone = '+8801712345678';
  expect(res.body.prescription.patient_phone).toBe('*'.repeat(phone.length - 4) + phone.slice(-4));
  expect(res.body.prescription.patient_phone).not.toContain('+88017');
  expect(res.body.prescription.medicines).toHaveLength(2);
  expect(res.body.prescription.medicines[0].medication).toBe('Amoxicillin');
  expect(res.body.prescription.signature).toBeUndefined();
  expect(res.body.prescription.hash).toBeUndefined();
});

test('verify flags a tampered medicine item', async () => {
  const created = await createRx();
  await pool.query(
    "UPDATE prescription_items SET medication = $1 WHERE prescription_id = $2 AND position = 0",
    ['Tampered', created.prescription.id]
  );
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

test('dispensing one item marks it dispensed and logs an audit row with item_id', async () => {
  const created = await createRx();
  const itemId = created.items[0].id;
  const ptoken = await pharmacistToken();
  const res = await request(app)
    .post(`/api/prescriptions/${created.prescription.id}/items/${itemId}/dispense`)
    .set('Authorization', `Bearer ${ptoken}`);
  expect(res.status).toBe(200);
  expect(res.body.prescription_status).toBe('active');
  const audit = await pool.query(
    "SELECT item_id FROM audit_logs WHERE prescription_id = $1 AND action = 'dispensed'",
    [created.prescription.id]
  );
  expect(audit.rows).toHaveLength(1);
  expect(audit.rows[0].item_id).toBe(itemId);
});

test('dispensing the last item flips the prescription to dispensed', async () => {
  const created = await createRx();
  const ptoken = await pharmacistToken();
  for (const it of created.items) {
    await request(app)
      .post(`/api/prescriptions/${created.prescription.id}/items/${it.id}/dispense`)
      .set('Authorization', `Bearer ${ptoken}`);
  }
  const presc = await pool.query('SELECT status FROM prescriptions WHERE id = $1', [created.prescription.id]);
  expect(presc.rows[0].status).toBe('dispensed');
});

test('concurrent dispense of the same item yields one success and one 409', async () => {
  const created = await createRx();
  const itemId = created.items[0].id;
  const ptoken = await pharmacistToken();
  const url = `/api/prescriptions/${created.prescription.id}/items/${itemId}/dispense`;
  const [a, b] = await Promise.all([
    request(app).post(url).set('Authorization', `Bearer ${ptoken}`),
    request(app).post(url).set('Authorization', `Bearer ${ptoken}`),
  ]);
  const codes = [a.status, b.status].sort();
  expect(codes).toEqual([200, 409]);
  const audit = await pool.query(
    "SELECT id FROM audit_logs WHERE prescription_id = $1 AND item_id = $2 AND action = 'dispensed'",
    [created.prescription.id, itemId]
  );
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
