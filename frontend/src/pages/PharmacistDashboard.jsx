import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../components/AuthContext';

export default function PharmacistDashboard() {
  const { user } = useAuth();

  return (
    <div>
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.6rem', fontWeight: 700, color: 'var(--color-primary)' }}>Pharmacist Dashboard</h1>
        <p style={{ color: 'var(--color-text-muted)', marginTop: '0.2rem' }}>
          Welcome, {user.name}
          {user.pharmacy_name && <> &mdash; {user.pharmacy_name}</>}
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
        <div className="card" style={{ padding: '1.75rem', textAlign: 'center' }}>
          <div style={{ fontSize: '2.75rem', marginBottom: '0.75rem' }}>📷</div>
          <h2 style={{ fontWeight: 700, fontSize: '1.1rem', marginBottom: '0.5rem', color: 'var(--color-text)' }}>Scan QR Code</h2>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem', marginBottom: '1.25rem', lineHeight: 1.55 }}>
            Use your device camera or upload a QR code image to verify a patient&apos;s prescription.
          </p>
          <Link to="/pharmacist/scan" className="btn btn-primary" style={{ width: '100%' }}>
            Scan / Upload QR
          </Link>
        </div>

        <div className="card" style={{ padding: '1.75rem' }}>
          <h2 style={{ fontWeight: 700, fontSize: '1rem', marginBottom: '1rem', color: 'var(--color-text)' }}>How it works</h2>
          <ol style={{ paddingLeft: '1.2rem', color: 'var(--color-text-muted)', fontSize: '0.9rem', lineHeight: 1.8 }}>
            <li>Patient presents a printed or digital QR code from their doctor.</li>
            <li>Scan or upload the QR code image.</li>
            <li>System verifies the prescription against the database.</li>
            <li>Confirm dispensing — an immutable audit log is recorded.</li>
          </ol>
        </div>
      </div>

      <div className="card" style={{ padding: '1.25rem', background: 'var(--color-bg)' }}>
        <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap' }}>
          {[
            { icon: '✅', label: 'Active — valid prescription, ready to dispense' },
            { icon: '🔴', label: 'Dispensed — already fulfilled, cannot dispense again' },
            { icon: '⚠️', label: 'Expired — past validity date, cannot dispense' },
            { icon: '🔒', label: 'Tampered — hash mismatch detected, reject immediately' },
          ].map(item => (
            <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>
              <span>{item.icon}</span>
              <span>{item.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
