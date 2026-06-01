const { generateKeyPairSync } = require('crypto');
const pool = require('../db/pool');
const { encryptPrivateKey } = require('../lib/keyVault');

const APPLICANT_FIELDS =
  'id, name, email, role, status, pharmacy_name, license_number, affiliation, applicant_note, rejection_reason, reviewed_by, reviewed_at, created_at';

async function listApplications(req, res) {
  const status = req.query.status || 'pending';
  if (!['pending', 'approved', 'rejected'].includes(status)) {
    return res.status(400).json({ error: 'Invalid status filter' });
  }
  try {
    const result = await pool.query(
      `SELECT ${APPLICANT_FIELDS} FROM users
       WHERE role IN ('doctor', 'pharmacist') AND status = $1
       ORDER BY created_at DESC`,
      [status]
    );
    res.json({ applications: result.rows });
  } catch (err) {
    console.error('List applications error:', err);
    res.status(500).json({ error: 'Failed to list applications' });
  }
}

async function getApplication(req, res) {
  const { id } = req.params;
  try {
    const result = await pool.query(
      `SELECT ${APPLICANT_FIELDS} FROM users WHERE id = $1 AND role IN ('doctor', 'pharmacist')`,
      [id]
    );
    if (!result.rows[0]) return res.status(404).json({ error: 'Application not found' });
    res.json({ application: result.rows[0] });
  } catch (err) {
    console.error('Get application error:', err);
    res.status(500).json({ error: 'Failed to fetch application' });
  }
}

async function approveApplication(req, res) {
  const { id } = req.params;
  const adminId = req.user.id;
  try {
    const found = await pool.query(
      "SELECT id, role, status FROM users WHERE id = $1 AND role IN ('doctor', 'pharmacist')",
      [id]
    );
    const applicant = found.rows[0];
    if (!applicant) return res.status(404).json({ error: 'Application not found' });
    if (applicant.status === 'approved') return res.status(409).json({ error: 'Already approved' });

    let public_key = null;
    let private_key_enc = null;
    if (applicant.role === 'doctor') {
      const { publicKey, privateKey } = generateKeyPairSync('rsa', {
        modulusLength: 2048,
        publicKeyEncoding: { type: 'spki', format: 'pem' },
        privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
      });
      public_key = publicKey;
      private_key_enc = encryptPrivateKey(privateKey);
    }

    await pool.query(
      `UPDATE users
       SET status = 'approved',
           public_key = COALESCE($1, public_key),
           private_key_enc = COALESCE($2, private_key_enc),
           reviewed_by = $3, reviewed_at = NOW(), rejection_reason = NULL
       WHERE id = $4`,
      [public_key, private_key_enc, adminId, id]
    );

    await pool.query(
      `INSERT INTO audit_logs (prescription_id, pharmacist_id, pharmacy_name, action)
       VALUES (NULL, $1, 'Administration', 'approved_user')`,
      [adminId]
    );

    res.json({ success: true, message: 'Application approved' });
  } catch (err) {
    console.error('Approve error:', err);
    res.status(500).json({ error: 'Failed to approve application' });
  }
}

async function rejectApplication(req, res) {
  const { id } = req.params;
  const adminId = req.user.id;
  const { reason } = req.body;

  if (!reason || !String(reason).trim()) {
    return res.status(400).json({ error: 'reason is required to reject an application' });
  }

  try {
    const found = await pool.query(
      "SELECT id, status FROM users WHERE id = $1 AND role IN ('doctor', 'pharmacist')",
      [id]
    );
    if (!found.rows[0]) return res.status(404).json({ error: 'Application not found' });

    await pool.query(
      `UPDATE users
       SET status = 'rejected', rejection_reason = $1, reviewed_by = $2, reviewed_at = NOW()
       WHERE id = $3`,
      [reason, adminId, id]
    );

    await pool.query(
      `INSERT INTO audit_logs (prescription_id, pharmacist_id, pharmacy_name, action)
       VALUES (NULL, $1, 'Administration', 'rejected_user')`,
      [adminId]
    );

    res.json({ success: true, message: 'Application rejected' });
  } catch (err) {
    console.error('Reject error:', err);
    res.status(500).json({ error: 'Failed to reject application' });
  }
}

module.exports = { listApplications, getApplication, approveApplication, rejectApplication };
