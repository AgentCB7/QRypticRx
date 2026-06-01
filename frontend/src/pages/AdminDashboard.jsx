import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { adminApi } from '../api/admin';
import { useAuth } from '../components/AuthContext';

const TABS = ['pending', 'approved', 'rejected'];

export default function AdminDashboard() {
  const { user, token } = useAuth();
  const [tab, setTab] = useState('pending');
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    setLoading(true);
    setError('');
    adminApi.listApplications(tab, token)
      .then(d => setApplications(d.applications))
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [tab, token]);

  return (
    <div>
      <div style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: '1.6rem', fontWeight: 700, color: 'var(--color-primary)' }}>Admin Dashboard</h1>
        <p style={{ color: 'var(--color-text-muted)', marginTop: '0.2rem' }}>Welcome, {user.name}</p>
      </div>

      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.25rem', flexWrap: 'wrap' }}>
        {TABS.map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`btn ${tab === t ? 'btn-primary' : ''}`}
            style={{ textTransform: 'capitalize' }}
          >
            {t}
          </button>
        ))}
      </div>

      {error && <div className="alert alert-error" style={{ marginBottom: '1rem' }}>{error}</div>}

      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--color-text-muted)' }}>Loading applications…</div>
      ) : applications.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '3rem', color: 'var(--color-text-muted)' }}>
          No {tab} applications.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {applications.map(appn => (
            <Link key={appn.id} to={`/admin/applications/${appn.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
              <div className="card" style={{
                padding: '1.1rem 1.4rem', display: 'flex', alignItems: 'center',
                justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap', cursor: 'pointer',
              }}>
                <div>
                  <div style={{ fontWeight: 600, marginBottom: '0.2rem' }}>{appn.name}</div>
                  <div style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>
                    {appn.email} — {appn.role}
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexShrink: 0 }}>
                  <span className={`badge badge-${appn.status}`}>{appn.status}</span>
                  <span style={{ color: 'var(--color-accent)', fontWeight: 600, fontSize: '0.9rem' }}>Review →</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
