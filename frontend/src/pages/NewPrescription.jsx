import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { prescriptionApi } from '../api/prescriptions';
import { useAuth } from '../components/AuthContext';

function getMinDate() {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toISOString().split('T')[0];
}

function getDefaultExpiry() {
  const d = new Date();
  d.setDate(d.getDate() + 30);
  return d.toISOString().split('T')[0];
}

export default function NewPrescription() {
  const { token } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    patient_name: '',
    patient_ic: '',
    medication: '',
    dosage: '',
    instructions: '',
    valid_until: getDefaultExpiry(),
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  function set(field) {
    return e => setForm(f => ({ ...f, [field]: e.target.value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { prescription } = await prescriptionApi.create({
        ...form,
        valid_until: new Date(form.valid_until).toISOString(),
      }, token);
      navigate(`/doctor/prescription/${prescription.id}`);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ maxWidth: 680, margin: '0 auto' }}>
      <div style={{ marginBottom: '1.75rem' }}>
        <Link to="/doctor" style={{ fontSize: '0.88rem', color: 'var(--color-text-muted)' }}>
          ← Back to Dashboard
        </Link>
        <h1 style={{ fontSize: '1.6rem', fontWeight: 700, color: 'var(--color-primary)', marginTop: '0.5rem' }}>
          New Prescription
        </h1>
      </div>

      <div className="card">
        {error && <div className="alert alert-error" style={{ marginBottom: '1.25rem' }}>{error}</div>}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.1rem' }}>
          <fieldset style={{ border: 'none', padding: 0 }}>
            <legend style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.85rem' }}>
              Patient Information
            </legend>
            <div className="form-grid">
              <div className="form-group">
                <label htmlFor="patient_name">Patient Name</label>
                <input id="patient_name" type="text" required value={form.patient_name} onChange={set('patient_name')} placeholder="Full legal name" />
              </div>
              <div className="form-group">
                <label htmlFor="patient_ic">Patient IC / ID</label>
                <input id="patient_ic" type="text" required value={form.patient_ic} onChange={set('patient_ic')} placeholder="IC or passport number" />
              </div>
            </div>
          </fieldset>

          <hr style={{ border: 'none', borderTop: '1px solid var(--color-border)' }} />

          <fieldset style={{ border: 'none', padding: 0 }}>
            <legend style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.85rem' }}>
              Medication
            </legend>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div className="form-grid">
                <div className="form-group">
                  <label htmlFor="medication">Medication Name</label>
                  <input id="medication" type="text" required value={form.medication} onChange={set('medication')} placeholder="e.g. Amoxicillin 500mg" />
                </div>
                <div className="form-group">
                  <label htmlFor="dosage">Dosage</label>
                  <input id="dosage" type="text" required value={form.dosage} onChange={set('dosage')} placeholder="e.g. 1 tablet 3x daily" />
                </div>
              </div>
              <div className="form-group">
                <label htmlFor="instructions">Instructions</label>
                <textarea
                  id="instructions"
                  required
                  value={form.instructions}
                  onChange={set('instructions')}
                  placeholder="Special instructions for the patient…"
                  rows={3}
                />
              </div>
            </div>
          </fieldset>

          <hr style={{ border: 'none', borderTop: '1px solid var(--color-border)' }} />

          <div className="form-group" style={{ maxWidth: 260 }}>
            <label htmlFor="valid_until">Validity Period (Expiry Date)</label>
            <input
              id="valid_until"
              type="date"
              required
              min={getMinDate()}
              value={form.valid_until}
              onChange={set('valid_until')}
            />
          </div>

          <div style={{ display: 'flex', gap: '0.85rem', marginTop: '0.5rem' }}>
            <button type="submit" className="btn btn-primary" disabled={loading} style={{ flex: 1, padding: '0.75rem' }}>
              {loading ? 'Generating prescription…' : 'Create & Generate QR Code'}
            </button>
            <Link to="/doctor" className="btn btn-secondary" style={{ padding: '0.75rem 1.25rem' }}>
              Cancel
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
