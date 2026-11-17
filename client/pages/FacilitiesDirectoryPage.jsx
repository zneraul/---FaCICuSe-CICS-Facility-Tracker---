import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Search } from 'lucide-react';
import { PublicLayout } from '../components/PublicLayout.jsx';
import { AppShell } from '../components/AppShell.jsx';
import { FacilityImage } from '../components/FacilityImage.jsx';
import { apiRequest } from '../services/api.js';

const CATEGORIES = ['All', 'Learning', 'Administrative', 'Support'];
const FLOORS = ['All Floors', 'First Floor', 'Second Floor', 'Third Floor', 'Fourth Floor', 'Fifth Floor'];

export function FacilitiesDirectoryPage({ authenticated = false }) {
  const [facilities, setFacilities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('All');
  const [floorFilter, setFloorFilter] = useState('All Floors');
  const [statusFilter, setStatusFilter] = useState('All');

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');
    const params = new URLSearchParams();
    if (search.trim()) params.set('search', search.trim());
    if (category !== 'All') params.set('category', category);
    if (floorFilter !== 'All Floors') params.set('floor', floorFilter);
    if (statusFilter !== 'All') params.set('status', statusFilter);

    const endpoint = authenticated
      ? `/facilities?${params.toString()}`
      : `/public/facilities?${params.toString()}`;

    apiRequest(endpoint)
      .then((res) => {
        if (active) setFacilities(res.facilities || []);
      })
      .catch((err) => {
        if (active) setError(err.message || 'Unable to load CICS facilities.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [authenticated, search, category, floorFilter, statusFilter]);

  const basePath = authenticated ? '/app/facilities' : '/facilities';

  const content = (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      <section className="glass-panel" aria-label="Search and filter CICS facilities">
        <div className="filter-bar-grid">
          <div className="field-group">
            <label htmlFor="dir-search" className="field-label">
              Search CICS facilities
            </label>
            <div style={{ position: 'relative' }}>
              <Search
                size={16}
                aria-hidden="true"
                style={{
                  position: 'absolute',
                  left: '0.8rem',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: 'var(--ink-muted)',
                }}
              />
              <input
                id="dir-search"
                type="search"
                className="field-input"
                style={{ paddingLeft: '2.35rem' }}
                placeholder="Room name, code (e.g. CICS-LAB1), or floor..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>

          <div className="field-group">
            <label htmlFor="dir-floor" className="field-label">
              Building Floor
            </label>
            <select
              id="dir-floor"
              className="field-select"
              value={floorFilter}
              onChange={(e) => setFloorFilter(e.target.value)}
            >
              {FLOORS.map((fl) => (
                <option key={fl} value={fl}>
                  {fl}
                </option>
              ))}
            </select>
          </div>

          <div className="field-group">
            <label htmlFor="dir-status" className="field-label">
              Status
            </label>
            <select
              id="dir-status"
              className="field-select"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="All">All Statuses</option>
              <option value="Available">Available</option>
              <option value="Maintenance">Maintenance</option>
              <option value="Restricted">Restricted</option>
            </select>
          </div>
        </div>

        <div style={{ marginTop: '1rem', overflowX: 'auto', paddingBottom: '0.2rem' }}>
          <div className="v10-tabs" role="tablist" aria-label="Facility category filter">
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                type="button"
                role="tab"
                aria-selected={category === cat}
                className={`v10-tab-btn ${category === cat ? 'active' : ''}`}
                onClick={() => setCategory(cat)}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>
      </section>

      {error && (
        <div className="alert-banner alert-error" role="alert">
          {error}
        </div>
      )}

      {loading ? (
        <div className="glass-panel" style={{ padding: '2.5rem', textAlign: 'center' }}>
          Loading CICS Building spaces...
        </div>
      ) : facilities.length === 0 ? (
        <div className="glass-panel" style={{ padding: '2.5rem', textAlign: 'center' }}>
          <p style={{ color: 'var(--ink-secondary)' }}>
            No CICS facilities matched your search criteria.
          </p>
          <button
            type="button"
            className="btn btn-glass btn-sm"
            style={{ marginTop: '0.85rem' }}
            onClick={() => {
              setSearch('');
              setCategory('All');
              setFloorFilter('All Floors');
              setStatusFilter('All');
            }}
          >
            Clear All Filters
          </button>
        </div>
      ) : (
        <div className="facilities-grid">
          {facilities.map((facility) => (
            <article key={facility.id} className="facility-card">
              <div className="facility-media-wrap">
                <FacilityImage src={facility.imageUrl} alt={facility.name} />
              </div>

              <div className="facility-card-body">
                <div className="meta-line">
                  <span className="tabular">{facility.code}</span>
                  <span aria-hidden="true">·</span>
                  <span>{facility.category}</span>
                  <span aria-hidden="true">·</span>
                  <span
                    className={`status-text status-${facility.status.toLowerCase().replace(/\s+/g, '-')}`}
                  >
                    {facility.status}
                  </span>
                </div>

                <h2 className="facility-card-title">{facility.name}</h2>
                <p className="facility-card-desc">{facility.description}</p>

                <div className="meta-line">
                  <span>{facility.building}</span>
                  <span aria-hidden="true">·</span>
                  <span>{facility.floor}</span>
                  <span aria-hidden="true">·</span>
                  <span className="tabular">
                    {facility.capacity != null
                      ? `Cap. ${facility.capacity}`
                      : facility.isReservable === false
                        ? 'Non-reservable'
                        : 'Cap. Unspecified'}
                  </span>
                </div>

                <div className="facility-card-footer">
                  <span className="tabular" style={{ fontSize: '0.8rem', color: 'var(--ink-muted)' }}>
                    {facility.openHour}–{facility.closeHour}
                  </span>
                  <Link to={`${basePath}/${facility.id}`} className="btn btn-coral btn-sm">
                    {authenticated
                      ? facility.isReservable === false
                        ? 'Inspect Room'
                        : 'Inspect & Book'
                      : 'View Schedule'}
                  </Link>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );

  if (authenticated) {
    return <AppShell title="CICS Building Facilities">{content}</AppShell>;
  }

  return (
    <PublicLayout>
      <div style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: '2rem', fontWeight: 700 }}>CICS Building Facility Directory</h1>
        <p style={{ color: 'var(--ink-secondary)', marginTop: '0.35rem' }}>
          Browse all 37 Learning, Administrative, and Support spaces across the 5-floor CICS Building.
        </p>
      </div>
      {content}
    </PublicLayout>
  );
}
