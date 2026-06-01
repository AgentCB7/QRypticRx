import React, { useState } from 'react';
import { Navigate, useNavigate, useLocation } from 'react-router-dom';
import { authApi } from '../api/auth';
import { useAuth, redirectFor } from '../components/AuthContext';

export default function LoginVerifyPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const email = location.state?.email;
  const from = location.state?.from;

  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [loading, setLoading] = useState(false);

  if (!email) return <Navigate to="/login" replace />;

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { token, user } = await authApi.loginVerify({ email, code });
      login(user, token);
      const dest = from && !from.includes('/login') ? from : redirectFor(user.role);
      navigate(dest, { replace: true });
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
      await authApi.resendOtp({ email, purpose: 'login' });
      setInfo('A new code has been sent.');
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div style={{ maxWidth: 440, margin: '2rem auto' }}>
      <div style={{ textAlign: 'center', marginBottom: '1.75rem' }}>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--color-primary)' }}>Enter Login Code</h1>
        <p style={{ color: 'var(--color-text-muted)', marginTop: '0.4rem' }}>
          We sent a 6-digit code to {email}
        </p>
      </div>

      <div className="card">
        {error && <div className="alert alert-error" style={{ marginBottom: '1.25rem' }}>{error}</div>}
        {info && <div className="alert alert-success" style={{ marginBottom: '1.25rem' }}>{info}</div>}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div className="form-group">
            <label htmlFor="code">Login Code</label>
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
            {loading ? 'Verifying…' : 'Sign In'}
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
