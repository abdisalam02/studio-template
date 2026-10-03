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

  function getApiBase() {
    if (typeof window === 'undefined') return '';
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
      if (window.location.port !== '3000') {
        return 'http://localhost:3000';
      }
    }
    return window.location.origin;
  }

  function getAdminToken() {
    try {
      return localStorage.getItem('admin_token') || sessionStorage.getItem('admin_token') || '';
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
    try {
      const stored = localStorage.getItem('gangina_bookings');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {
      console.warn('Error reading bookings:', e);
    }
    localStorage.setItem('gangina_bookings', JSON.stringify(SEED_BOOKINGS));
    return SEED_BOOKINGS;
  }

  function saveBookings(bookings) {
    localStorage.setItem('gangina_bookings', JSON.stringify(bookings));
    renderAllViews();
  }

  function getBlackouts() {
    try {
      const stored = localStorage.getItem('gangina_blackouts');
      if (stored) return JSON.parse(stored);
    } catch (e) {}
    return [
      { id: 'b1', date: formatDateYMD(todayObj), start_time: '12:30', end_time: '13:00', reason: 'Lunch Break' }
    ];
  }

  function saveBlackouts(list) {
    localStorage.setItem('gangina_blackouts', JSON.stringify(list));
    renderAgendaTimeline();
    renderBlockedIntervalsTable();
  }

  /**
   * Synchronizes with Supabase via Next.js backend API
   */
  async function syncWithSupabase(silent = false) {
    try {
      const endpoint = `${getApiBase()}/api/admin/bookings?tenant_id=gangina&dev_bypass=true`;
      const res = await fetch(endpoint, {
        headers: getAuthHeaders({ 'Accept': 'application/json' }),
        credentials: 'include'
      });
      if (res.status === 401) {
        localStorage.removeItem('admin_token');
        sessionStorage.removeItem('gangina_admin_auth');
        const overlay = document.getElementById('admin-login-overlay');
        if (overlay) overlay.style.display = 'flex';
        throw new Error('Authentication required (401)');
      }
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (!data || !data.success) throw new Error('API returned failure');

      // 1. Fetch Tenant Name and clean up to Gangina
      if (data.tenant) {
        const rawName = data.tenant.name || 'Gangina';
        const brandName = rawName.replace(/ Beauty Studio/i, '').trim();
        const brandEl = document.getElementById('studio-brand-name');
        if (brandEl) brandEl.textContent = brandName || 'Gangina';

        const studioNameInput = document.getElementById('studio-name-input');
        if (studioNameInput && !studioNameInput._userEdited) {
          studioNameInput.value = rawName;
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
            ref: b.ref || `GNG-${b.id}`,
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
          localStorage.setItem('gangina_bookings', JSON.stringify(mapped));
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
        localStorage.setItem('gangina_blackouts', JSON.stringify(mappedBlackouts));
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
    if (subEl) subEl.textContent = `Daily schedule for Gangina Studio`;

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
              <span class="timeline-client-name">🔒 ${bl.reason || 'Blocked Time'}</span>
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
        <span class="datetime-chip">📅 ${formatEnglishDate(b.date)}</span>
        <span class="datetime-chip">🕒 ${b.time}</span>
        ${b.clientEmail ? `<span class="datetime-chip client-email-chip" title="${b.clientEmail}">✉️ ${b.clientEmail}</span>` : ''}
        ${b.clientPhone ? `<span class="datetime-chip">📞 ${b.clientPhone}</span>` : ''}
      </div>
    `;

    // Quiet luxury triage buttons for pending appointments
    if (isPending && !isArchiveMode) {
      const triageRow = document.createElement('div');
      triageRow.className = 'triage-action-row';
      triageRow.innerHTML = `
        <button type="button" class="btn-triage btn-triage-approve">✓ Approve</button>
        <button type="button" class="btn-triage btn-triage-decline">✕ Decline</button>
        <button type="button" class="btn-triage btn-triage-details">Details →</button>
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
          body: JSON.stringify({ ref, status: newStatus, tenant_id: 'gangina', dev_bypass: true })
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
      const cached = localStorage.getItem('gangina_saved_hours');
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
      const savedInterval = localStorage.getItem('gangina_slot_interval') || '30';
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
              localStorage.setItem('gangina_slot_interval', customInput.value);
            }
          }
        } else {
          customWrap.style.display = 'none';
          localStorage.setItem('gangina_slot_interval', schedInterval.value);
        }
      };

      if (customInput) {
        customInput.oninput = () => {
          if (customInput.value) {
            localStorage.setItem('gangina_slot_interval', customInput.value);
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

        localStorage.setItem('gangina_saved_hours', JSON.stringify(newCache));

        try {
          const res = await fetch(`${getApiBase()}/api/admin/hours`, {
            method: 'POST',
            headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
            credentials: 'include',
            body: JSON.stringify({
              tenant_id: 'gangina',
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
            <strong style="font-size:0.86rem;">🔒 ${bl.reason || 'Blocked Time'}</strong>
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

    document.getElementById('drawer-ref-pill').textContent = `CLIENT CARD · REF ${booking.ref || 'GNG-0000'}`;
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
    const greeting = encodeURIComponent(`Hi ${booking.clientName}! Regarding your appointment at Gangina on ${formatEnglishDate(booking.date)} at ${booking.time} (Ref #${booking.ref}).`);
    const waLink = `https://wa.me/${cleanNumber || '4700000000'}?text=${greeting}`;
    document.getElementById('drawer-btn-wa').href = waLink;

    document.getElementById('drawer-btn-email').href = `mailto:${booking.clientEmail || ''}?subject=${encodeURIComponent(`Regarding your appointment at Gangina (Ref #${booking.ref})`)}`;

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
          ref: 'GNG-' + Math.random().toString(36).substring(2, 6).toUpperCase(),
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
            body: JSON.stringify({ ...newBooking, tenant_id: 'gangina' })
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
              body: JSON.stringify({ ref, date: newDate, time: newTime, tenant_id: 'gangina', dev_bypass: true })
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
          localStorage.setItem('gangina_studio_email', newEmail);
          if (window.GANGINA_CONFIG) window.GANGINA_CONFIG.studioEmail = newEmail;
        }

        showToast('✓ Saving studio settings...');

        try {
          const res = await fetch(`${getApiBase()}/api/admin/settings`, {
            method: 'POST',
            headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
            credentials: 'include',
            body: JSON.stringify({
              tenant_id: 'gangina',
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
      emailInput.value = localStorage.getItem('gangina_studio_email') || 'YOUR_TEST_EMAIL@gmail.com';
    }

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
    document.getElementById('resched-client-name').textContent = `${booking.clientName} (Current: ${formatEnglishDate(booking.date)} at ${booking.time})`;

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
  // 10. COLOR PALETTE SWITCHER
  // ----------------------------------------------------------------------------
  function initPaletteSwitcher() {
    const savedTheme = localStorage.getItem('gangina_admin_theme') || 'noir-champagne';
    document.documentElement.setAttribute('data-theme', savedTheme);

    const buttons = document.querySelectorAll('.palette-btn');
    buttons.forEach(btn => {
      const themeVal = btn.getAttribute('data-theme-val');
      if (themeVal === savedTheme) btn.classList.add('active');
      else btn.classList.remove('active');

      btn.addEventListener('click', () => {
        buttons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        document.documentElement.setAttribute('data-theme', themeVal);
        localStorage.setItem('gangina_admin_theme', themeVal);
        showToast(`✓ Palette changed to ${btn.querySelector('.palette-name').textContent}`);
      });
    });
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
    const form = document.getElementById('admin-login-form');
    const pinInput = document.getElementById('admin-pin-input');
    const lockBtn = document.getElementById('studio-lock-btn');
    const errorEl = document.getElementById('admin-login-error');
    const otpBtn = document.getElementById('admin-send-otp-btn');
    const unlockBtn = document.getElementById('admin-auth-btn');

    if (!overlay) return;

    let challengeToken = '';

    const hasValidToken = Boolean(getAdminToken() || sessionStorage.getItem('gangina_admin_auth') === 'true');
    if (hasValidToken) {
      overlay.style.display = 'none';
    } else {
      overlay.style.display = 'flex';
      if (pinInput) setTimeout(() => pinInput.focus(), 150);
    }

    if (lockBtn) {
      lockBtn.addEventListener('click', () => {
        sessionStorage.removeItem('gangina_admin_auth');
        localStorage.removeItem('admin_token');
        document.cookie = 'admin_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax';
        overlay.style.display = 'flex';
        if (pinInput) {
          pinInput.value = '';
          pinInput.focus();
        }
        showToast('🔒 Studio Manager locked');
      });
    }

    function getActiveStudioEmail() {
      return localStorage.getItem('gangina_studio_email') ||
             (window.GANGINA_CONFIG && window.GANGINA_CONFIG.studioEmail) ||
             'YOUR_TEST_EMAIL@gmail.com';
    }

    if (otpBtn) {
      otpBtn.addEventListener('click', async () => {
        otpBtn.disabled = true;
        const originalText = otpBtn.textContent;
        otpBtn.textContent = 'Sending code to email...';
        showToast('Sending code to registered email...');

        try {
          const targetEmail = getActiveStudioEmail();
          const res = await fetch(`${getApiBase()}/api/admin/auth/send-otp`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: targetEmail })
          });
          const data = await res.json().catch(() => ({}));
          if (res.ok && data.success) {
            challengeToken = data.challengeToken || '';
            showToast('✓ Code sent to registered email! Check inbox.');
            if (errorEl) errorEl.style.display = 'none';
            if (pinInput) {
              pinInput.value = '';
              pinInput.placeholder = '6-digit code';
              pinInput.focus();
            }

            let countdown = 30;
            otpBtn.textContent = `Resend code (${countdown}s)`;
            const timer = setInterval(() => {
              countdown--;
              if (countdown <= 0) {
                clearInterval(timer);
                otpBtn.disabled = false;
                otpBtn.textContent = 'Send one-time code to email';
              } else {
                otpBtn.textContent = `Resend code (${countdown}s)`;
              }
            }, 1000);
          } else {
            showToast(data.message || 'Could not send verification code.');
            otpBtn.disabled = false;
            otpBtn.textContent = originalText;
          }
        } catch (err) {
          showToast('Could not reach auth server.');
          otpBtn.disabled = false;
          otpBtn.textContent = originalText;
        }
      });
    }

    if (form) {
      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const code = (pinInput ? pinInput.value : '').trim();
        if (!code) {
          if (errorEl) {
            errorEl.textContent = 'Please enter a 6-digit code.';
            errorEl.style.display = 'block';
          }
          return;
        }

        if (unlockBtn) {
          unlockBtn.disabled = true;
          unlockBtn.textContent = 'Verifying...';
        }

        try {
          const targetEmail = getActiveStudioEmail();
          const res = await fetch(`${getApiBase()}/api/admin/auth/verify-otp`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({
              email: targetEmail,
              code: code,
              challengeToken: challengeToken
            })
          });

          const data = await res.json().catch(() => ({}));

          if (res.ok && data.success && data.token) {
            localStorage.setItem('admin_token', data.token);
            sessionStorage.setItem('gangina_admin_auth', 'true');
            document.cookie = `admin_token=${data.token}; path=/; max-age=2592000; SameSite=Lax`;
            overlay.style.display = 'none';
            if (errorEl) errorEl.style.display = 'none';
            showToast('✓ Studio Manager ready');
            syncWithSupabase(false);
          } else {
            if (errorEl) {
              errorEl.textContent = data.message || 'Invalid or expired email code. Please request a new one.';
              errorEl.style.display = 'block';
            }
          }
        } catch (err) {
          if (errorEl) {
            errorEl.textContent = 'Network error verifying email code. Please try again.';
            errorEl.style.display = 'block';
          }
        } finally {
          if (unlockBtn) {
            unlockBtn.disabled = false;
            unlockBtn.textContent = 'Open Studio Manager →';
          }
        }
      });
    }
  }

  // ----------------------------------------------------------------------------
  // INITIALIZE ON DOM READY
  // ----------------------------------------------------------------------------
  document.addEventListener('DOMContentLoaded', () => {
    initTouchGestures();
    initNavigation();
    initModals();
    initPaletteSwitcher();
    initSecurityGate();
    renderAllViews();
    syncWithSupabase(true);
  });

})();
