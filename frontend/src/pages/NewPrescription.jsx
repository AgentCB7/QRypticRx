import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { prescriptionApi } from '../api/prescriptions';
import { useAuth } from '../components/AuthContext';

const TIME_SLOTS = [
  { key: 'morning', label: 'Morning' },
  { key: 'afternoon', label: 'Afternoon' },
  { key: 'night', label: 'Night' },
];

const DOSE_MAX = 4;
const DURATION_MIN = 1;
const DURATION_MAX = 365;
const AMOUNT_MIN = 1;
const AMOUNT_MAX = { mL: 30, drops: 20 };

function PillToggle({ options, value, onChange, ariaLabel }) {
  return (
    <div
      role="group"
      aria-label={ariaLabel}
      style={{
        display: 'inline-flex',
        padding: '0.2rem',
        gap: '0.2rem',
        background: 'var(--color-bg, #f1f5f9)',
        border: '1px solid var(--color-border)',
        borderRadius: '999px',
      }}
    >
      {options.map(opt => {
        const active = opt.value === value;
        return (
          <button
            key={opt.value}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(opt.value)}
            style={{
              padding: '0.4rem 1.1rem',
              borderRadius: '999px',
              border: 'none',
              cursor: 'pointer',
              fontSize: '0.9rem',
              fontWeight: 600,
              color: active ? '#fff' : 'var(--color-text-muted)',
              background: active ? 'var(--color-primary)' : 'transparent',
              transition: 'background 150ms ease, color 150ms ease',
            }}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

function Counter({ value, min, max, onChange, suffix, ariaLabel }) {
  const dec = () => onChange(Math.max(min, value - 1));
  const inc = () => onChange(Math.min(max, value + 1));
  const btnStyle = disabled => ({
    width: 34,
    height: 34,
    borderRadius: '8px',
    border: '1px solid var(--color-border)',
    background: disabled ? 'var(--color-bg, #f1f5f9)' : '#fff',
    color: disabled ? 'var(--color-text-muted)' : 'var(--color-primary)',
    fontSize: '1.2rem',
    lineHeight: 1,
    fontWeight: 700,
    cursor: disabled ? 'not-allowed' : 'pointer',
  });
  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.6rem' }} aria-label={ariaLabel}>
      <button type="button" onClick={dec} disabled={value <= min} style={btnStyle(value <= min)} aria-label="decrease">
        −
      </button>
      <span
        style={{
          minWidth: suffix ? 64 : 28,
          textAlign: 'center',
          fontSize: '0.95rem',
          fontWeight: 600,
          fontVariantNumeric: 'tabular-nums',
        }}
        aria-live="polite"
      >
        {value}{suffix ? ` ${suffix}` : ''}
      </span>
      <button type="button" onClick={inc} disabled={value >= max} style={btnStyle(value >= max)} aria-label="increase">
        +
      </button>
    </div>
  );
}

export default function NewPrescription() {
  const { token } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    patient_name: '',
    patient_ic: '',
    medication: '',
    type: 'tablet',
    morning: 0,
    afternoon: 0,
    night: 0,
    amount: 5,
    unit: 'mL',
    duration_days: 7,
    notes: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  function set(field) {
    return e => setForm(f => ({ ...f, [field]: e.target.value }));
  }
  function setField(field, value) {
    setForm(f => ({ ...f, [field]: value }));
  }

  function setType(type) {
    // Switching type resets liquid-only fields but preserves dose counts.
    setForm(f => ({ ...f, type, amount: 5, unit: 'mL' }));
  }
  function setUnit(unit) {
    // Switching unit resets amount to its minimum and updates the counter max.
    setForm(f => ({ ...f, unit, amount: AMOUNT_MIN }));
  }

  function buildDosage(f) {
    const freq = `${f.morning}+${f.afternoon}+${f.night}`;
    if (f.type === 'liquid') {
      return `${freq} × ${f.amount}${f.unit} liquid`;
    }
    return `${freq} tablet`;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');

    if (form.morning + form.afternoon + form.night === 0) {
      setError('Set at least one dose (morning, afternoon, or night).');
      return;
    }

    const validUntil = new Date();
    validUntil.setDate(validUntil.getDate() + form.duration_days);

    setLoading(true);
    try {
      const { prescription } = await prescriptionApi.create({
        patient_name: form.patient_name,
        patient_ic: form.patient_ic,
        medication: form.medication,
        dosage: buildDosage(form),
        instructions: form.notes,
        valid_until: validUntil.toISOString(),
      }, token);
      navigate(`/doctor/prescription/${prescription.id}`);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  const isLiquid = form.type === 'liquid';

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
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.4rem' }}>
              <div className="form-group">
                <label htmlFor="medication">Medication Name</label>
                <input id="medication" type="text" required value={form.medication} onChange={set('medication')} placeholder="e.g. Amoxicillin 500mg" />
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                <span style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--color-text-muted)' }}>Type</span>
                <PillToggle
                  ariaLabel="Medication type"
                  value={form.type}
                  onChange={setType}
                  options={[
                    { value: 'tablet', label: 'Tablet' },
                    { value: 'liquid', label: 'Liquid' },
                  ]}
                />
              </div>

              <div>
                <div style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--color-text-muted)', marginBottom: '0.6rem' }}>
                  Dosage
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1.5rem' }}>
                  {TIME_SLOTS.map(slot => (
                    <div key={slot.key} style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
                      <span style={{ fontSize: '0.82rem', color: 'var(--color-text-muted)' }}>{slot.label}</span>
                      <Counter
                        ariaLabel={`${slot.label} doses`}
                        value={form[slot.key]}
                        min={0}
                        max={DOSE_MAX}
                        onChange={v => setField(slot.key, v)}
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* Liquid-only section — fades in/out via opacity + max-height transition */}
              <div
                aria-hidden={!isLiquid}
                style={{
                  overflow: 'hidden',
                  opacity: isLiquid ? 1 : 0,
                  maxHeight: isLiquid ? 120 : 0,
                  pointerEvents: isLiquid ? 'auto' : 'none',
                  transition: 'opacity 150ms ease, max-height 150ms ease',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
                    <span style={{ fontSize: '0.82rem', color: 'var(--color-text-muted)' }}>Amount per dose</span>
                    <Counter
                      ariaLabel="Amount per dose"
                      value={form.amount}
                      min={AMOUNT_MIN}
                      max={AMOUNT_MAX[form.unit]}
                      onChange={v => setField('amount', v)}
                      suffix={form.unit}
                    />
                  </div>
                  <PillToggle
                    ariaLabel="Liquid unit"
                    value={form.unit}
                    onChange={setUnit}
                    options={[
                      { value: 'mL', label: 'mL' },
                      { value: 'drops', label: 'drops' },
                    ]}
                  />
                </div>
              </div>

              <div>
                <div style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--color-text-muted)', marginBottom: '0.6rem' }}>
                  Duration
                </div>
                <Counter
                  ariaLabel="Duration in days"
                  value={form.duration_days}
                  min={DURATION_MIN}
                  max={DURATION_MAX}
                  onChange={v => setField('duration_days', v)}
                  suffix="days"
                />
              </div>

              <div className="form-group">
                <label htmlFor="notes">Notes</label>
                <textarea
                  id="notes"
                  value={form.notes}
                  onChange={set('notes')}
                  placeholder="Additional notes for the patient…"
                  rows={3}
                />
              </div>
            </div>
          </fieldset>

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
