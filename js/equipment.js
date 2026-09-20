/* ============================================================
   js/equipment.js — Source unique pour les équipements
   Lit data/equipment.json et remplit :
   - #equipment-grid (equipment.html) → la grille de tuiles
   - #instrument-detail (instruments/*.html) → la fiche détaillée,
     identifiée par l'attribut data-instrument-id sur le conteneur
   ============================================================ */

// Détecte si on est dans une sous-page (instruments/)
const EQ_IS_SUBPAGE = window.location.pathname.includes('/instruments/');
const EQ_BASE = EQ_IS_SUBPAGE ? '../' : '';

const STATUS_INFO = {
  available:   { text: 'Available',         cls: 'status-ok' },
  busy:        { text: 'In use',            cls: 'status-busy' },
  maintenance: { text: 'Maintenance',       cls: 'status-off' },
};

const STATUS_INFO_DETAIL = {
  available:   { text: 'Available',         cls: 'status-ok' },
  busy:        { text: 'In use',            cls: 'status-busy' },
  maintenance: { text: 'Under Maintenance', cls: 'status-off' },
};

/* ── GRILLE (equipment.html) ── */
function renderEquipmentGrid(container, items) {
  container.innerHTML = '';

  // Regroupe par catégorie, dans l'ordre de première apparition
  const groups = new Map();
  items.forEach(item => {
    const cat = item.category || item.label || 'Other';
    if (!groups.has(cat)) groups.set(cat, []);
    groups.get(cat).push(item);
  });

  groups.forEach((groupItems, cat) => {
    const section = document.createElement('div');
    section.className = 'equip-category';

    const title = document.createElement('h3');
    title.className = 'equip-category-title';
    title.textContent = cat;

    const grid = document.createElement('div');
    grid.className = 'equip-grid';

    section.append(title, grid);
    container.appendChild(section);
    renderEquipmentCards(grid, groupItems);
  });
}

function renderEquipmentCards(container, items) {
  items.forEach(item => {
    const status = STATUS_INFO[item.status] || STATUS_INFO.available;
    const disabled = item.status === 'maintenance';

    const card = document.createElement('a');
    card.href = `instruments/${item.id}.html`;
    card.className = 'equip-card'
      + (item.size === 'large' ? ' equip-card--large' : '')
      + (disabled ? ' equip-card--disabled' : '');

    // Image de fond (si fournie) + voile pour la lisibilité
    if (item.image) {
      const bg = document.createElement('div');
      bg.className = 'equip-card-bg';
      bg.style.backgroundImage = `url('${item.image}')`;
      const overlay = document.createElement('div');
      overlay.className = 'equip-card-overlay';
      card.append(bg, overlay);
      card.classList.add('equip-card--has-image');
    }

    const info = document.createElement('div');
    info.className = 'equip-card-info';
    info.innerHTML = `
      <div class="equip-card-name">${item.name}</div>
      <div class="equip-card-desc">${item.desc}</div>
      <div class="equip-card-tooltip">${item.tooltip || ''}</div>
    `;

    const right = document.createElement('div');
    right.className = 'equip-card-right';

    const statusEl = document.createElement('span');
    statusEl.className = 'equip-row-status ' + status.cls;
    statusEl.textContent = status.text;

    const btn = document.createElement('button');
    if (disabled) {
      btn.className = 'btn-ghost';
      btn.disabled = true;
      btn.textContent = 'Unavailable';
      btn.onclick = (e) => e.preventDefault();
    } else {
      btn.className = 'btn-primary';
      btn.textContent = 'See calendar →';
      btn.onclick = (e) => { e.preventDefault(); scrollToCalendar(); };
    }

    right.append(statusEl, btn);
    card.append(info, right);
    container.appendChild(card);
  });
}

