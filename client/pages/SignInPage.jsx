import React, { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { ShieldAlert } from 'lucide-react';
import { PublicLayout } from '../components/PublicLayout.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { PROJECT_INFO } from '../../server/domain/projectInfo.js';

export function SignInPage() {
  const { user, authConfig, authError, signInWithGoogle, signInDemo } = useAuth();
  const navigate = useNavigate();
  const [busyRole, setBusyRole] = useState('');
  const [localError, setLocalError] = useState('');

  if (user) {
    return <Navigate to="/app/dashboard" replace />;
  }

  async function handleGoogleSignIn() {
    setLocalError('');
    setBusyRole('google');
    try {
      await signInWithGoogle();
      navigate('/app/dashboard');
    } catch (err) {
      setLocalError(err.message || 'Google Sign-In did not complete.');
    } finally {
      setBusyRole('');
    }
  }

  async function handleDemoSignIn(role) {
    setLocalError('');
    setBusyRole(role);
    try {
      await signInDemo(role);
      navigate('/app/dashboard');
    } catch (err) {
      setLocalError(err.message || 'Unable to start demo session.');
    } finally {
      setBusyRole('');
    }
  }

  const displayedError = localError || authError;

  return (
    <PublicLayout>
      <div
        style={{
          maxWidth: '920px',
          margin: '1.5rem auto',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
          gap: '1.5rem',
          alignItems: 'stretch',
        }}
      >
        <section className="glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: '1.15rem' }}>
          <div>
            <div className="brand-lockup" style={{ marginBottom: '0.65rem' }}>
              <span className="brand-logo-badge">
                <img
                  src="/assets/aistudio/facicuse-logo_3cb5a6f2.png"
                  alt="FaCICuSe logo"
                  className="brand-logo-img"
                  style={{ width: '28px', height: '28px' }}
                />
              </span>
              <span className="brand-wordmark">FaCICuSe</span>
            </div>
            <span className="meta-line">
              {PROJECT_INFO.institutionShort} · {PROJECT_INFO.collegeShort} · {PROJECT_INFO.tagline}
            </span>
            <h1 style={{ fontSize: '1.85rem', marginTop: '0.25rem' }}>Sign in to FaCICuSe</h1>
            <p style={{ color: 'var(--ink-secondary)', marginTop: '0.45rem', fontSize: '0.94rem' }}>
              Authenticate with your verified campus Google account to submit facility
              reservations, monitor approvals, and log maintenance tickets.
            </p>
          </div>

          {displayedError && (
            <div className="alert-banner alert-error" role="alert">
              <ShieldAlert size={18} style={{ flexShrink: 0, marginTop: '2px' }} />
              <span>{displayedError}</span>
            </div>
          )}

          {authConfig.allowedDomainsConfigured ? (
            <div className="alert-banner alert-info">
              <span>
                Registration restricted to official domains:{' '}
                <strong>{authConfig.allowedDomains.join(', ')}</strong>
              </span>
            </div>
          ) : (
            <div className="alert-banner alert-info">
              <span>
                Verified campus and university Google accounts are permitted to sign in.
              </span>
            </div>
          )}

          <button
            type="button"
            className="btn btn-primary"
            disabled={Boolean(busyRole)}
            onClick={handleGoogleSignIn}
          >
            {busyRole === 'google' ? 'Verifying Google Account...' : 'Sign In with University Google Account'}
          </button>

          <p style={{ fontSize: '0.82rem', color: 'var(--ink-muted)' }}>
            Public administrator self-registration is disabled. New verified accounts receive
            Student access by default and may be elevated by a System Administrator.
          </p>
        </section>

        <section className="glass-panel-subtle" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
            <span className="meta-line">Demo Sandbox Accounts · Sample Seed Data</span>
            <h2 style={{ fontSize: '1.25rem', marginTop: '0.25rem' }}>
              Role Preview Access
            </h2>
            <p style={{ color: 'var(--ink-secondary)', fontSize: '0.88rem', marginTop: '0.35rem' }}>
              Explore role-specific views using pre-seeded demo profiles. Sessions are issued
              and verified by the server with strict role enforcement.
            </p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {(authConfig.demoAccounts || []).map((acc) => (
              <div
                key={acc.uid}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '0.85rem',
                  padding: '0.85rem 1rem',
                  borderRadius: '12px',
                  background: 'rgba(37, 48, 126, 0.48)',
                  border: '1px solid var(--glass-border-subtle)',
                }}
              >
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: '0.94rem' }}>{acc.fullName}</div>
                  <div className="meta-line" style={{ fontSize: '0.8rem' }}>
                    <span>
                      {acc.role === 'admin'
                        ? 'System Administrator'
                        : acc.role === 'professor'
                          ? 'Professor'
                          : 'Student'}
                    </span>
                    <span aria-hidden="true">·</span>
                    <span>{acc.department}</span>
                  </div>
                </div>

                <button
                  type="button"
                  className="btn btn-coral btn-sm"
                  disabled={Boolean(busyRole)}
                  onClick={() => handleDemoSignIn(acc.role)}
                >
                  {busyRole === acc.role ? 'Signing in...' : `Enter as ${acc.role}`}
                </button>
              </div>
            ))}
          </div>
        </section>
      </div>
    </PublicLayout>
  );
}
