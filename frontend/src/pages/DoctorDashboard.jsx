import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { prescriptionApi } from '../api/prescriptions';
import { useAuth } from '../components/AuthContext';

function StatusBadge({ status }) {
  return <span className={`badge badge-${status}`}>{status}</span>;
}

export default function DoctorDashboard() {
  const { user, token } = useAuth();
  const [prescriptions, setPrescriptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    prescriptionApi.list(token)
      .then(d => setPrescriptions(d.prescriptions))
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [token]);

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.75rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.6rem', fontWeight: 700, color: 'var(--color-primary)' }}>Doctor Dashboard</h1>
          <p style={{ color: 'var(--color-text-muted)', marginTop: '0.2rem' }}>Welcome, {user.name}</p>
        </div>
        <Link to="/doctor/new" className="btn btn-primary">
          + New Prescription
        </Link>
      </div>

      {error && <div className="alert alert-error" style={{ marginBottom: '1rem' }}>{error}</div>}

      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--color-text-muted)' }}>Loading prescriptions…</div>
      ) : prescriptions.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
          <p style={{ color: 'var(--color-text-muted)', marginBottom: '1.25rem' }}>No prescriptions yet.</p>
          <Link to="/doctor/new" className="btn btn-primary">Create your first prescription</Link>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {prescriptions.map(rx => (
            <Link
              key={rx.id}
              to={`/doctor/prescription/${rx.id}`}
              style={{ textDecoration: 'none', color: 'inherit' }}
            >
              <div className="card" style={{
                padding: '1.1rem 1.4rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '1rem',
                flexWrap: 'wrap',
                cursor: 'pointer',
                transition: 'box-shadow 0.15s',
              }}
                onMouseOver={e => e.currentTarget.style.boxShadow = 'var(--shadow-lg)'}
                onMouseOut={e => e.currentTarget.style.boxShadow = 'var(--shadow)'}
              >
                <div>
                  <div style={{ fontWeight: 600, marginBottom: '0.2rem' }}>{rx.patient_name}</div>
                  <div style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>
                    {(rx.items && rx.items.length)
                      ? `${rx.items[0].medication}${rx.items.length > 1 ? ` +${rx.items.length - 1} more` : ''}`
                      : '—'}
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexShrink: 0 }}>
                  <StatusBadge status={rx.status} />
                  <span style={{ color: 'var(--color-accent)', fontWeight: 600, fontSize: '0.9rem' }}>View →</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
