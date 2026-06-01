import React from 'react';
import { Link } from 'react-router-dom';

export default function RegisterSubmittedPage() {
  return (
    <div style={{ maxWidth: 480, margin: '3rem auto' }}>
      <div className="card" style={{ textAlign: 'center', padding: '2.5rem' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--color-primary)', marginBottom: '0.75rem' }}>
          Application submitted
        </h1>
        <p style={{ color: 'var(--color-text-muted)', marginBottom: '1.5rem' }}>
          You'll receive access once an admin reviews your account. Until then, sign-in will be blocked.
        </p>
        <Link to="/login" className="btn btn-primary">Back to Sign In</Link>
      </div>
    </div>
  );
}
