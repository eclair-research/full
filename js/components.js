/* ============================================================
   js/components.js
   Charge navbar.html et footer.html dans chaque page,
   corrige les chemins relatifs pour les pages dans /instruments/,
   puis active le lien de nav correspondant à la page courante.
   ============================================================ */

async function loadComponent(placeholderId, filePath) {
  const placeholder = document.getElementById(placeholderId);
  if (!placeholder) return;

  try {
    const response = await fetch(filePath);
    const html = await response.text();
    placeholder.outerHTML = html;
  } catch (e) {
    console.warn(`Could not load component: ${filePath}`);
  }
}

async function initComponents() {
  const isSubpage = window.location.pathname.includes('/instruments/')
               || window.location.pathname.includes('/domains/');
  const base = isSubpage ? '../' : '';

  await loadComponent('navbar-placeholder', base + 'components/navbar.html');
  await loadComponent('footer-placeholder', base + 'components/footer.html');

  // ── CORRIGE LES LIENS ET IMAGES si on est dans un sous-dossier ──
  if (isSubpage) {
    document.querySelectorAll('[data-root-link]').forEach(el => {
      const current = el.getAttribute('href');
      if (current && !current.startsWith('..') && !current.startsWith('http')) {
        el.setAttribute('href', '../' + current);
      }
    });

    // Corrige toutes les images de la navbar et du footer
    document.querySelectorAll('#navbar img, footer img').forEach(img => {
      const src = img.getAttribute('src');
      if (src && !src.startsWith('..') && !src.startsWith('http')) {
        img.setAttribute('src', '../' + src);
      }
    });
  }

  // Active le bon lien de nav
  const currentPage = window.location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('.nav-links a').forEach(link => {
    if (link.getAttribute('href').endsWith(currentPage)) {
      link.classList.add('active');
    }
  });

  // Effet scroll
  const nav = document.getElementById('navbar');
  if (nav) {
    window.addEventListener('scroll', () => {
      nav.classList.toggle('scrolled', window.scrollY > 20);
    });
  }

  // Burger
  const burger = document.getElementById('burger');
  const navLinks = document.querySelector('.nav-links');
  if (burger && navLinks) {
    burger.addEventListener('click', () => {
      burger.classList.toggle('open');
      navLinks.classList.toggle('open');
    });
    navLinks.querySelectorAll('a').forEach(link => {
      link.addEventListener('click', () => {
        burger.classList.remove('open');
        navLinks.classList.remove('open');
      });
    });
  }
}

initComponents();
