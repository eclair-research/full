/* ============================================================
   js/calendar.js — Calendrier de réservation
   Utilisé uniquement par equipment.html
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
  position: fixed;
  z-index: 1000;
  background: white;
  border: 1px solid rgba(0,0,0,0.08);
  border-radius: 10px;
  padding: 12px 16px;
  box-shadow: 0 8px 24px rgba(0,0,0,0.12);
  font-family: var(--sans);
  font-size: 0.82rem;
  max-width: 220px;
  pointer-events: none;
  opacity: 0;
  transition: opacity 0.15s;
`;
document.body.appendChild(tooltip);

function showTooltip(e, booking) {
  const color = COLORS[booking.instrument] || { bg: '#eee', text: '#555' };
  const startDate = new Date(`${booking.dateStart}T${booking.startTime}:00`);
  const endDate   = new Date(startDate.getTime() + booking.duration * 3600 * 1000);
  const endH = String(endDate.getHours()).padStart(2, '0');
  const endM = String(endDate.getMinutes()).padStart(2, '0');

  const commentCol = booking.comment
    ? `<div style="
        flex:1;
        border-left:1px solid rgba(0,0,0,0.07);
        padding-left:14px;
        color:var(--fog);
        font-size:0.78rem;
        line-height:1.7;
        font-style:italic;
      ">${booking.comment}</div>`
    : '';

  tooltip.style.maxWidth = booking.comment ? '420px' : '220px';

  tooltip.innerHTML = `
    <div style="display:flex; align-items:center; gap:8px; margin-bottom:10px;">
      <div style="width:10px; height:10px; border-radius:3px; background:${color.bg}; flex-shrink:0;"></div>
      <span style="font-weight:500; color:var(--ink);">${booking.instrument}</span>
    </div>
    <div style="display:flex; gap:14px;">
      <div style="flex:1; color:var(--fog); font-size:0.78rem; line-height:1.9;">
        <div>👤 ${booking.user || 'Unknown'}</div>
        <div>📅 ${booking.dateStart}</div>
        <div>🕐 ${booking.startTime} – ${endH}:${endM}</div>
        <div>⏱ ${booking.duration}h</div>
      </div>
      ${commentCol}
    </div>
  `;
  tooltip.style.opacity = '1';
  positionTooltip(e);
}

function positionTooltip(e) {
  // Sur petit écran : tooltip centré au milieu de la fenêtre
  if (window.innerWidth <= 820) {
    tooltip.style.left = '50%';
    tooltip.style.top = '50%';
    tooltip.style.transform = 'translate(-50%, -50%)';
    return;
  }

  // Sur grand écran : suit le curseur
  tooltip.style.transform = 'none';
  const x = e.clientX + 14;
  const y = e.clientY + 14;
  const w = tooltip.offsetWidth;
  const h = tooltip.offsetHeight;
  tooltip.style.left = (x + w > window.innerWidth  ? x - w - 28 : x) + 'px';
  tooltip.style.top  = (y + h > window.innerHeight ? y - h - 28 : y) + 'px';
}

function hideTooltip() {
  tooltip.style.opacity = '0';
}

function parseCSV(text) {
  const lines = text.trim().split(/\r?\n/).slice(1);
  return lines.map(line => {
    const parts = line.split(',').map(s => s.trim());
    return {
      instrument: parts[0],
      dateStart:  parts[1],
      startTime:  parts[2],
      duration:   parseFloat(parts[3]),
      user:       parts[4],
      comment:    parts[5] || ''
    };
  }).filter(b => b.instrument && b.dateStart && b.startTime && !isNaN(b.duration));
}

function buildDateMap(bookings) {
  const map = {};
  bookings.forEach(b => {
    const startDateTime = new Date(`${b.dateStart}T${b.startTime}:00`);
    const endDateTime   = new Date(startDateTime.getTime() + b.duration * 3600 * 1000);
    let cur = new Date(startDateTime);
    while (cur <= endDateTime) {
      const dayStr = cur.toISOString().slice(0, 10);
      if (!map[dayStr]) map[dayStr] = [];
      map[dayStr].push(b);
      cur.setDate(cur.getDate() + 1);
      cur.setHours(0, 0, 0, 0);
    }
  });
  return map;
}

function getLiveStatus(instrumentName) {
  if (MAINTENANCE.includes(instrumentName)) {
    return { text: 'Maintenance', class: 'status-off' };
  }
  const now = new Date();
  for (const b of bookings) {
    if (b.instrument !== instrumentName) continue;
    if (!b.startTime || isNaN(b.duration)) continue;
    const startDate = new Date(`${b.dateStart}T${b.startTime}:00`);
    const endDate   = new Date(startDate.getTime() + b.duration * 3600 * 1000);
    if (now >= startDate && now <= endDate) {
      const endH = String(endDate.getHours()).padStart(2, '0');
      const endM = String(endDate.getMinutes()).padStart(2, '0');
      return {
        text: 'In use',
        class: 'status-busy',
        tooltip: `${b.user || 'Unknown'} · ${b.startTime}–${endH}:${endM}`
      };
    }
  }
  return { text: 'Available', class: 'status-ok' };
}

function updateInstrumentCards() {
  document.querySelectorAll('.equip-card').forEach(card => {
    const nameEl   = card.querySelector('.equip-card-name');
    const statusEl = card.querySelector('.equip-row-status');
    const btn      = card.querySelector('button');
    const status   = getLiveStatus(nameEl.textContent.trim());

    statusEl.textContent = status.text;
    statusEl.className   = 'equip-row-status ' + status.class;

    const existing = statusEl.querySelector('.status-tooltip');
    if (existing) existing.remove();
    if (status.tooltip) {
      const tip = document.createElement('span');
      tip.className   = 'status-tooltip';
      tip.textContent = status.tooltip;
      statusEl.appendChild(tip);
    }

    if (status.class === 'status-off') {
      btn.disabled    = true;
      btn.className   = 'btn-ghost';
      btn.textContent = 'Unavailable';
    } else {
      btn.disabled    = false;
      btn.className   = 'btn-primary';
      btn.textContent = 'See calendar →';
    }
  });
}

function renderCalendar() {
  const year  = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const monthNames = ['January','February','March','April','May','June',
                      'July','August','September','October','November','December'];

  document.getElementById('calendar-title').textContent = `${monthNames[month]} ${year}`;

  const grid = document.getElementById('calendar-grid');
  grid.innerHTML = '';

  ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].forEach(d => {
    const h = document.createElement('div');
    h.className   = 'calendar-day-header';
    h.textContent = d;
    grid.appendChild(h);
  });

  const firstDay    = new Date(year, month, 1).getDay();
  const offset      = (firstDay === 0) ? 6 : firstDay - 1;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const today       = new Date().toISOString().slice(0, 10);
  const dateMap     = buildDateMap(bookings);

  for (let i = 0; i < offset; i++) {
    const empty = document.createElement('div');
    empty.className = 'calendar-day empty';
    grid.appendChild(empty);
  }

  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${year}-${String(month+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
    const cell    = document.createElement('div');
    cell.className = 'calendar-day' + (dateStr === today ? ' today' : '');

    const numEl = document.createElement('div');
    numEl.className   = 'day-num';
    numEl.textContent = d;
    cell.appendChild(numEl);

    if (dateMap[dateStr]) {
      dateMap[dateStr].forEach(b => {
        const color = COLORS[b.instrument] || { bg: '#eee', text: '#555' };
        const chip  = document.createElement('div');
        chip.className        = 'booking-chip';
        chip.style.background = color.bg;
        chip.style.color      = color.text;
        const shortName       = b.instrument.split(' ').slice(0, 2).join(' ');
        chip.textContent      = `${shortName} ${b.startTime}h`;

        chip.addEventListener('mouseenter', e => showTooltip(e, b));
        chip.addEventListener('mousemove',  e => positionTooltip(e));
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
  legend.innerHTML = '';
  const year  = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const used  = new Set();

  bookings.forEach(b => {
    const start = new Date(b.dateStart + 'T00:00:00');
    const end   = new Date(start.getTime() + b.duration * 3600 * 1000);
    if (
      (start.getFullYear() === year && start.getMonth() === month) ||
      (end.getFullYear()   === year && end.getMonth()   === month)
    ) {
      used.add(b.instrument);
    }
  });

  if (used.size === 0) {
    legend.innerHTML = '<span style="font-size:0.78rem;color:var(--fog)">No bookings this month.</span>';
    return;
  }

  used.forEach(inst => {
    const color = COLORS[inst] || { bg: '#eee', text: '#555' };
    const item  = document.createElement('div');
    item.className = 'legend-item';
    item.innerHTML = `
      <div class="legend-dot" style="background:${color.bg};border:1px solid ${color.text}22"></div>
      <span>${inst}</span>
    `;
    legend.appendChild(item);
  });
}

function changeMonth(delta) {
  currentDate.setMonth(currentDate.getMonth() + delta);
  renderCalendar();
}

function scrollToCalendar() {
  document.getElementById('calendar-section').scrollIntoView({ behavior: 'smooth' });
}

fetch('assets/bookings.csv')
  .then(r => r.text())
  .then(text => {
    bookings = parseCSV(text);
    renderCalendar();
    updateInstrumentCards();
  })
  .catch(() => {
    document.getElementById('calendar-wrap').insertAdjacentHTML('beforeend', `
      <div style="padding:24px;text-align:center;color:var(--fog);font-size:0.85rem;">
        ⚠️ Could not load bookings.csv — make sure you're using Live Server and the file exists in assets/.
      </div>`);
    renderCalendar();
    updateInstrumentCards();
  });

setInterval(updateInstrumentCards, 60 * 1000);
