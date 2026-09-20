/* ============================================================
   js/events.js — Source unique pour les news & événements
   Lit data/events.json et remplit :
   - #home-events  (index.html)  → les 3 plus récents
   - #events-feed  (events.html) → tous
   ============================================================ */

const EVENT_BADGES = {
  seminar:     { label: 'Seminar',     class: 'badge-seminar' },
  publication: { label: 'Publication', class: 'badge-publication' },
  news:        { label: 'News',        class: 'badge-news' },
  equipment:   { label: 'Equipment',   class: 'badge-equipment' },
};

const EVENT_MONTHS = ['Jan','Feb','Mar','Apr','May','Jun',
                      'Jul','Aug','Sep','Oct','Nov','Dec'];

function eventDateParts(dateStr) {
  const d = new Date(dateStr + 'T00:00:00');
  if (isNaN(d)) return { day: '?', month: dateStr };
  return {
    day:   d.getDate(),
    month: EVENT_MONTHS[d.getMonth()] + ' ' + d.getFullYear()
  };
}

function makeBadge(type) {
  const info = EVENT_BADGES[type] || EVENT_BADGES.news;
  const span = document.createElement('span');
  span.className = 'event-badge ' + info.class;
  span.textContent = info.label;
  return span;
}

/* ── HOME : lignes compactes ── */
function renderHomeEvents(container, events) {
  container.innerHTML = '';
  events.forEach(ev => {
    const { day, month } = eventDateParts(ev.date);

    const row = document.createElement('div');
    row.className = 'event-row';
    row.addEventListener('click', () => location.href = 'events.html');

    const dateBox = document.createElement('div');
    const dayEl = document.createElement('div');
    dayEl.className = 'event-day';
    dayEl.textContent = day;
    const monthEl = document.createElement('div');
    monthEl.className = 'event-month';
    monthEl.textContent = month;
    dateBox.append(dayEl, monthEl);

    const textBox = document.createElement('div');
    const titleEl = document.createElement('div');
    titleEl.className = 'event-title';
    titleEl.textContent = ev.title;
    const metaEl = document.createElement('div');
    metaEl.className = 'event-meta';
    metaEl.textContent = ev.meta;
    textBox.append(titleEl, metaEl);

    row.append(dateBox, textBox, makeBadge(ev.type));
    container.appendChild(row);
  });
}

/* ── EVENTS PAGE : items détaillés ── */
function renderEventsFeed(container, events) {
  container.innerHTML = '';
  events.forEach(ev => {
    const { day, month } = eventDateParts(ev.date);

    const item = document.createElement('div');
    item.className = 'news-item';

    const dateBox = document.createElement('div');
    dateBox.className = 'news-date';
    const dayEl = document.createElement('div');
    dayEl.className = 'news-day';
    dayEl.textContent = day;
    const monthEl = document.createElement('div');
    monthEl.className = 'news-month';
    monthEl.textContent = month;
    dateBox.append(dayEl, monthEl);

    const content = document.createElement('div');
    content.className = 'news-content';
    content.appendChild(makeBadge(ev.type));

    const titleEl = document.createElement('div');
    titleEl.className = 'news-title';
    titleEl.textContent = ev.title;
    content.appendChild(titleEl);

    if (ev.meta) {
      const metaEl = document.createElement('div');
      metaEl.className = 'news-meta';
      metaEl.textContent = ev.meta;
      content.appendChild(metaEl);
    }

    if (ev.body) {
      const bodyEl = document.createElement('p');
      bodyEl.className = 'news-body';
      bodyEl.textContent = ev.body;
      content.appendChild(bodyEl);
    }

    if (ev.gallery && ev.gallery.length) {
      const gal = document.createElement('div');
      gal.className = 'news-gallery';
      ev.gallery.forEach(([src, cap]) => {
        const a = document.createElement('a');
        a.href = src;
        a.target = '_blank';
        const img = document.createElement('img');
        img.src = src;
        img.alt = cap || ev.title;
        img.loading = 'lazy';
        if (cap) img.title = cap;
        a.appendChild(img);
        gal.appendChild(a);
      });
      content.appendChild(gal);
    }

    item.append(dateBox, content);
    container.appendChild(item);
  });
}

/* ── CHARGEMENT ── */
fetch('data/events.json')
  .then(r => { if (!r.ok) throw new Error('not found'); return r.json(); })
  .then(events => {
    // Tri du plus récent au plus ancien
    events.sort((a, b) => b.date.localeCompare(a.date));

    const home = document.getElementById('home-events');
    if (home) renderHomeEvents(home, events.slice(0, 3));

    const feed = document.getElementById('events-feed');
    if (feed) renderEventsFeed(feed, events);
  })
  .catch(() => {
    const target = document.getElementById('home-events')
                || document.getElementById('events-feed');
    if (target) {
      target.innerHTML = '<p style="font-size:0.85rem;color:var(--fog);padding:16px 0;">'
        + 'Could not load events — make sure data/events.json exists and you are using Live Server.</p>';
    }
  });
