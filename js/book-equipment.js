/* ============================================================
   js/book-equipment.js — Réservation d'équipement (maquette)
   v2 : store partagé + multi-jours/nuit + périodicité

   Flux : 1) équipement  2) créneau (modes)  3) récap

   Modes de créneau (étape 2) :
     - Normal       : grille de créneaux dans la journée (8h–20h)
     - Multi-day    : du [date+heure] au [date+heure] (continu, nuit OK)
     - Recurring    : même créneau répété (hebdo/quotidien), tout-ou-rien

   Données : data/equipment.json + window.BookingsStore (partagé calendrier)
   ============================================================ */

const OPEN_HOUR = 8;
const CLOSE_HOUR = 20;

let EQUIPMENT = [];

const draft = {
  equipment: null,
  mode: 'normal',
  recurring: false,
  date: '', startTime: '', duration: 1,
  startDate: '', startClock: '08:00',
  endDate: '', endClock: '10:00',
  recurFreq: 'weekly', recurEndMode: 'count', recurCount: 4, recurUntil: '',
  channels: 1, user: '', comment: '',
};

let SESSION_BOOKINGS = [];

Promise.all([
  fetch('data/equipment.json').then(r => r.json()),
  window.BookingsStore.load(),
]).then(([equip]) => {
  EQUIPMENT = equip;
  renderEquipmentChoices();
  renderMyBookings();
}).catch(() => {
  document.getElementById('equipment-choices').innerHTML =
    '<p style="color:var(--fog);font-size:0.85rem;">Could not load data — use Live Server.</p>';
});

function renderEquipmentChoices() {
  const container = document.getElementById('equipment-choices');
  container.innerHTML = '';
  EQUIPMENT.forEach(eq => {
    const maint = eq.status === 'maintenance';
    const div = document.createElement('div');
    div.className = 'equipment-choice' + (maint ? ' disabled' : '');
    const channels = eq.channels || 1;
    const chLabel = channels > 1 ? `${channels} channels` : 'single channel';
    div.innerHTML = `
      <div>
        <div class="equipment-choice-name">${eq.name}</div>
        <div class="equipment-choice-desc">${eq.desc || ''}</div>
      </div>
      <div class="equipment-choice-meta">${maint ? '⚠ Maintenance' : '✓ ' + chLabel}</div>
    `;
    if (!maint) {
      div.addEventListener('click', () => {
        container.querySelectorAll('.equipment-choice').forEach(c => c.classList.remove('selected'));
        div.classList.add('selected');
        draft.equipment = eq;
        draft.channels = 1;
        document.getElementById('to-step-2').disabled = false;
      });
    }
    container.appendChild(div);
  });
}

function setupStep2() {
  const eq = draft.equipment;
  document.getElementById('step2-equip-name').textContent = eq.name;
  const today = new Date().toISOString().slice(0, 10);
  if (!draft.date) draft.date = today;
  if (!draft.startDate) draft.startDate = today;
  if (!draft.endDate) draft.endDate = today;

  const dEl = document.getElementById('booking-date');
  dEl.value = draft.date; dEl.min = today;
  document.getElementById('md-start-date').value = draft.startDate;
  document.getElementById('md-start-date').min = today;
  document.getElementById('md-end-date').value = draft.endDate;
  document.getElementById('md-end-date').min = today;

  const channelsField = document.getElementById('channels-field');
  const channels = eq.channels || 1;
  if (channels > 1) {
    channelsField.style.display = 'block';
    const sel = document.getElementById('booking-channels');
    sel.innerHTML = '';
    for (let i = 1; i <= channels; i++) {
      const opt = document.createElement('option');
      opt.value = i; opt.textContent = `${i} channel${i > 1 ? 's' : ''}`;
      sel.appendChild(opt);
    }
    sel.value = draft.channels || 1;
  } else {
    channelsField.style.display = 'none';
    draft.channels = 1;
  }

  document.getElementById('booking-duration').value = draft.duration || 1;
  document.getElementById('booking-user').value = draft.user || '';
  document.getElementById('booking-comment').value = draft.comment || '';

  applyMode();
  renderTimeslots();
  validateStep2();
}

function applyMode() {
  const multiday = document.getElementById('opt-multiday').checked;
  draft.mode = multiday ? 'multiday' : 'normal';
  document.getElementById('normal-slots').style.display = multiday ? 'none' : 'block';
  document.getElementById('multiday-fields').style.display = multiday ? 'block' : 'none';
  const recurring = document.getElementById('opt-recurring').checked;
  draft.recurring = recurring;
  document.getElementById('recurring-fields').style.display = recurring ? 'block' : 'none';
  document.getElementById('opt-recurring').disabled = multiday;
  document.getElementById('opt-multiday').disabled = recurring;
}

