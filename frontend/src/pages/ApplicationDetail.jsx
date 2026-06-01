import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { adminApi } from '../api/admin';
import { useAuth } from '../components/AuthContext';

function Field({ label, value }) {
  return (
    <div style={{ marginBottom: '0.85rem' }}>
      <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--color-text-muted)' }}>
        {label}
      </div>
      <div style={{ fontWeight: 500 }}>{value || <span style={{ color: 'var(--color-text-muted)' }}>—</span>}</div>
    </div>
  );
}

export default function ApplicationDetail() {
  const { id } = useParams();
  const { token } = useAuth();
  const navigate = useNavigate();

  const [appn, setAppn] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState('');

  useEffect(() => {
    adminApi.getApplication(id, token)
      .then(d => setAppn(d.application))
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [id, token]);

  async function handleApprove() {
    setBusy(true);
    setError('');
    try {
      await adminApi.approveApplication(id, token);
      navigate('/admin', { replace: true });
    } catch (e) {
      setError(e.message);
      setBusy(false);
    }
  }

  async function handleReject() {
    if (!reason.trim()) {
      return setError('A reason is required to reject.');
    }
    setBusy(true);
    setError('');
    try {
      await adminApi.rejectApplication(id, reason, token);
      navigate('/admin', { replace: true });
    } catch (e) {
      setError(e.message);
      setBusy(false);
    }
  }

  if (loading) return <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--color-text-muted)' }}>Loading…</div>;
  if (error && !appn) return <div className="alert alert-error">{error}</div>;
  if (!appn) return null;

  const decided = appn.status !== 'pending';

  return (
    <div style={{ maxWidth: 640, margin: '0 auto' }}>
      <button onClick={() => navigate('/admin')} className="btn" style={{ marginBottom: '1rem' }}>← Back</button>

      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
          <h1 style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--color-primary)' }}>{appn.name}</h1>
          <span className={`badge badge-${appn.status}`}>{appn.status}</span>
        </div>

        {error && <div className="alert alert-error" style={{ marginBottom: '1rem' }}>{error}</div>}

        <Field label="Email" value={appn.email} />
        <Field label="Role" value={appn.role} />
        <Field label="License Number" value={appn.license_number} />
        {appn.role === 'doctor'
          ? <Field label="Affiliation" value={appn.affiliation} />
          : <Field label="Pharmacy" value={appn.pharmacy_name} />}
        <Field label="Applicant Note" value={appn.applicant_note} />

        {decided && (
          <>
            <Field label="Reviewed At" value={appn.reviewed_at ? new Date(appn.reviewed_at).toLocaleString() : null} />
            {appn.status === 'rejected' && <Field label="Rejection Reason" value={appn.rejection_reason} />}
          </>
        )}

        {!decided && (
          <div style={{ marginTop: '1.5rem', borderTop: '1px solid var(--color-border)', paddingTop: '1.25rem' }}>
            {!rejecting ? (
              <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                <button onClick={handleApprove} disabled={busy} className="btn btn-primary">
                  {busy ? 'Working…' : 'Approve'}
                </button>
                <button onClick={() => setRejecting(true)} disabled={busy} className="btn">Reject</button>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <div className="form-group">
                  <label htmlFor="reason">Rejection Reason</label>
                  <textarea id="reason" rows={3} value={reason} onChange={e => setReason(e.target.value)}
                    placeholder="Explain why this application is denied" />
                </div>
                <div style={{ display: 'flex', gap: '0.75rem' }}>
                  <button onClick={handleReject} disabled={busy} className="btn btn-primary">
                    {busy ? 'Working…' : 'Confirm Rejection'}
                  </button>
                  <button onClick={() => { setRejecting(false); setReason(''); }} disabled={busy} className="btn">Cancel</button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
