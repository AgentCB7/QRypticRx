import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { authApi } from '../api/auth';

export default function VerifyEmailPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const email = location.state?.email || '';

  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setInfo('');
    setLoading(true);
    try {
      await authApi.verifyEmail({ email, code });
      navigate('/register/submitted', { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleResend() {
    setError('');
    setInfo('');
    try {
      await authApi.resendOtp({ email, purpose: 'email_verify' });
      setInfo('A new code has been sent.');
    } catch (err) {
      setError(err.message);
    }
  }

  if (!email) {
    return (
      <div style={{ maxWidth: 440, margin: '2rem auto' }}>
        <div className="card">
          <p>We don&apos;t know which account to verify. <Link to="/register">Start registration</Link>.</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 440, margin: '2rem auto' }}>
      <div style={{ textAlign: 'center', marginBottom: '1.75rem' }}>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--color-primary)' }}>Verify Your Email</h1>
        <p style={{ color: 'var(--color-text-muted)', marginTop: '0.4rem' }}>
          Enter the 6-digit code we sent to {email}
        </p>
      </div>

      <div className="card">
        {error && <div className="alert alert-error" style={{ marginBottom: '1.25rem' }}>{error}</div>}
        {info && <div className="alert alert-success" style={{ marginBottom: '1.25rem' }}>{info}</div>}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div className="form-group">
            <label htmlFor="code">Verification Code</label>
            <input
              id="code"
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              required
              maxLength={6}
              value={code}
              onChange={e => setCode(e.target.value.replace(/\D/g, ''))}
              placeholder="123456"
            />
          </div>

          <button type="submit" className="btn btn-primary" disabled={loading} style={{ marginTop: '0.5rem', width: '100%', padding: '0.75rem' }}>
            {loading ? 'Verifying…' : 'Verify Email'}
          </button>
        </form>

        <p style={{ textAlign: 'center', marginTop: '1.25rem', fontSize: '0.9rem', color: 'var(--color-text-muted)' }}>
          Didn&apos;t get a code?{' '}
          <button type="button" onClick={handleResend} className="btn-link" style={{ background: 'none', border: 'none', color: 'var(--color-primary)', cursor: 'pointer', padding: 0 }}>
            Resend
          </button>
        </p>
      </div>
    </div>
  );
}
