const pool = require('../db/pool');
const { truncateAll, insertUser } = require('./helpers');
const { issueOtp, verifyOtp, hashCode, generateCode } = require('../lib/otp');

beforeEach(() => truncateAll(pool));
afterAll(() => pool.end());

function wrongOf(code) {
  return code === '000000' ? '111111' : '000000';
}

test('generateCode returns a 6-digit string', () => {
  expect(generateCode()).toMatch(/^\d{6}$/);
});

test('issueOtp stores a hashed code; verifyOtp accepts it exactly once', async () => {
  const u = await insertUser(pool, { status: 'unverified' });
  const issued = await issueOtp(u.id, 'email_verify');
  expect(issued.ok).toBe(true);

  const row = await pool.query('SELECT code_hash FROM otp_codes WHERE user_id = $1', [u.id]);
  expect(row.rows[0].code_hash).toBe(hashCode(issued.code));
  expect(row.rows[0].code_hash).not.toBe(issued.code);

  const first = await verifyOtp(u.id, 'email_verify', issued.code);
  expect(first.ok).toBe(true);
  const second = await verifyOtp(u.id, 'email_verify', issued.code);
  expect(second.ok).toBe(false);
});

test('verifyOtp rejects a wrong code and increments attempts', async () => {
  const u = await insertUser(pool, { status: 'unverified' });
  const issued = await issueOtp(u.id, 'email_verify');
  const res = await verifyOtp(u.id, 'email_verify', wrongOf(issued.code));
  expect(res.ok).toBe(false);
  expect(res.reason).toBe('invalid');
  const row = await pool.query('SELECT attempts FROM otp_codes WHERE user_id = $1', [u.id]);
  expect(row.rows[0].attempts).toBe(1);
});

test('verifyOtp blocks after 5 failed attempts', async () => {
  const u = await insertUser(pool, { status: 'unverified' });
  const issued = await issueOtp(u.id, 'email_verify');
  const wrong = wrongOf(issued.code);
  for (let i = 0; i < 5; i++) await verifyOtp(u.id, 'email_verify', wrong);
  const res = await verifyOtp(u.id, 'email_verify', issued.code);
  expect(res.ok).toBe(false);
  expect(res.reason).toBe('too_many_attempts');
});

test('verifyOtp rejects an expired code', async () => {
  const u = await insertUser(pool, { status: 'unverified' });
  const issued = await issueOtp(u.id, 'email_verify');
  await pool.query("UPDATE otp_codes SET expires_at = NOW() - INTERVAL '1 minute' WHERE user_id = $1", [u.id]);
  const res = await verifyOtp(u.id, 'email_verify', issued.code);
  expect(res.ok).toBe(false);
  expect(res.reason).toBe('expired');
});

test('issueOtp enforces a resend cooldown', async () => {
  const u = await insertUser(pool, { status: 'unverified' });
  await issueOtp(u.id, 'login');
  const second = await issueOtp(u.id, 'login');
  expect(second.ok).toBe(false);
  expect(second.reason).toBe('cooldown');
});
