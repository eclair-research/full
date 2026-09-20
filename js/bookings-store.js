/* ============================================================
   js/bookings-store.js — Source de réservations PARTAGÉE
   ============================================================
   Charge bookings.csv (réservations "officielles") ET les
   réservations ajoutées par l'utilisateur, conservées dans
   localStorage.

   localStorage = persistance LOCALE : les réservations survivent
   au changement de page ET à la fermeture du navigateur. Mais
   elles restent dans CE navigateur, sur CETTE machine — un autre
   utilisateur ne les voit pas. Le partage entre utilisateurs
   viendra avec le back-end.

   Pour tout effacer : bouton "Reset demo bookings" sur la page,
   ou en console : BookingsStore.clearSaved().

   Le branchement back-end remplacera : le CSV par un appel
   serveur (load), et localStorage par l'enregistrement réel
   côté serveur (add/remove). L'interface qui consomme ce module
   ne changera pas.

   API (window.BookingsStore) :
     - load()                       → Promise, charge CSV + session
     - all()                        → toutes les réservations
     - add(booking)                 → ajoute (persisté en session)
     - remove(booking)              → retire
     - onChange(cb)                 → s'abonne aux changements
     - channelsTakenInterval(...)   → voies prises sur un intervalle
   ============================================================ */

(function () {
  const SESSION_KEY = 'eclair_saved_bookings';

  let csvBookings = [];       // venant du CSV (officielles)
  let sessionBookings = [];   // ajoutées pendant la session (localStorage)
  let bookings = [];          // union des deux (ce que tout le monde lit)
  let loaded = false;
  let loadPromise = null;
  const listeners = [];

  // ── localStorage : lecture / écriture sûres ──
  function readSession() {
    try {
      const raw = localStorage.getItem(SESSION_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      return [];
    }
  }

  function writeSession() {
    try {
      localStorage.setItem(SESSION_KEY, JSON.stringify(sessionBookings));
    } catch (e) {
      // si localStorage indisponible, on reste au moins en mémoire
    }
  }

  function rebuild() {
    bookings = csvBookings.concat(sessionBookings);
  }

  function parseCSV(text) {
    const lines = text.trim().split(/\r?\n/).slice(1);
    return lines.map(line => {
      const p = line.split(',').map(s => s.trim());
      return {
        instrument: p[0],
        dateStart:  p[1],
        startTime:  p[2],
        duration:   parseFloat(p[3]),
        user:       p[4] || '',
        comment:    p[5] || '',
        channels:   parseInt(p[6]) || 1,
        status:     p[7] || 'confirmed',
        endDate:    p[8] || p[1],
      };
    }).filter(b => b.instrument && b.dateStart && b.startTime && !isNaN(b.duration));
  }

  function notify() {
    listeners.forEach(cb => { try { cb(bookings); } catch (e) {} });
  }

  function load() {
    if (loadPromise) return loadPromise;
    const base = window.location.pathname.includes('/instruments/')
              || window.location.pathname.includes('/domains/') ? '../' : '';

    // Récupère d'abord les réservations de session (déjà disponibles)
    sessionBookings = readSession();

    loadPromise = fetch(base + 'assets/bookings.csv')
      .then(r => r.ok ? r.text() : '')
      .then(text => {
        csvBookings = text ? parseCSV(text) : [];
        rebuild();
        loaded = true;
        notify();
        return bookings;
      })
      .catch(() => {
        csvBookings = [];
        rebuild();
        loaded = true;
        notify();
        return bookings;
      });
    return loadPromise;
  }

  function all() { return bookings; }

  function add(booking) {
    sessionBookings.push(booking);
    writeSession();
    rebuild();
    notify();
  }

  function remove(booking) {
    // On retire par identité d'abord ; si l'objet vient d'une autre page
    // (rechargé depuis localStorage), on retire par comparaison de contenu.
    const before = sessionBookings.length;
    sessionBookings = sessionBookings.filter(b => b !== booking);
    if (sessionBookings.length === before) {
      sessionBookings = sessionBookings.filter(b => !sameBooking(b, booking));
    }
    writeSession();
    rebuild();
    notify();
  }

  function sameBooking(a, b) {
    return a.instrument === b.instrument
        && a.dateStart === b.dateStart
        && a.startTime === b.startTime
        && a.user === b.user
        && (a.duration || 0) === (b.duration || 0);
  }

  function onChange(cb) {
    listeners.push(cb);
    if (loaded) cb(bookings);
  }

  function timeToHours(t) {
    const [h, m] = t.split(':').map(Number);
    return h + (m || 0) / 60;
  }

  function bookingInterval(b) {
    const start = new Date(`${b.dateStart}T${b.startTime}:00`);
    let end;
    if (b.endDate && b.endTime) {
      end = new Date(`${b.endDate}T${b.endTime}:00`);
    } else {
      end = new Date(start.getTime() + (b.duration || 0) * 3600 * 1000);
    }
    return [start.getTime(), end.getTime()];
  }

  function channelsTakenInterval(instrumentName, sMs, eMs) {
    let taken = 0;
    bookings.forEach(b => {
      if (b.instrument !== instrumentName) return;
      const [bs, be] = bookingInterval(b);
      if (sMs < be && eMs > bs) taken += (b.channels || 1);
    });
    return taken;
  }

  // Permet de vider les réservations de session (utile pour debug/démo)
  function clearSaved() {
    sessionBookings = [];
    writeSession();
    rebuild();
    notify();
  }

  window.BookingsStore = {
    load, all, add, remove, onChange, clearSaved,
    timeToHours, bookingInterval, channelsTakenInterval,
  };
})();
