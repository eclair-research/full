/* ============================================================
   js/calendar.js — Calendrier de réservation (equipment.html)
   v2 : lit les réservations depuis window.BookingsStore (partagé
        avec la page de réservation), se redessine quand une
        réservation est ajoutée/annulée, et distingue visuellement
        les réservations "pending" des "confirmed".
   ============================================================ */

const COLORS = {
  'Potentiostat 1':   { bg: '#8B0000', text: '#ffffff' },
  'Potentiostat 2':   { bg: '#8B0000', text: '#ffffff' },
  'Potentiostat 3':   { bg: '#8B0000', text: '#ffffff' },
  'RDE 1':            { bg: '#FF6347', text: '#000000' },
  'RDE 2':            { bg: '#FF6347', text: '#000000' },
  'AFM':              { bg: '#FF69B4', text: '#000000' },
  'DEMS':             { bg: '#800080', text: '#ffffff' },
  'Polishing Machine':{ bg: '#00FFFF', text: '#000000' },
};

const MAINTENANCE = ['Polishing Machine'];

let currentDate = new Date();
let bookings = [];

const tooltip = document.createElement('div');
tooltip.style.cssText = `
  position: fixed; z-index: 1000; background: white;
  border: 1px solid rgba(0,0,0,0.08); border-radius: 10px;
  padding: 12px 16px; box-shadow: 0 8px 24px rgba(0,0,0,0.12);
  font-family: var(--sans); font-size: 0.82rem; max-width: 220px;
  pointer-events: none; opacity: 0; transition: opacity 0.15s;
`;
document.body.appendChild(tooltip);

function showTooltip(e, b) {
  const color = COLORS[b.instrument] || { bg: '#eee', text: '#555' };
  const start = new Date(`${b.dateStart}T${b.startTime}:00`);
  const end = (b.endDate && b.endTime)
    ? new Date(`${b.endDate}T${b.endTime}:00`)
    : new Date(start.getTime() + b.duration * 3600 * 1000);
  const endH = String(end.getHours()).padStart(2, '0');
  const endM = String(end.getMinutes()).padStart(2, '0');
  const statusTxt = b.status === 'pending'
    ? '<span style="color:#a07830;">● Pending</span>'
    : '<span style="color:#007d6f;">● Confirmed</span>';

  const commentCol = b.comment
    ? `<div style="flex:1;border-left:1px solid rgba(0,0,0,0.07);padding-left:14px;color:var(--fog);font-size:0.78rem;line-height:1.7;font-style:italic;">${b.comment}</div>`
    : '';
  tooltip.style.maxWidth = b.comment ? '420px' : '240px';
  tooltip.innerHTML = `
    <div style="display:flex; align-items:center; gap:8px; margin-bottom:10px;">
      <div style="width:10px; height:10px; border-radius:3px; background:${color.bg}; flex-shrink:0;"></div>
      <span style="font-weight:500; color:var(--ink);">${b.instrument}</span>
    </div>
    <div style="display:flex; gap:14px;">
      <div style="flex:1; color:var(--fog); font-size:0.78rem; line-height:1.9;">
        <div>👤 ${b.user || 'Unknown'}</div>
        <div>📅 ${b.dateStart}</div>
        <div>🕐 ${b.startTime} – ${endH}:${endM}</div>
        <div>${statusTxt}</div>
      </div>
      ${commentCol}
    </div>
  `;
  tooltip.style.opacity = '1';
  positionTooltip(e);
}

function positionTooltip(e) {
  // Petit écran : centré au milieu de la fenêtre
  if (window.innerWidth <= 820) {
    tooltip.style.left = '50%';
    tooltip.style.top = '50%';
    tooltip.style.transform = 'translate(-50%, -50%)';
    return;
  }
  tooltip.style.transform = 'none';
  const x = e.clientX + 14, y = e.clientY + 14;
  const w = tooltip.offsetWidth, h = tooltip.offsetHeight;
  tooltip.style.left = (x + w > window.innerWidth ? x - w - 28 : x) + 'px';
  tooltip.style.top  = (y + h > window.innerHeight ? y - h - 28 : y) + 'px';
}

function hideTooltip() { tooltip.style.opacity = '0'; }

function buildDateMap(list) {
  const map = {};
  list.forEach(b => {
    const start = new Date(`${b.dateStart}T${b.startTime}:00`);
    const end = (b.endDate && b.endTime)
      ? new Date(`${b.endDate}T${b.endTime}:00`)
      : new Date(start.getTime() + b.duration * 3600 * 1000);
    let cur = new Date(start);
    while (cur <= end) {
      const day = cur.toISOString().slice(0, 10);
      (map[day] = map[day] || []).push(b);
      cur.setDate(cur.getDate() + 1);
      cur.setHours(0, 0, 0, 0);
    }
  });
  return map;
}

