import React from 'react';
import { Link } from 'react-router-dom';

export default function LandingPage() {
  return (
    <div style={{ maxWidth: 720, margin: '0 auto', textAlign: 'center', paddingTop: '3rem' }}>
      <div style={{ marginBottom: '2rem' }}>
        <svg width="72" height="72" viewBox="0 0 72 72" fill="none" aria-hidden="true" style={{ margin: '0 auto 1rem' }}>
          <rect width="72" height="72" rx="16" fill="var(--color-primary)" />
          <path d="M18 18h16v16H18zM38 18h16v16H38zM18 38h16v16H18z" fill="#fff" opacity="0.9"/>
          <rect x="42" y="42" width="4" height="4" fill="#fff"/>
          <rect x="48" y="48" width="4" height="4" fill="#fff"/>
          <rect x="42" y="54" width="4" height="4" fill="#fff"/>
          <rect x="54" y="42" width="4" height="4" fill="#fff"/>
          <rect x="48" y="42" width="4" height="4" fill="#fff" opacity="0.5"/>
          <rect x="54" y="54" width="4" height="4" fill="#fff" opacity="0.5"/>
        </svg>
        <h1 style={{ fontSize: '2.2rem', fontWeight: 700, color: 'var(--color-primary)', marginBottom: '0.5rem' }}>
          QRypticRx
        </h1>
        <p style={{ fontSize: '1.1rem', color: 'var(--color-text-muted)', maxWidth: 520, margin: '0 auto' }}>
          A secure, tamper-proof digital prescription system with QR code verification and cryptographic integrity.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '2.5rem' }}>
        {[
          { icon: '🔐', title: 'RSA-2048 Signatures', desc: 'Every prescription is cryptographically signed to guarantee authenticity.' },
          { icon: '🔍', title: 'SHA-256 Integrity', desc: 'Tamper detection ensures prescriptions cannot be altered after creation.' },
          { icon: '📱', title: 'QR Code Verification', desc: 'Pharmacists scan a QR to instantly verify any prescription.' },
          { icon: '📋', title: 'Audit Trail', desc: 'Every dispensing event creates an immutable, timestamped log entry.' },
        ].map(f => (
          <div key={f.title} className="card" style={{ textAlign: 'left', padding: '1.25rem' }}>
            <div style={{ fontSize: '1.75rem', marginBottom: '0.5rem' }}>{f.icon}</div>
            <div style={{ fontWeight: 700, marginBottom: '0.3rem', color: 'var(--color-text)' }}>{f.title}</div>
            <div style={{ fontSize: '0.88rem', color: 'var(--color-text-muted)' }}>{f.desc}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
        <Link to="/login" className="btn btn-primary" style={{ padding: '0.75rem 2rem', fontSize: '1rem' }}>
          Sign In
        </Link>
        <Link to="/register" className="btn btn-secondary" style={{ padding: '0.75rem 2rem', fontSize: '1rem' }}>
          Create Account
        </Link>
      </div>
    </div>
  );
}
