# eclair — Gestion complète du contenu (research, teaching, equipment, events, team)

Extension du système "piloté par les données" à TOUT le site.
Un seul outil gère désormais les 5 types de contenu.

════════════════════════════════════════════════════════
## CONTENU DU ZIP
════════════════════════════════════════════════════════

data/                       ← LE contenu du site (5 fichiers JSON)
├── research.json
├── teaching.json
├── equipment.json
├── events.json
└── team.json

js/                         ← scripts qui lisent les JSON et génèrent les pages
├── domains.js   (NOUVEAU — research + teaching)
├── equipment.js (déjà installé à l'étape précédente)
├── events.js    (REMPLACE l'ancien : lit JSON au lieu de CSV)
└── team.js      (NOUVEAU)

Pages allégées (remplacent les vôtres) :
├── activities.html   ← mosaïques générées
├── about.html        ← équipe générée
├── events.html       ← feed généré
└── equipment.html    ← (déjà fait à l'étape précédente)

domains/                    ← NOUVEAU dossier : fiches research + teaching
├── research-domain1.html ... research-domain4.html
└── teaching-teaching1.html, teaching-teaching2.html

instruments/                ← fiches equipment (déjà fait à l'étape précédente)

tool/
└── gestion_site.py         ← L'OUTIL UNIFIÉ (remplace gestion_equipements.py)

════════════════════════════════════════════════════════
## INSTALLATION
════════════════════════════════════════════════════════

1. Copiez `data/` à la racine (fusionne avec l'existant)
2. Copiez les 4 fichiers de `js/` dans votre dossier js/
   → events.js ÉCRASE l'ancien (c'est voulu)
3. Remplacez activities.html, about.html, events.html à la racine
4. Copiez le dossier `domains/` à la racine
5. Remplacez tool/gestion_equipements.py par tool/gestion_site.py
   (vous pouvez supprimer l'ancien)

⚠️ SUPPRESSIONS IMPORTANTES — ces anciens fichiers ne servent plus :
   - domain1.html, domain2.html, domain3.html, domain4.html (à la RACINE)
   - teaching1.html, teaching2.html (à la RACINE)
   - assets/events.csv (remplacé par data/events.json)
   Supprimez-les pour éviter la confusion. Les nouvelles fiches sont
   maintenant dans le dossier domains/.

⚠️ NE CHANGENT PAS (gardez les vôtres) :
   css/, components/, js/components.js, js/calendar.js, assets/,
   index.html, bookings.csv

════════════════════════════════════════════════════════
## VÉRIFICATION
════════════════════════════════════════════════════════

Lancez Live Server, puis vérifiez chaque page :
- activities.html → 2 sections avec les tuiles (research + teaching)
- clic sur une tuile → ouvre la fiche dans domains/
- about.html → l'équipe s'affiche
- events.html + home → les actualités s'affichent
- equipment.html → comme avant

Si une zone reste vide : ouvrez la Console (F12) pour voir l'erreur,
et vérifiez que vous êtes bien en Live Server (pas en file://).

════════════════════════════════════════════════════════
## L'OUTIL UNIFIÉ
════════════════════════════════════════════════════════

Lancement : `python tool/gestion_site.py` (ou le .exe)

Au démarrage : un MENU avec 5 boutons
  - Research domains
  - Teaching activities
  - Equipment
  - Events / News
  - Team members

Cliquez sur un type → liste + boutons Ajouter / Modifier / Supprimer.
Bouton « ← Menu » pour revenir au choix.

Quand vous ajoutez un research/teaching/equipment, l'outil crée
automatiquement la sous-page HTML. Quand vous supprimez, elle part aussi.

Champs particuliers dans les formulaires :
- « clé = valeur par ligne » (specs, équipements liés, figures) :
  une entrée par ligne, séparée par un =.
  Exemple specs :
      Potential range = ±10 V
      Current range = ±2 A
  Exemple équipements liés :
      Potentiostat 1 = instruments/potentiostat-1.html
- « un par ligne » (techniques/topics) : juste une valeur par ligne.
- Titre affiché : peut contenir <em>...</em> pour le mot en italique coloré.

════════════════════════════════════════════════════════
## REFABRIQUER LE .EXE
════════════════════════════════════════════════════════

Comme avant, dans tool/ :

    pyinstaller --onefile --windowed --name "Gestion-Site" gestion_site.py

→ tool/dist/Gestion-Site.exe (à remettre dans tool/).

L'outil doit rester dans tool/ à la racine du site, à côté de data/.
