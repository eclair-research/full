/* ============================================================
   js/team.js — Source unique pour les membres de l'équipe
   Lit data/team.json et remplit #team-grid (about.html)
   ============================================================ */

function renderTeam(container, members) {
  container.innerHTML = '';
  members.forEach(m => {
    const card = document.createElement('div');
    card.className = 'team-card';

    // Avatar : photo si fournie, sinon initiales
    let avatarInner;
    if (m.photo) {
      avatarInner = `<img src="${m.photo}" alt="${m.name}">`;
    } else {
      const initials = m.name.split(/\s+/).map(w => w[0] || '').slice(0, 2).join('').toUpperCase();
      avatarInner = initials;
    }

    card.innerHTML = `
      <div class="team-avatar">${avatarInner}</div>
      <div class="team-name">${m.name}</div>
      <div class="team-role">${m.role || ''}</div>
      ${m.email ? `<a href="mailto:${m.email}" class="team-email">${m.email.replace("@", "@<wbr>")}</a>` : ''}
    `;
    container.appendChild(card);
  });
}

fetch('data/team.json')
  .then(r => { if (!r.ok) throw new Error('not found'); return r.json(); })
  .then(members => {
    const grid = document.getElementById('team-grid');
    if (grid) renderTeam(grid, members);
  })
  .catch(() => {
    const grid = document.getElementById('team-grid');
    if (grid) {
      grid.innerHTML = '<p style="font-size:0.85rem;color:var(--fog);">'
        + 'Could not load data/team.json — make sure the file exists and you are using Live Server.</p>';
    }
  });
