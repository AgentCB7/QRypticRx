const request = require('supertest');
const app = require('../app');
const pool = require('../db/pool');
const { truncateAll, insertUser, makeToken } = require('./helpers');

let admin, adminToken;

beforeEach(async () => {
  await truncateAll(pool);
  admin = await insertUser(pool, { email: 'admin@example.com', role: 'admin', status: 'approved' });
  adminToken = makeToken(admin);
});
afterAll(() => pool.end());

test('no JWT → 401', async () => {
  const res = await request(app).get('/api/admin/applications');
  expect(res.status).toBe(401);
});

test('non-admin JWT → 403', async () => {
  const doc = await insertUser(pool, { email: 'd@example.com', role: 'doctor', status: 'approved' });
  const res = await request(app).get('/api/admin/applications').set('Authorization', `Bearer ${makeToken(doc)}`);
  expect(res.status).toBe(403);
});

test('list defaults to pending only', async () => {
  await insertUser(pool, { email: 'p1@example.com', role: 'doctor', status: 'pending' });
  await insertUser(pool, { email: 'a1@example.com', role: 'doctor', status: 'approved' });
  const res = await request(app).get('/api/admin/applications').set('Authorization', `Bearer ${adminToken}`);
  expect(res.status).toBe(200);
  expect(res.body.applications).toHaveLength(1);
  expect(res.body.applications[0].email).toBe('p1@example.com');
});

test('approve doctor → approved, public_key set, reviewer recorded, audit row', async () => {
  const doc = await insertUser(pool, { email: 'pd@example.com', role: 'doctor', status: 'pending' });
  const res = await request(app)
    .post(`/api/admin/applications/${doc.id}/approve`)
    .set('Authorization', `Bearer ${adminToken}`);
  expect(res.status).toBe(200);

  const row = await pool.query('SELECT status, public_key, reviewed_by, reviewed_at FROM users WHERE id = $1', [doc.id]);
  expect(row.rows[0].status).toBe('approved');
  expect(row.rows[0].public_key).toMatch(/BEGIN PUBLIC KEY/);
  expect(row.rows[0].reviewed_by).toBe(admin.id);
  expect(row.rows[0].reviewed_at).not.toBeNull();

  const audit = await pool.query("SELECT action FROM audit_logs WHERE action = 'approved_user'");
  expect(audit.rows).toHaveLength(1);
});

test('approve doctor stores an encrypted private key that decrypts to a PEM', async () => {
  const { decryptPrivateKey } = require('../lib/keyVault');
  const doc = await insertUser(pool, { email: 'pk@example.com', role: 'doctor', status: 'pending' });
  await request(app)
    .post(`/api/admin/applications/${doc.id}/approve`)
    .set('Authorization', `Bearer ${adminToken}`);
  const row = await pool.query('SELECT private_key_enc FROM users WHERE id = $1', [doc.id]);
  expect(row.rows[0].private_key_enc).toMatch(/^[^:]+:[^:]+:[^:]+$/);
  expect(decryptPrivateKey(row.rows[0].private_key_enc)).toMatch(/BEGIN PRIVATE KEY/);
});

test('approve pharmacist → approved, public_key stays null', async () => {
  const ph = await insertUser(pool, { email: 'pp@example.com', role: 'pharmacist', status: 'pending', pharmacy_name: 'Rx', affiliation: null });
  const res = await request(app)
    .post(`/api/admin/applications/${ph.id}/approve`)
    .set('Authorization', `Bearer ${adminToken}`);
  expect(res.status).toBe(200);
  const row = await pool.query('SELECT status, public_key FROM users WHERE id = $1', [ph.id]);
  expect(row.rows[0].status).toBe('approved');
  expect(row.rows[0].public_key).toBeNull();
});

test('approve already-approved → 409', async () => {
  const doc = await insertUser(pool, { email: 'aa@example.com', role: 'doctor', status: 'approved' });
  const res = await request(app)
    .post(`/api/admin/applications/${doc.id}/approve`)
    .set('Authorization', `Bearer ${adminToken}`);
  expect(res.status).toBe(409);
});

test('reject without reason → 400', async () => {
  const doc = await insertUser(pool, { email: 'nr@example.com', role: 'doctor', status: 'pending' });
  const res = await request(app)
    .post(`/api/admin/applications/${doc.id}/reject`)
    .set('Authorization', `Bearer ${adminToken}`)
    .send({});
  expect(res.status).toBe(400);
});

test('reject with reason → rejected, reason stored, audit row', async () => {
  const doc = await insertUser(pool, { email: 'rj@example.com', role: 'doctor', status: 'pending' });
  const res = await request(app)
    .post(`/api/admin/applications/${doc.id}/reject`)
    .set('Authorization', `Bearer ${adminToken}`)
    .send({ reason: 'Could not verify license' });
  expect(res.status).toBe(200);
  const row = await pool.query('SELECT status, rejection_reason FROM users WHERE id = $1', [doc.id]);
  expect(row.rows[0].status).toBe('rejected');
  expect(row.rows[0].rejection_reason).toBe('Could not verify license');
  const audit = await pool.query("SELECT action FROM audit_logs WHERE action = 'rejected_user'");
  expect(audit.rows).toHaveLength(1);
});

test('detail returns one application with all fields', async () => {
  const doc = await insertUser(pool, { email: 'dt@example.com', role: 'doctor', status: 'pending' });
  const res = await request(app)
    .get(`/api/admin/applications/${doc.id}`)
    .set('Authorization', `Bearer ${adminToken}`);
  expect(res.status).toBe(200);
  expect(res.body.application.email).toBe('dt@example.com');
  expect(res.body.application.license_number).toBeDefined();
});
