'use strict';

(function initFacicuseProjectSync() {
  const headerAuthCta = document.getElementById('header-auth-cta');
  const heroAuthCta = document.getElementById('hero-auth-cta');
  const previewAuthCta = document.getElementById('preview-auth-cta');
  const ctaAuthLink = document.getElementById('cta-auth-link');

  // 1. Sync Sign In CTAs using live Express session cookie
  async function syncAuthCtas() {
    try {
      const res = await fetch('/api/auth/session', { credentials: 'include' });
      if (!res.ok) return;
      const data = await res.json();
      const isSignedIn = Boolean(data && (data.authenticated || data.user));
      if (!isSignedIn) return;

      if (headerAuthCta) {
        headerAuthCta.href = '/app/dashboard';
        headerAuthCta.textContent = 'Open Workspace';
      }
      if (heroAuthCta) {
        heroAuthCta.href = '/app/dashboard';
        heroAuthCta.textContent = 'Open Workspace';
      }
      if (previewAuthCta) {
        previewAuthCta.href = '/app/calendar';
        previewAuthCta.textContent = 'Open Calendar & Request';
      }
      if (ctaAuthLink) {
        ctaAuthLink.href = '/app/dashboard';
        ctaAuthLink.textContent = 'Open Workspace';
      }
    } catch {
      // Keep default Sign In link for visitors
    }
  }

  // 2. Subpage Mobile Drawer Handler (index.html attaches its own inside landing.js)
  function initSubpageMobileDrawer() {
    if (document.getElementById('landing-facilities-container')) return;

    const mobileToggle = document.getElementById('public-mobile-toggle');
    const mobileDrawer = document.getElementById('public-mobile-menu');
    if (!mobileToggle || !mobileDrawer) return;

    function setOpen(open) {
      mobileDrawer.hidden = !open;
      mobileToggle.setAttribute('aria-expanded', open ? 'true' : 'false');
      mobileToggle.setAttribute('aria-label', open ? 'Close navigation menu' : 'Open navigation menu');
    }

    mobileToggle.addEventListener('click', () => {
      setOpen(mobileToggle.getAttribute('aria-expanded') !== 'true');
    });

    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') setOpen(false);
    });

    window.addEventListener('resize', () => {
      if (window.innerWidth > 1120) setOpen(false);
    });

    mobileDrawer.querySelectorAll('a').forEach((link) => {
      link.addEventListener('click', () => setOpen(false));
    });
  }

  // 3. Hydrate shared project metadata from backend single source of truth (/api/public/project-info)
  function resolvePath(obj, dotPath) {
    return dotPath.split('.').reduce((acc, part) => (acc && acc[part] !== undefined ? acc[part] : null), obj);
  }

  function hydrateProjectFields(project) {
    if (!project) return;
    document.querySelectorAll('[data-project-field]').forEach((el) => {
      const key = el.getAttribute('data-project-field');
      if (!key) return;
      const val = resolvePath(project, key);
      if (typeof val === 'string' || typeof val === 'number') {
        el.textContent = String(val);
        if (key === 'contactEmail' && el.tagName === 'A') {
          el.setAttribute('href', 'mailto:' + val);
        }
      }
    });
  }

  // 4. Interactive CICS 5-Floor 37-Facility Explorer (on /about)
  function initCicsCatalogExplorer(catalog) {
    const grid = document.getElementById('cics-facilities-grid');
    if (!grid) return;

    const categoryTabs = Array.from(document.querySelectorAll('#cics-category-tabs [data-cics-category]'));
    const floorSelect = document.getElementById('cics-floor-select');
    const countLabel = document.getElementById('cics-filtered-count');

    const state = {
      category: 'All',
      floor: 'All Floors',
    };

    function statusCategoryClass(cat) {
      if (cat === 'Learning') return 'status-available';
      if (cat === 'Administrative') return 'status-pending';
      return 'status-confirmed';
    }

    function renderCatalog() {
      const filtered = (catalog || []).filter((room) => {
        if (state.category !== 'All' && room.category !== state.category) return false;
        if (state.floor !== 'All Floors' && room.floor !== state.floor) return false;
        return true;
      });

      if (countLabel) {
        countLabel.textContent =
          'Showing ' + filtered.length + ' of ' + (catalog ? catalog.length : 0) + ' CICS Building rooms';
      }

      grid.textContent = '';

      if (filtered.length === 0) {
        const empty = document.createElement('div');
        empty.className = 'glass-panel state-panel-center';
        empty.style.gridColumn = '1 / -1';
        const p = document.createElement('p');
        p.className = 'card-body-copy';
        p.textContent = 'No CICS Building spaces match the selected floor and category filter.';
        empty.appendChild(p);
        grid.appendChild(empty);
        return;
      }

      filtered.forEach((room) => {
        const card = document.createElement('article');
        card.className = 'glass-panel cics-room-card';

        const meta = document.createElement('div');
        meta.className = 'meta-line';

        const codeSpan = document.createElement('span');
        codeSpan.className = 'tabular';
        codeSpan.textContent = room.code || '';

        const dot0 = document.createElement('span');
        dot0.setAttribute('aria-hidden', 'true');
        dot0.textContent = '·';

        const floorSpan = document.createElement('span');
        floorSpan.textContent = room.floor || '';

        const dot = document.createElement('span');
        dot.setAttribute('aria-hidden', 'true');
        dot.textContent = '·';

        const catSpan = document.createElement('span');
        catSpan.className = 'status-text ' + statusCategoryClass(room.category);
        catSpan.textContent = room.category || '';

        if (room.code) {
          meta.append(codeSpan, dot0, floorSpan, dot, catSpan);
        } else {
          meta.append(floorSpan, dot, catSpan);
        }

        const title = document.createElement('h3');
        title.className = 'cics-room-title';
        title.textContent = room.name || '';

        const desc = document.createElement('p');
        desc.className = 'cics-room-desc';
        desc.textContent = room.description || '';

        const footer = document.createElement('div');
        footer.className = 'facility-card-footer';
        footer.style.marginTop = 'auto';
        footer.style.paddingTop = '0.55rem';

        const statusBadge = document.createElement('span');
        statusBadge.style.fontSize = '0.78rem';
        statusBadge.style.color = 'var(--ink-muted)';
        statusBadge.textContent =
          (room.status || 'Available') +
          (room.isReservable === false ? ' · Directory only' : ' · Bookable');

        footer.appendChild(statusBadge);

        if (room.id) {
          const link = document.createElement('a');
          link.className = 'btn btn-glass btn-sm';
          link.href = '/facilities/' + encodeURIComponent(room.id);
          link.textContent = 'Open Room';
          footer.appendChild(link);
        }

        card.append(meta, title, desc, footer);
        grid.appendChild(card);
      });
    }

    categoryTabs.forEach((tab) => {
      tab.addEventListener('click', () => {
        state.category = tab.getAttribute('data-cics-category') || 'All';
        categoryTabs.forEach((btn) => {
          const active = btn === tab;
          btn.classList.toggle('active', active);
          btn.setAttribute('aria-selected', active ? 'true' : 'false');
        });
        renderCatalog();
      });
    });

    if (floorSelect) {
      floorSelect.addEventListener('change', () => {
        state.floor = floorSelect.value || 'All Floors';
        renderCatalog();
      });
    }

    renderCatalog();
  }

  // 5. Sync Team Cards cleanly from Single Source of Truth (on /team)
  function syncTeamMembers(project) {
    const container = document.getElementById('team-members-container');
    if (!container || !project || !Array.isArray(project.teamMembers)) return;

    const existingCards = container.querySelectorAll('.team-member-card');
    if (existingCards.length !== project.teamMembers.length) return;

    project.teamMembers.forEach((member, idx) => {
      const card = existingCards[idx];
      const nameEl = card.querySelector('.team-member-name');
      const roleEl = card.querySelector('.team-member-role');
      const dirEl = card.querySelector('.team-member-directory');
      if (nameEl) nameEl.textContent = member.name;
      if (roleEl) roleEl.textContent = member.role;
      if (dirEl) dirEl.textContent = member.directoryName;
    });
  }

  function renderAcademicBlockReference(ref) {
    const grid = document.getElementById('academic-block-grid');
    const ruleCode = document.getElementById('block-rule-code');
    const noteEl = document.getElementById('academic-block-note');
    if (!grid || !ref) return;

    if (ruleCode && ref.namingRule) {
      ruleCode.textContent = ref.namingRule;
    }
    if (noteEl && ref.discrepancyNote) {
      noteEl.textContent = ref.discrepancyNote;
    }

    grid.textContent = '';
    (ref.examplesByYear || []).forEach((item) => {
      const card = document.createElement('article');
      card.className = 'glass-panel cics-room-card';

      const k = document.createElement('span');
      k.className = 'step-number';
      k.textContent = item.yearLabel || '';

      const title = document.createElement('h3');
      title.className = 'cics-room-title';
      title.textContent = '1st Sem: ' + (item.firstSem || '') + ' · 2nd Sem: ' + (item.secondSem || '');

      card.append(k, title);
      grid.appendChild(card);
    });
  }

  async function loadProjectInfo() {
    try {
      const [infoRes, facRes] = await Promise.all([
        fetch('/api/public/project-info'),
        fetch('/api/public/facilities'),
      ]);
      if (!infoRes.ok) throw new Error('Unable to load project information.');
      const data = await infoRes.json();
      if (data && data.project) {
        hydrateProjectFields(data.project);
        syncTeamMembers(data.project);
      }
      if (data && data.academicBlockReference) {
        renderAcademicBlockReference(data.academicBlockReference);
      }
      let catalog = data && Array.isArray(data.cicsFacilities) ? data.cicsFacilities : [];
      if (facRes.ok) {
        const facData = await facRes.json();
        if (facData && Array.isArray(facData.facilities) && facData.facilities.length > 0) {
          catalog = facData.facilities;
        }
      }
      if (catalog.length > 0) {
        initCicsCatalogExplorer(catalog);
      }
    } catch {
      const grid = document.getElementById('cics-facilities-grid');
      if (grid && grid.children.length === 0) {
        grid.innerHTML =
          '<div class="glass-panel state-panel-center" style="grid-column:1 / -1;">Unable to load CICS Building facility list right now.</div>';
      }
    }
  }

  syncAuthCtas();
  initSubpageMobileDrawer();
  loadProjectInfo();
})();
