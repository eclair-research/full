/* ============================================================
   js/bookings-store.js — Source de réservations PARTAGÉE
   ============================================================
   Ce module charge bookings.csv UNE fois et garde les
   réservations en mémoire pour la session. Le calendrier ET
   la page de réservation l'utilisent, donc une réservation
   ajoutée dans le formulaire apparaît aussi sur le calendrier.

   IMPORTANT (maquette) : les ajouts restent en mémoire le temps
   de la session du navigateur. Au rechargement, on repart du CSV.
   Le branchement back-end remplacera le stockage CSV/mémoire par
   des appels au serveur, sans changer l'interface qui consomme
   ce module.

   API exposée (window.BookingsStore) :
     - load()                  → Promise, charge le CSV une fois
     - all()                   → tableau de toutes les réservations
     - add(booking)            → ajoute une réservation (session)
     - remove(booking)         → retire une réservation
     - onChange(callback)      → s'abonne aux changements
     - channelsTakenAt(...)    → voies prises sur un intervalle
   ============================================================ */

(function () {
  let bookings = [];
  let loaded = false;
  let loadPromise = null;
  const listeners = [];

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
        endDate:    p[8] || p[1],   // pour les résa multi-jours (optionnel)
      };
    }).filter(b => b.instrument && b.dateStart && b.startTime && !isNaN(b.duration));
  }

  function notify() {
    listeners.forEach(cb => { try { cb(bookings); } catch (e) {} });
  }

  function load() {
    if (loadPromise) return loadPromise;
    // Détecte le préfixe (au cas où appelé depuis un sous-dossier)
    const base = window.location.pathname.includes('/instruments/')
              || window.location.pathname.includes('/domains/') ? '../' : '';
    loadPromise = fetch(base + 'assets/bookings.csv')
      .then(r => r.ok ? r.text() : '')
      .then(text => {
        bookings = text ? parseCSV(text) : [];
        loaded = true;
        notify();
        return bookings;
      })
      .catch(() => {
        bookings = [];
        loaded = true;
        notify();
        return bookings;
      });
    return loadPromise;
  }

  function all() { return bookings; }

  function add(booking) {
    bookings.push(booking);
    notify();
  }

  function remove(booking) {
    bookings = bookings.filter(b => b !== booking);
    notify();
  }

  function onChange(cb) {
    listeners.push(cb);
    if (loaded) cb(bookings);  // appel immédiat si déjà chargé
  }

  // ── Helpers temps ──
  function timeToHours(t) {
    const [h, m] = t.split(':').map(Number);
    return h + (m || 0) / 60;
  }

  // Convertit une réservation en intervalle absolu [startMs, endMs]
  // Gère le multi-jours via endDate, sinon reste dans la journée.
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

  // Voies prises sur un intervalle absolu [sMs, eMs[ pour un instrument
  function channelsTakenInterval(instrumentName, sMs, eMs) {
    let taken = 0;
    bookings.forEach(b => {
      if (b.instrument !== instrumentName) return;
      const [bs, be] = bookingInterval(b);
      if (sMs < be && eMs > bs) taken += (b.channels || 1);
    });
    return taken;
  }

  window.BookingsStore = {
    load, all, add, remove, onChange,
    timeToHours, bookingInterval, channelsTakenInterval,
  };
})();
