const { v4: uuidv4 } = require('uuid');
const { createHash, createSign, createVerify } = require('crypto');
const pool = require('../db/pool');
const { buildPayload } = require('../lib/payload');
const { decryptPrivateKey } = require('../lib/keyVault');

function maskPhone(phone) {
  if (!phone) return phone;
  const s = String(phone);
  const last4 = s.slice(-4);
  return '*'.repeat(Math.max(0, s.length - 4)) + last4;
}

function publicView(rx, items) {
  return {
    id: rx.id,
    patient_name: rx.patient_name,
    patient_phone: maskPhone(rx.patient_phone),
    medicines: items.map(it => ({
      id: it.id,
      medication: it.medication,
      dosage: it.dosage,
      duration_days: it.duration_days,
      notes: it.notes,
      status: it.status,
    })),
    valid_until: rx.valid_until,
    status: rx.status,
    doctor_name: rx.doctor_name,
    created_at: rx.created_at,
  };
}

async function createPrescription(req, res) {
  const { patient_name, patient_phone, valid_until, medicines } = req.body;
  const doctor_id = req.user.id;

  if (!patient_name || !patient_phone || !valid_until) {
    return res.status(400).json({ error: 'patient_name, patient_phone and valid_until are required' });
  }
  if (!Array.isArray(medicines) || medicines.length === 0) {
    return res.status(400).json({ error: 'At least one medicine is required' });
  }
  for (const m of medicines) {
    if (!m || !m.medication || !m.dosage || !Number.isInteger(m.duration_days) || m.duration_days < 1) {
      return res.status(400).json({ error: 'Each medicine requires medication, dosage and a positive duration_days' });
    }
  }

  const validUntilDate = new Date(valid_until);
  if (isNaN(validUntilDate.getTime()) || validUntilDate <= new Date()) {
    return res.status(400).json({ error: 'valid_until must be a future date' });
  }
  const maxValid = new Date();
  maxValid.setFullYear(maxValid.getFullYear() + 1);
  if (validUntilDate > maxValid) {
    return res.status(400).json({ error: 'valid_until cannot be more than 365 days in the future' });
  }

  let client;
  try {
    const doctorRow = await pool.query('SELECT private_key_enc FROM users WHERE id = $1', [doctor_id]);
    const enc = doctorRow.rows[0]?.private_key_enc;
    if (!enc) {
      return res.status(409).json({ error: 'Doctor signing key not provisioned' });
    }
    const privateKey = decryptPrivateKey(enc);

    const normMedicines = medicines.map(m => ({
      medication: m.medication,
      dosage: m.dosage,
      duration_days: m.duration_days,
      notes: m.notes ?? '',
    }));

    const id = uuidv4();
    const payload = buildPayload({ patient_name, patient_phone, medicines: normMedicines, valid_until, doctor_id });
    const hash = createHash('sha256').update(payload).digest('hex');
    const signer = createSign('SHA256');
    signer.update(payload);
    const signature = signer.sign(privateKey, 'base64');

    client = await pool.connect();
    await client.query('BEGIN');
    await client.query(
      `INSERT INTO prescriptions
         (id, doctor_id, patient_name, patient_phone, valid_until, hash, signature)
       VALUES ($1,$2,$3,$4,$5,$6,$7)`,
      [id, doctor_id, patient_name, patient_phone, validUntilDate, hash, signature]
    );
    for (let i = 0; i < normMedicines.length; i++) {
      const m = normMedicines[i];
      await client.query(
        `INSERT INTO prescription_items
           (prescription_id, position, medication, dosage, duration_days, notes)
         VALUES ($1,$2,$3,$4,$5,$6)`,
        [id, i, m.medication, m.dosage, m.duration_days, m.notes]
      );
    }
    await client.query('COMMIT');

    const presc = await pool.query(
      `SELECT p.*, u.name AS doctor_name
       FROM prescriptions p JOIN users u ON u.id = p.doctor_id
       WHERE p.id = $1`,
      [id]
    );
    const items = await pool.query(
      `SELECT * FROM prescription_items WHERE prescription_id = $1 ORDER BY position`,
      [id]
    );

    res.status(201).json({
      prescription: presc.rows[0],
      items: items.rows,
      qr_payload: JSON.stringify({ id, hash }),
    });
  } catch (err) {
    if (client) { try { await client.query('ROLLBACK'); } catch { /* ignore */ } }
    console.error('Create prescription error:', err);
    res.status(500).json({ error: 'Failed to create prescription' });
  } finally {
    if (client) client.release();
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
    const ids = result.rows.map(r => r.id);
    const itemsByRx = {};
    if (ids.length) {
      const itemsRes = await pool.query(
        `SELECT * FROM prescription_items WHERE prescription_id = ANY($1) ORDER BY position`,
        [ids]
      );
      for (const it of itemsRes.rows) {
        (itemsByRx[it.prescription_id] ||= []).push(it);
      }
    }
    const prescriptions = result.rows.map(r => ({ ...r, items: itemsByRx[r.id] || [] }));
    res.json({ prescriptions });
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
    const items = await pool.query(
      `SELECT * FROM prescription_items WHERE prescription_id = $1 ORDER BY position`,
      [id]
    );
    res.json({ prescription: { ...result.rows[0], items: items.rows } });
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
      `SELECT p.*, u.name AS doctor_name, u.public_key
       FROM prescriptions p JOIN users u ON u.id = p.doctor_id
       WHERE p.id = $1`,
      [id]
    );

    if (!result.rows[0]) {
      return res.status(404).json({ valid: false, reason: 'Prescription not found in database' });
    }

    const rx = result.rows[0];
    const itemsRes = await pool.query(
      `SELECT * FROM prescription_items WHERE prescription_id = $1 ORDER BY position`,
      [id]
    );
    const items = itemsRes.rows;

    const allDispensed = items.length > 0 && items.every(it => it.status === 'dispensed');
    if (rx.status === 'dispensed' || allDispensed) {
      return res.status(200).json({ valid: false, reason: 'Prescription has already been dispensed', prescription: publicView(rx, items) });
    }

    if (rx.status === 'expired' || new Date(rx.valid_until) < new Date()) {
      if (rx.status !== 'expired') {
        await pool.query("UPDATE prescriptions SET status = 'expired' WHERE id = $1", [rx.id]);
        rx.status = 'expired';
      }
      return res.status(200).json({ valid: false, reason: 'Prescription has expired', prescription: publicView(rx, items) });
    }

    const payload = buildPayload({
      patient_name: rx.patient_name,
      patient_phone: rx.patient_phone,
      medicines: items.map(it => ({
        medication: it.medication,
        dosage: it.dosage,
        duration_days: it.duration_days,
        notes: it.notes ?? '',
      })),
      valid_until: rx.valid_until,
      doctor_id: rx.doctor_id,
    });
    const computedHash = createHash('sha256').update(payload).digest('hex');

    if (computedHash !== rx.hash || rx.hash !== hash) {
      return res.status(200).json({ valid: false, reason: 'Prescription data has been tampered with' });
    }

    const verifier = createVerify('SHA256');
    verifier.update(payload);
    let signatureOk = false;
    try {
      signatureOk = rx.public_key && verifier.verify(rx.public_key, rx.signature, 'base64');
    } catch {
      signatureOk = false;
    }
    if (!signatureOk) {
      return res.status(200).json({ valid: false, reason: 'Signature verification failed' });
    }

    res.json({ valid: true, prescription: publicView(rx, items) });
  } catch (err) {
    console.error('Verify error:', err);
    res.status(500).json({ error: 'Verification failed' });
  }
}

