import React, { useEffect, useState } from 'react';
import { AppShell } from '../components/AppShell.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { apiRequest } from '../services/api.js';

export function ProfilePage() {
  const { user, refreshProfile } = useAuth();
  const [fullName, setFullName] = useState(user?.fullName || '');
  const [department, setDepartment] = useState(user?.department || '');
  const [academicBlock, setAcademicBlock] = useState(user?.academicBlock || '');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [notifications, setNotifications] = useState([]);

  useEffect(() => {
    setFullName(user?.fullName || '');
    setDepartment(user?.department || '');
    setAcademicBlock(user?.academicBlock || '');
    apiRequest('/notifications')
      .then((res) => setNotifications(res.notifications || []))
      .catch(() => {});
  }, [user]);

  async function handleSave(e) {
    e.preventDefault();
    setSaving(true);
    setMessage('');
    setError('');
    try {
      await apiRequest('/profile', {
        method: 'PATCH',
        body: JSON.stringify({
          fullName,
          department,
          academicBlock: academicBlock.trim() || null,
        }),
      });
      await refreshProfile();
      setMessage('Profile updated.');
    } catch (err) {
      setError(err.message || 'Could not update profile.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <AppShell title="Account Profile">
      <div className="two-col-grid">
        <section className="glass-panel" aria-label="Profile settings">
          <h2 style={{ fontSize: '1.2rem', marginBottom: '0.35rem' }}>Account Details</h2>
          <div className="meta-line" style={{ marginBottom: '1rem' }}>
            <span>{user?.email}</span>
            <span aria-hidden="true">·</span>
            <span>
              Role:{' '}
              {user?.role === 'admin'
                ? 'System Administrator'
                : user?.role === 'professor'
                  ? 'Professor'
                  : 'Student'}
            </span>
            {user?.isDemo && (
              <>
                <span aria-hidden="true">·</span>
                <span>Demo Sandbox Account</span>
              </>
            )}
          </div>

          {error && (
            <div className="alert-banner alert-error" role="alert" style={{ marginBottom: '1rem' }}>
              {error}
            </div>
          )}
          {message && (
            <div className="alert-banner alert-success" role="status" style={{ marginBottom: '1rem' }}>
              {message}
            </div>
          )}

          <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '0.95rem' }}>
            <div className="field-group">
              <label htmlFor="prof-name" className="field-label">
                Full Name
              </label>
              <input
                id="prof-name"
                type="text"
                className="field-input"
                required
                minLength={2}
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
              />
            </div>

            <div className="field-group">
              <label htmlFor="prof-dept" className="field-label">
                Department or College
              </label>
              <input
                id="prof-dept"
                type="text"
                className="field-input"
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
              />
            </div>

            <div className="field-group">
              <label htmlFor="prof-block" className="field-label">
                Academic Block / Section (Optional)
              </label>
              <input
                id="prof-block"
                type="text"
                className="field-input"
                maxLength={12}
                placeholder="e.g. IT-1109, IT-2109, IT-3106, IT-4106 (leave blank if N/A)"
                value={academicBlock}
                onChange={(e) => setAcademicBlock(e.target.value.toUpperCase())}
              />
              <span style={{ fontSize: '0.78rem', color: 'var(--ink-muted)' }}>
                Format: IT-&lt;Year 1-4&gt;&lt;Sem 1-2&gt;&lt;2-digit block&gt;. Leave blank if not assigned to a section.
              </span>
            </div>

            <button type="submit" className="btn btn-coral" disabled={saving}>
              {saving ? 'Saving...' : 'Save Profile Changes'}
            </button>
          </form>
        </section>

        <section className="glass-panel" aria-label="Notification log">
          <h2 style={{ fontSize: '1.2rem', marginBottom: '0.85rem' }}>Recent Notifications</h2>
          {notifications.length === 0 ? (
            <p style={{ color: 'var(--ink-secondary)', fontSize: '0.9rem' }}>
              No notifications yet.
            </p>
          ) : (
            <div className="schedule-list">
              {notifications.map((n) => (
                <div key={n.id} className="schedule-row">
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '0.92rem' }}>{n.title}</div>
                    <div style={{ fontSize: '0.84rem', color: 'var(--ink-secondary)', marginTop: '0.2rem' }}>
                      {n.message}
                    </div>
                  </div>
                  <span style={{ fontSize: '0.78rem', color: 'var(--ink-muted)' }}>
                    {n.isRead ? 'Read' : 'Unread'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </AppShell>
  );
}
