import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from './AuthContext';

export default function Layout({ children }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate('/login');
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <header style={{
        background: 'var(--color-primary)',
        color: '#fff',
        boxShadow: '0 2px 8px rgba(0,0,0,0.18)',
        position: 'sticky',
        top: 0,
        zIndex: 100,
      }}>
        <div className="container" style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0.85rem 1.5rem',
        }}>
          <Link to="/" style={{ color: '#fff', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <svg width="28" height="28" viewBox="0 0 28 28" fill="none" aria-hidden="true">
              <rect width="28" height="28" rx="6" fill="rgba(255,255,255,0.15)" />
              <path d="M7 7h6v6H7zM15 7h6v6h-6zM7 15h6v6H7z" fill="#fff" opacity="0.9"/>
              <rect x="17" y="17" width="2" height="2" fill="#fff"/>
              <rect x="19" y="19" width="2" height="2" fill="#fff"/>
              <rect x="17" y="21" width="2" height="2" fill="#fff"/>
              <rect x="21" y="17" width="2" height="2" fill="#fff"/>
            </svg>
            <span style={{ fontWeight: 700, fontSize: '1.2rem', letterSpacing: '-0.01em' }}>QRypticRx</span>
          </Link>

          {user && (
            <nav style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
              <span style={{ fontSize: '0.88rem', opacity: 0.85 }}>
                {user.name}
                <span style={{
                  marginLeft: '0.5rem',
                  background: 'rgba(255,255,255,0.18)',
                  padding: '0.15rem 0.5rem',
                  borderRadius: '999px',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  textTransform: 'capitalize',
                }}>
                  {user.role}
                </span>
              </span>
              <button
                onClick={handleLogout}
                style={{
                  background: 'rgba(255,255,255,0.12)',
                  color: '#fff',
                  border: '1px solid rgba(255,255,255,0.25)',
                  borderRadius: 'var(--radius)',
                  padding: '0.4rem 0.9rem',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'background 0.15s',
                }}
                onMouseOver={e => e.target.style.background = 'rgba(255,255,255,0.22)'}
                onMouseOut={e => e.target.style.background = 'rgba(255,255,255,0.12)'}
              >
                Sign Out
              </button>
            </nav>
          )}
        </div>
      </header>

      <main style={{ flex: 1, padding: '2rem 0' }}>
        <div className="container">
          {children}
        </div>
      </main>

      <footer style={{
        borderTop: '1px solid var(--color-border)',
        padding: '1rem 1.5rem',
        textAlign: 'center',
        fontSize: '0.8rem',
        color: 'var(--color-text-muted)',
      }}>
        QRypticRx &mdash; Secure E-Prescription System &copy; {new Date().getFullYear()}
      </footer>
    </div>
  );
}
