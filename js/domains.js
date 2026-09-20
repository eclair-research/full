/* ============================================================
   js/domains.js — Gère les domaines Research ET Teaching
   Lit data/research.json et data/teaching.json et remplit :
   - #research-mosaic (activities.html) → tuiles research
   - #teaching-mosaic (activities.html) → tuiles teaching
   - #home-research / #home-teaching (index.html) → aperçu (optionnel)
   - #domain-detail (domains/*.html) → la fiche détaillée,
     identifiée par data-domain-kind + data-domain-id
   ============================================================ */

const DOM_IS_SUBPAGE = window.location.pathname.includes('/domains/');
const DOM_BASE = DOM_IS_SUBPAGE ? '../' : '';

/* ── TUILE (mosaïque) ── */
function buildDomainTile(item, kind) {
  const href = `${DOM_BASE}domains/${kind}-${item.id}.html`;
  const numLabel = kind === 'teaching' ? `Course ${item.num}` : `Domain ${item.num}`;

  const a = document.createElement('a');
  a.href = href;
  a.className = 'domain-tile';
  a.innerHTML = `
    <div class="domain-tile-bg" style="background-image: url('${DOM_BASE}${item.image}');"></div>
    <div class="domain-tile-overlay"></div>
    <div class="domain-tile-badge">${item.num}</div>
    <div class="domain-tile-content">
      <span class="domain-tile-num">${numLabel}</span>
      <div class="domain-tile-title">${item.title}</div>
      <div class="domain-tile-desc">${item.tileDesc}</div>
      <span class="domain-tile-cta">Explore →</span>
    </div>
  `;
  return a;
}

function renderMosaic(container, items, kind) {
  container.innerHTML = '';
  items.forEach(item => container.appendChild(buildDomainTile(item, kind)));
}

/* ── FICHE DÉTAILLÉE (domains/*.html) ── */
function renderDomainDetail(container, item, kind) {
  const numLabel = kind === 'teaching' ? `Teaching · Course ${item.num}` : `Domain ${item.num}`;
  document.title = `eclair — ${item.shortTitle || item.num}`;

  // Techniques
  const tags = (item.techniques || [])
    .map(t => `<span class="technique-tag">${t}</span>`).join('\n');

  // Équipements liés
  const equipLinks = (item.equipment || [])
    .map(([name, href]) => `<a href="${DOM_BASE}${href}" class="equip-link">${name}</a>`).join('\n');

  // Figures (galerie) — bloc entier masqué s'il n'y en a pas
  let figuresBlock = '';
  if (item.figures && item.figures.length) {
    const figs = item.figures.map(([src, cap]) => `
      <div class="figure-card">
        <img src="${DOM_BASE}${src}" alt="${cap || item.title}">
        ${cap ? `<p>${cap}</p>` : ""}
      </div>`).join('\n');
    figuresBlock = `
      <div class="domain-card">
        <div class="domain-card-title">Gallery</div>
        <div class="figures-grid">${figs}</div>
      </div>`;
  }

  // Libellés adaptés au type
  const objTitle = kind === 'teaching' ? 'Course content' : 'Objectives';
  const techTitle = kind === 'teaching' ? 'Topics &amp; Skills' : 'Techniques &amp; Methods';
  const resTitle = kind === 'teaching' ? 'Practical information' : 'Results &amp; Publications';

  container.innerHTML = `
    <div class="domain-hero" style="background-image: url('${DOM_BASE}${item.image}');">
      <div class="domain-hero-overlay">
        <div class="domain-hero-text">
          <p class="section-label">${numLabel}</p>
          <h1>${item.title}</h1>
        </div>
      </div>
    </div>

    <section class="page-section bg-cream">
      <div class="container">

        <div class="domain-card">
          <div class="domain-card-title">Overview</div>
          <p>${item.overview || ''}</p>
        </div>

        <div class="domain-grid-2">
          <div class="domain-card">
            <div class="domain-card-title">${objTitle}</div>
            <p>${item.objectives || ''}</p>
          </div>
          <div class="domain-card">
            <div class="domain-card-title">${techTitle}</div>
            <div class="technique-tags">${tags}</div>
          </div>
        </div>

        <div class="domain-card">
          <div class="domain-card-title">Related Equipment</div>
          <div class="equip-links">${equipLinks}</div>
        </div>

        ${figuresBlock}

        <div class="domain-card">
          <div class="domain-card-title">${resTitle}</div>
          <p>${item.results || ''}</p>
        </div>

        <div class="domain-actions">
          <a href="${DOM_BASE}equipment.html" class="btn-primary">See all equipment →</a>
          <a href="${DOM_BASE}activities.html" class="btn-ghost">← Back to Activities</a>
        </div>

      </div>
    </section>
  `;
}

/* ── CHARGEMENT ── */
function loadDomains(kind, file) {
  return fetch(DOM_BASE + file)
    .then(r => { if (!r.ok) throw new Error('not found'); return r.json(); })
    .then(items => ({ kind, items }))
    .catch(() => ({ kind, items: null }));
}

Promise.all([
  loadDomains('research', 'data/research.json'),
  loadDomains('teaching', 'data/teaching.json'),
]).then(results => {
  const data = {};
  results.forEach(r => { data[r.kind] = r.items; });

  // Mosaïques sur activities.html
  const researchMosaic = document.getElementById('research-mosaic');
  if (researchMosaic && data.research) renderMosaic(researchMosaic, data.research, 'research');

  const teachingMosaic = document.getElementById('teaching-mosaic');
  if (teachingMosaic && data.teaching) renderMosaic(teachingMosaic, data.teaching, 'teaching');

  // Page détail
  const detail = document.getElementById('domain-detail');
  if (detail) {
    const kind = detail.getAttribute('data-domain-kind');
    const id = detail.getAttribute('data-domain-id');
    const list = data[kind];
    if (list) {
      const item = list.find(x => x.id === id);
      if (item) renderDomainDetail(detail, item, kind);
      else detail.innerHTML = `<div class="page-header"><h1>Not found</h1><p>No ${kind} matches id "${id}".</p></div>`;
    }
  }
});