function renderTimeslots() {
  const grid = document.getElementById('timeslots');
  grid.innerHTML = '';
  if (draft.mode !== 'normal') return;
  const eq = draft.equipment;
  const totalChannels = eq.channels || 1;
  const wanted = draft.channels || 1;
  const duration = parseFloat(document.getElementById('booking-duration').value) || 1;

  for (let h = OPEN_HOUR; h < CLOSE_HOUR; h++) {
    const cell = document.createElement('div');
    cell.className = 'timeslot';
    const hh = String(h).padStart(2, '0');
    cell.textContent = `${hh}:00`;
    if (h + duration > CLOSE_HOUR) {
      cell.classList.add('disabled');
      grid.appendChild(cell);
      continue;
    }
    const sMs = new Date(`${draft.date}T${hh}:00:00`).getTime();
    const eMs = sMs + duration * 3600 * 1000;
    const taken = window.BookingsStore.channelsTakenInterval(eq.name, sMs, eMs);
    const available = totalChannels - taken;
    if (available < wanted) {
      cell.classList.add('taken');
      cell.title = `Only ${available}/${totalChannels} channel(s) free`;
    } else {
      cell.addEventListener('click', () => {
        grid.querySelectorAll('.timeslot').forEach(c => c.classList.remove('selected'));
        cell.classList.add('selected');
        draft.startTime = `${hh}:00`;
        validateStep2();
      });
    }
    if (draft.startTime === `${hh}:00` && !cell.classList.contains('taken')) {
      cell.classList.add('selected');
    }
    grid.appendChild(cell);
  }
}

function computeOccurrences() {
  const occ = [];
  if (draft.mode === 'multiday') {
    const startMs = new Date(`${draft.startDate}T${draft.startClock}:00`).getTime();
    const endMs = new Date(`${draft.endDate}T${draft.endClock}:00`).getTime();
    occ.push({
      startDate: draft.startDate, startTime: draft.startClock,
      endDate: draft.endDate, endTime: draft.endClock,
      durationH: (endMs - startMs) / 3600000,
    });
    return occ;
  }
  const duration = parseFloat(document.getElementById('booking-duration').value) || 1;
  const baseDate = draft.date;
  const baseTime = draft.startTime;
  if (!draft.recurring) {
    occ.push(makeNormalOcc(baseDate, baseTime, duration));
    return occ;
  }
  const stepDays = draft.recurFreq === 'weekly' ? 7 : 1;
  let dates = [];
  if (draft.recurEndMode === 'count') {
    let d = new Date(baseDate + 'T00:00:00');
    for (let i = 0; i < draft.recurCount; i++) {
      dates.push(d.toISOString().slice(0, 10));
      d.setDate(d.getDate() + stepDays);
    }
  } else {
    let d = new Date(baseDate + 'T00:00:00');
    const until = new Date(draft.recurUntil + 'T00:00:00');
    let guard = 0;
    while (d <= until && guard < 366) {
      dates.push(d.toISOString().slice(0, 10));
      d.setDate(d.getDate() + stepDays);
      guard++;
    }
  }
  dates.forEach(dt => occ.push(makeNormalOcc(dt, baseTime, duration)));
  return occ;
}

function makeNormalOcc(dateStr, timeStr, durationH) {
  const startMs = new Date(`${dateStr}T${timeStr}:00`).getTime();
  const endMs = startMs + durationH * 3600000;
  const end = new Date(endMs);
  const endDate = end.toISOString().slice(0, 10);
  const endTime = `${String(end.getHours()).padStart(2,'0')}:${String(end.getMinutes()).padStart(2,'0')}`;
  return { startDate: dateStr, startTime: timeStr, endDate, endTime, durationH };
}

function checkOccurrences(occ) {
  const eq = draft.equipment;
  const total = eq.channels || 1;
  const wanted = draft.channels || 1;
  const conflicts = [];
  occ.forEach(o => {
    const sMs = new Date(`${o.startDate}T${o.startTime}:00`).getTime();
    const eMs = new Date(`${o.endDate}T${o.endTime}:00`).getTime();
    const taken = window.BookingsStore.channelsTakenInterval(eq.name, sMs, eMs);
    if (total - taken < wanted) conflicts.push(`${o.startDate} ${o.startTime}`);
  });
  return conflicts.length ? { ok: false, conflicts } : { ok: true };
}

