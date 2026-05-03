import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { authApi } from '../api/auth';
import { useAuth } from '../components/AuthContext';

export default function RegisterPage() {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    role: 'doctor',
    pharmacy_name: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  function set(field) {
    return e => setForm(f => ({ ...f, [field]: e.target.value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');

    if (form.password !== form.confirmPassword) {
      return setError('Passwords do not match');
    }
    if (form.password.length < 8) {
      return setError('Password must be at least 8 characters');
    }
    if (form.role === 'pharmacist' && !form.pharmacy_name.trim()) {
      return setError('Pharmacy name is required for pharmacists');
    }

    setLoading(true);
    try {
      const payload = {
        name: form.name,
        email: form.email,
        password: form.password,
        role: form.role,
        ...(form.role === 'pharmacist' && { pharmacy_name: form.pharmacy_name }),
      };
      const { token, user } = await authApi.register(payload);
      login(user, token);
      navigate(user.role === 'doctor' ? '/doctor' : '/pharmacist', { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ maxWidth: 520, margin: '2rem auto' }}>
      <div style={{ textAlign: 'center', marginBottom: '1.75rem' }}>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--color-primary)' }}>Create Account</h1>
        <p style={{ color: 'var(--color-text-muted)', marginTop: '0.4rem' }}>
          Join QRypticRx — Secure E-Prescriptions
        </p>
      </div>

      <div className="card">
        {error && <div className="alert alert-error" style={{ marginBottom: '1.25rem' }}>{error}</div>}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div className="form-group">
            <label htmlFor="name">Full Name</label>
            <input id="name" type="text" required value={form.name} onChange={set('name')} placeholder="Dr. Jane Smith" />
          </div>

          <div className="form-group">
            <label htmlFor="email">Email Address</label>
            <input id="email" type="email" autoComplete="email" required value={form.email} onChange={set('email')} placeholder="you@example.com" />
          </div>

          <div className="form-group">
            <label htmlFor="role">Role</label>
            <select id="role" value={form.role} onChange={set('role')}>
              <option value="doctor">Doctor</option>
              <option value="pharmacist">Pharmacist</option>
            </select>
          </div>

          {form.role === 'pharmacist' && (
            <div className="form-group">
              <label htmlFor="pharmacy_name">Pharmacy Name</label>
              <input
                id="pharmacy_name"
                type="text"
                required
                value={form.pharmacy_name}
                onChange={set('pharmacy_name')}
                placeholder="City Health Pharmacy"
              />
            </div>
          )}

          <div className="form-grid">
            <div className="form-group">
              <label htmlFor="password">Password</label>
              <input id="password" type="password" autoComplete="new-password" required minLength={8} value={form.password} onChange={set('password')} placeholder="Min. 8 characters" />
            </div>
            <div className="form-group">
              <label htmlFor="confirmPassword">Confirm Password</label>
              <input id="confirmPassword" type="password" autoComplete="new-password" required value={form.confirmPassword} onChange={set('confirmPassword')} placeholder="Repeat password" />
            </div>
          </div>

          <button type="submit" className="btn btn-primary" disabled={loading} style={{ marginTop: '0.5rem', width: '100%', padding: '0.75rem' }}>
            {loading ? 'Creating account…' : 'Create Account'}
          </button>
        </form>

        <p style={{ textAlign: 'center', marginTop: '1.25rem', fontSize: '0.9rem', color: 'var(--color-text-muted)' }}>
          Already have an account? <Link to="/login">Sign in</Link>
        </p>
      </div>
    </div>
  );
}