async function dispenseItem(req, res) {
  const { id, itemId } = req.params;
  const pharmacist_id = req.user.id;

  try {
    const upd = await pool.query(
      `UPDATE prescription_items
         SET status = 'dispensed', dispensed_at = NOW(), dispensed_by = $1
       WHERE id = $2 AND prescription_id = $3 AND status = 'active'
         AND EXISTS (SELECT 1 FROM prescriptions p WHERE p.id = $3 AND p.valid_until > NOW())
       RETURNING id`,
      [pharmacist_id, itemId, id]
    );

    if (upd.rowCount === 0) {
      const cur = await pool.query(
        'SELECT status FROM prescription_items WHERE id = $1 AND prescription_id = $2',
        [itemId, id]
      );
      if (!cur.rows[0]) return res.status(404).json({ error: 'Prescription item not found' });
      if (cur.rows[0].status === 'dispensed') return res.status(409).json({ error: 'Item already dispensed' });
      return res.status(409).json({ error: 'Prescription is expired' });
    }

    const pharmResult = await pool.query('SELECT pharmacy_name FROM users WHERE id = $1', [pharmacist_id]);
    const pharmacy_name = pharmResult.rows[0]?.pharmacy_name || 'Unknown Pharmacy';

    await pool.query(
      `INSERT INTO audit_logs (prescription_id, item_id, pharmacist_id, pharmacy_name, action)
       VALUES ($1, $2, $3, $4, $5)`,
      [id, itemId, pharmacist_id, pharmacy_name, 'dispensed']
    );

    const remaining = await pool.query(
      `SELECT 1 FROM prescription_items WHERE prescription_id = $1 AND status = 'active' LIMIT 1`,
      [id]
    );
    let prescription_status = 'active';
    if (remaining.rowCount === 0) {
      await pool.query("UPDATE prescriptions SET status = 'dispensed' WHERE id = $1", [id]);
      prescription_status = 'dispensed';
    }

    res.json({ success: true, item_id: itemId, prescription_status, message: 'Item dispensed and audit log recorded' });
  } catch (err) {
    console.error('Dispense item error:', err);
    res.status(500).json({ error: 'Failed to dispense item' });
  }
}

module.exports = {
  createPrescription,
  listPrescriptions,
  getPrescription,
  verifyPrescription,
  dispenseItem,
};