function validateStep2() {
  const alert = document.getElementById('step2-alert');
  const nextBtn = document.getElementById('to-step-3');
  draft.user = document.getElementById('booking-user').value.trim();
  draft.comment = document.getElementById('booking-comment').value.trim();
  draft.duration = parseFloat(document.getElementById('booking-duration').value) || 0;

  function fail(msg) {
    alert.className = 'booking-alert error';
    alert.textContent = msg;
    alert.style.display = 'block';
    nextBtn.disabled = true;
    return false;
  }
  if (!draft.user) return fail('Please enter your name.');
  if (draft.mode === 'normal') {
    if (draft.duration <= 0) return fail('Duration must be greater than 0.');
    if (!draft.startTime) { alert.style.display = 'none'; nextBtn.disabled = true; return false; }
  } else {
    const sMs = new Date(`${draft.startDate}T${draft.startClock}:00`).getTime();
    const eMs = new Date(`${draft.endDate}T${draft.endClock}:00`).getTime();
    if (!(eMs > sMs)) return fail('End must be after start.');
  }
  const occ = computeOccurrences();
  const res = checkOccurrences(occ);
  if (!res.ok) return fail('Conflict on: ' + res.conflicts.join(', ') + '. The whole booking is blocked (all-or-nothing).');
  alert.style.display = 'none';
  nextBtn.disabled = false;
  return true;
}

function setupStep3() {
  const eq = draft.equipment;
  const occ = computeOccurrences();
  const rows = [['Equipment', eq.name]];
  if (draft.mode === 'multiday') {
    const o = occ[0];
    rows.push(['From', `${o.startDate} ${o.startTime}`]);
    rows.push(['To', `${o.endDate} ${o.endTime}`]);
    rows.push(['Total duration', `${o.durationH} h`]);
  } else if (draft.recurring) {
    rows.push(['Time', `${draft.startTime} (${draft.duration} h)`]);
    rows.push(['Frequency', draft.recurFreq === 'weekly' ? 'Every week' : 'Every day']);
    rows.push(['Occurrences', `${occ.length} sessions`]);
    rows.push(['First / Last', `${occ[0].startDate} → ${occ[occ.length-1].startDate}`]);
  } else {
    const o = occ[0];
    rows.push(['Date', o.startDate]);
    rows.push(['Time', `${o.startTime} – ${o.endTime}`]);
    rows.push(['Duration', `${draft.duration} h`]);
  }
  if ((eq.channels || 1) > 1) rows.push(['Channels', `${draft.channels} of ${eq.channels}`]);
  rows.push(['Name', draft.user]);
  if (draft.comment) rows.push(['Comment', draft.comment]);

  document.getElementById('recap-content').innerHTML =
    rows.map(([k, v]) => `
      <div class="recap-row"><span class="recap-label">${k}</span><span class="recap-value">${v}</span></div>
    `).join('') + `
      <div class="recap-row">
        <span class="recap-label">Status after booking</span>
        <span class="recap-value"><span class="recap-badge">Pending confirmation</span></span>
      </div>`;
}

function confirmBooking() {
  const eq = draft.equipment;
  const occ = computeOccurrences();
  const res = checkOccurrences(occ);
  if (!res.ok) { showStep(2); validateStep2(); return; }
  occ.forEach(o => {
    const booking = {
      instrument: eq.name,
      dateStart: o.startDate, startTime: o.startTime,
      duration: o.durationH,
      endDate: o.endDate, endTime: o.endTime,
      user: draft.user, comment: draft.comment,
      channels: draft.channels, status: 'pending', _session: true,
    };
    window.BookingsStore.add(booking);
    SESSION_BOOKINGS.push(booking);
  });
  showStep('success');
  renderMyBookings();
}

function renderMyBookings() {
  const container = document.getElementById('my-bookings-list');
  const section = document.getElementById('my-bookings');
  if (!container) return;
  if (SESSION_BOOKINGS.length === 0) { section.style.display = 'none'; return; }
  section.style.display = 'block';
  container.innerHTML = '';
  SESSION_BOOKINGS.forEach(b => {
    const sameDayEnd = b.dateStart === b.endDate;
    const when = sameDayEnd
      ? `${b.dateStart} · ${b.startTime}–${b.endTime}`
      : `${b.dateStart} ${b.startTime} → ${b.endDate} ${b.endTime}`;
    const chTxt = (b.channels > 1) ? ` · ${b.channels} ch` : '';
    const statusCls = b.status === 'confirmed' ? 'status-confirmed' : 'status-pending';
    const statusTxt = b.status === 'confirmed' ? 'Confirmed' : 'Pending';
    const item = document.createElement('div');
    item.className = 'my-booking-item';
    item.innerHTML = `
      <div class="my-booking-info">
        <div class="my-booking-title">${b.instrument}${chTxt}</div>
        <div class="my-booking-meta">${when} · ${b.user}</div>
      </div>
      <div style="display:flex; align-items:center; gap:10px;">
        <span class="status-pill ${statusCls}">${statusTxt}</span>
        <button class="btn-cancel">Cancel</button>
      </div>
    `;
    item.querySelector('.btn-cancel').addEventListener('click', () => cancelBooking(b));
    container.appendChild(item);
  });
}

