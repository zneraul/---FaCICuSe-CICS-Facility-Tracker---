import React, { useEffect, useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import {
  BarChart3,
  Bell,
  Building2,
  CalendarCheck2,
  CalendarDays,
  ClipboardList,
  LayoutDashboard,
  LogOut,
  Menu,
  ShieldCheck,
  UserCircle2,
  Users,
  Wrench,
  X,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import { apiRequest } from '../services/api.js';

export function AppShell({ title, primaryAction, children }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);

  useEffect(() => {
    let active = true;
    apiRequest('/notifications')
      .then((res) => {
        if (active) setNotifications(res.notifications || []);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [title]);

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  async function handleMarkAllRead() {
    await apiRequest('/notifications/all/read', { method: 'PATCH' }).catch(() => {});
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
  }

  async function handleMarkRead(item) {
    if (!item.isRead) {
      await apiRequest(`/notifications/${item.id}/read`, { method: 'PATCH' }).catch(() => {});
      setNotifications((prev) =>
        prev.map((n) => (n.id === item.id ? { ...n, isRead: true } : n))
      );
    }
    setNotifOpen(false);
    if (item.linkPath) {
      navigate(item.linkPath);
    }
  }

  async function handleLogout() {
    navigate('/', { replace: true });
    await logout();
  }

  const isAdmin = user?.role === 'admin';

  const coreLinks = [
    { to: '/app/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/app/facilities', label: 'Facilities', icon: Building2 },
    { to: '/app/calendar', label: 'Calendar', icon: CalendarDays },
    { to: '/app/reservations', label: 'Reservations', icon: CalendarCheck2 },
    { to: '/app/issues', label: 'Maintenance', icon: Wrench },
    { to: '/app/profile', label: 'Profile', icon: UserCircle2 },
  ];

  // Analytics is strictly for System Administrators
  const adminLinks = isAdmin
    ? [
        { to: '/app/admin/facilities', label: 'Manage Spaces', icon: ShieldCheck },
        { to: '/app/admin/reservations', label: 'Review Requests', icon: ClipboardList },
        { to: '/app/admin/maintenance', label: 'Triage Issues', icon: Wrench },
        { to: '/app/admin/users', label: 'User Accounts', icon: Users },
        { to: '/app/admin/analytics', label: 'Analytics', icon: BarChart3 },
      ]
    : [];

  return (
    <div className="ambient-canvas">
      <div className="ambient-backdrop" aria-hidden="true" />
      <div className="ambient-scrim" aria-hidden="true" />

      <div className="app-shell">
        <aside
          className={`app-sidebar ${sidebarOpen ? 'mobile-open' : ''}`}
          aria-label="Workspace navigation"
        >
          <div style={{ overflowY: 'auto' }}>
            <div className="sidebar-brand">
              <Link to="/" className="brand-lockup" onClick={() => setSidebarOpen(false)}>
                <span className="brand-logo-badge">
                  <img
                    src="/assets/aistudio/facicuse-logo_3cb5a6f2.png"
                    alt="FaCICuSe logo"
                    className="brand-logo-img"
                    style={{ width: '28px', height: '28px' }}
                  />
                </span>
                <span className="sidebar-brand-title">FaCICuSe</span>
              </Link>
              <button
                type="button"
                className="mobile-only-btn icon-btn"
                style={{ width: '34px', height: '34px', background: 'rgba(255,255,255,0.12)', color: '#fff', border: 'none' }}
                onClick={() => setSidebarOpen(false)}
                aria-label="Close navigation menu"
              >
                <X size={18} />
              </button>
            </div>

            <nav className="sidebar-nav-group" aria-label="Campus workspace">
              <span className="sidebar-section-label">Workspace</span>
              {coreLinks.map((item) => {
                const Icon = item.icon;
                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
                    onClick={() => setSidebarOpen(false)}
                  >
                    <Icon size={18} aria-hidden="true" />
                    <span>{item.label}</span>
                  </NavLink>
                );
              })}
            </nav>

            {isAdmin && (
              <nav className="sidebar-nav-group" aria-label="Administration">
                <span className="sidebar-section-label">Administration</span>
                {adminLinks.map((item) => {
                  const Icon = item.icon;
                  return (
                    <NavLink
                      key={item.to}
                      to={item.to}
                      className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
                      onClick={() => setSidebarOpen(false)}
                    >
                      <Icon size={18} aria-hidden="true" />
                      <span>{item.label}</span>
                    </NavLink>
                  );
                })}
              </nav>
            )}
          </div>

          <div className="sidebar-footer">
            <div style={{ padding: '0 0.5rem' }}>
              <div style={{ fontSize: '0.88rem', fontWeight: 600, color: '#fff' }}>
                {user?.fullName}
              </div>
              <div style={{ fontSize: '0.76rem', color: 'rgba(249,247,244,0.72)' }}>
                {user?.role === 'admin'
                  ? 'System Administrator'
                  : user?.role === 'professor'
                    ? 'Professor'
                    : 'Student'}
                {user?.isDemo ? ' · Demo Sandbox' : ''}
              </div>
            </div>
            <button
              type="button"
              onClick={handleLogout}
              className="sidebar-link"
              style={{ border: 'none', background: 'transparent', width: '100%', textAlign: 'left', cursor: 'pointer' }}
            >
              <LogOut size={18} aria-hidden="true" />
              <span>Sign Out</span>
            </button>
          </div>
        </aside>

        <div className="app-workspace">
          <header className="app-topbar">
            <div className="app-topbar-left">
              <button
                type="button"
                className="mobile-only-btn icon-btn"
                onClick={() => setSidebarOpen(true)}
                aria-label="Open navigation menu"
              >
                <Menu size={19} />
              </button>
              <h1 className="app-topbar-title">{title}</h1>
            </div>

            <div className="app-topbar-actions">
              {primaryAction}

              <div className="popover-anchor">
                <button
                  type="button"
                  className="icon-btn"
                  aria-label={`Notifications (${unreadCount} unread)`}
                  aria-expanded={notifOpen}
                  onClick={() => setNotifOpen((prev) => !prev)}
                >
                  <Bell size={18} />
                  {unreadCount > 0 && (
                    <span className="notif-count-badge">{unreadCount}</span>
                  )}
                </button>

                {notifOpen && (
                  <div className="popover-panel" role="dialog" aria-label="Notifications">
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        marginBottom: '0.75rem',
                      }}
                    >
                      <strong style={{ fontSize: '0.95rem' }}>Notifications</strong>
                      {unreadCount > 0 && (
                        <button
                          type="button"
                          className="btn btn-glass btn-sm"
                          onClick={handleMarkAllRead}
                        >
                          Mark all read
                        </button>
                      )}
                    </div>

                    {notifications.length === 0 ? (
                      <p style={{ fontSize: '0.86rem', color: 'var(--ink-muted)' }}>
                        No notifications recorded yet.
                      </p>
                    ) : (
                      <div className="schedule-list">
                        {notifications.slice(0, 8).map((n) => (
                          <button
                            key={n.id}
                            type="button"
                            onClick={() => handleMarkRead(n)}
                            style={{
                              textAlign: 'left',
                              background: n.isRead ? 'transparent' : 'rgba(79, 70, 229, 0.09)',
                              border: 'none',
                              borderRadius: '10px',
                              padding: '0.65rem',
                              cursor: 'pointer',
                              width: '100%',
                            }}
                          >
                            <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--ink-primary)' }}>
                              {n.title}
                            </div>
                            <div style={{ fontSize: '0.8rem', color: 'var(--ink-secondary)', marginTop: '0.2rem' }}>
                              {n.message}
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              <Link
                to="/app/profile"
                className="btn btn-glass btn-sm"
                aria-label="Account profile"
              >
                <UserCircle2 size={17} aria-hidden="true" />
                <span>{user?.fullName?.split(' ')[0] || 'Profile'}</span>
              </Link>
            </div>
          </header>

          <main className="app-content">{children}</main>
        </div>
      </div>

      {/* Responsive V10 Mobile Bottom Navigation Bar */}
      <nav className="mobile-v10-bar" aria-label="Mobile workspace tabs">
        <NavLink
          to="/app/dashboard"
          className={({ isActive }) => `mobile-v10-link ${isActive ? 'active' : ''}`}
        >
          <LayoutDashboard size={16} aria-hidden="true" />
          <span>Home</span>
        </NavLink>
        <NavLink
          to="/app/facilities"
          className={({ isActive }) => `mobile-v10-link ${isActive ? 'active' : ''}`}
        >
          <Building2 size={16} aria-hidden="true" />
          <span>Spaces</span>
        </NavLink>
        <NavLink
          to="/app/calendar"
          className={({ isActive }) => `mobile-v10-link ${isActive ? 'active' : ''}`}
        >
          <CalendarDays size={16} aria-hidden="true" />
          <span>Calendar</span>
        </NavLink>
        <NavLink
          to="/app/reservations"
          className={({ isActive }) => `mobile-v10-link ${isActive ? 'active' : ''}`}
        >
          <CalendarCheck2 size={16} aria-hidden="true" />
          <span>Bookings</span>
        </NavLink>
        <NavLink
          to="/app/issues"
          className={({ isActive }) => `mobile-v10-link ${isActive ? 'active' : ''}`}
        >
          <Wrench size={16} aria-hidden="true" />
          <span>Issues</span>
        </NavLink>
        {isAdmin && (
          <NavLink
            to="/app/admin/analytics"
            className={({ isActive }) => `mobile-v10-link ${isActive ? 'active' : ''}`}
          >
            <BarChart3 size={16} aria-hidden="true" />
            <span>Admin</span>
          </NavLink>
        )}
      </nav>
    </div>
  );
}
