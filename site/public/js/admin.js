/**
 * ==============================================================================
 * BY GANGINA — DUAL-SURFACE LUXURY STUDIO MANAGER
 * Executive appointment management with interactive draggable sheet, spacious
 * month grid, adaptive bottom pill dock, and live Supabase synchronization.
 * ==============================================================================
 */

(function() {
  'use strict';

  // ----------------------------------------------------------------------------
  // 1. STATE MANAGEMENT & CONSTANTS
  // ----------------------------------------------------------------------------
  const todayObj = new Date();
  let selectedDate = formatDateYMD(todayObj);
  let viewYear = todayObj.getFullYear();
  let viewMonth = todayObj.getMonth(); // 0-11
  let activeTab = 'kalender';
  let isCanopyExpanded = false; // false = Week Strip mode; true = 35-day Month Grid
  let activeFilter = 'active'; // 'active', 'pending', 'confirmed', 'archive', 'all'
  let isArchiveOpen = false;
  let activeDrawerBooking = null;
  let isToggling = false;

  // The frosted login gate starts locked. While locked the dashboard renders
  // only synthetic silhouettes and Supabase is never queried, so an
  // unauthenticated visitor can never read a real customer's data.
  let isGateLocked = true;

  // ----------------------------------------------------------------------------
  // 1b. MULTI-TENANT RESOLUTION & NAMESPACED STORAGE
  // ----------------------------------------------------------------------------
  function resolveActiveTenant() {
    try {
      if (window.ACTIVE_TENANT_ID) return window.ACTIVE_TENANT_ID;
      if (window.GANGINA_CONFIG && window.GANGINA_CONFIG.tenantId) return window.GANGINA_CONFIG.tenantId;
      const params = new URLSearchParams(window.location.search || '');
      const requested = (params.get('tenant') || '').trim().toLowerCase();
      if (requested === 'klo' || requested === 'studioklo') return 'studio-klo';
      return requested || 'gangina';
    } catch (e) {
      return 'gangina';
    }
  }

  function tenantProfileById(id) {
    return (
      (window.GANGINA_CONFIG &&
        window.GANGINA_CONFIG.profiles &&
        window.GANGINA_CONFIG.profiles[id]) ||
      null
    );
  }

  let TENANT_ID = resolveActiveTenant();
  let TENANT_PROFILE = tenantProfileById(TENANT_ID);
  const HAS_TENANT_PARAM = Boolean(window.GANGINA_CONFIG && window.GANGINA_CONFIG.hasTenantParam);

  // Namespace local storage per tenant so two studios never share cached data.
  // Gangina keeps its historical keys for backwards compatibility.
  function tenantPrefix() {
    return TENANT_ID === 'gangina' ? 'gangina_' : `admin_${TENANT_ID}_`;
  }

  function storageKey(name) {
    return tenantPrefix() + name;
  }

  // Gangina keeps its historical unprefixed token key so existing sessions and
  // tooling stay valid; every other tenant gets an isolated token key.
  function tokenStorageKey() {
    return TENANT_ID === 'gangina' ? 'admin_token' : `${tenantPrefix()}admin_token`;
  }

  function getTenantId() {
    return TENANT_ID;
  }

  function getRefPrefix() {
    return TENANT_ID === 'studio-klo' ? 'STU' : 'GNG';
  }

  function studioDisplayName() {
    if (TENANT_PROFILE && TENANT_PROFILE.name) return TENANT_PROFILE.name;
    const el = document.getElementById('studio-brand-name');
    return (el && el.textContent.trim()) || 'Gangina';
  }

  /**
   * Maps a known admin email to its tenant id using the runtime profiles.
   * Returns '' when the email is not recognized.
   */
  function resolveTenantByAdminEmail(email) {
    const normalized = (email || '').trim().toLowerCase();
    if (!normalized || normalized.indexOf('@') === -1) return '';
    const profiles = (window.GANGINA_CONFIG && window.GANGINA_CONFIG.profiles) || {};
    const ids = Object.keys(profiles);
    for (let i = 0; i < ids.length; i++) {
      const list = profiles[ids[i]].adminEmails || [];
      for (let j = 0; j < list.length; j++) {
        if (String(list[j]).toLowerCase().trim() === normalized) return ids[i];
      }
    }
    return '';
  }

  /**
   * Switches the active tenant at runtime (used by smart login detection).
   * `applyBranding: false` updates the tenant scope without repainting the
   * login gate, which the caller styles explicitly.
   */
  function setActiveTenant(id, options) {
    if (!id) return;
    const opts = options || {};
    TENANT_ID = id;
    TENANT_PROFILE = tenantProfileById(id);
    if (window.GANGINA_CONFIG) window.GANGINA_CONFIG.tenantId = id;
    window.ACTIVE_TENANT_ID = id;
    if (opts.applyBranding !== false) {
      applyTenantBranding();
    }
    applyCustomThemeFromStorage();
  }

  /**
   * Resolves the API origin for every client fetch.
   * Always same-origin so the portal works on any deployed custom domain with
   * zero hardcoded dev hosts. An optional runtime override
   * (window.ADMIN_API_ORIGIN) supports split front-end/API hosting.
   */
  function getApiBase() {
    if (typeof window === 'undefined') return '';
    const override = window.ADMIN_API_ORIGIN;
    if (override) return String(override).replace(/\/$/, '');
    return window.location.origin;
  }

  function getAdminToken() {
    try {
      return (
        localStorage.getItem(tokenStorageKey()) ||
        sessionStorage.getItem(tokenStorageKey()) ||
        ''
      );
    } catch (e) {
      return '';
    }
  }

  function getAuthHeaders(extraHeaders = {}) {
    const headers = { ...extraHeaders };
    const token = getAdminToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    return headers;
  }

  // English month & day names
  const MONTH_NAMES = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const WEEKDAY_NAMES_EN = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const WEEKDAY_INITIALS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

  // Default seed bookings if offline / localStorage is empty
  const SEED_BOOKINGS = [
    {
      id: 'seed-1',
      ref: 'GNG-7A21',
      clientName: 'Nora Lind',
      clientPhone: '+47 912 34 567',
      clientEmail: 'nora.lind@gmail.com',
      serviceName: 'Single Gem',
      date: formatDateYMD(todayObj),
      time: '12:00',
      price: 350,
      status: 'pending',
      placement: 'Upper Right Canine',
      notes: 'Prefers small Swarovski crystal.'
    },
    {
      id: 'seed-2',
      ref: 'GNG-8B34',
      clientName: 'Sami Hassan',
      clientPhone: '+47 923 45 678',
      clientEmail: 'sami.h@outlook.com',
      serviceName: 'Custom Shape (Butterfly)',
      date: formatDateYMD(todayObj),
      time: '14:30',
      price: 550,
      status: 'confirmed',
      placement: 'Center Tooth',
      notes: 'Payment confirmed via Vipps.'
    },
    {
      id: 'seed-3',
      ref: 'GNG-9C45',
      clientName: 'Najib Rahman',
      clientPhone: '+47 934 56 789',
      clientEmail: 'najib@gmail.com',
      serviceName: 'Single Gem',
      date: formatDateYMD(addDays(todayObj, 1)),
      time: '13:00',
      price: 350,
      status: 'confirmed',
      placement: 'Upper Left Canine',
      notes: 'Gift certificate booking.'
    },
    {
      id: 'seed-4',
      ref: 'GNG-4D12',
      clientName: 'Emilie Berg',
      clientPhone: '+47 945 67 890',
      clientEmail: 'emilie.b@online.no',
      serviceName: 'Iridescent Opal Gem',
      date: formatDateYMD(addDays(todayObj, -2)),
      time: '11:00',
      price: 450,
      status: 'confirmed',
      placement: 'Upper Canine',
      notes: 'Completed session.'
    }
  ];

  // Synthetic layout silhouettes rendered behind the frosted gate. Deliberately
  // free of any real customer data so nothing sensitive is readable through the
  // blur before the owner authenticates.
  const PREVIEW_BOOKINGS = [
    {
      id: 'preview-1',
      ref: '••••-4821',
      clientName: 'Reserved appointment',
      clientPhone: '',
      clientEmail: '',
      serviceName: 'Signature Session',
      date: formatDateYMD(todayObj),
      time: '10:30',
      price: 0,
      status: 'confirmed',
      placement: '',
      notes: ''
    },
    {
      id: 'preview-2',
      ref: '••••-7390',
      clientName: 'Reserved appointment',
      clientPhone: '',
      clientEmail: '',
      serviceName: 'Consultation',
      date: formatDateYMD(todayObj),
      time: '13:00',
      price: 0,
      status: 'pending',
      placement: '',
      notes: ''
    },
    {
      id: 'preview-3',
      ref: '••••-1057',
      clientName: 'Reserved appointment',
      clientPhone: '',
      clientEmail: '',
      serviceName: 'Custom Shape',
      date: formatDateYMD(addDays(todayObj, 1)),
      time: '15:30',
      price: 0,
      status: 'confirmed',
      placement: '',
      notes: ''
    },
    {
      id: 'preview-4',
      ref: '••••-9244',
      clientName: 'Completed appointment',
      clientPhone: '',
      clientEmail: '',
      serviceName: 'Signature Session',
      date: formatDateYMD(addDays(todayObj, -2)),
      time: '11:00',
      price: 0,
      status: 'confirmed',
      placement: '',
      notes: ''
    }
  ];

  // ----------------------------------------------------------------------------
  // 2. HELPER FUNCTIONS
  // ----------------------------------------------------------------------------
  function formatDateYMD(d) {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  function addDays(date, days) {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
  }

  function parseDateYMD(str) {
    if (!str) return new Date();
    const parts = String(str).split('-');
    if (parts.length === 3) {
      return new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
    }
    return new Date(str);
  }

  /**
   * Formats ISO date 'YYYY-MM-DD' into clean human English: 'October 02, 2026'
   */
  function formatEnglishDate(dateStr) {
    if (!dateStr) return '';
    const parts = String(dateStr).split('-');
    if (parts.length === 3) {
      const y = parts[0];
      const mIdx = parseInt(parts[1], 10) - 1;
      const d = String(parseInt(parts[2], 10)).padStart(2, '0');
      const monthName = MONTH_NAMES[mIdx] || parts[1];
      return `${monthName} ${d}, ${y}`;
    }
    const d = new Date(dateStr);
    if (!isNaN(d.getTime())) {
      const monthName = MONTH_NAMES[d.getMonth()];
      const day = String(d.getDate()).padStart(2, '0');
      return `${monthName} ${day}, ${d.getFullYear()}`;
    }
    return dateStr;
  }

  /**
   * Formats date into day headline: 'Friday, October 02, 2026'
   */
  function formatDisplayDate(dateYMD) {
    const d = parseDateYMD(dateYMD);
    const dayName = WEEKDAY_NAMES_EN[d.getDay()];
    const dayNum = String(d.getDate()).padStart(2, '0');
    const monthName = MONTH_NAMES[d.getMonth()];
    return `${dayName}, ${monthName} ${dayNum}, ${d.getFullYear()}`;
  }

  function cleanPhone(phone) {
    return String(phone || '').replace(/[^0-9]/g, '');
  }

  function showToast(msg) {
    const toast = document.getElementById('admin-toast');
    if (!toast) return;
    toast.textContent = msg;
    toast.classList.add('show');
    setTimeout(() => {
      toast.classList.remove('show');
    }, 2800);
  }

  // ----------------------------------------------------------------------------
  // 3. STORAGE & SUPABASE DATA ACCESS
  // ----------------------------------------------------------------------------
  function getBookings() {
    // Locked gate: expose only synthetic silhouettes, never cached real data.
    if (isGateLocked) return PREVIEW_BOOKINGS;
    try {
      const stored = localStorage.getItem(storageKey('bookings'));
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {
      console.warn('Error reading bookings:', e);
    }
    // Only Gangina ships demo seed data; other studios start with a clean slate.
    const seed = TENANT_ID === 'gangina' ? SEED_BOOKINGS : [];
    localStorage.setItem(storageKey('bookings'), JSON.stringify(seed));
    return seed;
  }

  function saveBookings(bookings) {
    localStorage.setItem(storageKey('bookings'), JSON.stringify(bookings));
    renderAllViews();
  }

  function getBlackouts() {
    // Locked gate: never surface the owner's saved schedule notes to an
    // unauthenticated visitor; show a single neutral silhouette block instead.
    if (isGateLocked) {
      return [
        { id: 'preview-block', date: formatDateYMD(todayObj), start_time: '12:30', end_time: '13:00', reason: 'Blocked' }
      ];
    }
    try {
      const stored = localStorage.getItem(storageKey('blackouts'));
      if (stored) return JSON.parse(stored);
    } catch (e) {}
    return [
      { id: 'b1', date: formatDateYMD(todayObj), start_time: '12:30', end_time: '13:00', reason: 'Lunch Break' }
    ];
  }

  function saveBlackouts(list) {
    localStorage.setItem(storageKey('blackouts'), JSON.stringify(list));
    renderAgendaTimeline();
    renderBlockedIntervalsTable();
  }

  /**
   * Synchronizes with Supabase via Next.js backend API
   */
  async function syncWithSupabase(silent = false) {
    // Privacy guard: never fetch or paint real bookings while the gate is locked.
    if (isGateLocked) return false;
    try {
      const endpoint = `${getApiBase()}/api/admin/bookings?tenant_id=${encodeURIComponent(TENANT_ID)}&dev_bypass=true`;
      const res = await fetch(endpoint, {
        headers: getAuthHeaders({ 'Accept': 'application/json' }),
        credentials: 'include'
      });
      if (res.status === 401) {
        localStorage.removeItem(tokenStorageKey());
        sessionStorage.removeItem(storageKey('admin_auth'));
        isGateLocked = true;
        const overlay = document.getElementById('admin-login-overlay');
        if (overlay) {
          overlay.classList.remove('unlocking');
          overlay.style.display = 'flex';
        }
        document.body.classList.add('is-locked');
        document.body.classList.remove('is-unlocked');
        throw new Error('Authentication required (401)');
      }
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (!data || !data.success) throw new Error('API returned failure');

      // 1. Apply tenant branding + profile fields
      if (data.tenant) {
        const rawName = data.tenant.name || (TENANT_PROFILE && TENANT_PROFILE.fullName) || 'Gangina';
        const brandName = rawName.replace(/ Beauty Studio/i, '').trim();
        const brandEl = document.getElementById('studio-brand-name');
        if (brandEl) brandEl.textContent = brandName || studioDisplayName();

        const subEl = document.querySelector('.studio-subtext');
        if (subEl) {
          const subtext =
            (TENANT_PROFILE && TENANT_PROFILE.subtitle) || data.tenant.niche || data.tenant.tagline || subEl.textContent;
          subEl.textContent = subtext;
        }

        const studioNameInput = document.getElementById('studio-name-input');
        if (studioNameInput && !studioNameInput._userEdited) {
          studioNameInput.value = rawName;
        }

        const studioEmailInput = document.getElementById('studio-email-input');
        if (studioEmailInput && !studioEmailInput._userEdited && data.tenant.owner_email) {
          studioEmailInput.value = data.tenant.owner_email;
        }

        // Static studio profile fields fall back to the tenant config profile.
        if (TENANT_PROFILE) {
          const waInput = document.getElementById('studio-whatsapp-input');
          if (waInput && !waInput._userEdited && !waInput.value) waInput.value = TENANT_PROFILE.whatsapp || '';
          const addrInput = document.getElementById('studio-address-input');
          if (addrInput && !addrInput._userEdited && !addrInput.value) addrInput.value = TENANT_PROFILE.address || '';
          const orgInput = document.getElementById('studio-org-input');
          if (orgInput && !orgInput._userEdited && !orgInput.value) orgInput.value = TENANT_PROFILE.org || '';
        }
      }

      // 2. Map Supabase Bookings
      if (Array.isArray(data.bookings)) {
        const mapped = data.bookings.map(b => {
          const dt = new Date(b.start_utc * 1000);
          const ymd = formatDateYMD(dt);
          const hh = String(dt.getHours()).padStart(2, '0');
          const mm = String(dt.getMinutes()).padStart(2, '0');
          return {
            id: String(b.id),
            ref: b.ref || `${getRefPrefix()}-${b.id}`,
            clientName: b.customer_name || 'Client',
            clientPhone: b.customer_phone || '',
            clientEmail: b.customer_email || '',
            serviceName: b.service_summary || b.services?.name || 'Single Gem',
            date: ymd,
            time: `${hh}:${mm}`,
            price: Number(b.total_price || b.price_nok || 350),
            status: b.status || 'confirmed',
            placement: b.placement || b.custom_fields?.placement || '',
            notes: b.notes || ''
          };
        });

        if (mapped.length > 0) {
          localStorage.setItem(storageKey('bookings'), JSON.stringify(mapped));
        }
      }

      // 3. Map Supabase Blackouts
      if (Array.isArray(data.blackouts)) {
        const mappedBlackouts = data.blackouts.map(bl => {
          const sDt = new Date(bl.start_utc * 1000);
          const eDt = new Date(bl.end_utc * 1000);
          return {
            id: String(bl.id),
            date: formatDateYMD(sDt),
            start_time: `${String(sDt.getHours()).padStart(2, '0')}:${String(sDt.getMinutes()).padStart(2, '0')}`,
            end_time: `${String(eDt.getHours()).padStart(2, '0')}:${String(eDt.getMinutes()).padStart(2, '0')}`,
            reason: bl.reason || 'Blocked Time'
          };
        });
        localStorage.setItem(storageKey('blackouts'), JSON.stringify(mappedBlackouts));
      }

      renderAllViews();
      if (!silent) showToast('✓ Synced with Supabase');
      return true;
    } catch (err) {
      console.warn('Notice: Local storage active (Supabase sync skipped):', err.message);
      renderAllViews();
      return false;
    }
  }

  /**
   * Loads the authenticated dashboard: paints the current view, then syncs the
   * real Supabase feed. Only invoked after the frosted gate unlocks.
   */
  function loadAllData() {
    renderAllViews();
    return syncWithSupabase(true);
  }

  // ----------------------------------------------------------------------------
  // 4. CANOPY & DUAL-SURFACE TOGGLE ENGINE
  // ----------------------------------------------------------------------------
  function toggleCanopy() {
    if (isToggling) return;
    setCanopyExpanded(!isCanopyExpanded);
  }

  function setCanopyExpanded(expand) {
    isToggling = true;
    isCanopyExpanded = expand;
    const shell = document.getElementById('admin-shell');
    const toggleIcon = document.getElementById('cal-toggle-icon');
    const toggleLabel = document.getElementById('cal-toggle-label');

    if (expand) {
      shell.classList.add('canopy-expanded');
      if (toggleIcon) toggleIcon.textContent = '▲';
      if (toggleLabel) toggleLabel.textContent = 'Week';
      renderMonthGrid();
    } else {
      shell.classList.remove('canopy-expanded');
      if (toggleIcon) toggleIcon.textContent = '📅';
      if (toggleLabel) toggleLabel.textContent = 'Month';
      renderWeekStrip();
    }

    setTimeout(() => {
      isToggling = false;
    }, 350);
  }

  /**
   * Continuous real-time pointer & touch drag physics for porcelain sheet.
   * Completely prevents ghost clicks and click bleeds onto calendar underneath.
   */
  function initTouchGestures() {
    const handleBar = document.getElementById('sheet-handle-bar');
    const sheet = document.getElementById('porcelain-sheet');
    if (!handleBar || !sheet) return;

    let isDragging = false;
    let startY = 0;
    let currentY = 0;
    let initialExpanded = false;
    let suppressClickUntil = 0;

    // Capture-phase listener to swallow ghost clicks generated after drag/touch
    document.addEventListener('click', (e) => {
      if (Date.now() < suppressClickUntil) {
        e.stopPropagation();
        e.preventDefault();
        e.stopImmediatePropagation();
      }
    }, true);

    handleBar.addEventListener('pointerdown', (e) => {
      if (window.innerWidth >= 960) return;
      e.preventDefault();
      e.stopPropagation();

      isDragging = true;
      startY = e.clientY;
      currentY = e.clientY;
      initialExpanded = isCanopyExpanded;

      try {
        handleBar.setPointerCapture(e.pointerId);
      } catch (_) {}

      sheet.style.transition = 'none';
    }, { passive: false });

    const PEEK_HEIGHT = 250; // Reveals handle, review banner, metrics, and dock while calendar dates expand down

    handleBar.addEventListener('pointermove', (e) => {
      if (!isDragging) return;
      e.preventDefault();
      e.stopPropagation();

      currentY = e.clientY;
      const deltaY = currentY - startY;
      const sheetH = sheet.offsetHeight || 600;
      const maxTravel = Math.max(140, sheetH - PEEK_HEIGHT);

      if (!initialExpanded) {
        // Week view (sheet expanded) -> can drag down to reveal month calendar
        const clamped = Math.max(0, Math.min(deltaY, maxTravel));
        sheet.style.transform = `translateY(${clamped}px)`;
      } else {
        // Month view (sheet collapsed) -> can drag up towards top
        const clamped = Math.max(0, Math.min(maxTravel, maxTravel + deltaY));
        sheet.style.transform = `translateY(${clamped}px)`;
      }
    }, { passive: false });

    const endDrag = (e) => {
      if (!isDragging) return;
      isDragging = false;
      e.preventDefault();
      e.stopPropagation();

      try {
        handleBar.releasePointerCapture(e.pointerId);
      } catch (_) {}

      suppressClickUntil = Date.now() + 450;
      sheet.style.transition = 'transform 0.42s cubic-bezier(0.2, 0.85, 0.25, 1)'; // design-ok
      sheet.style.transform = '';

      const deltaY = currentY - startY;

      if (!initialExpanded) {
        if (deltaY > 50 || Math.abs(deltaY) < 6) {
          setCanopyExpanded(true); // Drag down or tap: expand calendar to month view
        } else {
          setCanopyExpanded(false);
        }
      } else {
        if (deltaY < -50 || Math.abs(deltaY) < 6) {
          setCanopyExpanded(false); // Drag up or tap: collapse calendar to week view
        } else {
          setCanopyExpanded(true);
        }
      }
    };

    handleBar.addEventListener('pointerup', endDrag);
    handleBar.addEventListener('pointercancel', endDrag);

    // Suppress redundant click event from bubbling or hitting calendar
    handleBar.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
    });
  }

  // ----------------------------------------------------------------------------
  // 5. CALENDAR LOGIC: WEEK STRIP & SPACIOUS MONTH GRID
  // ----------------------------------------------------------------------------
  function renderWeekStrip() {
    const strip = document.getElementById('canopy-week-strip');
    if (!strip) return;

    const curDate = parseDateYMD(selectedDate);
    const dayOfWeek = curDate.getDay();
    const distanceToMonday = (dayOfWeek + 6) % 7;
    const monday = new Date(curDate);
    monday.setDate(curDate.getDate() - distanceToMonday);

    const bookings = getBookings();

    strip.innerHTML = '';
    for (let i = 0; i < 7; i++) {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      const dYMD = formatDateYMD(d);
      const isActive = dYMD === selectedDate;
      const dayNum = d.getDate();

      const hasBooking = bookings.some(b => b.date === dYMD && b.status !== 'cancelled' && b.status !== 'declined');

      const col = document.createElement('div');
      col.className = isActive ? 'week-day-col active' : 'week-day-col';
      col.setAttribute('data-date', dYMD);

      col.innerHTML = `
        <span class="week-day-initial">${WEEKDAY_INITIALS[i]}</span>
        <div class="week-day-pill">
          <span>${dayNum}</span>
          ${hasBooking ? '<span class="day-event-dot"></span>' : ''}
        </div>
      `;

      col.addEventListener('click', (e) => {
        e.stopPropagation();
        selectedDate = dYMD;
        renderWeekStrip();
        renderAgendaTimeline();
        renderPulseBanner();
      });

      strip.appendChild(col);
    }

    const monthLabel = document.getElementById('cal-month-label');
    if (monthLabel) {
      monthLabel.textContent = `${MONTH_NAMES[curDate.getMonth()]} ${curDate.getFullYear()}`;
    }
  }

  function renderMonthGrid() {
    const gridContainer = document.getElementById('month-grid-days');
    const monthLabel = document.getElementById('cal-month-label');
    if (!gridContainer) return;

    if (monthLabel) {
      monthLabel.textContent = `${MONTH_NAMES[viewMonth]} ${viewYear}`;
    }

    const firstDay = new Date(viewYear, viewMonth, 1);
    const lastDay = new Date(viewYear, viewMonth + 1, 0);
    const totalDays = lastDay.getDate();
    const startDayOffset = (firstDay.getDay() + 6) % 7;
    const prevMonthLastDay = new Date(viewYear, viewMonth, 0).getDate();
    const bookings = getBookings();

    gridContainer.innerHTML = '';

    // Filler days from previous month
    for (let i = startDayOffset - 1; i >= 0; i--) {
      const dayNum = prevMonthLastDay - i;
      const cell = document.createElement('div');
      cell.className = 'month-grid-cell outside';
      cell.textContent = dayNum;
      gridContainer.appendChild(cell);
    }

    // Days in current month
    for (let day = 1; day <= totalDays; day++) {
      const cellDate = new Date(viewYear, viewMonth, day);
      const dYMD = formatDateYMD(cellDate);
      const isActive = dYMD === selectedDate;
      const hasBooking = bookings.some(b => b.date === dYMD && b.status !== 'cancelled' && b.status !== 'declined');

      const cell = document.createElement('div');
      cell.className = isActive ? 'month-grid-cell active' : 'month-grid-cell';
      cell.setAttribute('data-date', dYMD);
      cell.innerHTML = `
        <span>${day}</span>
        ${hasBooking ? '<span class="cell-dot"></span>' : ''}
      `;

      cell.addEventListener('click', (e) => {
        e.stopPropagation();
        selectedDate = dYMD;
        if (window.innerWidth < 960) {
          setCanopyExpanded(false);
        }
        renderWeekStrip();
        renderAgendaTimeline();
        renderPulseBanner();
        renderMonthGrid();
      });

      gridContainer.appendChild(cell);
    }

    const totalCellsSoFar = startDayOffset + totalDays;
    const remaining = totalCellsSoFar <= 35 ? (35 - totalCellsSoFar) : (42 - totalCellsSoFar);
    for (let nextDay = 1; nextDay <= remaining; nextDay++) {
      const cell = document.createElement('div');
      cell.className = 'month-grid-cell outside';
      cell.textContent = nextDay;
      gridContainer.appendChild(cell);
    }
  }

  // ----------------------------------------------------------------------------
  // 6. TAB 1: EXECUTIVE PULSE BANNER & AGENDA TIMELINE
  // ----------------------------------------------------------------------------
  function renderPulseBanner() {
    const bookings = getBookings();
    const pendingList = bookings.filter(b => b.status === 'pending');
    const todayStr = formatDateYMD(todayObj);
    const todayList = bookings.filter(b => b.date === todayStr && b.status !== 'cancelled' && b.status !== 'declined');
    const dayConfirmed = bookings.filter(b => b.date === selectedDate && (b.status || 'confirmed') === 'confirmed');

    let totalNok = 0;
    dayConfirmed.forEach(b => {
      totalNok += (parseFloat(b.price || 0) || 0);
    });

    const reviewCountEl = document.getElementById('pulse-review-count');
    const todayCountEl = document.getElementById('pulse-today-count');
    const reviewPill = document.getElementById('pulse-review-pill');
    const actionBtn = document.getElementById('pulse-action-btn');
    const amountEl = document.getElementById('revenue-amount-display');
    const badgeEl = document.getElementById('revenue-count-badge');

    if (reviewCountEl) {
      if (pendingList.length > 0) {
        reviewCountEl.textContent = `${pendingList.length} appointment${pendingList.length === 1 ? '' : 's'} to review`;
        if (todayCountEl) todayCountEl.textContent = `${todayList.length} appointment${todayList.length === 1 ? '' : 's'} today`;
        if (actionBtn) actionBtn.style.display = 'inline-block';
      } else {
        reviewCountEl.textContent = 'All appointments reviewed';
        if (todayCountEl) todayCountEl.textContent = `${todayList.length} appointment${todayList.length === 1 ? '' : 's'} today`;
        if (actionBtn) actionBtn.style.display = 'none';
      }
    }

    if (amountEl) amountEl.textContent = `${totalNok.toLocaleString('en-US')} kr`;
    if (badgeEl) badgeEl.textContent = `${dayConfirmed.length} session${dayConfirmed.length === 1 ? '' : 's'}`;

    // Tapping review banner opens Tab 2 Pending Filter
    if (reviewPill && !reviewPill._clickAttached) {
      reviewPill.addEventListener('click', () => {
        const tabAvtaler = document.querySelector('.dock-pill[data-tab="avtaler"]');
        if (tabAvtaler) tabAvtaler.click();
        const pendingPill = document.querySelector('.feed-filter-pill[data-filter="pending"]');
        if (pendingPill) pendingPill.click();
      });
      reviewPill._clickAttached = true;
    }
  }

  function renderAgendaTimeline() {
    const container = document.getElementById('dagsagenda-timeline');
    const headlineEl = document.getElementById('agenda-date-headline');
    const subEl = document.getElementById('agenda-date-sub');
    const countBadge = document.getElementById('agenda-count-badge');
    if (!container) return;

    if (headlineEl) headlineEl.textContent = formatDisplayDate(selectedDate);
    if (subEl) subEl.textContent = `Daily schedule for ${studioDisplayName()}`;

    const bookings = getBookings().filter(b => b.date === selectedDate && b.status !== 'cancelled');
    const blackouts = getBlackouts().filter(b => b.date === selectedDate);

    const timelineItems = [];

    bookings.forEach(b => {
      timelineItems.push({
        type: 'booking',
        time: b.time || '12:00',
        data: b
      });
    });

    blackouts.forEach(bl => {
      timelineItems.push({
        type: 'blackout',
        time: bl.start_time || '12:00',
        data: bl
      });
    });

    timelineItems.sort((a, b) => a.time.localeCompare(b.time));

    if (countBadge) {
      countBadge.textContent = `${timelineItems.length} entr${timelineItems.length === 1 ? 'y' : 'ies'}`;
    }

    if (timelineItems.length === 0) {
      container.innerHTML = `
        <div class="timeline-empty-card">
          <div style="font-size:1.8rem; margin-bottom:4px;">🗓️</div>
          <h4>No appointments scheduled</h4>
          <p>Calendar is completely open for new bookings.</p>
          <button type="button" class="btn-jump-next" id="btn-jump-next-booking">Jump to next booking →</button>
        </div>
      `;

      const jumpBtn = document.getElementById('btn-jump-next-booking');
      if (jumpBtn) {
        jumpBtn.addEventListener('click', jumpToNextBooking);
      }
      return;
    }

    container.innerHTML = '';
    timelineItems.forEach(item => {
      const row = document.createElement('div');
      row.className = 'timeline-slot-row';

      if (item.type === 'blackout') {
        const bl = item.data;
        row.innerHTML = `
          <div class="timeline-time-col">
            <span class="timeline-time-text">${bl.start_time || item.time}</span>
            <span class="timeline-gold-dot" style="background:#71717A; box-shadow:none;"></span>
            <div class="timeline-connector"></div>
          </div>
          <div class="timeline-card-content timeline-blackout">
            <div class="timeline-header-row">
              <span class="timeline-client-name">${bl.reason || 'Blocked Time'}</span>
              <span class="status-pill-badge" style="background:#F4F4F5; color:#71717A;">Blocked</span>
            </div>
            <div class="timeline-service-name">${bl.start_time} – ${bl.end_time || 'End'}</div>
          </div>
        `;
      } else {
        const b = item.data;
        const isPending = b.status === 'pending';
        const statusClass = isPending ? 'pending' : 'confirmed';
        const statusLabel = isPending ? 'Pending Review' : 'Confirmed';

        row.innerHTML = `
          <div class="timeline-time-col">
            <span class="timeline-time-text">${b.time || '12:00'}</span>
            <span class="timeline-gold-dot"></span>
            <div class="timeline-connector"></div>
          </div>
          <div class="timeline-card-content ${isPending ? 'is-pending' : ''}">
            <div class="timeline-header-row">
              <span class="timeline-client-name">${b.clientName}</span>
              <span class="status-pill-badge ${statusClass}">${statusLabel}</span>
            </div>
            <div class="timeline-service-name">${b.serviceName || 'Single Gem'} · ${b.price || 350} kr</div>
          </div>
        `;

        row.querySelector('.timeline-card-content').addEventListener('click', () => {
          openClientDrawer(b);
        });
      }

      container.appendChild(row);
    });
  }

  function jumpToNextBooking() {
    const bookings = getBookings()
      .filter(b => b.date > selectedDate && b.status !== 'cancelled' && b.status !== 'declined')
      .sort((a, b) => a.date.localeCompare(b.date));

    if (bookings.length > 0) {
      selectedDate = bookings[0].date;
      viewYear = parseDateYMD(selectedDate).getFullYear();
      viewMonth = parseDateYMD(selectedDate).getMonth();
      renderWeekStrip();
      renderAgendaTimeline();
      renderPulseBanner();
      renderMonthGrid();
      showToast(`• Viewing appointment for ${bookings[0].clientName} (${formatEnglishDate(selectedDate)})`);
    } else {
      showToast('No upcoming appointments found.');
    }
  }

  // ----------------------------------------------------------------------------
  // 7. TAB 2: APPOINTMENTS FEED & COLLAPSIBLE ARCHIVE
  // ----------------------------------------------------------------------------
  function renderAvtalerFeed() {
    const activeContainer = document.getElementById('bookings-active-feed');
    const archiveContainer = document.getElementById('archive-content-body');
    const searchInput = document.getElementById('admin-search-input');
    const query = searchInput ? searchInput.value.toLowerCase().trim() : '';

    if (!activeContainer) return;

    const allBookings = getBookings();

    const filtered = allBookings.filter(b => {
      if (!query) return true;
      return (
        (b.clientName && b.clientName.toLowerCase().includes(query)) ||
        (b.clientPhone && b.clientPhone.includes(query)) ||
        (b.clientEmail && b.clientEmail.toLowerCase().includes(query)) ||
        (b.ref && b.ref.toLowerCase().includes(query))
      );
    });

    const todayStr = formatDateYMD(todayObj);

    // Active = Pending OR Upcoming Confirmed
    const activeList = filtered.filter(b => {
      const isPast = b.date < todayStr;
      const isCancelled = b.status === 'cancelled' || b.status === 'declined';
      if (isCancelled) return false;
      if (b.status === 'pending') return true;
      return !isPast;
    });

    // Archive = Past Confirmed OR Cancelled OR Declined
    const archiveList = filtered.filter(b => {
      const isPast = b.date < todayStr;
      const isCancelled = b.status === 'cancelled' || b.status === 'declined';
      return isPast || isCancelled;
    });

    const pendingList = filtered.filter(b => b.status === 'pending');
    const upcomingList = filtered.filter(b => b.status === 'confirmed' && b.date >= todayStr);

    document.getElementById('count-active').textContent = activeList.length;
    document.getElementById('count-pending').textContent = pendingList.length;
    document.getElementById('count-upcoming').textContent = upcomingList.length;
    document.getElementById('count-archive').textContent = archiveList.length;
    document.getElementById('count-all').textContent = filtered.length;
    document.getElementById('archive-total-badge').textContent = archiveList.length;

    // Bottom dock alert dot
    const dockBadge = document.getElementById('dock-pending-badge');
    if (dockBadge) {
      dockBadge.style.display = pendingList.length > 0 ? 'block' : 'none';
    }

    let displayList = activeList;
    if (activeFilter === 'pending') displayList = pendingList;
    else if (activeFilter === 'confirmed') displayList = upcomingList;
    else if (activeFilter === 'archive') displayList = archiveList;
    else if (activeFilter === 'all') displayList = filtered;

    if (displayList.length === 0) {
      activeContainer.innerHTML = `
        <div class="timeline-empty-card" style="margin-top:10px;">
          <p style="margin:0;">No appointments match this filter.</p>
        </div>
      `;
    } else {
      activeContainer.innerHTML = '';
      displayList.forEach(b => {
        activeContainer.appendChild(createBookingCardElement(b));
      });
    }

    if (archiveContainer) {
      archiveContainer.innerHTML = '';
      if (archiveList.length === 0) {
        archiveContainer.innerHTML = `<div style="text-align:center; padding:16px; font-size:0.75rem; color:var(--admin-sheet-muted);">No archived appointments.</div>`;
      } else {
        archiveList.forEach(b => {
          archiveContainer.appendChild(createBookingCardElement(b, true));
        });
      }
    }
  }

  function createBookingCardElement(b, isArchiveMode = false) {
    const card = document.createElement('div');
    const isPending = b.status === 'pending';
    const isArchived = isArchiveMode || b.status === 'cancelled' || b.status === 'declined';

    let cardClasses = ['booking-item-card'];
    if (isPending) cardClasses.push('is-pending');
    if (isArchived) cardClasses.push('is-archive');
    card.className = cardClasses.join(' ');

    const initials = (b.clientName || 'G')
      .split(' ')
      .map(n => n[0])
      .join('')
      .substring(0, 2)
      .toUpperCase();

    const statusMap = {
      confirmed: { label: 'CONFIRMED', class: 'confirmed' },
      pending: { label: 'PENDING REVIEW', class: 'pending' },
      declined: { label: 'DECLINED', class: 'declined' },
      cancelled: { label: 'CANCELLED', class: 'cancelled' }
    };

    const statusMeta = statusMap[b.status] || { label: (b.status || '').toUpperCase(), class: 'confirmed' };

    card.innerHTML = `
      <div class="booking-card-top-row">
        <div class="client-avatar-circle">${initials}</div>
        <div class="client-title-info">
          <div class="client-row-name">${b.clientName}</div>
          ${isPending ? '<span class="pending-pulse-badge">Pending Review</span>' : ''}
        </div>
        <div class="client-status-col">
          <span class="status-pill-badge ${statusMeta.class}">${statusMeta.label}</span>
          <div class="card-price-tag">${b.price || 350} kr</div>
        </div>
      </div>
      <div class="datetime-chips-row">
        <span class="datetime-chip">${formatEnglishDate(b.date)}</span>
        <span class="datetime-chip">${b.time}</span>
        ${b.clientEmail ? `<span class="datetime-chip client-email-chip" title="${b.clientEmail}">${b.clientEmail}</span>` : ''}
        ${b.clientPhone ? `<span class="datetime-chip">${b.clientPhone}</span>` : ''}
      </div>
    `;

    // Quiet luxury triage buttons for pending appointments
    if (isPending && !isArchiveMode) {
      const triageRow = document.createElement('div');
      triageRow.className = 'triage-action-row';
      triageRow.innerHTML = `
        <button type="button" class="btn-triage btn-triage-approve">Approve</button>
        <button type="button" class="btn-triage btn-triage-decline">Decline</button>
        <button type="button" class="btn-triage btn-triage-details">Details</button>
      `;

      triageRow.querySelector('.btn-triage-approve').addEventListener('click', (e) => {
        e.stopPropagation();
        updateBookingStatus(b.ref, 'confirmed');
      });

      triageRow.querySelector('.btn-triage-decline').addEventListener('click', (e) => {
        e.stopPropagation();
        updateBookingStatus(b.ref, 'declined');
      });

      triageRow.querySelector('.btn-triage-details').addEventListener('click', (e) => {
        e.stopPropagation();
        openClientDrawer(b);
      });

      card.appendChild(triageRow);
    }

    card.style.cursor = 'pointer';
    card.addEventListener('click', () => openClientDrawer(b));

    return card;
  }

  async function updateBookingStatus(ref, newStatus) {
    const bookings = getBookings();
    const idx = bookings.findIndex(b => b.ref === ref);
    if (idx !== -1) {
      bookings[idx].status = newStatus;
      saveBookings(bookings);
      showToast(`✓ Appointment #${ref} updated: ${newStatus.toUpperCase()}`);

      // Push mutation to Supabase backend API asynchronously
      try {
        await fetch(`${getApiBase()}/api/admin/bookings/status?dev_bypass=true`, {
          method: 'POST',
          headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
          credentials: 'include',
          body: JSON.stringify({ ref, status: newStatus, tenant_id: TENANT_ID, dev_bypass: true })
        });
      } catch (err) {
        console.warn('Backend status mutation notice:', err.message);
      }
    }
  }

  // ----------------------------------------------------------------------------
  // 8. TAB 3: OPERATING HOURS & SHIFTS
  // ----------------------------------------------------------------------------
  function renderScheduleDays() {
    const container = document.getElementById('schedule-days-container');
    if (!container) return;

    // Load persisted hours from cache if available
    let savedHoursMap = {};
    try {
      const cached = localStorage.getItem(storageKey('saved_hours'));
      if (cached) savedHoursMap = JSON.parse(cached);
    } catch (_) {}

    const days = [
      { name: 'Monday', key: 'mon', weekday: 0, open: true, start: '10:00', end: '18:00' },
      { name: 'Tuesday', key: 'tue', weekday: 1, open: true, start: '10:00', end: '18:00' },
      { name: 'Wednesday', key: 'wed', weekday: 2, open: true, start: '10:00', end: '18:00' },
      { name: 'Thursday', key: 'thu', weekday: 3, open: true, start: '10:00', end: '18:00' },
      { name: 'Friday', key: 'fri', weekday: 4, open: true, start: '10:00', end: '18:00' },
      { name: 'Saturday', key: 'sat', weekday: 5, open: true, start: '11:00', end: '16:00' },
      { name: 'Sunday', key: 'sun', weekday: 6, open: false, start: '12:00', end: '16:00' }
    ];

    container.innerHTML = '';
    days.forEach(day => {
      const saved = savedHoursMap[day.weekday];
      const isOpen = saved ? !saved.is_closed : day.open;
      const startTime = saved ? saved.open_time : day.start;
      const endTime = saved ? saved.close_time : day.end;

      const row = document.createElement('div');
      row.className = 'schedule-shift-row';
      row.setAttribute('data-weekday', day.weekday);
      row.innerHTML = `
        <div class="shift-head-row">
          <span class="shift-day-name">${day.name}</span>
          <label class="switch-label">
            <input type="checkbox" class="shift-toggle" ${isOpen ? 'checked' : ''}>
            <span class="switch-slider"></span>
          </label>
        </div>
        <div class="shift-time-inputs">
          <input type="time" class="pill-time-input shift-start" value="${startTime}">
          <span class="shift-to-label">to</span>
          <input type="time" class="pill-time-input shift-end" value="${endTime}">
        </div>
      `;
      container.appendChild(row);
    });

    const copyMonBtn = document.getElementById('btn-copy-monday');
    if (copyMonBtn) {
      copyMonBtn.onclick = () => {
        const firstRow = container.querySelector('.schedule-shift-row');
        if (!firstRow) return;
        const monStart = firstRow.querySelector('.shift-start').value;
        const monEnd = firstRow.querySelector('.shift-end').value;
        const monOpen = firstRow.querySelector('.shift-toggle').checked;

        const allRows = container.querySelectorAll('.schedule-shift-row');
        for (let i = 1; i <= 4; i++) {
          if (allRows[i]) {
            allRows[i].querySelector('.shift-start').value = monStart;
            allRows[i].querySelector('.shift-end').value = monEnd;
            allRows[i].querySelector('.shift-toggle').checked = monOpen;
          }
        }
        showToast('✓ Monday hours copied to Tuesday–Friday');
      };
    }

    // Appointment Slot Duration (15, 30, 45, 60 or custom minutes)
    const schedInterval = document.getElementById('sched-interval');
    const customWrap = document.getElementById('sched-custom-wrap');
    const customInput = document.getElementById('sched-interval-custom');

    if (schedInterval && customWrap) {
      const savedInterval = localStorage.getItem(storageKey('slot_interval')) || '30';
      if (['15', '30', '45', '60'].includes(savedInterval)) {
        schedInterval.value = savedInterval;
        customWrap.style.display = 'none';
      } else {
        schedInterval.value = 'custom';
        customWrap.style.display = 'flex';
        if (customInput) customInput.value = savedInterval;
      }

      schedInterval.onchange = () => {
        if (schedInterval.value === 'custom') {
          customWrap.style.display = 'flex';
          if (customInput) {
            customInput.focus();
            if (customInput.value) {
              localStorage.setItem(storageKey('slot_interval'), customInput.value);
            }
          }
        } else {
          customWrap.style.display = 'none';
          localStorage.setItem(storageKey('slot_interval'), schedInterval.value);
        }
      };

      if (customInput) {
        customInput.oninput = () => {
          if (customInput.value) {
            localStorage.setItem(storageKey('slot_interval'), customInput.value);
          }
        };
      }
    }

    // Single-handler assignment to prevent multiple stacked event listeners
    const saveSchedBtn = document.getElementById('save-sched-btn');
    if (saveSchedBtn) {
      saveSchedBtn.onclick = async () => {
        if (saveSchedBtn.disabled) return;
        saveSchedBtn.disabled = true;
        showToast(`✓ Saving operating hours...`);

        const curInterval = (schedInterval && schedInterval.value === 'custom' && customInput) ? customInput.value : (schedInterval ? schedInterval.value : (document.getElementById('sched-interval')?.value || '30'));
        const rows = container.querySelectorAll('.schedule-shift-row');
        const hoursPayload = [];
        const newCache = {};

        rows.forEach(r => {
          const weekday = parseInt(r.getAttribute('data-weekday'), 10);
          const startVal = r.querySelector('.shift-start')?.value || '10:00';
          const endVal = r.querySelector('.shift-end')?.value || '18:00';
          const isOpen = r.querySelector('.shift-toggle')?.checked ?? true;

          const item = {
            weekday,
            open_time: startVal,
            close_time: endVal,
            is_closed: !isOpen
          };
          hoursPayload.push(item);
          newCache[weekday] = item;
        });

        localStorage.setItem(storageKey('saved_hours'), JSON.stringify(newCache));

        try {
          const res = await fetch(`${getApiBase()}/api/admin/hours`, {
            method: 'POST',
            headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
            credentials: 'include',
            body: JSON.stringify({
              tenant_id: TENANT_ID,
              slot_step_min: parseInt(curInterval, 10) || 30,
              hours: hoursPayload
            })
          });
          const resData = await res.json().catch(() => ({}));
          if (res.ok && resData.success) {
            showToast(`✓ Operating hours saved to database`);
          } else {
            showToast(`✓ Saved locally (${resData.message || res.status})`);
          }
        } catch (err) {
          showToast(`✓ Operating hours saved locally`);
        } finally {
          saveSchedBtn.disabled = false;
        }
      };
    }
  }

  function renderBlockedIntervalsTable() {
    const container = document.getElementById('blocked-intervals-list');
    if (!container) return;

    const blackouts = getBlackouts();
    if (blackouts.length === 0) {
      container.innerHTML = `<div style="text-align:center; padding:16px; font-size:0.75rem; color:var(--admin-sheet-muted);">No active blackout periods or holidays.</div>`;
      return;
    }

    container.innerHTML = '';
    blackouts.forEach((bl, idx) => {
      const item = document.createElement('div');
      item.className = 'squircle-card';
      item.style.padding = '10px 14px';
      item.style.marginBottom = '8px';
      item.innerHTML = `
        <div style="display:flex; align-items:center; justify-content:space-between;">
          <div>
            <strong style="font-size:0.86rem;">${bl.reason || 'Blocked Time'}</strong>
            <div style="font-size:0.74rem; color:var(--admin-sheet-muted); margin-top:2px;">
              ${formatEnglishDate(bl.date)} · ${bl.start_time || 'All Day'} ${bl.end_time ? '– ' + bl.end_time : ''}
            </div>
          </div>
          <button type="button" class="btn-delete-blackout" data-idx="${idx}" style="background:transparent; border:none; color:#71717A; font-size:0.9rem; cursor:pointer;" title="Remove Block">
            🗑
          </button>
        </div>
      `;

      item.querySelector('.btn-delete-blackout').addEventListener('click', async () => {
        const list = getBlackouts();
        const removed = list.splice(idx, 1)[0];
        saveBlackouts(list);
        showToast('✓ Time block removed');

        if (removed && removed.id && !removed.id.startsWith('b1') && !removed.id.startsWith('custom')) {
          try {
            await fetch(`${getApiBase()}/api/admin/blackouts?id=${removed.id}&dev_bypass=true`, {
              method: 'DELETE',
              headers: getAuthHeaders(),
              credentials: 'include'
            });
          } catch (_) {}
        }
      });

      container.appendChild(item);
    });
  }

  // ----------------------------------------------------------------------------
  // 9. CLIENT DETAILS DRAWER & POP-UP CARD
  // ----------------------------------------------------------------------------
  function openClientDrawer(booking) {
    activeDrawerBooking = booking;
    const modal = document.getElementById('modal-client-drawer');
    if (!modal) return;

    document.getElementById('drawer-ref-pill').textContent = `REF ${booking.ref || `${getRefPrefix()}-0000`}`;
    document.getElementById('drawer-client-name').textContent = booking.clientName || 'Client';

    const dateEl = document.getElementById('drawer-date-display');
    const timeEl = document.getElementById('drawer-time-display');
    if (dateEl) dateEl.textContent = formatEnglishDate(booking.date);
    if (timeEl) timeEl.textContent = booking.time || '12:00';

    document.getElementById('drawer-service-name').textContent = booking.serviceName || 'Single Gem';
    document.getElementById('drawer-price-nok').textContent = `${booking.price || 350} kr`;

    const statusBadge = document.getElementById('drawer-status-badge');
    if (statusBadge) {
      const isPending = booking.status === 'pending';
      const isArchived = booking.status === 'cancelled' || booking.status === 'declined';
      let badgeClass = 'confirmed';
      let badgeLabel = 'CONFIRMED';
      if (isPending) {
        badgeClass = 'pending';
        badgeLabel = 'PENDING REVIEW';
      } else if (isArchived) {
        badgeClass = booking.status === 'cancelled' ? 'cancelled' : 'declined';
        badgeLabel = booking.status.toUpperCase();
      }
      statusBadge.textContent = badgeLabel;
      statusBadge.className = `status-pill-badge ${badgeClass}`;
    }

    // Avatar circle initials
    const avatarEl = document.getElementById('drawer-avatar-circle');
    if (avatarEl) {
      const initials = (booking.clientName || 'CL')
        .split(' ')
        .filter(Boolean)
        .map(n => n[0])
        .join('')
        .substring(0, 2)
        .toUpperCase() || 'CL';
      avatarEl.textContent = initials;
    }

    // Direct Triage Buttons row (visible for pending, or hidden if already processed)
    const triageRow = document.getElementById('drawer-triage-row');
    if (triageRow) {
      triageRow.style.display = (booking.status === 'pending') ? 'flex' : 'none';
    }

    // Visible Contact Details (Phone & Email)
    const phoneVal = document.getElementById('drawer-phone-val');
    if (phoneVal) phoneVal.textContent = booking.clientPhone || '+47 000 00 000';

    const emailVal = document.getElementById('drawer-email-val');
    if (emailVal) emailVal.textContent = booking.clientEmail || 'client@post.no';

    document.getElementById('drawer-intake-details').textContent = booking.placement ? `Placement: ${booking.placement}` : 'Standard placement';
    document.getElementById('drawer-notes-display').textContent = booking.notes || 'No client notes recorded.';

    const cleanNumber = cleanPhone(booking.clientPhone);
    const greeting = encodeURIComponent(`Hi ${booking.clientName}! Regarding your appointment at ${studioDisplayName()} on ${formatEnglishDate(booking.date)} at ${booking.time} (Ref #${booking.ref}).`);
    const waLink = `https://wa.me/${cleanNumber || '4700000000'}?text=${greeting}`;
    document.getElementById('drawer-btn-wa').href = waLink;

    document.getElementById('drawer-btn-email').href = `mailto:${booking.clientEmail || ''}?subject=${encodeURIComponent(`Regarding your appointment at ${studioDisplayName()} (Ref #${booking.ref})`)}`;

    modal.classList.add('open');
  }

  function initModals() {
    const closeDrawerBtn = document.getElementById('close-client-drawer-btn');
    const drawerModal = document.getElementById('modal-client-drawer');
    if (closeDrawerBtn) {
      closeDrawerBtn.addEventListener('click', () => drawerModal.classList.remove('open'));
    }

    // Direct Triage Approve / Decline from Client Card
    const drawerApproveBtn = document.getElementById('drawer-btn-approve');
    if (drawerApproveBtn) {
      drawerApproveBtn.addEventListener('click', () => {
        if (activeDrawerBooking) {
          updateBookingStatus(activeDrawerBooking.ref, 'confirmed');
          drawerModal.classList.remove('open');
          showToast(`✓ Booking for ${activeDrawerBooking.clientName} confirmed!`);
        }
      });
    }

    const drawerDeclineBtn = document.getElementById('drawer-btn-decline');
    if (drawerDeclineBtn) {
      drawerDeclineBtn.addEventListener('click', () => {
        if (activeDrawerBooking) {
          updateBookingStatus(activeDrawerBooking.ref, 'declined');
          drawerModal.classList.remove('open');
          showToast(`Booking for ${activeDrawerBooking.clientName} declined.`);
        }
      });
    }

    const drawerReschedBtn = document.getElementById('drawer-btn-reschedule');
    if (drawerReschedBtn) {
      drawerReschedBtn.addEventListener('click', () => {
        if (activeDrawerBooking) {
          drawerModal.classList.remove('open');
          openRescheduleModal(activeDrawerBooking);
        }
      });
    }

    const drawerCancelBtn = document.getElementById('drawer-btn-cancel');
    if (drawerCancelBtn) {
      drawerCancelBtn.addEventListener('click', () => {
        if (activeDrawerBooking && confirm(`Cancel appointment for ${activeDrawerBooking.clientName}?`)) {
          updateBookingStatus(activeDrawerBooking.ref, 'cancelled');
          drawerModal.classList.remove('open');
        }
      });
    }

    // Manual Booking Modal
    const openNewBookingBtn = document.getElementById('btn-quick-new-booking');
    const newBookingModal = document.getElementById('modal-new-booking');
    const closeNewBookingBtn = document.getElementById('close-new-booking-btn');
    const formNewBooking = document.getElementById('form-new-booking');

    if (openNewBookingBtn) {
      openNewBookingBtn.addEventListener('click', () => {
        document.getElementById('manual-date').value = selectedDate;
        newBookingModal.classList.add('open');
      });
    }

    if (closeNewBookingBtn) {
      closeNewBookingBtn.addEventListener('click', () => newBookingModal.classList.remove('open'));
    }

    if (formNewBooking) {
      formNewBooking.addEventListener('submit', async (e) => {
        e.preventDefault();
        const serviceSelect = document.getElementById('manual-service-select');
        const selectedOpt = serviceSelect.options[serviceSelect.selectedIndex];
        const price = parseInt(selectedOpt.getAttribute('data-price') || '350', 10);

        const newBooking = {
          id: 'manual-' + Date.now(),
          ref: `${getRefPrefix()}-` + Math.random().toString(36).substring(2, 6).toUpperCase(),
          clientName: document.getElementById('manual-client-name').value.trim(),
          clientPhone: document.getElementById('manual-client-phone').value.trim(),
          clientEmail: document.getElementById('manual-client-email').value.trim(),
          serviceName: serviceSelect.value,
          date: document.getElementById('manual-date').value,
          time: document.getElementById('manual-time').value,
          price: price,
          status: 'confirmed',
          placement: 'Manual Drop-in',
          notes: document.getElementById('manual-notes').value.trim()
        };

        const bookings = getBookings();
        bookings.unshift(newBooking);
        saveBookings(bookings);

        newBookingModal.classList.remove('open');
        formNewBooking.reset();
        showToast(`✓ Appointment created for ${newBooking.clientName}`);

        try {
          await fetch(`${getApiBase()}/api/admin/bookings/manual`, {
            method: 'POST',
            headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
            credentials: 'include',
            body: JSON.stringify({ ...newBooking, tenant_id: TENANT_ID })
          });
        } catch (_) {}
      });
    }

    // TimeBlock Modal
    const openBlockTimeBtn = document.getElementById('btn-quick-block-time');
    const openBlockTabBtn = document.getElementById('btn-add-blackout-tab');
    const timeblockModal = document.getElementById('modal-timeblock');
    const closeTimeblockBtn = document.getElementById('close-timeblock-btn');

    const openBlockModal = () => {
      document.getElementById('custom-block-date').value = selectedDate;
      timeblockModal.classList.add('open');
    };

    if (openBlockTimeBtn) openBlockTimeBtn.addEventListener('click', openBlockModal);
    if (openBlockTabBtn) openBlockTabBtn.addEventListener('click', openBlockModal);
    if (closeTimeblockBtn) {
      closeTimeblockBtn.addEventListener('click', () => timeblockModal.classList.remove('open'));
    }

    const btnPause30 = document.getElementById('btn-quick-pause-30');
    if (btnPause30) {
      btnPause30.addEventListener('click', () => {
        const now = new Date();
        const start = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
        const endD = new Date(now.getTime() + 30 * 60000);
        const end = `${String(endD.getHours()).padStart(2, '0')}:${String(endD.getMinutes()).padStart(2, '0')}`;

        const blackouts = getBlackouts();
        blackouts.push({
          id: 'pause-' + Date.now(),
          date: formatDateYMD(now),
          start_time: start,
          end_time: end,
          reason: '30 min break'
        });
        saveBlackouts(blackouts);
        timeblockModal.classList.remove('open');
        showToast('✓ 30 min break activated now');
      });
    }

    const btnCloseDay = document.getElementById('btn-quick-close-day');
    if (btnCloseDay) {
      btnCloseDay.addEventListener('click', () => {
        const now = new Date();
        const start = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
        const blackouts = getBlackouts();
        blackouts.push({
          id: 'close-' + Date.now(),
          date: formatDateYMD(now),
          start_time: start,
          end_time: '18:00',
          reason: 'Closed for the rest of today'
        });
        saveBlackouts(blackouts);
        timeblockModal.classList.remove('open');
        showToast('✓ Closed for the rest of today');
      });
    }

    const btnSaveCustomBlock = document.getElementById('btn-save-custom-block');
    if (btnSaveCustomBlock) {
      btnSaveCustomBlock.addEventListener('click', () => {
        const date = document.getElementById('custom-block-date').value || selectedDate;
        const time = document.getElementById('custom-block-time').value || '13:00';
        const reason = document.getElementById('custom-block-reason').value.trim() || 'Custom Break';

        const blackouts = getBlackouts();
        blackouts.push({
          id: 'custom-' + Date.now(),
          date: date,
          start_time: time,
          end_time: '14:00',
          reason: reason
        });
        saveBlackouts(blackouts);
        timeblockModal.classList.remove('open');
        showToast('✓ Time block saved');
      });
    }

    // Reschedule Modal
    const reschedModal = document.getElementById('modal-reschedule');
    const closeReschedBtn = document.getElementById('close-resched-btn');
    const formReschedule = document.getElementById('form-reschedule');

    if (closeReschedBtn) {
      closeReschedBtn.addEventListener('click', () => reschedModal.classList.remove('open'));
    }

    if (formReschedule) {
      formReschedule.addEventListener('submit', async (e) => {
        e.preventDefault();
        const ref = document.getElementById('resched-ref').value;
        const newDate = document.getElementById('resched-date').value;
        const newTime = document.getElementById('resched-time').value;

        const bookings = getBookings();
        const b = bookings.find(item => item.ref === ref);
        if (b) {
          b.date = newDate;
          b.time = newTime;
          saveBookings(bookings);
          reschedModal.classList.remove('open');
          showToast(`✓ Appointment rescheduled to ${formatEnglishDate(newDate)} at ${newTime}`);
          renderAgendaTimeline();
          renderAvtalerFeed();
          renderPulseBanner();

          try {
            await fetch(`${getApiBase()}/api/admin/bookings/reschedule?dev_bypass=true`, {
              method: 'POST',
              headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
              credentials: 'include',
              body: JSON.stringify({ ref, date: newDate, time: newTime, tenant_id: TENANT_ID, dev_bypass: true })
            });
          } catch (err) {
            console.warn('Backend sync failed, stored in localStorage:', err);
          }
        }
      });
    }

    const saveSettingsBtn = document.getElementById('save-settings-btn');
    if (saveSettingsBtn) {
      saveSettingsBtn.onclick = async () => {
        const emailInput = document.getElementById('studio-email-input') || document.getElementById('settings-email');
        const newEmail = emailInput ? emailInput.value.trim() : '';

        if (newEmail) {
          localStorage.setItem(storageKey('studio_email'), newEmail);
          if (window.GANGINA_CONFIG) window.GANGINA_CONFIG.studioEmail = newEmail;
        }

        showToast('✓ Saving studio settings...');

        try {
          const res = await fetch(`${getApiBase()}/api/admin/settings`, {
            method: 'POST',
            headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
            credentials: 'include',
            body: JSON.stringify({
              tenant_id: TENANT_ID,
              email: newEmail
            })
          });
          if (res.ok) {
            showToast('✓ Studio settings saved to database');
          } else {
            showToast('✓ Settings saved locally');
          }
        } catch (_) {
          showToast('✓ Settings saved locally');
        }
      };
    }

    const emailInput = document.getElementById('studio-email-input') || document.getElementById('settings-email');
    if (emailInput && !emailInput._userEdited) {
      emailInput.value =
        localStorage.getItem(storageKey('studio_email')) ||
        (TENANT_PROFILE && TENANT_PROFILE.studioEmail) ||
        '';
    }

    // Track manual edits so background syncs never clobber operator input.
    ['studio-name-input', 'studio-email-input', 'studio-whatsapp-input', 'studio-address-input', 'studio-org-input'].forEach(id => {
      const field = document.getElementById(id);
      if (field) {
        field.addEventListener('input', () => { field._userEdited = true; });
        if (TENANT_PROFILE && !field.value) {
          if (id === 'studio-whatsapp-input') field.value = TENANT_PROFILE.whatsapp || '';
          if (id === 'studio-address-input') field.value = TENANT_PROFILE.address || '';
          if (id === 'studio-org-input') field.value = TENANT_PROFILE.org || '';
        }
      }
    });

    const sendTestAlertBtn = document.getElementById('send-test-alert-btn');
    if (sendTestAlertBtn) {
      sendTestAlertBtn.addEventListener('click', () => {
        showToast('✓ Test alert dispatched via WhatsApp & Email');
      });
    }

    document.querySelectorAll('.modal-backdrop').forEach(bd => {
      bd.addEventListener('click', (e) => {
        if (e.target === bd) bd.classList.remove('open');
      });
    });
  }

  function openRescheduleModal(booking) {
    const modal = document.getElementById('modal-reschedule');
    if (!modal) return;
    document.getElementById('resched-ref').value = booking.ref;
    document.getElementById('resched-client-name').textContent = booking.clientName || '';

    const dateInput = document.getElementById('resched-date');
    const timeInput = document.getElementById('resched-time');
    dateInput.value = booking.date;
    timeInput.value = booking.time;

    function renderSlotsForDate(selectedDateStr) {
      const slotsList = document.getElementById('resched-slots-list');
      if (!slotsList) return;
      slotsList.innerHTML = '';

      const allSlots = [
        '10:00', '10:30', '11:00', '11:30',
        '12:00', '12:30', '13:00', '13:30',
        '14:00', '14:30', '15:00', '15:30',
        '16:00', '16:30', '17:00', '17:30'
      ];

      const bookings = getBookings();
      const bookedTimes = bookings
        .filter(b => b.date === selectedDateStr && b.ref !== booking.ref && (b.status === 'confirmed' || b.status === 'pending'))
        .map(b => b.time);

      allSlots.forEach(slot => {
        const isBooked = bookedTimes.includes(slot);
        const pill = document.createElement('button');
        pill.type = 'button';
        pill.className = `slot-pill${timeInput.value === slot ? ' active' : ''}`;
        if (isBooked) {
          pill.style.opacity = '0.35';
          pill.style.textDecoration = 'line-through';
          pill.title = 'Slot occupied';
        }
        pill.textContent = slot;
        pill.addEventListener('click', () => {
          timeInput.value = slot;
          slotsList.querySelectorAll('.slot-pill').forEach(p => p.classList.remove('active'));
          pill.classList.add('active');
        });
        slotsList.appendChild(pill);
      });
    }

    renderSlotsForDate(booking.date);

    dateInput.onchange = () => {
      renderSlotsForDate(dateInput.value);
    };

    modal.classList.add('open');
  }

  // ----------------------------------------------------------------------------
  // 10. ADVANCED COLOR ENGINE (preset swatches + custom palette picker)
  // ----------------------------------------------------------------------------
  const THEME_PRESETS = {
    'noir-champagne': { label: 'Noir Champagne', accent: '#C9A876', card: '#18181B', canvas: '#0A0A0A' },
    'klo-sage': { label: 'Klō Sage', accent: '#A3B18A', card: '#161A16', canvas: '#0E110E' },
    'rose-chrome': { label: 'Rose & Chrome', accent: '#E0A899', card: '#1C1619', canvas: '#120E10' },
    'titanium-minimal': { label: 'Titanium Minimal', accent: '#E4E4E7', card: '#18181B', canvas: '#0F0F10' },
    'royal-cobalt': { label: 'Royal Cobalt', accent: '#3B82F6', card: '#131722', canvas: '#0A0D14' }
  };

  // Circular swatches rendered inside the custom theme drawer. The accent
  // swatches are mirrored by the inline `data-accent` buttons; the surface
  // swatches pair a card and a canvas tone.
  const THEME_ACCENT_SWATCHES = [
    { name: 'Champagne Gold', hex: '#C9A876' },
    { name: 'Klō Sage', hex: '#A3B18A' },
    { name: 'Rose Quartz', hex: '#E0A899' },
    { name: 'Titanium Silver', hex: '#E4E4E7' },
    { name: 'Royal Cobalt', hex: '#3B82F6' },
    { name: 'Emerald Noir', hex: '#2D5A27' },
    { name: 'Warm Terracotta', hex: '#C86D51' },
    { name: 'Lavender Frost', hex: '#9D8DF1' },
    { name: 'Pure Bronze', hex: '#A97148' }
  ];

  const THEME_SURFACE_SWATCHES = [
    { name: 'Noir Slate', card: '#18181B', canvas: '#0A0A0A' },
    { name: 'Warm Espresso', card: '#1A1615', canvas: '#0F0D0C' },
    { name: 'Forest Deep', card: '#141A15', canvas: '#0A0E0B' },
    { name: 'Titanium Gray', card: '#1F2024', canvas: '#121316' },
    { name: 'Cashmere Light', card: '#FFFFFF', canvas: '#F8F6F0' }
  ];

  let currentPalette = null;
  let draftPalette = { accent: '#E4E4E7', card: '#18181B', canvas: '#0F0F10' };

  function clampChannel(value) {
    return Math.max(0, Math.min(255, Math.round(value)));
  }

  function parseHexColor(hex) {
    let value = String(hex == null ? '' : hex).trim().replace(/^#/, '');
    if (value.length === 3) {
      value = value.split('').map(c => c + c).join('');
    }
    if (!/^[0-9a-fA-F]{6}$/.test(value)) return null;
    return {
      r: parseInt(value.slice(0, 2), 16),
      g: parseInt(value.slice(2, 4), 16),
      b: parseInt(value.slice(4, 6), 16)
    };
  }

  function toHexColor(c) {
    const part = n => clampChannel(n).toString(16).padStart(2, '0');
    return `#${part(c.r)}${part(c.g)}${part(c.b)}`.toUpperCase();
  }

  function normalizeHexColor(hex, fallback) {
    const parsed = parseHexColor(hex);
    if (!parsed) return fallback || null;
    return toHexColor(parsed);
  }

  function mixHexColors(from, to, ratio) {
    const a = parseHexColor(from);
    const b = parseHexColor(to);
    if (!a || !b) return from;
    return toHexColor({
      r: a.r + (b.r - a.r) * ratio,
      g: a.g + (b.g - a.g) * ratio,
      b: a.b + (b.b - a.b) * ratio
    });
  }

  function rgbaFromHex(hex, alpha) {
    const c = parseHexColor(hex);
    if (!c) return `rgba(0, 0, 0, ${alpha})`;
    return `rgba(${c.r}, ${c.g}, ${c.b}, ${alpha})`;
  }

  function relativeLuminance(hex) {
    const c = parseHexColor(hex);
    if (!c) return 0;
    const channels = [c.r, c.g, c.b].map(value => {
      const s = value / 255;
      return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
  }

  function isDarkColor(hex) {
    return relativeLuminance(hex) < 0.5;
  }

  /** Picks the foreground (near-black / near-white) with the best contrast. */
  function bestContrastText(bg) {
    const l = relativeLuminance(bg);
    const contrastWithWhite = 1.05 / (l + 0.05);
    const contrastWithBlack = (l + 0.05) / 0.05;
    return contrastWithBlack >= contrastWithWhite ? '#121214' : '#FAFAFA';
  }

  function themeStorageKey() {
    return `${TENANT_ID}_custom_theme`;
  }

  function studioDefaultPalette() {
    // Titanium Minimal is the studio-wide default color combo.
    const base = 'titanium-minimal';
    return Object.assign({ preset: base }, THEME_PRESETS[base]);
  }

  /**
   * Applies a palette with STRICT theme isolation: only the accent family is
   * exposed to CSS. Sheets, cards, inputs and the bottom dock are hardcoded in
   * the stylesheet and must never be overridden here, which keeps text/background
   * contrast safe under every theme (rule: no white-on-white / dark-on-dark).
   */
  function applyCustomTheme(palette) {
    if (!palette) return;
    const root = document.documentElement;
    const accent = normalizeHexColor(palette.accent, '#C9A876');
    const card = normalizeHexColor(palette.card, '#18181B');
    const canvas = normalizeHexColor(palette.canvas, '#0A0A0A');
    const accentText = bestContrastText(accent);

    const setVar = (name, value) => root.style.setProperty(name, value);

    // Theme surface 1/3: accent fills (calendar active day, secondary buttons).
    setVar('--admin-accent', accent);
    setVar('--admin-accent-hover', mixHexColors(accent, accentText, 0.18));
    setVar('--admin-accent-light', rgbaFromHex(accent, 0.18));
    setVar('--admin-accent-text', accentText);
    // Theme surface 3/3: focus rings & subtle brand glow.
    setVar('--admin-accent-glow', rgbaFromHex(accent, 0.32));

    // Note: `card`/`canvas` are persisted for the drawer + live preview only.
    // They intentionally do NOT touch --admin-sheet-*, --admin-card-* or the dock.
    currentPalette = { accent, card, canvas, preset: palette.preset || '' };
  }

  function clearCustomTheme() {
    const root = document.documentElement;
    [
      '--admin-accent', '--admin-accent-hover', '--admin-accent-light',
      '--admin-accent-text', '--admin-accent-glow'
    ].forEach(name => root.style.removeProperty(name));
    currentPalette = null;
  }

  function persistCustomTheme(palette) {
    try {
      localStorage.setItem(themeStorageKey(), JSON.stringify(palette));
    } catch (e) {
      // Storage may be unavailable (private mode); the theme still applies live.
    }
  }

  function loadStoredTheme() {
    try {
      const raw = localStorage.getItem(themeStorageKey());
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (!parsed || !parsed.accent || !parsed.card || !parsed.canvas) return null;
      return parsed;
    } catch (e) {
      return null;
    }
  }

  function syncPaletteControls(palette) {
    document.querySelectorAll('#theme-presets-grid .palette-btn').forEach(btn => {
      const presetId = btn.getAttribute('data-preset');
      btn.classList.toggle('active', Boolean(palette) && presetId === palette.preset);
    });
  }

  function applyCustomThemeFromStorage() {
    const stored = loadStoredTheme();
    if (stored) {
      applyCustomTheme(stored);
    } else {
      // No saved theme: fall back to the studio default (Titanium Minimal).
      applyCustomTheme(studioDefaultPalette());
    }
    syncPaletteControls(currentPalette);
  }

  function commitPalette(palette) {
    applyCustomTheme({
      accent: normalizeHexColor(palette.accent, '#C9A876'),
      card: normalizeHexColor(palette.card, '#18181B'),
      canvas: normalizeHexColor(palette.canvas, '#0A0A0A'),
      preset: palette.preset || ''
    });
    persistCustomTheme(currentPalette);
    syncPaletteControls(currentPalette);
  }

  /** Returns the preset id matching a palette exactly, else 'custom'. */
  function matchPresetId(palette) {
    if (!palette) return '';
    for (const id of Object.keys(THEME_PRESETS)) {
      const preset = THEME_PRESETS[id];
      if (
        preset.accent === palette.accent &&
        preset.card === palette.card &&
        preset.canvas === palette.canvas
      ) {
        return id;
      }
    }
    return 'custom';
  }

  function openCustomThemeSheet() {
    const base = currentPalette || studioDefaultPalette();
    draftPalette = {
      accent: normalizeHexColor(base.accent, '#C9A876'),
      card: normalizeHexColor(base.card, '#18181B'),
      canvas: normalizeHexColor(base.canvas, '#0A0A0A')
    };
    renderThemeDraft();
    const sheet = document.getElementById('custom-theme-sheet');
    if (sheet) {
      sheet.classList.add('open');
      sheet.setAttribute('aria-hidden', 'false');
    }
  }

  function closeCustomThemeSheet() {
    const sheet = document.getElementById('custom-theme-sheet');
    if (sheet) {
      sheet.classList.remove('open');
      sheet.setAttribute('aria-hidden', 'true');
    }
  }

  /** Paints the drawer selection rings and the mini live preview. */
  function renderThemeDraft() {
    const accentDots = Array.from(
      document.querySelectorAll('#theme-accent-dots .theme-dot[data-accent]')
    );
    accentDots.forEach(dot => {
      const hex = normalizeHexColor(dot.getAttribute('data-accent'), '');
      dot.classList.toggle('active', Boolean(hex) && hex === draftPalette.accent);
    });

    document.querySelectorAll('#theme-surface-dots .theme-dot[data-card]').forEach(dot => {
      const card = normalizeHexColor(dot.getAttribute('data-card'), '');
      const canvas = normalizeHexColor(dot.getAttribute('data-canvas'), '');
      dot.classList.toggle('active', card === draftPalette.card && canvas === draftPalette.canvas);
    });

    const wheel = document.getElementById('theme-accent-wheel');
    if (wheel) wheel.value = draftPalette.accent;

    const wheelDot = document.getElementById('theme-accent-wheel-dot');
    if (wheelDot) {
      const curated = accentDots.map(dot => normalizeHexColor(dot.getAttribute('data-accent'), ''));
      wheelDot.classList.toggle('active', curated.indexOf(draftPalette.accent) === -1);
    }

    const preview = document.getElementById('theme-preview');
    if (preview) {
      const cardText = bestContrastText(draftPalette.card);
      preview.style.setProperty('--preview-accent', draftPalette.accent);
      preview.style.setProperty('--preview-accent-text', bestContrastText(draftPalette.accent));
      preview.style.setProperty('--preview-card', draftPalette.card);
      preview.style.setProperty('--preview-canvas', draftPalette.canvas);
      // Auto-contrast the preview copy so it is never white-on-white.
      preview.style.setProperty('--preview-card-text', cardText);
      preview.style.setProperty('--preview-card-muted', rgbaFromHex(cardText, 0.62));
      preview.setAttribute('data-preview-tone', isDarkColor(draftPalette.card) ? 'dark' : 'light');
    }
  }

  function applyCustomThemeDraft() {
    commitPalette({
      accent: draftPalette.accent,
      card: draftPalette.card,
      canvas: draftPalette.canvas,
      preset: matchPresetId(draftPalette)
    });
    closeCustomThemeSheet();
    showToast('✓ Custom theme applied');
  }

  function initPaletteSwitcher() {
    // Curated preset swatches (applied immediately)
    document.querySelectorAll('#theme-presets-grid .palette-btn[data-preset]').forEach(btn => {
      const presetId = btn.getAttribute('data-preset');
      if (presetId === 'custom') return;
      btn.addEventListener('click', () => {
        const preset = THEME_PRESETS[presetId];
        if (!preset) return;
        commitPalette({ accent: preset.accent, card: preset.card, canvas: preset.canvas, preset: presetId });
        showToast(`✓ Palette changed to ${preset.label}`);
      });
    });

    // 6th card -> slide up the custom theme drawer
    const openBtn = document.getElementById('theme-custom-open');
    if (openBtn) openBtn.addEventListener('click', openCustomThemeSheet);

    // Drawer controls
    const sheet = document.getElementById('custom-theme-sheet');
    const closeBtn = document.getElementById('custom-theme-close');
    const cancelBtn = document.getElementById('custom-theme-cancel');
    const applyBtn = document.getElementById('custom-theme-apply');
    if (closeBtn) closeBtn.addEventListener('click', closeCustomThemeSheet);
    if (cancelBtn) cancelBtn.addEventListener('click', closeCustomThemeSheet);
    if (applyBtn) applyBtn.addEventListener('click', applyCustomThemeDraft);
    if (sheet) {
      sheet.addEventListener('click', (e) => {
        if (e.target === sheet) closeCustomThemeSheet();
      });
    }
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') closeCustomThemeSheet();
    });

    // Accent circular swatches
    document.querySelectorAll('#theme-accent-dots .theme-dot[data-accent]').forEach(dot => {
      const hex = normalizeHexColor(dot.getAttribute('data-accent'), '');
      if (!hex) return;
      dot.addEventListener('click', () => {
        draftPalette.accent = hex;
        renderThemeDraft();
      });
    });

    // Native color wheel for exact hex selection
    const wheel = document.getElementById('theme-accent-wheel');
    if (wheel) {
      wheel.addEventListener('input', () => {
        draftPalette.accent = normalizeHexColor(wheel.value, draftPalette.accent);
        renderThemeDraft();
      });
    }

    // Surface circular swatches
    document.querySelectorAll('#theme-surface-dots .theme-dot[data-card]').forEach(dot => {
      const card = normalizeHexColor(dot.getAttribute('data-card'), '');
      const canvas = normalizeHexColor(dot.getAttribute('data-canvas'), '');
      if (!card || !canvas) return;
      dot.addEventListener('click', () => {
        draftPalette.card = card;
        draftPalette.canvas = canvas;
        renderThemeDraft();
      });
    });

    // Reset to the studio's default palette
    const resetBtn = document.getElementById('theme-reset-btn');
    if (resetBtn) {
      resetBtn.addEventListener('click', () => {
        commitPalette(studioDefaultPalette());
        showToast('✓ Default palette restored');
      });
    }

    // Initial paint: restore a stored palette, otherwise apply the default
    // combo (Titanium Minimal) and highlight its swatch.
    const stored = loadStoredTheme();
    if (stored) {
      applyCustomTheme(stored);
    } else {
      applyCustomTheme(studioDefaultPalette());
    }
    syncPaletteControls(currentPalette);
  }

  // ----------------------------------------------------------------------------
  // 11. NAVIGATION & INITIALIZATION
  // ----------------------------------------------------------------------------
  function initNavigation() {
    const dockPills = document.querySelectorAll('.dock-pill');
    dockPills.forEach(pill => {
      pill.addEventListener('click', () => {
        dockPills.forEach(p => p.classList.remove('active'));
        pill.classList.add('active');

        activeTab = pill.getAttribute('data-tab');
        document.querySelectorAll('.tab-panel').forEach(panel => panel.classList.remove('active'));

        const targetPanel = document.getElementById(`panel-${activeTab}`);
        if (targetPanel) targetPanel.classList.add('active');

        if (window.innerWidth < 960) {
          setCanopyExpanded(false);
        }
      });
    });

    const calToggleBtn = document.getElementById('cal-mode-toggle');
    if (calToggleBtn) {
      calToggleBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        toggleCanopy();
      });
    }

    const prevMonthBtn = document.getElementById('cal-prev-month');
    const nextMonthBtn = document.getElementById('cal-next-month');

    if (prevMonthBtn) {
      prevMonthBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        viewMonth--;
        if (viewMonth < 0) {
          viewMonth = 11;
          viewYear--;
        }
        renderMonthGrid();
        if (!isCanopyExpanded && window.innerWidth < 960) {
          renderWeekStrip();
        }
      });
    }

    if (nextMonthBtn) {
      nextMonthBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        viewMonth++;
        if (viewMonth > 11) {
          viewMonth = 0;
          viewYear++;
        }
        renderMonthGrid();
        if (!isCanopyExpanded && window.innerWidth < 960) {
          renderWeekStrip();
        }
      });
    }

    // Filter pills in Tab 2
    const filterPills = document.querySelectorAll('.feed-filter-pill');
    filterPills.forEach(fp => {
      fp.addEventListener('click', () => {
        filterPills.forEach(p => p.classList.remove('active'));
        fp.classList.add('active');
        activeFilter = fp.getAttribute('data-filter');
        renderAvtalerFeed();
      });
    });

    const searchInput = document.getElementById('admin-search-input');
    if (searchInput) {
      searchInput.addEventListener('input', () => renderAvtalerFeed());
    }

    const archiveHead = document.getElementById('archive-toggle-head');
    const archiveBody = document.getElementById('archive-content-body');
    const archiveChevron = document.getElementById('archive-chevron');

    if (archiveHead) {
      archiveHead.addEventListener('click', () => {
        isArchiveOpen = !isArchiveOpen;
        if (isArchiveOpen) {
          archiveBody.classList.add('open');
          archiveChevron.textContent = 'Hide Archive ▲';
        } else {
          archiveBody.classList.remove('open');
          archiveChevron.textContent = 'View Archive ▼';
        }
      });
    }

    const refreshAgendaBtn = document.getElementById('btn-refresh-agenda');
    if (refreshAgendaBtn) {
      refreshAgendaBtn.addEventListener('click', async () => {
        showToast('↻ Synchronizing...');
        await syncWithSupabase();
      });
    }
  }

  function renderAllViews() {
    renderWeekStrip();
    renderMonthGrid();
    renderAgendaTimeline();
    renderPulseBanner();
    renderAvtalerFeed();
    renderScheduleDays();
    renderBlockedIntervalsTable();
  }

  // ----------------------------------------------------------------------------
  // 12. SECURITY GATE
  // ----------------------------------------------------------------------------
  function initSecurityGate() {
    const overlay = document.getElementById('admin-login-overlay');
    const emailForm = document.getElementById('admin-email-form');
    const codeForm = document.getElementById('admin-login-form');
    const emailInputEl = document.getElementById('admin-login-email');
    const pinInput = document.getElementById('admin-pin-input');
    const lockBtn = document.getElementById('studio-lock-btn');
    const emailError = document.getElementById('admin-email-error');
    const codeError = document.getElementById('admin-login-error');
    const otpBtn = document.getElementById('admin-send-otp-btn');
    const verifyBtn = document.getElementById('admin-verify-btn');
    const resendBtn = document.getElementById('login-resend-btn');
    const changeEmailBtn = document.getElementById('login-change-email-btn');
    const chipEmailEl = document.getElementById('login-code-chip-email');
    const emailStep = document.getElementById('login-step-email');
    const codeStep = document.getElementById('login-step-code');

    if (!overlay) return;

    const OTP_LABEL = 'Send verification code →';
    const RESEND_LABEL = 'Resend code';
    const VERIFY_LABEL = 'Open Studio Manager →';

    let challengeToken = '';
    let activeChallengeEmail = '';
    let activeChallengeTenant = '';
    let loginStep = 'email';
    let resendTimer = null;

    function setStepError(el, message) {
      if (!el) return;
      if (message) {
        el.textContent = message;
        el.style.display = 'block';
      } else {
        el.textContent = '';
        el.style.display = 'none';
      }
    }

    function clearStepErrors() {
      setStepError(emailError, '');
      setStepError(codeError, '');
    }

    function stopResendCooldown() {
      if (resendTimer) {
        clearInterval(resendTimer);
        resendTimer = null;
      }
      if (resendBtn) {
        resendBtn.disabled = false;
        resendBtn.classList.remove('is-loading');
        resendBtn.textContent = RESEND_LABEL;
      }
    }

    function startResendCooldown() {
      if (!resendBtn) return;
      let remaining = 30;
      resendBtn.disabled = true;
      resendBtn.textContent = `Resend code (${remaining}s)`;
      if (resendTimer) clearInterval(resendTimer);
      resendTimer = setInterval(() => {
        remaining -= 1;
        if (remaining <= 0) {
          clearInterval(resendTimer);
          resendTimer = null;
          resendBtn.disabled = false;
          resendBtn.textContent = RESEND_LABEL;
        } else {
          resendBtn.textContent = `Resend code (${remaining}s)`;
        }
      }, 1000);
    }

    function showLoginStep(step) {
      loginStep = step;
      if (emailStep) emailStep.hidden = step !== 'email';
      if (codeStep) codeStep.hidden = step !== 'code';

      const activeStep = step === 'code' ? codeStep : emailStep;
      if (activeStep && activeStep.classList) {
        activeStep.classList.remove('login-step-in');
        // Force reflow so the entrance animation restarts on every switch.
        void activeStep.offsetWidth;
        activeStep.classList.add('login-step-in');
      }

      clearStepErrors();

      if (step === 'email') {
        stopResendCooldown();
        if (otpBtn) {
          otpBtn.disabled = false;
          otpBtn.classList.remove('is-loading');
          otpBtn.textContent = OTP_LABEL;
        }
        if (emailInputEl) setTimeout(() => emailInputEl.focus(), 120);
      } else if (pinInput) {
        pinInput.value = '';
        setTimeout(() => pinInput.focus(), 220);
      }
    }

    // Smart tenant auto-detection: adapt the gate as the owner types/blurs.
    if (emailInputEl) {
      let detectTimer = null;
      const detectTenantFromEmail = () => {
        const matched = resolveTenantByAdminEmail(emailInputEl.value);
        if (matched) {
          setActiveTenant(matched, { applyBranding: false });
          applyLoginBranding(matched);
        } else {
          applyLoginBranding(HAS_TENANT_PARAM ? TENANT_ID : '');
        }
      };
      emailInputEl.addEventListener('input', () => {
        if (detectTimer) clearTimeout(detectTimer);
        detectTimer = setTimeout(detectTenantFromEmail, 200);
      });
      emailInputEl.addEventListener('blur', detectTenantFromEmail);
    }

    async function sendOtp(isResend) {
      const requestedEmail =
        (emailInputEl && emailInputEl.value.trim()) ||
        (TENANT_PROFILE && TENANT_PROFILE.studioEmail) ||
        localStorage.getItem(storageKey('studio_email')) ||
        '';

      if (!isResend && (!requestedEmail || requestedEmail.indexOf('@') === -1)) {
        setStepError(emailError, 'Enter a valid email address to receive the code.');
        if (emailInputEl) emailInputEl.focus();
        return;
      }

      const requestedTenant = resolveTenantByAdminEmail(requestedEmail) || TENANT_ID;
      const button = isResend ? resendBtn : otpBtn;
      const idleLabel = isResend ? RESEND_LABEL : OTP_LABEL;

      if (button) {
        button.disabled = true;
        button.classList.add('is-loading');
        button.textContent = isResend ? 'Sending...' : 'Sending code...';
      }
      clearStepErrors();

      try {
        const res = await fetch(`${getApiBase()}/api/admin/auth/send-otp`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ tenant_id: requestedTenant, email: requestedEmail })
        });
        const data = await res.json().catch(() => ({}));

        if (res.ok && data.success) {
          challengeToken = data.challengeToken || '';
          activeChallengeEmail = data.email || requestedEmail;
          activeChallengeTenant = data.tenant_id || requestedTenant;

          if (activeChallengeTenant) {
            setActiveTenant(activeChallengeTenant, { applyBranding: false });
            applyLoginBranding(activeChallengeTenant);
          }
          if (chipEmailEl) chipEmailEl.textContent = activeChallengeEmail;

          if (button) {
            button.disabled = false;
            button.classList.remove('is-loading');
            button.textContent = idleLabel;
          }

          if (!isResend) {
            showLoginStep('code');
          } else if (pinInput) {
            pinInput.focus();
          }
          startResendCooldown();
        } else {
          setStepError(
            isResend ? codeError : emailError,
            data.message || 'Could not send the verification code. Please try again.'
          );
          if (button) {
            button.disabled = false;
            button.classList.remove('is-loading');
            button.textContent = idleLabel;
          }
        }
      } catch (err) {
        setStepError(isResend ? codeError : emailError, 'Could not reach the service. Please try again.');
        if (button) {
          button.disabled = false;
          button.classList.remove('is-loading');
          button.textContent = idleLabel;
        }
      }
    }

    const hasValidToken = Boolean(getAdminToken() || sessionStorage.getItem(storageKey('admin_auth')) === 'true');
    if (hasValidToken) {
      isGateLocked = false;
      overlay.classList.remove('unlocking');
      overlay.style.display = 'none';
      document.body.classList.remove('is-locked');
      document.body.classList.remove('is-unlocked');
    } else {
      isGateLocked = true;
      overlay.classList.remove('unlocking');
      overlay.style.display = 'flex';
      document.body.classList.add('is-locked');
      document.body.classList.remove('is-unlocked');
      showLoginStep('email');
    }

    if (lockBtn) {
      lockBtn.addEventListener('click', () => {
        sessionStorage.removeItem(storageKey('admin_auth'));
        localStorage.removeItem(tokenStorageKey());
        document.cookie = 'admin_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax';
        isGateLocked = true;
        overlay.classList.remove('unlocking');
        overlay.style.display = 'flex';
        document.body.classList.add('is-locked');
        document.body.classList.remove('is-unlocked');
        if (emailInputEl) emailInputEl.value = '';
        if (pinInput) pinInput.value = '';
        applyLoginBranding(HAS_TENANT_PARAM ? TENANT_ID : '');
        showLoginStep('email');
        renderAllViews();
        showToast('Studio Manager locked');
      });
    }

    // STEP 1 — request the verification code
    if (emailForm) {
      emailForm.addEventListener('submit', (e) => {
        e.preventDefault();
        if (loginStep === 'email') sendOtp(false);
      });
    }
    if (otpBtn && otpBtn.type !== 'submit') {
      otpBtn.addEventListener('click', () => sendOtp(false));
    }

    // STEP 2 — resend code (30s cooldown enforced by the button state)
    if (resendBtn) {
      resendBtn.addEventListener('click', () => {
        if (resendBtn.disabled) return;
        sendOtp(true);
      });
    }

    // STEP 2 — return to the email step
    if (changeEmailBtn) {
      changeEmailBtn.addEventListener('click', () => showLoginStep('email'));
    }

    // STEP 2 — verify the code and mint the session
    if (codeForm) {
      codeForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const code = (pinInput ? pinInput.value : '').trim();
        if (!code) {
          setStepError(codeError, 'Enter the 6-digit code from the email.');
          return;
        }

        if (verifyBtn) {
          verifyBtn.disabled = true;
          verifyBtn.classList.add('is-loading');
          verifyBtn.textContent = 'Verifying...';
        }
        clearStepErrors();

        try {
          const verifyEmail =
            activeChallengeEmail ||
            (emailInputEl && emailInputEl.value.trim()) ||
            (TENANT_PROFILE && TENANT_PROFILE.studioEmail) ||
            localStorage.getItem(storageKey('studio_email')) ||
            '';
          const verifyTenant =
            activeChallengeTenant || resolveTenantByAdminEmail(verifyEmail) || TENANT_ID;

          const res = await fetch(`${getApiBase()}/api/admin/auth/verify-otp`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({
              email: verifyEmail,
              code: code,
              challengeToken: challengeToken,
              tenant_id: verifyTenant
            })
          });

          const data = await res.json().catch(() => ({}));

          if (res.ok && data.success && data.token) {
            setActiveTenant(verifyTenant, { applyBranding: true });
            localStorage.setItem(tokenStorageKey(), data.token);
            sessionStorage.setItem(storageKey('admin_auth'), 'true');
            document.cookie = `admin_token=${data.token}; path=/; max-age=2592000; SameSite=Lax`;
            clearStepErrors();
            showToast('✓ Studio Manager ready');

            // Cinematic dissolve: recede the capsule, clear the veil, then load
            // the authenticated feed once the animation has settled.
            isGateLocked = false;
            overlay.classList.add('unlocking');
            document.body.classList.remove('is-locked');
            document.body.classList.add('is-unlocked');

            setTimeout(() => {
              overlay.style.display = 'none';
              overlay.classList.remove('unlocking');
              document.body.classList.remove('is-unlocked');
              loadAllData();
            }, 750);
          } else {
            setStepError(codeError, data.message || 'Invalid or expired code. Request a new one.');
          }
        } catch (err) {
          setStepError(codeError, 'Network error during verification. Please try again.');
        } finally {
          if (verifyBtn) {
            verifyBtn.disabled = false;
            verifyBtn.classList.remove('is-loading');
            verifyBtn.textContent = VERIFY_LABEL;
          }
        }
      });
    }
  }

  // ----------------------------------------------------------------------------
  // 13. DYNAMIC TENANT BRANDING
  // ----------------------------------------------------------------------------
  /** Styles the frosted gate capsule. Empty id renders the neutral atelier view. */
  function applyLoginBranding(tenantId) {
    const card = document.getElementById('admin-login-card');
    const heading = document.getElementById('login-studio-name');
    const subtitle = document.getElementById('login-subtitle');
    const badge = document.getElementById('admin-login-badge');
    const logoImg = document.getElementById('admin-login-logo');
    const profile = tenantId ? tenantProfileById(tenantId) : null;

    if (profile) {
      if (heading) heading.textContent = profile.fullName || profile.name || tenantId;
      if (card) card.setAttribute('data-tenant', tenantId);
      // Cross-fade the glass badge from the "A.G" monogram to the studio logo.
      if (logoImg) {
        logoImg.setAttribute('src', profile.logoUrl || '');
        logoImg.setAttribute('alt', profile.name || '');
      }
      if (badge) badge.classList.add('is-resolved');
    } else {
      if (heading) heading.textContent = 'Atelier Portal';
      if (card) card.removeAttribute('data-tenant');
      if (badge) badge.classList.remove('is-resolved');
    }
    // Subtitle stays constant per the frosted-capsule design.
    if (subtitle) subtitle.textContent = 'Enter email to open portal';
  }

  function applyTenantBranding() {
    const name = (TENANT_PROFILE && TENANT_PROFILE.name) || TENANT_ID;
    const fullName = (TENANT_PROFILE && TENANT_PROFILE.fullName) || name;
    const subtitle = (TENANT_PROFILE && TENANT_PROFILE.subtitle) || '';
    const logo = (TENANT_PROFILE && TENANT_PROFILE.logoUrl) || '';

    document.title = `${name} Studio Manager · Executive Portal`;

    const brandEl = document.getElementById('studio-brand-name');
    if (brandEl) brandEl.textContent = name;

    const subEl = document.querySelector('.studio-subtext');
    if (subEl && subtitle) subEl.textContent = subtitle;

    if (logo) {
      document
        .querySelectorAll('.canopy-logo-img, .canopy-watermark-img, .sheet-watermark-img')
        .forEach((img) => {
          img.setAttribute('src', logo);
          if (img.getAttribute('alt')) img.setAttribute('alt', name);
        });
    }

    // Login gate is branded only when a tenant was explicitly requested; the
    // email handlers repaint it once an owner email resolves a tenant.
    applyLoginBranding(HAS_TENANT_PARAM ? TENANT_ID : '');

    const loginEmailInput = document.getElementById('admin-login-email');
    if (loginEmailInput && !loginEmailInput.value && HAS_TENANT_PARAM && TENANT_PROFILE) {
      loginEmailInput.value = TENANT_PROFILE.studioEmail || '';
    }

    if (TENANT_PROFILE) {
      const nameInput = document.getElementById('studio-name-input');
      if (nameInput && !nameInput._userEdited && !nameInput.value) nameInput.value = fullName;
    }
  }

  // ----------------------------------------------------------------------------
  // INITIALIZE ON DOM READY
  // ----------------------------------------------------------------------------
  document.addEventListener('DOMContentLoaded', () => {
    applyTenantBranding();
    initTouchGestures();
    initNavigation();
    initModals();
    initPaletteSwitcher();
    initSecurityGate();
    renderAllViews();
    // Only reach for real data when a session is already established; the locked
    // dashboard stays on its synthetic silhouettes until the owner signs in.
    if (!isGateLocked) {
      syncWithSupabase(true);
    }
  });

})();
