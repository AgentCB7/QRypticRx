const crypto = require('crypto');
const pool = require('../db/pool');

const CODE_TTL_MS = 10 * 60 * 1000;
const MAX_ATTEMPTS = 5;
const RESEND_COOLDOWN_MS = 60 * 1000;

function generateCode() {
  return String(crypto.randomInt(0, 1000000)).padStart(6, '0');
}

function hashCode(code) {
  return crypto.createHash('sha256').update(String(code)).digest('hex');
}

async function issueOtp(userId, purpose) {
  const recent = await pool.query(
    'SELECT created_at FROM otp_codes WHERE user_id = $1 AND purpose = $2 AND consumed_at IS NULL ORDER BY created_at DESC LIMIT 1',
    [userId, purpose]
  );
  if (recent.rows[0]) {
    const age = Date.now() - new Date(recent.rows[0].created_at).getTime();
    if (age < RESEND_COOLDOWN_MS) {
      return { ok: false, reason: 'cooldown', retryAfter: Math.ceil((RESEND_COOLDOWN_MS - age) / 1000) };
    }
  }
  await pool.query(
    'DELETE FROM otp_codes WHERE user_id = $1 AND purpose = $2 AND consumed_at IS NULL',
    [userId, purpose]
  );
  const code = generateCode();
  const expiresAt = new Date(Date.now() + CODE_TTL_MS);
  await pool.query(
    'INSERT INTO otp_codes (user_id, purpose, code_hash, expires_at) VALUES ($1, $2, $3, $4)',
    [userId, purpose, hashCode(code), expiresAt]
  );
  return { ok: true, code };
}

async function verifyOtp(userId, purpose, code) {
  const result = await pool.query(
    'SELECT id, code_hash, expires_at, attempts FROM otp_codes WHERE user_id = $1 AND purpose = $2 AND consumed_at IS NULL ORDER BY created_at DESC LIMIT 1',
    [userId, purpose]
  );
  const row = result.rows[0];
  if (!row) return { ok: false, reason: 'no_code' };
  if (new Date(row.expires_at).getTime() < Date.now()) {
    await pool.query('DELETE FROM otp_codes WHERE id = $1', [row.id]);
    return { ok: false, reason: 'expired' };
  }
  if (row.attempts >= MAX_ATTEMPTS) {
    await pool.query('DELETE FROM otp_codes WHERE id = $1', [row.id]);
    return { ok: false, reason: 'too_many_attempts' };
  }
  if (row.code_hash !== hashCode(code)) {
    await pool.query('UPDATE otp_codes SET attempts = attempts + 1 WHERE id = $1', [row.id]);
    return { ok: false, reason: 'invalid' };
  }
  await pool.query('UPDATE otp_codes SET consumed_at = NOW() WHERE id = $1', [row.id]);
  return { ok: true };
}

module.exports = { generateCode, hashCode, issueOtp, verifyOtp, CODE_TTL_MS, MAX_ATTEMPTS, RESEND_COOLDOWN_MS };
