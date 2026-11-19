/* ============================================================
   js/reveal.js — Révélation en fondu des sections au scroll
   Ajoute .reveal à chaque section ciblée, puis .reveal-visible
   dès qu'elle entre dans le viewport (IntersectionObserver).
   Respecte prefers-reduced-motion et dégrade proprement si
   IntersectionObserver n'est pas supporté.
   ============================================================ */

(function () {
  const SELECTOR = [
    '.section-domains', '.section-equip', '.section-events',
    '.activities-section', '.page-section',
  ].join(', ');

  function init() {
    const els = document.querySelectorAll(SELECTOR);
    if (!els.length) return;

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduced || !('IntersectionObserver' in window)) {
      els.forEach(el => el.classList.add('reveal-visible'));
      return;
    }

    els.forEach(el => el.classList.add('reveal'));

    const io = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('reveal-visible');
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -60px 0px' });

    els.forEach(el => io.observe(el));
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
