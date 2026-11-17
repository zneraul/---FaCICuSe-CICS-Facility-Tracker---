import React, { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Menu, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import { PROJECT_INFO } from '../../server/domain/projectInfo.js';

export const PUBLIC_SECTIONS = [
  { id: 'home', label: 'Home' },
  { id: 'about', label: 'About' },
  { id: 'facilities', label: 'Facilities' },
  { id: 'how-it-works', label: 'How It Works' },
  { id: 'reservations', label: 'Reservations' },
  { id: 'maintenance', label: 'Maintenance' },
  { id: 'features', label: 'Features' },
  { id: 'user-roles', label: 'User Roles' },
  { id: 'faq', label: 'FAQ' },
  { id: 'contact', label: 'Contact' },
];

export function PublicLayout({ children }) {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const isHomepage = location.pathname === '/';

  const initialHash = location.hash ? location.hash.replace('#', '') : '';
  const [activeSection, setActiveSection] = useState(
    isHomepage
      ? PUBLIC_SECTIONS.some((s) => s.id === initialHash)
        ? initialHash
        : 'home'
      : ''
  );
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const manualLockUntilRef = useRef(0);

  // Handle direct URLs with #hash and browser refresh on the homepage
  useEffect(() => {
    if (!isHomepage) {
      setActiveSection('');
      return;
    }

    const hashId = location.hash ? location.hash.replace('#', '') : '';
    if (hashId && PUBLIC_SECTIONS.some((s) => s.id === hashId)) {
      setActiveSection(hashId);
      manualLockUntilRef.current = Date.now() + 1000;
      const scrollToTarget = (behavior = 'smooth') => {
        const el = document.getElementById(hashId);
        if (el) {
          el.scrollIntoView({ behavior, block: 'start' });
        }
      };
      const timer1 = window.setTimeout(() => scrollToTarget('smooth'), 60);
      const timer2 = window.setTimeout(() => {
        const el = document.getElementById(hashId);
        if (el && Math.abs(el.getBoundingClientRect().top - 88) > 100) {
          scrollToTarget('auto');
        }
      }, 520);
      return () => {
        window.clearTimeout(timer1);
        window.clearTimeout(timer2);
      };
    }

    setActiveSection('home');
  }, [isHomepage, location.hash]);

  // IntersectionObserver + edge fallback for reliable scroll-aware active highlights
  useEffect(() => {
    if (!isHomepage) return undefined;

    const visibleRatios = new Map();

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            visibleRatios.set(entry.target.id, entry.intersectionRatio);
          } else {
            visibleRatios.delete(entry.target.id);
          }
        }

        if (Date.now() < manualLockUntilRef.current) return;

        if (window.scrollY < 70) {
          setActiveSection('home');
          return;
        }

        const nearBottom =
          window.innerHeight + window.scrollY >=
          document.documentElement.scrollHeight - 40;
        if (nearBottom) {
          setActiveSection('contact');
          return;
        }

        // Pick the section closest to the top reading band below the sticky header
        let bestId = '';
        let bestScore = -Infinity;
        for (const sec of PUBLIC_SECTIONS) {
          const el = document.getElementById(sec.id);
          if (!el) continue;
          const rect = el.getBoundingClientRect();
          if (rect.bottom < 88 || rect.top > window.innerHeight * 0.72) continue;
          const headerDistance = Math.abs(rect.top - 104);
          const ratioBonus = (visibleRatios.get(sec.id) || 0) * 200;
          const score = ratioBonus - headerDistance;
          if (score > bestScore) {
            bestScore = score;
            bestId = sec.id;
          }
        }

        if (bestId) {
          setActiveSection(bestId);
        }
      },
      {
        rootMargin: '-88px 0px -35% 0px',
        threshold: [0, 0.1, 0.25, 0.5, 0.75],
      }
    );

    const observedElements = [];
    for (const sec of PUBLIC_SECTIONS) {
      const el = document.getElementById(sec.id);
      if (el) {
        observer.observe(el);
        observedElements.push(el);
      }
    }

    const handleEdgeScroll = () => {
      if (Date.now() < manualLockUntilRef.current) return;
      if (window.scrollY < 70) {
        setActiveSection('home');
        return;
      }
      const nearBottom =
        window.innerHeight + window.scrollY >=
        document.documentElement.scrollHeight - 40;
      if (nearBottom) {
        setActiveSection('contact');
      }
    };

    window.addEventListener('scroll', handleEdgeScroll, { passive: true });

    return () => {
      observer.disconnect();
      window.removeEventListener('scroll', handleEdgeScroll);
    };
  }, [isHomepage]);

  function handleSectionNavigate(e, sectionId) {
    e.preventDefault();
    setMobileMenuOpen(false);

    if (!isHomepage) {
      window.location.assign(`/#${sectionId}`);
      return;
    }

    setActiveSection(sectionId);
    manualLockUntilRef.current = Date.now() + 800;
    window.history.replaceState(null, '', `#${sectionId}`);

    if (sectionId === 'home') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    const target = document.getElementById(sectionId);
    if (target) {
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  return (
    <div className="ambient-canvas">
      <div className="ambient-backdrop" aria-hidden="true" />
      <div className="ambient-scrim" aria-hidden="true" />

      <header className="public-header">
        <div className="public-header-inner">
          <a
            href={isHomepage ? '#home' : '/#home'}
            className="brand-lockup"
            onClick={(e) => handleSectionNavigate(e, 'home')}
          >
            <span className="brand-logo-badge">
              <img
                src="/assets/aistudio/facicuse-logo_3cb5a6f2.png"
                alt="FaCICuSe logo"
                className="brand-logo-img"
                style={{ width: '28px', height: '28px' }}
              />
            </span>
            <span className="brand-wordmark">FaCICuSe</span>
          </a>

          <nav className="public-nav-links" aria-label="Primary navigation">
            {PUBLIC_SECTIONS.map((sec) => {
              const isActive = isHomepage && activeSection === sec.id;
              return (
                <a
                  key={sec.id}
                  href={isHomepage ? `#${sec.id}` : `/#${sec.id}`}
                  aria-current={isActive ? 'location' : undefined}
                  className={`public-nav-link ${isActive ? 'active' : ''}`}
                  onClick={(e) => handleSectionNavigate(e, sec.id)}
                >
                  {sec.label}
                </a>
              );
            })}
          </nav>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', flexShrink: 0 }}>
            {user ? (
              <Link to="/app/dashboard" className="btn btn-coral btn-sm">
                Open Workspace
              </Link>
            ) : (
              <Link to="/signin" className="btn btn-coral btn-sm">
                Sign In
              </Link>
            )}

            <button
              type="button"
              className="icon-btn public-mobile-toggle"
              aria-label={mobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
              aria-expanded={mobileMenuOpen}
              aria-controls="public-mobile-menu"
              onClick={() => setMobileMenuOpen((prev) => !prev)}
            >
              {mobileMenuOpen ? <X size={19} /> : <Menu size={19} />}
            </button>
          </div>
        </div>

        {mobileMenuOpen && (
          <nav
            id="public-mobile-menu"
            className="public-mobile-drawer"
            aria-label="Mobile section navigation"
          >
            {PUBLIC_SECTIONS.map((sec) => {
              const isActive = isHomepage && activeSection === sec.id;
              return (
                <a
                  key={sec.id}
                  href={isHomepage ? `#${sec.id}` : `/#${sec.id}`}
                  aria-current={isActive ? 'location' : undefined}
                  className={`public-mobile-link ${isActive ? 'active' : ''}`}
                  onClick={(e) => handleSectionNavigate(e, sec.id)}
                >
                  <span>{sec.label}</span>
                  {isActive && <span style={{ fontSize: '0.75rem', opacity: 0.9 }}>Viewing</span>}
                </a>
              );
            })}
          </nav>
        )}
      </header>

      <main className="public-main">{children}</main>

      <footer id="contact" className="public-footer" style={{ scrollMarginTop: '5.5rem' }}>
        <div className="public-footer-inner">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
            <a
              href={isHomepage ? '#home' : '/#home'}
              className="brand-lockup"
              onClick={(e) => handleSectionNavigate(e, 'home')}
            >
              <span className="brand-logo-badge">
                <img
                  src="/assets/aistudio/facicuse-logo_3cb5a6f2.png"
                  alt="FaCICuSe logo"
                  className="brand-logo-img"
                  style={{ width: '28px', height: '28px' }}
                />
              </span>
              <span className="brand-wordmark">FaCICuSe</span>
            </a>
            <p style={{ fontSize: '0.9rem', color: 'var(--ink-secondary)', maxWidth: '36ch' }}>
              <strong>{PROJECT_INFO.meaning}</strong> — {PROJECT_INFO.tagline}.
            </p>
            <address style={{ fontStyle: 'normal', fontSize: '0.84rem', color: 'var(--ink-muted)', lineHeight: 1.6 }}>
              {PROJECT_INFO.college}
              <br />
              {PROJECT_INFO.institutionShort}
              <br />
              {PROJECT_INFO.campusAddress}
              <br />
              Email:{' '}
              <a href={`mailto:${PROJECT_INFO.contactEmail}`} style={{ color: 'var(--accent-blue)' }}>
                {PROJECT_INFO.contactEmail}
              </a>
            </address>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem', fontSize: '0.9rem' }}>
            <strong style={{ fontSize: '0.85rem', color: 'var(--ink-muted)' }}>Homepage Sections</strong>
            <a href={isHomepage ? '#home' : '/#home'} onClick={(e) => handleSectionNavigate(e, 'home')}>Home</a>
            <a href={isHomepage ? '#about' : '/#about'} onClick={(e) => handleSectionNavigate(e, 'about')}>About FaCICuSe</a>
            <a href={isHomepage ? '#facilities' : '/#facilities'} onClick={(e) => handleSectionNavigate(e, 'facilities')}>Campus Facilities</a>
            <a href={isHomepage ? '#how-it-works' : '/#how-it-works'} onClick={(e) => handleSectionNavigate(e, 'how-it-works')}>How It Works</a>
            <a href={isHomepage ? '#reservations' : '/#reservations'} onClick={(e) => handleSectionNavigate(e, 'reservations')}>Live Availability</a>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem', fontSize: '0.9rem' }}>
            <strong style={{ fontSize: '0.85rem', color: 'var(--ink-muted)' }}>Official Project Pages</strong>
            <a href="/about">Project Overview (37 CICS Rooms)</a>
            <a href="/team">Team &amp; Course Context</a>
            <a href={isHomepage ? '#maintenance' : '/#maintenance'} onClick={(e) => handleSectionNavigate(e, 'maintenance')}>Maintenance Reporting</a>
            <a href={isHomepage ? '#features' : '/#features'} onClick={(e) => handleSectionNavigate(e, 'features')}>Platform Features</a>
            <a href={isHomepage ? '#faq' : '/#faq'} onClick={(e) => handleSectionNavigate(e, 'faq')}>Frequently Asked Questions</a>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem', fontSize: '0.9rem' }}>
            <strong style={{ fontSize: '0.85rem', color: 'var(--ink-muted)' }}>Campus Access</strong>
            <Link to="/facilities">Full Facility Directory</Link>
            <Link to="/signin">University Sign In</Link>
            <Link to="/app/dashboard">Authenticated Workspace</Link>
            <span style={{ color: 'var(--ink-muted)', marginTop: '0.45rem', fontSize: '0.82rem' }}>
              {PROJECT_INFO.copyright}
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}
