import React, { useCallback, useEffect, useState } from 'react';
import { AppShell } from '../components/AppShell.jsx';
import { apiRequest } from '../services/api.js';

export function AdminUsersPage() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [feedback, setFeedback] = useState('');
  const [busyId, setBusyId] = useState(null);
  const [blockDrafts, setBlockDrafts] = useState({});

  const loadUsers = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await apiRequest('/admin/users');
      const list = res.users || [];
      setUsers(list);
      const nextDrafts = {};
      list.forEach((u) => {
        nextDrafts[u.id] = u.academicBlock || '';
      });
      setBlockDrafts(nextDrafts);
    } catch (err) {
      setError(err.message || 'Unable to load user accounts.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  async function handleUpdateUser(targetUser, patch) {
    setBusyId(targetUser.id);
    setError('');
    setFeedback('');
    try {
      await apiRequest(`/admin/users/${targetUser.id}`, {
        method: 'PATCH',
        body: JSON.stringify(patch),
      });
      setFeedback(`Updated account settings for ${targetUser.fullName}.`);
      await loadUsers();
    } catch (err) {
      setError(err.message || 'Unable to update user account.');
    } finally {
      setBusyId(null);
    }
  }

  return (
    <AppShell title="User Accounts & Permissions">
      {error && (
        <div className="alert-banner alert-error" role="alert">
          {error}
        </div>
      )}
      {feedback && (
        <div className="alert-banner alert-success" role="status">
          {feedback}
        </div>
      )}

      <section className="glass-panel" aria-label="Registered users">
        <p style={{ fontSize: '0.88rem', color: 'var(--ink-secondary)', marginBottom: '1rem' }}>
          Administrator privileges are provisioned exclusively from this console or server bootstrap configuration.
          Academic blocks (e.g. IT-3106) are optional and remain unassigned unless explicitly recorded.
        </p>

        {loading ? (
          <div style={{ padding: '2rem', textAlign: 'center' }}>Loading users...</div>
        ) : (
          <div className="table-scroll">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Name &amp; Email</th>
                  <th>Department</th>
                  <th>Academic Block</th>
                  <th>Account Type</th>
                  <th>Role</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => {
                  const draft = blockDrafts[u.id] ?? '';
                  const blockChanged = draft.trim() !== (u.academicBlock || '');
                  return (
                    <tr key={u.id}>
                      <td>
                        <div style={{ fontWeight: 600 }}>{u.fullName}</div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--ink-muted)' }}>{u.email}</div>
                      </td>
                      <td>{u.department || 'CICS'}</td>
                      <td>
                        <div style={{ display: 'flex', gap: '0.35rem', alignItems: 'center' }}>
                          <input
                            type="text"
                            aria-label={`Academic block for ${u.fullName}`}
                            className="field-input"
                            style={{ width: '105px', padding: '0.35rem 0.5rem', fontSize: '0.8rem' }}
                            placeholder="Unassigned"
                            maxLength={12}
                            value={draft}
                            disabled={busyId === u.id}
                            onChange={(e) =>
                              setBlockDrafts((prev) => ({
                                ...prev,
                                [u.id]: e.target.value.toUpperCase(),
                              }))
                            }
                          />
                          {blockChanged && (
                            <button
                              type="button"
                              className="btn btn-glass btn-sm"
                              style={{ padding: '0.3rem 0.55rem', fontSize: '0.75rem', minHeight: '30px' }}
                              disabled={busyId === u.id}
                              onClick={() =>
                                handleUpdateUser(u, {
                                  academicBlock: draft.trim() || null,
                                })
                              }
                            >
                              Save
                            </button>
                          )}
                        </div>
                      </td>
                      <td>{u.isDemo ? 'Demo Sandbox' : 'Verified Google'}</td>
                      <td>
                        <select
                          aria-label={`Role for ${u.fullName}`}
                          className="field-select"
                          style={{ minWidth: '145px', padding: '0.4rem 0.6rem', fontSize: '0.84rem' }}
                          value={u.role}
                          disabled={busyId === u.id}
                          onChange={(e) => handleUpdateUser(u, { role: e.target.value })}
                        >
                          <option value="student">Student</option>
                          <option value="professor">Professor</option>
                          <option value="admin">System Administrator</option>
                        </select>
                      </td>
                      <td>
                        <span className={`status-text ${u.isActive ? 'status-confirmed' : 'status-rejected'}`}>
                          {u.isActive ? 'Active' : 'Suspended'}
                        </span>
                      </td>
                      <td>
                        <button
                          type="button"
                          className={`btn btn-sm ${u.isActive ? 'btn-danger-ghost' : 'btn-glass'}`}
                          disabled={busyId === u.id || u.isDemo}
                          onClick={() => handleUpdateUser(u, { isActive: !u.isActive })}
                        >
                          {u.isDemo ? 'Protected Demo' : u.isActive ? 'Suspend' : 'Reactivate'}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </AppShell>
  );
}
