const { v4: uuidv4 } = require('uuid');
const { createHash, generateKeyPairSync, createSign } = require('crypto');
const pool = require('../db/pool');

function buildPayload(fields) {
  return JSON.stringify({
    patient_name: fields.patient_name,
    patient_ic: fields.patient_ic,
    medication: fields.medication,
    dosage: fields.dosage,
    instructions: fields.instructions,
    valid_until: fields.valid_until,
    doctor_id: fields.doctor_id,
  });
}

async function createPrescription(req, res) {
  const { patient_name, patient_ic, medication, dosage, valid_until } = req.body;
  const instructions = req.body.instructions || '';
  const doctor_id = req.user.id;

  if (!patient_name || !patient_ic || !medication || !dosage || !valid_until) {
    return res.status(400).json({ error: 'All prescription fields are required' });
  }

  const validUntilDate = new Date(valid_until);
  if (isNaN(validUntilDate.getTime()) || validUntilDate <= new Date()) {
    return res.status(400).json({ error: 'valid_until must be a future date' });
  }

  try {
    const id = uuidv4();

    const payload = buildPayload({ patient_name, patient_ic, medication, dosage, instructions, valid_until, doctor_id });
    const hash = createHash('sha256').update(payload).digest('hex');

    const { privateKey, publicKey } = generateKeyPairSync('rsa', {
      modulusLength: 2048,
      publicKeyEncoding: { type: 'spki', format: 'pem' },
      privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
    });

    const signer = createSign('SHA256');
    signer.update(payload);
    const signature = signer.sign(privateKey, 'base64');

    await pool.query(
      `INSERT INTO prescriptions
         (id, doctor_id, patient_name, patient_ic, medication, dosage, instructions, valid_until, hash, signature)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
      [id, doctor_id, patient_name, patient_ic, medication, dosage, instructions, validUntilDate, hash, signature]
    );

    await pool.query(
      'UPDATE users SET public_key = $1 WHERE id = $2',
      [publicKey, doctor_id]
    );

    const row = await pool.query(
      `SELECT p.*, u.name AS doctor_name
       FROM prescriptions p JOIN users u ON u.id = p.doctor_id
       WHERE p.id = $1`,
      [id]
    );

    res.status(201).json({ prescription: row.rows[0], qr_payload: JSON.stringify({ id, hash }) });
  } catch (err) {
    console.error('Create prescription error:', err);
    res.status(500).json({ error: 'Failed to create prescription' });
  }
}

async function listPrescriptions(req, res) {
  const doctor_id = req.user.id;
  try {
    const result = await pool.query(
      `SELECT p.*, u.name AS doctor_name
       FROM prescriptions p JOIN users u ON u.id = p.doctor_id
       WHERE p.doctor_id = $1
       ORDER BY p.created_at DESC`,
      [doctor_id]
    );
    res.json({ prescriptions: result.rows });
  } catch (err) {
    console.error('List prescriptions error:', err);
    res.status(500).json({ error: 'Failed to fetch prescriptions' });
  }
}

async function getPrescription(req, res) {
  const { id } = req.params;
  const doctor_id = req.user.id;
  try {
    const result = await pool.query(
      `SELECT p.*, u.name AS doctor_name
       FROM prescriptions p JOIN users u ON u.id = p.doctor_id
       WHERE p.id = $1 AND p.doctor_id = $2`,
      [id, doctor_id]
    );
    if (!result.rows[0]) return res.status(404).json({ error: 'Prescription not found' });
    res.json({ prescription: result.rows[0] });
  } catch (err) {
    console.error('Get prescription error:', err);
    res.status(500).json({ error: 'Failed to fetch prescription' });
  }
}

async function verifyPrescription(req, res) {
  const { id, hash } = req.body;

  if (!id || !hash) {
    return res.status(400).json({ error: 'id and hash are required' });
  }

  try {
    const result = await pool.query(
      `SELECT p.*, u.name AS doctor_name
       FROM prescriptions p JOIN users u ON u.id = p.doctor_id
       WHERE p.id = $1`,
      [id]
    );

    if (!result.rows[0]) {
      return res.status(404).json({ valid: false, reason: 'Prescription not found in database' });
    }

    const rx = result.rows[0];

    if (rx.status === 'dispensed') {
      return res.status(200).json({ valid: false, reason: 'Prescription has already been dispensed', prescription: rx });
    }

    if (rx.status === 'expired' || new Date(rx.valid_until) < new Date()) {
      if (rx.status !== 'expired') {
        await pool.query("UPDATE prescriptions SET status = 'expired' WHERE id = $1", [rx.id]);
        rx.status = 'expired';
      }
      return res.status(200).json({ valid: false, reason: 'Prescription has expired', prescription: rx });
    }

    if (rx.hash !== hash) {
      return res.status(200).json({ valid: false, reason: 'Prescription data has been tampered with' });
    }

    res.json({ valid: true, prescription: rx });
  } catch (err) {
    console.error('Verify error:', err);
    res.status(500).json({ error: 'Verification failed' });
  }
}

async function dispensePrescription(req, res) {
  const { id } = req.params;
  const pharmacist_id = req.user.id;

  try {
    const rxResult = await pool.query(
      "SELECT * FROM prescriptions WHERE id = $1",
      [id]
    );
    const rx = rxResult.rows[0];

    if (!rx) return res.status(404).json({ error: 'Prescription not found' });
    if (rx.status === 'dispensed') return res.status(409).json({ error: 'Already dispensed' });
    if (rx.status === 'expired' || new Date(rx.valid_until) < new Date()) {
      return res.status(409).json({ error: 'Prescription is expired' });
    }

    const pharmResult = await pool.query(
      'SELECT pharmacy_name FROM users WHERE id = $1',
      [pharmacist_id]
    );
    const pharmacy_name = pharmResult.rows[0]?.pharmacy_name || 'Unknown Pharmacy';

    await pool.query("UPDATE prescriptions SET status = 'dispensed' WHERE id = $1", [id]);

    await pool.query(
      `INSERT INTO audit_logs (prescription_id, pharmacist_id, pharmacy_name, action)
       VALUES ($1, $2, $3, $4)`,
      [id, pharmacist_id, pharmacy_name, 'dispensed']
    );

    res.json({ success: true, message: 'Prescription dispensed and audit log recorded' });
  } catch (err) {
    console.error('Dispense error:', err);
    res.status(500).json({ error: 'Failed to dispense prescription' });
  }
}

module.exports = {
  createPrescription,
  listPrescriptions,
  getPrescription,
  verifyPrescription,
  dispensePrescription,
};