/* ── FICHE DÉTAILLÉE (instruments/*.html) ── */
function renderInstrumentDetail(container, item) {
  const status = STATUS_INFO_DETAIL[item.status] || STATUS_INFO_DETAIL.available;

  // Lignes de specs
  const specsRows = (item.specs || []).map(([k, v]) => `
    <div style="display:flex; justify-content:space-between; padding:12px 20px; border-bottom:1px solid var(--border); font-size:0.88rem;">
      <span style="font-weight:500; color:var(--ink);">${k}</span>
      <span style="font-weight:300; color:var(--fog);">${v}</span>
    </div>
  `).join('');

  // Met à jour le titre de l'onglet
  document.title = `eclair — ${item.name}`;

  // Bloc image (si fournie) — affiché à côté de l'overview
  const imageBlock = item.image ? `
        <div class="instrument-overview-grid">
          <div>
            <h2 class="section-title">Overview</h2>
            <p class="section-text">${item.overview || ''}</p>
          </div>
          <div class="instrument-image">
            <img src="${EQ_BASE}${item.image}" alt="${item.name}">
          </div>
        </div>
  ` : `
        <h2 class="section-title">Overview</h2>
        <p class="section-text">${item.overview || ''}</p>
  `;

  // Galerie (autant d'images que souhaité) — bloc masqué s'il n'y en a pas
  const galleryBlock = (item.gallery && item.gallery.length) ? `
        <h2 class="section-title">Gallery</h2>
        <div class="figures-grid">
          ${item.gallery.map(([src, cap]) => `
            <div class="figure-card">
              <img src="${EQ_BASE}${src}" alt="${cap || item.name}">
              ${cap ? `<p>${cap}</p>` : ''}
            </div>`).join('')}
        </div>
  ` : '';

  container.innerHTML = `
    <div class="page-header">
      <p class="section-label">${item.label || 'Instrument'}</p>
      <h1><em>${item.name}</em></h1>
      <p>${item.desc}</p>
    </div>

    <section class="page-section bg-white">
      <div class="container">

        <div style="display:flex; gap:16px; align-items:center; margin-bottom:40px; flex-wrap:wrap;">
          <span class="equip-row-status ${status.cls}">${status.text}</span>
          <a href="../equipment.html#calendar-section" class="btn-primary">See booking calendar →</a>
          <a href="../equipment.html" class="btn-ghost">← Back to Equipment</a>
        </div>

        ${imageBlock}

        ${galleryBlock}

        <h2 class="section-title">Specifications</h2>
        <div style="border:1px solid var(--border); border-radius:10px; overflow:hidden; margin-bottom:40px; max-width:600px;">
          ${specsRows}
        </div>

        <h2 class="section-title">Usage &amp; Access</h2>
        <p class="section-text">${item.usage || ''}</p>

        <h2 class="section-title">Documentation</h2>
        <p class="section-text">
          <a href="${item.link || '#'}" class="text-link" target="_blank">${item.linkText || 'Documentation'} ↗</a>
        </p>

      </div>
    </section>
  `;
}

/* ── CHARGEMENT ── */
fetch(EQ_BASE + 'data/equipment.json')
  .then(r => {
    if (!r.ok) throw new Error('not found');
    return r.json();
  })
  .then(items => {
    // Page liste
    const grid = document.getElementById('equipment-grid');
    if (grid) renderEquipmentGrid(grid, items);

    // Page détail
    const detail = document.getElementById('instrument-detail');
    if (detail) {
      const id = detail.getAttribute('data-instrument-id');
      const item = items.find(x => x.id === id);
      if (item) {
        renderInstrumentDetail(detail, item);
      } else {
        detail.innerHTML = `
          <div class="page-header">
            <p class="section-label">Not found</p>
            <h1>Instrument <em>not found</em></h1>
            <p>No instrument matches the id "${id}".</p>
          </div>`;
      }
    }
  })
  .catch(() => {
    const target = document.getElementById('equipment-grid')
                || document.getElementById('instrument-detail');
    if (target) {
      target.innerHTML = '<p style="font-size:0.85rem;color:var(--fog);padding:24px;">'
        + 'Could not load data/equipment.json — make sure the file exists and you are using Live Server.</p>';
    }
  });
