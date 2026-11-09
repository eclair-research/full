/* ============================================================
   js/lightbox.js — Visionneuse de galerie plein écran, réutilisable
   Usage : Lightbox.open([{src, caption}, ...], startIndex)
   Flèches gauche/droite (ou boutons) pour naviguer, Échap ou clic
   en dehors de l'image pour fermer.
   ============================================================ */

(function () {
  let items = [];
  let index = 0;
  let el = null;

  function build() {
    const root = document.createElement('div');
    root.className = 'lightbox';
    root.innerHTML = `
      <button type="button" class="lightbox-close" aria-label="Close">✕</button>
      <button type="button" class="lightbox-nav lightbox-prev" aria-label="Previous photo">‹</button>
      <div class="lightbox-stage">
        <img class="lightbox-img" alt="">
      </div>
      <button type="button" class="lightbox-nav lightbox-next" aria-label="Next photo">›</button>
      <div class="lightbox-caption"></div>
      <div class="lightbox-counter"></div>
    `;
    document.body.appendChild(root);

    root.querySelector('.lightbox-close').addEventListener('click', close);
    root.querySelector('.lightbox-prev').addEventListener('click', () => step(-1));
    root.querySelector('.lightbox-next').addEventListener('click', () => step(1));

    // Clic en dehors de l'image (sur le fond) → ferme
    root.addEventListener('click', (e) => {
      if (e.target === root || e.target.classList.contains('lightbox-stage')) close();
    });

    document.addEventListener('keydown', (e) => {
      if (!root.classList.contains('is-open')) return;
      if (e.key === 'Escape') close();
      else if (e.key === 'ArrowLeft') step(-1);
      else if (e.key === 'ArrowRight') step(1);
    });

    return root;
  }

  function render() {
    const item = items[index];
    const img = el.querySelector('.lightbox-img');
    img.src = item.src;
    img.alt = item.caption || '';

    const caption = el.querySelector('.lightbox-caption');
    caption.textContent = item.caption || '';

    const counter = el.querySelector('.lightbox-counter');
    const multi = items.length > 1;
    counter.textContent = multi ? `${index + 1} / ${items.length}` : '';
    el.querySelector('.lightbox-prev').hidden = !multi;
    el.querySelector('.lightbox-next').hidden = !multi;
  }

  function step(delta) {
    index = (index + delta + items.length) % items.length;
    render();
  }

  function open(galleryItems, startIndex) {
    if (!galleryItems || !galleryItems.length) return;
    items = galleryItems;
    index = startIndex || 0;
    if (!el) el = build();
    render();
    el.classList.add('is-open');
    document.body.style.overflow = 'hidden';
  }

  function close() {
    if (!el) return;
    el.classList.remove('is-open');
    document.body.style.overflow = '';
  }

  window.Lightbox = { open, close };
})();
