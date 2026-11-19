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

/* Transforme les URL en liens cliquables dans un texte brut (échappé). */
function linkify(text) {
  const escaped = text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  return escaped.replace(/(https?:\/\/[^\s<]+)/g,
    '<a href="$1" class="text-link" target="_blank" rel="noopener">$1</a>');
}

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
      bodyEl.innerHTML = linkify(ev.body);
      content.appendChild(bodyEl);
    }

    if (ev.gallery && ev.gallery.length) {
      const lightboxItems = ev.gallery.map(([src, cap]) => ({ src, caption: cap || '' }));

      const gal = document.createElement('div');
      gal.className = 'news-gallery';
      ev.gallery.forEach(([src, cap], i) => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'news-gallery-item';
        btn.addEventListener('click', () => window.Lightbox.open(lightboxItems, i));
        const img = document.createElement('img');
        img.src = src;
        img.alt = cap || ev.title;
        img.loading = 'lazy';
        if (cap) img.title = cap;
        btn.appendChild(img);
        gal.appendChild(btn);
      });
      content.appendChild(gal);
    }

    item.append(dateBox, content);
    container.appendChild(item);
  });
}

/* ── FILTRES PAR TYPE (events.html) ── */
function renderEventFilters(container, events, feedEl) {
  container.innerHTML = '';

  // Types réellement présents dans les données, dans l'ordre d'EVENT_BADGES
  const typesPresent = Object.keys(EVENT_BADGES).filter(t => events.some(ev => ev.type === t));

  const makeFilterBtn = (type, label) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'event-filter-btn';
    btn.textContent = label;
    btn.dataset.type = type;
    btn.addEventListener('click', () => {
      container.querySelectorAll('.event-filter-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const filtered = type === 'all' ? events : events.filter(ev => ev.type === type);
      renderEventsFeed(feedEl, filtered);
    });
    return btn;
  };

  const allBtn = makeFilterBtn('all', 'All');
  allBtn.classList.add('active');
  container.appendChild(allBtn);
  typesPresent.forEach(t => container.appendChild(makeFilterBtn(t, EVENT_BADGES[t].label)));
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

    const filters = document.getElementById('events-filters');
    if (filters && feed) renderEventFilters(filters, events, feed);
  })
  .catch(() => {
    const target = document.getElementById('home-events')
                || document.getElementById('events-feed');
    if (target) {
      target.innerHTML = '<p style="font-size:0.85rem;color:var(--fog);padding:16px 0;">'
        + 'Could not load events — make sure data/events.json exists and you are using Live Server.</p>';
    }
  });