function getLiveStatus(name) {
  if (MAINTENANCE.includes(name)) return { text: 'Maintenance', class: 'status-off' };
  const now = new Date();
  for (const b of bookings) {
    if (b.instrument !== name || !b.startTime) continue;
    const start = new Date(`${b.dateStart}T${b.startTime}:00`);
    const end = (b.endDate && b.endTime)
      ? new Date(`${b.endDate}T${b.endTime}:00`)
      : new Date(start.getTime() + b.duration * 3600 * 1000);
    if (now >= start && now <= end) {
      const endH = String(end.getHours()).padStart(2, '0');
      const endM = String(end.getMinutes()).padStart(2, '0');
      return { text: 'In use', class: 'status-busy', tooltip: `${b.user || 'Unknown'} · ${b.startTime}–${endH}:${endM}` };
    }
  }
  return { text: 'Available', class: 'status-ok' };
}

function updateInstrumentCards() {
  document.querySelectorAll('.equip-card').forEach(card => {
    const nameEl = card.querySelector('.equip-card-name');
    const statusEl = card.querySelector('.equip-row-status');
    const btn = card.querySelector('button');
    if (!nameEl || !statusEl) return;
    const status = getLiveStatus(nameEl.textContent.trim());
    statusEl.textContent = status.text;
    statusEl.className = 'equip-row-status ' + status.class;
    const ex = statusEl.querySelector('.status-tooltip');
    if (ex) ex.remove();
    if (status.tooltip) {
      const tip = document.createElement('span');
      tip.className = 'status-tooltip';
      tip.textContent = status.tooltip;
      statusEl.appendChild(tip);
    }
    if (btn) {
      if (status.class === 'status-off') { btn.disabled = true; btn.className = 'btn-ghost'; btn.textContent = 'Unavailable'; }
      else { btn.disabled = false; btn.className = 'btn-primary'; btn.textContent = 'See calendar →'; }
    }
  });
}

function renderCalendar() {
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const monthNames = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  const titleEl = document.getElementById('calendar-title');
  if (!titleEl) return;
  titleEl.textContent = `${monthNames[month]} ${year}`;

  const grid = document.getElementById('calendar-grid');
  grid.innerHTML = '';
  ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].forEach(d => {
    const h = document.createElement('div');
    h.className = 'calendar-day-header';
    h.textContent = d;
    grid.appendChild(h);
  });

  const firstDay = new Date(year, month, 1).getDay();
  const offset = (firstDay === 0) ? 6 : firstDay - 1;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const today = new Date().toISOString().slice(0, 10);
  const dateMap = buildDateMap(bookings);

  for (let i = 0; i < offset; i++) {
    const empty = document.createElement('div');
    empty.className = 'calendar-day empty';
    grid.appendChild(empty);
  }

  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${year}-${String(month+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
    const cell = document.createElement('div');
    cell.className = 'calendar-day' + (dateStr === today ? ' today' : '');
    const numEl = document.createElement('div');
    numEl.className = 'day-num';
    numEl.textContent = d;
    cell.appendChild(numEl);

    if (dateMap[dateStr]) {
      dateMap[dateStr].forEach(b => {
        const color = COLORS[b.instrument] || { bg: '#eee', text: '#555' };
        const chip = document.createElement('div');
        chip.className = 'booking-chip';
        chip.style.background = color.bg;
        chip.style.color = color.text;
        // Pending : style pointillé pour distinguer
        if (b.status === 'pending') {
          chip.style.opacity = '0.7';
          chip.style.border = '1px dashed rgba(255,255,255,0.8)';
        }
        const shortName = b.instrument.split(' ').slice(0, 2).join(' ');
        chip.textContent = `${shortName} ${b.startTime}`;
        chip.addEventListener('mouseenter', e => showTooltip(e, b));
        chip.addEventListener('mousemove', e => positionTooltip(e));
        chip.addEventListener('mouseleave', hideTooltip);
        cell.appendChild(chip);
      });
    }
    grid.appendChild(cell);
  }
  renderLegend();
}

function renderLegend() {
  const legend = document.getElementById('calendar-legend');
  if (!legend) return;
  legend.innerHTML = '';
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const used = new Set();
  bookings.forEach(b => {
    const start = new Date(b.dateStart + 'T00:00:00');
    if (start.getFullYear() === year && start.getMonth() === month) used.add(b.instrument);
  });
  if (used.size === 0) {
    legend.innerHTML = '<span style="font-size:0.78rem;color:var(--fog)">No bookings this month.</span>';
    return;
  }
  used.forEach(inst => {
    const color = COLORS[inst] || { bg: '#eee', text: '#555' };
    const item = document.createElement('div');
    item.className = 'legend-item';
    item.innerHTML = `<div class="legend-dot" style="background:${color.bg};border:1px solid ${color.text}22"></div><span>${inst}</span>`;
    legend.appendChild(item);
  });
}

function changeMonth(delta) {
  currentDate.setMonth(currentDate.getMonth() + delta);
  renderCalendar();
}

function scrollToCalendar() {
  const el = document.getElementById('calendar-section');
  if (el) el.scrollIntoView({ behavior: 'smooth' });
}

// ── Branchement au store partagé ──
window.BookingsStore.onChange(list => {
  bookings = list;
  renderCalendar();
  updateInstrumentCards();
});
window.BookingsStore.load();

setInterval(updateInstrumentCards, 60 * 1000);
