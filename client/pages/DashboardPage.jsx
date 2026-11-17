import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, CalendarDays, CalendarPlus, Wrench } from 'lucide-react';
import { AppShell } from '../components/AppShell.jsx';
import { apiRequest } from '../services/api.js';

export function DashboardPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    setLoading(true);
    apiRequest('/dashboard')
      .then((res) => {
        if (active) setData(res);
      })
      .catch((err) => {
        if (active) setError(err.message || 'Failed to load dashboard.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const primaryAction = (
    <Link to="/app/facilities" className="btn btn-coral btn-sm">
      <CalendarPlus size={16} aria-hidden="true" />
      <span>New Reservation</span>
    </Link>
  );

  if (loading) {
    return (
      <AppShell title="Dashboard" primaryAction={primaryAction}>
        <div className="glass-panel" style={{ padding: '2.5rem', textAlign: 'center' }}>
          Loading your campus workspace...
        </div>
      </AppShell>
    );
  }

  if (error || !data) {
    return (
      <AppShell title="Dashboard" primaryAction={primaryAction}>
        <div className="alert-banner alert-error" role="alert">
          {error || 'Dashboard data unavailable.'}
        </div>
      </AppShell>
    );
  }

  const { user, metrics, recentIssues } = data;
  const isAdmin = user.role === 'admin';
  const roleLabel =
    user.role === 'admin'
      ? 'System Administrator'
      : user.role === 'professor'
        ? 'Faculty Member'
        : 'Student';

  return (
    <AppShell title="Dashboard" primaryAction={primaryAction}>
      {/* V24 Hero Row: Coral Greeting Overview + Upcoming Schedule Card */}
      <div className="dashboard-hero-grid">
        <section className="v24-hero-card" aria-label="Workspace overview">
          <div>
            <div style={{ fontSize: '0.84rem', color: 'rgba(255,255,255,0.85)', marginBottom: '0.35rem' }}>
              {roleLabel} · {user.department || 'Academic Campus'}
            </div>
            <h2 style={{ fontSize: '1.75rem', fontWeight: 700, color: '#ffffff' }}>
              Good day, {user.fullName}
            </h2>
            <p className="v24-hero-sub" style={{ marginTop: '0.45rem' }}>
              {isAdmin
                ? 'Coordinate CICS Building spaces, review pending booking requests, and track open maintenance reports across all 5 floors.'
                : 'Inspect live CICS facility availability, track your reservation approvals, and report space maintenance issues.'}
            </p>
          </div>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem' }}>
            {isAdmin ? (
              <>
                <Link to="/app/admin/reservations" className="btn btn-on-coral btn-sm">
                  <span>Review Pending Queue</span>
                  <ArrowRight size={15} aria-hidden="true" />
                </Link>
                <Link to="/app/admin/analytics" className="btn btn-glass btn-sm" style={{ background: 'rgba(255,255,255,0.18)', color: '#fff', borderColor: 'rgba(255,255,255,0.32)' }}>
                  Open Admin Analytics
                </Link>
              </>
            ) : (
              <>
                <Link to="/app/facilities" className="btn btn-on-coral btn-sm">
                  <span>Explore Facilities</span>
                  <ArrowRight size={15} aria-hidden="true" />
                </Link>
                <Link to="/app/issues" className="btn btn-glass btn-sm" style={{ background: 'rgba(255,255,255,0.18)', color: '#fff', borderColor: 'rgba(255,255,255,0.32)' }}>
                  Report Maintenance Issue
                </Link>
              </>
            )}
          </div>

          <div className="v24-hero-metrics">
            <div>
              <div className="v24-hero-metric-val">{metrics.pendingReservations}</div>
              <div className="v24-hero-metric-label">
                {isAdmin ? 'Pending Campus Requests' : 'Pending Approvals'}
              </div>
            </div>
            <div>
              <div className="v24-hero-metric-val">{metrics.confirmedReservations}</div>
              <div className="v24-hero-metric-label">
                {isAdmin ? 'Confirmed Bookings' : 'My Confirmed Slots'}
              </div>
            </div>
            <div>
              <div className="v24-hero-metric-val">{metrics.openIssues}</div>
              <div className="v24-hero-metric-label">Active Maintenance Issues</div>
            </div>
          </div>
        </section>

        <section className="glass-panel" aria-label="Upcoming schedule">
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '0.85rem',
            }}
          >
            <h2 style={{ fontSize: '1.12rem' }}>Upcoming Schedule</h2>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
              <Link
                to="/app/calendar"
                style={{ fontSize: '0.82rem', fontWeight: 600, color: '#93c5fd', display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}
              >
                <CalendarDays size={14} aria-hidden="true" />
                <span>Calendar</span>
              </Link>
              <Link
                to={isAdmin ? '/app/admin/reservations' : '/app/reservations'}
                style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--accent-coral)' }}
              >
                View All
              </Link>
            </div>
          </div>

          {metrics.upcomingSchedule.length === 0 ? (
            <div style={{ padding: '1.25rem 0', color: 'var(--ink-secondary)', fontSize: '0.9rem' }}>
              <p>No upcoming scheduled reservations.</p>
              <Link to="/app/facilities" className="btn btn-glass btn-sm" style={{ marginTop: '0.75rem' }}>
                Browse Available Spaces
              </Link>
            </div>
          ) : (
            <div className="schedule-list">
              {metrics.upcomingSchedule.map((item) => (
                <div key={item.id} className="schedule-row">
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: '0.92rem' }}>
                      {item.facilityName}
                    </div>
                    <div className="meta-line">
                      <span className="tabular">{item.reservationDate}</span>
                      <span aria-hidden="true">·</span>
                      <span className="tabular">
                        {item.startTime}–{item.endTime}
                      </span>
                      {item.academicBlock && (
                        <>
                          <span aria-hidden="true">·</span>
                          <span className="tabular">{item.academicBlock}</span>
                        </>
                      )}
                    </div>
                  </div>
                  <span
                    className={`status-text status-${item.status.toLowerCase().replace(/\s+/g, '-')}`}
                  >
                    {item.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      {/* Compact Stat Cards Row */}
      <section className="stats-row" aria-label="Key recorded counts">
        <div className="stat-card">
          <span className="stat-card-label">Available Facilities</span>
          <span className="stat-card-value">{metrics.availableFacilitiesCount}</span>
          <span className="stat-card-foot">
            Out of <span className="tabular">{metrics.totalFacilitiesCount}</span> CICS spaces
          </span>
        </div>

        <div className="stat-card">
          <span className="stat-card-label">
            {isAdmin ? 'Total Recorded Bookings' : 'My Total Reservations'}
          </span>
          <span className="stat-card-value">{metrics.totalReservations}</span>
          <span className="stat-card-foot">Active & past records</span>
        </div>

        <div className="stat-card">
          <span className="stat-card-label">Pending Review</span>
          <span className="stat-card-value">{metrics.pendingReservations}</span>
          <span className="stat-card-foot">Awaiting admin action</span>
        </div>

        <div className="stat-card">
          <span className="stat-card-label">Maintenance Reports</span>
          <span className="stat-card-value">{metrics.totalIssues}</span>
          <span className="stat-card-foot">
            <span className="tabular">{metrics.openIssues}</span> currently open/in progress
          </span>
        </div>
      </section>

      {/* Bottom Two-Column Section */}
      <div className="two-col-grid">
        <section className="glass-panel" aria-label="Maintenance updates">
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '0.85rem',
            }}
          >
            <h2 style={{ fontSize: '1.12rem' }}>Recent Maintenance Updates</h2>
            <Link
              to={isAdmin ? '/app/admin/maintenance' : '/app/issues'}
              style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--accent-coral)' }}
            >
              Manage Issues
            </Link>
          </div>

          {recentIssues.length === 0 ? (
            <p style={{ fontSize: '0.9rem', color: 'var(--ink-secondary)' }}>
              No maintenance reports have been logged yet.
            </p>
          ) : (
            <div className="schedule-list">
              {recentIssues.map((issue) => (
                <div key={issue.id} className="schedule-row">
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: '0.92rem' }}>{issue.title}</div>
                    <div className="meta-line">
                      <span>{issue.facilityName}</span>
                      <span aria-hidden="true">·</span>
                      <span>{issue.category}</span>
                      <span aria-hidden="true">·</span>
                      <span>Priority: {issue.priority}</span>
                    </div>
                  </div>
                  <span
                    className={`status-text status-${issue.status.toLowerCase().replace(/\s+/g, '-')}`}
                  >
                    {issue.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="glass-panel" aria-label="Coordination guidelines">
          <h2 style={{ fontSize: '1.12rem', marginBottom: '0.65rem' }}>
            Campus Coordination Notes
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem', fontSize: '0.9rem', color: 'var(--ink-secondary)' }}>
            <p>
              All reservation counts and scheduled hours shown here are calculated directly
              from confirmed and pending booking records.
            </p>
            <p>
              A confirmed booking reserves calendar time for the requested room and never
              represents physical sensor occupancy.
            </p>
            <div style={{ marginTop: '0.35rem', display: 'flex', gap: '0.65rem', flexWrap: 'wrap' }}>
              <Link to="/app/facilities" className="btn btn-glass btn-sm">
                Check Facility Availability
              </Link>
              <Link to="/app/issues" className="btn btn-glass btn-sm">
                <Wrench size={15} aria-hidden="true" />
                <span>Log Facility Issue</span>
              </Link>
            </div>
          </div>
        </section>
      </div>
    </AppShell>
  );
}