function cancelBooking(booking) {
  if (!confirm(`Cancel your booking of ${booking.instrument} on ${booking.dateStart} at ${booking.startTime}?`)) return;
  SESSION_BOOKINGS = SESSION_BOOKINGS.filter(b => b !== booking);
  window.BookingsStore.remove(booking);
  renderMyBookings();
}

function showStep(step) {
  document.querySelectorAll('.booking-panel').forEach(p => p.classList.remove('active'));
  if (step === 'success') {
    document.getElementById('panel-success').classList.add('active');
    updateStepBar(4);
    return;
  }
  document.getElementById(`panel-${step}`).classList.add('active');
  updateStepBar(step);
  if (step === 2) setupStep2();
  if (step === 3) setupStep3();
}

function updateStepBar(step) {
  document.querySelectorAll('.booking-step').forEach((el, i) => {
    const n = i + 1;
    el.classList.remove('active', 'done');
    if (n < step) el.classList.add('done');
    else if (n === step) el.classList.add('active');
  });
}

function resetBooking() {
  draft.equipment = null;
  draft.startTime = ''; draft.duration = 1; draft.channels = 1; draft.comment = '';
  draft.recurring = false;
  document.getElementById('to-step-2').disabled = true;
  document.querySelectorAll('.equipment-choice').forEach(c => c.classList.remove('selected'));
  document.getElementById('opt-multiday').checked = false;
  document.getElementById('opt-recurring').checked = false;
  showStep(1);
}

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('to-step-2').addEventListener('click', () => showStep(2));
  document.getElementById('to-step-3').addEventListener('click', () => { if (validateStep2()) showStep(3); });
  document.getElementById('back-to-1').addEventListener('click', () => showStep(1));
  document.getElementById('back-to-2').addEventListener('click', () => showStep(2));
  document.getElementById('confirm-booking').addEventListener('click', confirmBooking);
  document.getElementById('new-booking').addEventListener('click', resetBooking);

  document.getElementById('opt-multiday').addEventListener('change', () => { applyMode(); renderTimeslots(); validateStep2(); });
  document.getElementById('opt-recurring').addEventListener('change', () => { applyMode(); validateStep2(); });

  document.getElementById('booking-date').addEventListener('change', e => {
    draft.date = e.target.value; draft.startTime = ''; renderTimeslots(); validateStep2();
  });
  document.getElementById('booking-duration').addEventListener('input', () => {
    draft.startTime = ''; renderTimeslots(); validateStep2();
  });
  document.getElementById('booking-channels').addEventListener('change', e => {
    draft.channels = parseInt(e.target.value) || 1; draft.startTime = ''; renderTimeslots(); validateStep2();
  });
  document.getElementById('booking-user').addEventListener('input', validateStep2);
  document.getElementById('booking-comment').addEventListener('input', () => {
    draft.comment = document.getElementById('booking-comment').value.trim();
  });

  document.getElementById('md-start-date').addEventListener('change', e => { draft.startDate = e.target.value; validateStep2(); });
  document.getElementById('md-start-time').addEventListener('change', e => { draft.startClock = e.target.value; validateStep2(); });
  document.getElementById('md-end-date').addEventListener('change', e => { draft.endDate = e.target.value; validateStep2(); });
  document.getElementById('md-end-time').addEventListener('change', e => { draft.endClock = e.target.value; validateStep2(); });

  document.getElementById('recur-freq').addEventListener('change', e => { draft.recurFreq = e.target.value; validateStep2(); });
  document.querySelectorAll('input[name="recur-end"]').forEach(r => {
    r.addEventListener('change', e => {
      draft.recurEndMode = e.target.value;
      document.getElementById('recur-count-wrap').style.display = e.target.value === 'count' ? 'block' : 'none';
      document.getElementById('recur-until-wrap').style.display = e.target.value === 'until' ? 'block' : 'none';
      validateStep2();
    });
  });
  document.getElementById('recur-count').addEventListener('input', e => { draft.recurCount = parseInt(e.target.value) || 1; validateStep2(); });
  document.getElementById('recur-until').addEventListener('change', e => { draft.recurUntil = e.target.value; validateStep2(); });
});
