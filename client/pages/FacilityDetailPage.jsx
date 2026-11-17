import React, { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Calendar, CheckCircle2, Clock, MapPin, Users } from 'lucide-react';
import { PublicLayout } from '../components/PublicLayout.jsx';
import { AppShell } from '../components/AppShell.jsx';
import { FacilityImage } from '../components/FacilityImage.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { apiRequest } from '../services/api.js';

function getDefaultDate() {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toISOString().slice(0, 10);
}

export function FacilityDetailPage({ authenticated = false }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedDate, setSelectedDate] = useState(getDefaultDate);

  // Reservation Form State
  const [startTime, setStartTime] = useState('10:00');
  const [endTime, setEndTime] = useState('11:30');
  const [attendeesCount, setAttendeesCount] = useState('30');
  const [academicBlock, setAcademicBlock] = useState(user?.academicBlock || '');
  const [purpose, setPurpose] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [submitSuccess, setSubmitSuccess] = useState('');

  useEffect(() => {
    if (user?.academicBlock) {
      setAcademicBlock((prev) => prev || user.academicBlock);
    }
  }, [user]);

  const loadDetail = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const endpoint = authenticated
        ? `/facilities/${id}?date=${encodeURIComponent(selectedDate)}`
        : `/public/facilities/${id}?date=${encodeURIComponent(selectedDate)}`;
      const res = await apiRequest(endpoint);
      setDetail(res);
    } catch (err) {
      setError(err.message || 'Unable to load facility details.');
    } finally {
      setLoading(false);
    }
  }, [authenticated, id, selectedDate]);

  useEffect(() => {
    loadDetail();
  }, [loadDetail]);

  async function handleReservationSubmit(e) {
    e.preventDefault();
    setSubmitError('');
    setSubmitSuccess('');
    setSubmitting(true);

    try {
      const res = await apiRequest('/reservations', {
        method: 'POST',
        body: JSON.stringify({
          facilityId: Number(id),
          reservationDate: selectedDate,
          startTime,
          endTime,
          attendeesCount: Number(attendeesCount),
          academicBlock: academicBlock.trim() || null,
          purpose,
        }),
      });
      setSubmitSuccess(
        `Reservation request #${res.reservation.id} submitted with status Pending.`
      );
      setPurpose('');
      await loadDetail();
    } catch (err) {
      setSubmitError(err.message || 'Could not submit reservation request.');
    } finally {
      setSubmitting(false);
    }
  }

  const backHref = authenticated ? '/app/facilities' : '/facilities';

  const body = loading ? (
    <div className="glass-panel" style={{ padding: '2.5rem', textAlign: 'center' }}>
      Loading facility details...
    </div>
  ) : error || !detail ? (
    <div className="glass-panel" style={{ padding: '2rem' }}>
      <div className="alert-banner alert-error">{error || 'Facility not found.'}</div>
      <Link to={backHref} className="btn btn-glass btn-sm" style={{ marginTop: '1rem' }}>
        <ArrowLeft size={16} />
        <span>Back to Directory</span>
      </Link>
    </div>
  ) : (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      <div>
        <Link to={backHref} className="btn btn-glass btn-sm">
          <ArrowLeft size={16} aria-hidden="true" />
          <span>Back to Facilities</span>
        </Link>
      </div>

      <div className="detail-split">
        {/* Left: Photo, Metadata, Amenities, Recorded Schedule */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div className="glass-panel" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ aspectRatio: '16 / 9', overflow: 'hidden' }}>
              <FacilityImage src={detail.facility.imageUrl} alt={detail.facility.name} />
            </div>

            <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>
              <div className="meta-line">
                <span className="tabular">{detail.facility.code}</span>
                <span aria-hidden="true">·</span>
                <span>{detail.facility.category}</span>
                <span aria-hidden="true">·</span>
                <span
                  className={`status-text status-${detail.facility.status.toLowerCase().replace(/\s+/g, '-')}`}
                >
                  {detail.facility.status}
                </span>
              </div>

              <h2 style={{ fontSize: '1.65rem', fontWeight: 700 }}>{detail.facility.name}</h2>
              <p style={{ color: 'var(--ink-secondary)', fontSize: '0.96rem' }}>
                {detail.facility.description}
              </p>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))',
                  gap: '0.85rem',
                  paddingTop: '0.85rem',
                  borderTop: '1px solid var(--glass-border-subtle)',
                  fontSize: '0.88rem',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <MapPin size={16} aria-hidden="true" color="var(--accent-coral)" />
                  <span>
                    {detail.facility.building} · {detail.facility.floor}
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Users size={16} aria-hidden="true" color="var(--accent-coral)" />
                  <span className="tabular">
                    Capacity:{' '}
                    {detail.facility.capacity != null
                      ? `${detail.facility.capacity} seats`
                      : 'Not specified in proposal'}
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Clock size={16} aria-hidden="true" color="var(--accent-coral)" />
                  <span className="tabular">
                    Hours: {detail.facility.openHour}–{detail.facility.closeHour}
                  </span>
                </div>
              </div>

              <div style={{ paddingTop: '0.75rem', borderTop: '1px solid var(--glass-border-subtle)' }}>
                <strong style={{ fontSize: '0.88rem', display: 'block', marginBottom: '0.45rem' }}>
                  Equipment &amp; Amenities
                </strong>
                {Array.isArray(detail.facility.amenities) && detail.facility.amenities.length > 0 ? (
                  <div className="meta-line" style={{ color: 'var(--ink-primary)' }}>
                    {detail.facility.amenities.map((item, idx) => (
                      <React.Fragment key={item}>
                        {idx > 0 && <span aria-hidden="true">·</span>}
                        <span>{item}</span>
                      </React.Fragment>
                    ))}
                  </div>
                ) : (
                  <p style={{ fontSize: '0.86rem', color: 'var(--ink-muted)' }}>
                    No equipment inventory specified in official proposal; inspect room details with CICS faculty.
                  </p>
                )}
              </div>

              <div className="meta-line">
                <span>Permitted roles:</span>
                <span>{detail.facility.allowedRoles.join(', ')}</span>
              </div>
            </div>
          </div>

          <section className="glass-panel" aria-label="Recorded schedule">
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '0.75rem',
                marginBottom: '1rem',
              }}
            >
              <div>
                <h3 style={{ fontSize: '1.1rem' }}>Recorded Booking Windows</h3>
                <p style={{ fontSize: '0.84rem', color: 'var(--ink-muted)' }}>
                  Pending and Confirmed blocks on <span className="tabular">{selectedDate}</span>
                </p>
              </div>

              <div className="field-group" style={{ minWidth: '170px' }}>
                <label htmlFor="schedule-date-picker" className="sr-only">
                  Select schedule date
                </label>
                <input
                  id="schedule-date-picker"
                  type="date"
                  className="field-input"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                />
              </div>
            </div>

            {detail.schedule.length === 0 ? (
              <p style={{ fontSize: '0.9rem', color: 'var(--ink-secondary)' }}>
                No active reservations recorded on {selectedDate}. All windows within{' '}
                <span className="tabular">
                  {detail.facility.openHour}–{detail.facility.closeHour}
                </span>{' '}
                are open for request.
              </p>
            ) : (
              <div className="schedule-list">
                {detail.schedule.map((slot) => (
                  <div key={slot.id} className="schedule-row">
                    <div>
                      <div className="tabular" style={{ fontWeight: 600, fontSize: '0.92rem' }}>
                        {slot.startTime} – {slot.endTime}
                        {slot.academicBlock && (
                          <span style={{ marginLeft: '0.55rem', fontSize: '0.8rem', color: 'var(--accent-lavender)' }}>
                            · {slot.academicBlock}
                          </span>
                        )}
                      </div>
                      {slot.purpose && (
                        <div style={{ fontSize: '0.84rem', color: 'var(--ink-secondary)', marginTop: '0.2rem' }}>
                          {slot.purpose}
                        </div>
                      )}
                    </div>
                    <span
                      className={`status-text status-${slot.status.toLowerCase().replace(/\s+/g, '-')}`}
                    >
                      {slot.status}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>

        {/* Right: Booking Action Form */}
        <aside className="glass-panel" aria-label="Facility reservation">
          {authenticated || user ? (
            detail.facility.isReservable === false ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <h3 style={{ fontSize: '1.2rem' }}>Non-Reservable CICS Space</h3>
                <div className="alert-banner alert-info" role="status">
                  {detail.facility.category} spaces ({detail.facility.name}) are listed in the CICS Building directory for operational tracking and maintenance reporting rather than room booking.
                </div>
                <Link to="/app/issues" className="btn btn-glass">
                  Report Maintenance Issue
                </Link>
              </div>
            ) : (
              <form onSubmit={handleReservationSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div>
                  <h3 style={{ fontSize: '1.2rem' }}>Request Reservation</h3>
                  <p style={{ fontSize: '0.86rem', color: 'var(--ink-secondary)', marginTop: '0.25rem' }}>
                    Requests are checked for time conflicts and routed to CICS Facilities Administration.
                  </p>
                </div>

                {detail.facility.status !== 'Available' && (
                  <div className="alert-banner alert-error" role="status">
                    This facility is currently marked as {detail.facility.status} and cannot accept new bookings.
                  </div>
                )}

                {submitError && (
                  <div className="alert-banner alert-error" role="alert">
                    {submitError}
                  </div>
                )}

                {submitSuccess && (
                  <div className="alert-banner alert-success" role="status">
                    <CheckCircle2 size={18} style={{ flexShrink: 0, marginTop: '2px' }} />
                    <div>
                      <div>{submitSuccess}</div>
                      <button
                        type="button"
                        className="btn btn-glass btn-sm"
                        style={{ marginTop: '0.5rem' }}
                        onClick={() => navigate('/app/reservations')}
                      >
                        Track in My Reservations
                      </button>
                    </div>
                  </div>
                )}

                <div className="field-group">
                  <label htmlFor="res-date" className="field-label">
                    Reservation Date
                  </label>
                  <input
                    id="res-date"
                    type="date"
                    className="field-input"
                    required
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                  />
                </div>

                <div className="form-grid-2">
                  <div className="field-group">
                    <label htmlFor="res-start" className="field-label">
                      Start Time
                    </label>
                    <input
                      id="res-start"
                      type="time"
                      className="field-input"
                      required
                      value={startTime}
                      onChange={(e) => setStartTime(e.target.value)}
                    />
                  </div>

                  <div className="field-group">
                    <label htmlFor="res-end" className="field-label">
                      End Time
                    </label>
                    <input
                      id="res-end"
                      type="time"
                      className="field-input"
                      required
                      value={endTime}
                      onChange={(e) => setEndTime(e.target.value)}
                    />
                  </div>
                </div>

                <div className="form-grid-2">
                  <div className="field-group">
                    <label htmlFor="res-attendees" className="field-label">
                      {detail.facility.capacity != null
                        ? `Expected Attendees (Max ${detail.facility.capacity})`
                        : 'Expected Attendees'}
                    </label>
                    <input
                      id="res-attendees"
                      type="number"
                      min="1"
                      max={detail.facility.capacity != null ? detail.facility.capacity : undefined}
                      className="field-input"
                      required
                      value={attendeesCount}
                      onChange={(e) => setAttendeesCount(e.target.value)}
                    />
                  </div>

                  <div className="field-group">
                    <label htmlFor="res-academic-block" className="field-label">
                      Academic Block (Optional)
                    </label>
                    <input
                      id="res-academic-block"
                      type="text"
                      className="field-input"
                      placeholder="e.g. IT-3106"
                      maxLength={12}
                      value={academicBlock}
                      onChange={(e) => setAcademicBlock(e.target.value.toUpperCase())}
                    />
                  </div>
                </div>

                <div className="field-group">
                  <label htmlFor="res-purpose" className="field-label">
                    Academic or Event Purpose
                  </label>
                  <textarea
                    id="res-purpose"
                    className="field-textarea"
                    required
                    minLength={5}
                    maxLength={300}
                    placeholder="Describe the course session, lab activity, or student meeting..."
                    value={purpose}
                    onChange={(e) => setPurpose(e.target.value)}
                  />
                </div>

                <button
                  type="submit"
                  className="btn btn-coral"
                  disabled={submitting || detail.facility.status !== 'Available'}
                >
                  <Calendar size={17} aria-hidden="true" />
                  <span>{submitting ? 'Validating & Submitting...' : 'Submit Reservation Request'}</span>
                </button>
              </form>
            )
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <h3 style={{ fontSize: '1.2rem' }}>
                {detail.facility.isReservable === false
                  ? 'Directory & Maintenance Status'
                  : 'Ready to reserve this space?'}
              </h3>
              <p style={{ fontSize: '0.92rem', color: 'var(--ink-secondary)' }}>
                Sign in with your university account to{' '}
                {detail.facility.isReservable === false
                  ? `report maintenance issues or view operational details for ${detail.facility.name}.`
                  : `submit a reservation request, track approval status, or report maintenance issues for ${detail.facility.name}.`}
              </p>
              <Link to="/signin" className="btn btn-coral">
                Sign In to Workspace
              </Link>
            </div>
          )}
        </aside>
      </div>
    </div>
  );

  if (authenticated) {
    return <AppShell title={detail?.facility?.name || 'Facility Detail'}>{body}</AppShell>;
  }

  return <PublicLayout>{body}</PublicLayout>;
}
