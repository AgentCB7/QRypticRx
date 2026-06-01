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
const VALID_MIN = 1;
const VALID_MAX = 365;
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

function newMedicine() {
  return {
    medication: '',
    type: 'tablet',
    morning: 0,
    afternoon: 0,
    night: 0,
    amount: 5,
    unit: 'mL',
    duration_days: 7,
    notes: '',
  };
}

function buildDosage(m) {
  const freq = `${m.morning}+${m.afternoon}+${m.night}`;
  if (m.type === 'liquid') {
    return `${freq} × ${m.amount}${m.unit} liquid`;
  }
  return `${freq} tablet`;
}

function MedicineRow({ med, index, onChange, onSetType, onSetUnit, onRemove, canRemove }) {
  const isLiquid = med.type === 'liquid';
  return (
    <div style={{ border: '1px solid var(--color-border)', borderRadius: 'var(--radius)', padding: '1.1rem', display: 'flex', flexDirection: 'column', gap: '1.1rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.75rem' }}>
        <span style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Medicine {index + 1}
        </span>
        {canRemove && (
          <button type="button" onClick={() => onRemove(index)} className="btn btn-secondary btn-sm" aria-label={`Remove medicine ${index + 1}`}>
            Remove
          </button>
        )}
      </div>

      <div className="form-group">
        <label htmlFor={`medication-${index}`}>Medication Name</label>
        <input
          id={`medication-${index}`}
          type="text"
          required
          value={med.medication}
          onChange={e => onChange(index, 'medication', e.target.value)}
          placeholder="e.g. Amoxicillin 500mg"
        />
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
        <span style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--color-text-muted)' }}>Type</span>
        <PillToggle
          ariaLabel={`Medicine ${index + 1} type`}
          value={med.type}
          onChange={t => onSetType(index, t)}
          options={[
            { value: 'tablet', label: 'Tablet' },
            { value: 'liquid', label: 'Liquid' },
          ]}
        />
      </div>

      <div>
        <div style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--color-text-muted)', marginBottom: '0.6rem' }}>Dosage</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1.5rem' }}>
          {TIME_SLOTS.map(slot => (
            <div key={slot.key} style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
              <span style={{ fontSize: '0.82rem', color: 'var(--color-text-muted)' }}>{slot.label}</span>
              <Counter
                ariaLabel={`Medicine ${index + 1} ${slot.label} doses`}
                value={med[slot.key]}
                min={0}
                max={DOSE_MAX}
                onChange={v => onChange(index, slot.key, v)}
              />
            </div>
          ))}
        </div>
      </div>

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
              ariaLabel={`Medicine ${index + 1} amount per dose`}
              value={med.amount}
              min={AMOUNT_MIN}
              max={AMOUNT_MAX[med.unit]}
              onChange={v => onChange(index, 'amount', v)}
              suffix={med.unit}
            />
          </div>
          <PillToggle
            ariaLabel={`Medicine ${index + 1} liquid unit`}
            value={med.unit}
            onChange={u => onSetUnit(index, u)}
            options={[
              { value: 'mL', label: 'mL' },
              { value: 'drops', label: 'drops' },
            ]}
          />
        </div>
      </div>

      <div>
        <div style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--color-text-muted)', marginBottom: '0.6rem' }}>Duration</div>
        <Counter
          ariaLabel={`Medicine ${index + 1} duration in days`}
          value={med.duration_days}
          min={DURATION_MIN}
          max={DURATION_MAX}
          onChange={v => onChange(index, 'duration_days', v)}
          suffix="days"
        />
      </div>

      <div className="form-group">
        <label htmlFor={`notes-${index}`}>Notes</label>
        <textarea
          id={`notes-${index}`}
          value={med.notes}
          onChange={e => onChange(index, 'notes', e.target.value)}
          placeholder="Notes for this medicine…"
          rows={2}
        />
      </div>
    </div>
  );
}

export default function NewPrescription() {
  const { token } = useAuth();
  const navigate = useNavigate();

  const [patient, setPatient] = useState({ patient_name: '', patient_ic: '' });
  const [validDays, setValidDays] = useState(30);
  const [medicines, setMedicines] = useState([newMedicine()]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  function setPatientField(field) {
    return e => setPatient(p => ({ ...p, [field]: e.target.value }));
  }

  function updateMedicine(index, field, value) {
    setMedicines(list => list.map((m, i) => (i === index ? { ...m, [field]: value } : m)));
  }
  function setMedicineType(index, type) {
    setMedicines(list => list.map((m, i) => (i === index ? { ...m, type, amount: 5, unit: 'mL' } : m)));
  }
  function setMedicineUnit(index, unit) {
    setMedicines(list => list.map((m, i) => (i === index ? { ...m, unit, amount: AMOUNT_MIN } : m)));
  }
  function addMedicine() {
    setMedicines(list => [...list, newMedicine()]);
  }
  function removeMedicine(index) {
    setMedicines(list => list.filter((_, i) => i !== index));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');

    for (let i = 0; i < medicines.length; i++) {
      const m = medicines[i];
      if (!m.medication.trim()) {
        setError(`Medicine ${i + 1}: enter a medication name.`);
        return;
      }
      if (m.morning + m.afternoon + m.night === 0) {
        setError(`Medicine ${i + 1}: set at least one dose (morning, afternoon, or night).`);
        return;
      }
    }

    const validUntil = new Date();
    validUntil.setDate(validUntil.getDate() + validDays);

    setLoading(true);
    try {
      const { prescription } = await prescriptionApi.create({
        patient_name: patient.patient_name,
        patient_ic: patient.patient_ic,
        valid_until: validUntil.toISOString(),
        medicines: medicines.map(m => ({
          medication: m.medication,
          dosage: buildDosage(m),
          duration_days: m.duration_days,
          notes: m.notes,
        })),
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
                <input id="patient_name" type="text" required value={patient.patient_name} onChange={setPatientField('patient_name')} placeholder="Full legal name" />
              </div>
              <div className="form-group">
                <label htmlFor="patient_ic">Patient IC / ID</label>
                <input id="patient_ic" type="text" required value={patient.patient_ic} onChange={setPatientField('patient_ic')} placeholder="IC or passport number" />
              </div>
            </div>
          </fieldset>

          <hr style={{ border: 'none', borderTop: '1px solid var(--color-border)' }} />

          <fieldset style={{ border: 'none', padding: 0 }}>
            <legend style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.85rem' }}>
              Medicines
            </legend>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {medicines.map((med, index) => (
                <MedicineRow
                  key={index}
                  med={med}
                  index={index}
                  onChange={updateMedicine}
                  onSetType={setMedicineType}
                  onSetUnit={setMedicineUnit}
                  onRemove={removeMedicine}
                  canRemove={medicines.length > 1}
                />
              ))}
              <button type="button" onClick={addMedicine} className="btn btn-secondary" style={{ alignSelf: 'flex-start' }}>
                + Add medicine
              </button>
            </div>
          </fieldset>

          <hr style={{ border: 'none', borderTop: '1px solid var(--color-border)' }} />

          <div>
            <div style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--color-text-muted)', marginBottom: '0.6rem' }}>
              Prescription valid for
            </div>
            <Counter
              ariaLabel="Prescription validity in days"
              value={validDays}
              min={VALID_MIN}
              max={VALID_MAX}
              onChange={setValidDays}
              suffix="days"
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
