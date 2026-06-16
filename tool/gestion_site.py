#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
============================================================
 IECP — Gestionnaire de contenu du site
============================================================
Outil unique pour gérer SANS CODE :
  - Research domains
  - Teaching activities
  - Equipment
  - Events / News
  - Team members (About page)

Il édite uniquement les fichiers data/*.json.
Le site lit ces fichiers et se met à jour tout seul.

Pour research/teaching/equipment, il crée aussi les
sous-pages HTML correspondantes (et les supprime).

Lancement : double-clic sur l'exe, OU `python gestion_site.py`
============================================================
"""

import json
import os
import sys
import re
import tkinter as tk
from tkinter import ttk, messagebox


# ════════════════════════════════════════════════════════
#  LOCALISATION DU SITE
# ════════════════════════════════════════════════════════
def find_site_root():
    here = os.path.dirname(os.path.abspath(sys.argv[0]))
    candidates = [here, os.path.dirname(here), os.getcwd()]
    for base in candidates:
        if os.path.exists(os.path.join(base, "data", "equipment.json")):
            return base
    return os.path.dirname(here)

SITE_ROOT = find_site_root()
DATA_DIR = os.path.join(SITE_ROOT, "data")
INSTRUMENTS_DIR = os.path.join(SITE_ROOT, "instruments")
DOMAINS_DIR = os.path.join(SITE_ROOT, "domains")


# ════════════════════════════════════════════════════════
#  UTILITAIRES
# ════════════════════════════════════════════════════════
def slugify(name):
    s = name.strip().lower()
    s = re.sub(r"[^\w\s-]", "", s)
    s = re.sub(r"[\s_]+", "-", s)
    s = re.sub(r"-+", "-", s)
    return s.strip("-")


def load_json(filename):
    path = os.path.join(DATA_DIR, filename)
    if not os.path.exists(path):
        return []
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


def save_json(filename, data):
    os.makedirs(DATA_DIR, exist_ok=True)
    path = os.path.join(DATA_DIR, filename)
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)


# ── Stubs HTML ──
INSTRUMENT_STUB = '''<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>IECP — Instrument</title>
  <link rel="icon" href="../assets/logo IECP.svg" type="image/svg+xml">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="../css/base.css">
  <link rel="stylesheet" href="../css/navbar.css">
  <link rel="stylesheet" href="../css/footer.css">
  <link rel="stylesheet" href="../css/components.css">
  <link rel="stylesheet" href="../css/pages/subpages.css">
</head>
<body>
  <div id="navbar-placeholder"></div>
  <div id="instrument-detail" data-instrument-id="{id}"></div>
  <div id="footer-placeholder"></div>
  <script src="../js/components.js"></script>
  <script src="../js/equipment.js"></script>
</body>
</html>
'''

DOMAIN_STUB = '''<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>IECP — {label}</title>
  <link rel="icon" href="../assets/logo IECP.svg" type="image/svg+xml">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="../css/base.css">
  <link rel="stylesheet" href="../css/navbar.css">
  <link rel="stylesheet" href="../css/footer.css">
  <link rel="stylesheet" href="../css/components.css">
  <link rel="stylesheet" href="../css/pages/subpages.css">
  <link rel="stylesheet" href="../css/pages/domains.css">
</head>
<body>
  <div id="navbar-placeholder"></div>
  <div id="domain-detail" data-domain-kind="{kind}" data-domain-id="{id}"></div>
  <div id="footer-placeholder"></div>
  <script src="../js/components.js"></script>
  <script src="../js/domains.js"></script>
</body>
</html>
'''


def write_instrument_stub(item_id):
    os.makedirs(INSTRUMENTS_DIR, exist_ok=True)
    with open(os.path.join(INSTRUMENTS_DIR, f"{item_id}.html"), "w", encoding="utf-8") as f:
        f.write(INSTRUMENT_STUB.format(id=item_id))


def delete_instrument_stub(item_id):
    p = os.path.join(INSTRUMENTS_DIR, f"{item_id}.html")
    if os.path.exists(p):
        os.remove(p)


def write_domain_stub(kind, item_id, label):
    os.makedirs(DOMAINS_DIR, exist_ok=True)
    fname = f"{kind}-{item_id}.html"
    with open(os.path.join(DOMAINS_DIR, fname), "w", encoding="utf-8") as f:
        f.write(DOMAIN_STUB.format(kind=kind, id=item_id, label=label))


def delete_domain_stub(kind, item_id):
    p = os.path.join(DOMAINS_DIR, f"{kind}-{item_id}.html")
    if os.path.exists(p):
        os.remove(p)


# ════════════════════════════════════════════════════════
#  DÉFINITION DES CHAMPS PAR TYPE DE CONTENU
#  Chaque champ : (clé, libellé, type)
#  type ∈ {text, multi, status, list_lines, pairs_lines, figures_lines}
# ════════════════════════════════════════════════════════
EQUIPMENT_FIELDS = [
    ("name", "Nom (ex: Potentiostat 4)", "text"),
    ("desc", "Sous-titre / modèle", "text"),
    ("label", "Catégorie (Potentiostat, RDE...)", "text"),
    ("status", "Statut", "status"),
    ("image", "Image de fond (assets/xxx.png, optionnel)", "text"),
    ("tooltip", "Description courte (tuile)", "multi"),
    ("overview", "Présentation (texte long)", "multi"),
    ("usage", "Usage & accès", "multi"),
    ("link", "Lien documentation (URL ou #)", "text"),
    ("linkText", "Texte du lien", "text"),
    ("specs", "Spécifications (clé = valeur par ligne)", "pairs_lines"),
]

DOMAIN_FIELDS = [
    ("num", "Numéro (ex: 05)", "text"),
    ("shortTitle", "Titre simple (sans mise en forme)", "text"),
    ("title", "Titre affiché (peut contenir <em>...</em>)", "text"),
    ("image", "Image de fond (assets/xxx.png)", "text"),
    ("tileDesc", "Description sur la tuile", "multi"),
    ("overview", "Overview", "multi"),
    ("objectives", "Objectives / Course content", "multi"),
    ("techniques", "Techniques / Topics (un par ligne)", "list_lines"),
    ("equipment", "Équipements liés (Nom = lien par ligne)", "pairs_lines"),
    ("figures", "Figures (chemin = légende par ligne)", "pairs_lines"),
    ("results", "Results / Practical info", "multi"),
]

EVENT_FIELDS = [
    ("date", "Date (AAAA-MM-JJ)", "text"),
    ("type", "Type", "event_type"),
    ("title", "Titre", "text"),
    ("meta", "Sous-titre (lieu, revue...)", "text"),
    ("body", "Description", "multi"),
]

TEAM_FIELDS = [
    ("name", "Nom complet", "text"),
    ("role", "Fonction", "text"),
    ("email", "Email", "text"),
    ("photo", "Photo (assets/xxx.png, optionnel)", "text"),
]

STATUS_OPTIONS = ["available", "busy", "maintenance"]
EVENT_TYPES = ["seminar", "publication", "news", "equipment"]


# Config par type : fichier json, champs, clé d'affichage, gestion stubs
CONTENT_TYPES = {
    "Research domains": {
        "file": "research.json",
        "fields": DOMAIN_FIELDS,
        "display": lambda it: f"{it.get('num','')} — {it.get('shortTitle', it.get('id',''))}",
        "kind": "research",
        "stub": "domain",
    },
    "Teaching activities": {
        "file": "teaching.json",
        "fields": DOMAIN_FIELDS,
        "display": lambda it: f"{it.get('num','')} — {it.get('shortTitle', it.get('id',''))}",
        "kind": "teaching",
        "stub": "domain",
    },
    "Equipment": {
        "file": "equipment.json",
        "fields": EQUIPMENT_FIELDS,
        "display": lambda it: f"{it.get('name','')} — {it.get('desc','')} [{it.get('status','')}]",
        "kind": None,
        "stub": "instrument",
    },
    "Events / News": {
        "file": "events.json",
        "fields": EVENT_FIELDS,
        "display": lambda it: f"{it.get('date','')} — {it.get('title','')} [{it.get('type','')}]",
        "kind": None,
        "stub": None,
    },
    "Team members": {
        "file": "team.json",
        "fields": TEAM_FIELDS,
        "display": lambda it: f"{it.get('name','')} — {it.get('role','')}",
        "kind": None,
        "stub": None,
    },
}


# ════════════════════════════════════════════════════════
#  FORMULAIRE GÉNÉRIQUE
# ════════════════════════════════════════════════════════
class ContentForm(tk.Toplevel):
    def __init__(self, master, config, on_save, existing=None):
        super().__init__(master)
        self.config_def = config
        self.on_save = on_save
        self.existing = existing
        self.title("Modifier" if existing else "Ajouter")
        self.configure(padx=20, pady=16)
        self.resizable(False, True)
        self.widgets = {}

        e = existing or {}

        # Zone scrollable simple
        canvas = tk.Canvas(self, borderwidth=0, width=560, height=560, highlightthickness=0)
        frame = tk.Frame(canvas)
        vsb = tk.Scrollbar(self, orient="vertical", command=canvas.yview)
        canvas.configure(yscrollcommand=vsb.set)
        vsb.pack(side="right", fill="y")
        canvas.pack(side="left", fill="both", expand=True)
        canvas.create_window((0, 0), window=frame, anchor="nw")
        frame.bind("<Configure>", lambda ev: canvas.configure(scrollregion=canvas.bbox("all")))

        row = 0
        for key, label, ftype in config["fields"]:
            tk.Label(frame, text=label, anchor="w",
                     font=("Segoe UI", 9, "bold")).grid(row=row, column=0, sticky="w", pady=(8, 2))
            row += 1

            val = e.get(key, "")

            if ftype == "text":
                w = tk.Entry(frame, width=62, font=("Segoe UI", 9))
                w.insert(0, val if isinstance(val, str) else "")
                w.grid(row=row, column=0, sticky="we", pady=(0, 4))

            elif ftype == "multi":
                w = tk.Text(frame, width=62, height=3, wrap="word", font=("Segoe UI", 9))
                w.insert("1.0", val if isinstance(val, str) else "")
                w.grid(row=row, column=0, sticky="we", pady=(0, 4))

            elif ftype == "status":
                w = ttk.Combobox(frame, values=STATUS_OPTIONS, state="readonly", width=59)
                w.set(val or "available")
                w.grid(row=row, column=0, sticky="we", pady=(0, 4))

            elif ftype == "event_type":
                w = ttk.Combobox(frame, values=EVENT_TYPES, state="readonly", width=59)
                w.set(val or "news")
                w.grid(row=row, column=0, sticky="we", pady=(0, 4))

            elif ftype == "list_lines":
                w = tk.Text(frame, width=62, height=4, wrap="word", font=("Segoe UI", 9))
                if isinstance(val, list):
                    w.insert("1.0", "\n".join(val))
                w.grid(row=row, column=0, sticky="we", pady=(0, 4))

            elif ftype == "pairs_lines":
                w = tk.Text(frame, width=62, height=4, wrap="word", font=("Segoe UI", 9))
                if isinstance(val, list):
                    w.insert("1.0", "\n".join(f"{a} = {b}" for a, b in val))
                w.grid(row=row, column=0, sticky="we", pady=(0, 4))

            self.widgets[key] = (w, ftype)
            row += 1

        # Boutons
        btn_frame = tk.Frame(self)
        btn_frame.pack(side="bottom", fill="x", pady=(12, 0))
        tk.Button(btn_frame, text="Annuler", command=self.destroy, width=12).pack(side="right", padx=4)
        tk.Button(btn_frame, text="Enregistrer", command=self.save, width=14,
                  bg="#00b4a0", fg="white", font=("Segoe UI", 9, "bold")).pack(side="right")

    def collect(self):
        out = {}
        for key, (w, ftype) in self.widgets.items():
            if ftype in ("text", "status", "event_type"):
                out[key] = w.get().strip()
            elif ftype == "multi":
                out[key] = w.get("1.0", "end").strip()
            elif ftype == "list_lines":
                lines = [l.strip() for l in w.get("1.0", "end").strip().splitlines() if l.strip()]
                out[key] = lines
            elif ftype == "pairs_lines":
                pairs = []
                for l in w.get("1.0", "end").strip().splitlines():
                    l = l.strip()
                    if not l:
                        continue
                    if "=" in l:
                        a, b = l.split("=", 1)
                        pairs.append([a.strip(), b.strip()])
                    else:
                        pairs.append([l, ""])
                out[key] = pairs
        return out

    def save(self):
        data = self.collect()

        # Champ identifiant principal selon le type
        first_key = self.config_def["fields"][0][0]
        if not data.get(first_key) and not (self.config_def["fields"][0][0] == "num"):
            messagebox.showwarning("Champ manquant", "Le premier champ est obligatoire.")
            return

        # Calcule un id stable
        if self.existing:
            data["id"] = self.existing["id"]
        else:
            # base pour l'id : name, ou title/shortTitle, ou date+title
            base = data.get("name") or data.get("shortTitle") or data.get("title") or data.get("date", "item")
            data["id"] = slugify(base) or "item"

        self.on_save(data, is_new=(self.existing is None))
        self.destroy()


# ════════════════════════════════════════════════════════
#  ÉCRAN DE GESTION D'UN TYPE
# ════════════════════════════════════════════════════════
class ManagerFrame(tk.Frame):
    def __init__(self, master, type_name, on_back):
        super().__init__(master, padx=16, pady=16)
        self.type_name = type_name
        self.config_def = CONTENT_TYPES[type_name]
        self.on_back = on_back
        self.items = load_json(self.config_def["file"])

        # En-tête
        head = tk.Frame(self)
        head.pack(fill="x")
        tk.Button(head, text="← Menu", command=self.on_back, width=10).pack(side="left")
        tk.Label(head, text=f"  {type_name}", font=("Segoe UI", 13, "bold")).pack(side="left")

        tk.Label(self, text=f"Fichier : data/{self.config_def['file']}",
                 font=("Segoe UI", 7), fg="#888").pack(anchor="w", pady=(4, 10))

        # Liste
        list_frame = tk.Frame(self)
        list_frame.pack(fill="both", expand=True)
        sb = tk.Scrollbar(list_frame)
        sb.pack(side="right", fill="y")
        self.listbox = tk.Listbox(list_frame, font=("Segoe UI", 10),
                                  yscrollcommand=sb.set, height=12)
        self.listbox.pack(side="left", fill="both", expand=True)
        sb.config(command=self.listbox.yview)
        self.listbox.bind("<Double-Button-1>", lambda e: self.modify())

        # Boutons
        bf = tk.Frame(self)
        bf.pack(fill="x", pady=(12, 0))
        tk.Button(bf, text="+ Ajouter", command=self.add, width=14,
                  bg="#00b4a0", fg="white", font=("Segoe UI", 9, "bold")).pack(side="left", padx=2)
        tk.Button(bf, text="Modifier", command=self.modify, width=14).pack(side="left", padx=2)
        tk.Button(bf, text="Supprimer", command=self.delete, width=14,
                  bg="#c0392b", fg="white").pack(side="left", padx=2)

        self.refresh()

    def refresh(self):
        self.listbox.delete(0, "end")
        disp = self.config_def["display"]
        for it in self.items:
            self.listbox.insert("end", "  " + disp(it))

    def sel(self):
        s = self.listbox.curselection()
        return s[0] if s else None

    def add(self):
        ContentForm(self, self.config_def, self.on_save)

    def modify(self):
        i = self.sel()
        if i is None:
            messagebox.showinfo("Sélection", "Sélectionnez un élément.")
            return
        ContentForm(self, self.config_def,
                    lambda d, is_new: self.on_save(d, is_new, i),
                    existing=self.items[i])

    def delete(self):
        i = self.sel()
        if i is None:
            messagebox.showinfo("Sélection", "Sélectionnez un élément.")
            return
        it = self.items[i]
        name = self.config_def["display"](it)
        if not messagebox.askyesno("Confirmer", f"Supprimer définitivement :\n\n{name} ?"):
            return
        # Supprime le stub HTML associé
        stub = self.config_def["stub"]
        if stub == "instrument":
            delete_instrument_stub(it["id"])
        elif stub == "domain":
            delete_domain_stub(self.config_def["kind"], it["id"])
        self.items.pop(i)
        save_json(self.config_def["file"], self.items)
        self.refresh()

    def on_save(self, data, is_new, idx=None):
        if is_new:
            existing_ids = {x["id"] for x in self.items}
            base = data["id"]
            new_id = base
            n = 2
            while new_id in existing_ids:
                new_id = f"{base}-{n}"
                n += 1
            data["id"] = new_id
            self.items.append(data)
        else:
            self.items[idx] = data

        # Crée / met à jour le stub HTML
        stub = self.config_def["stub"]
        if stub == "instrument":
            write_instrument_stub(data["id"])
        elif stub == "domain":
            label = data.get("shortTitle", data["id"])
            write_domain_stub(self.config_def["kind"], data["id"], label)

        save_json(self.config_def["file"], self.items)
        self.refresh()


# ════════════════════════════════════════════════════════
#  MENU D'ACCUEIL
# ════════════════════════════════════════════════════════
class MenuFrame(tk.Frame):
    def __init__(self, master, on_choose):
        super().__init__(master, padx=24, pady=24)
        tk.Label(self, text="IECP — Gestion du contenu",
                 font=("Segoe UI", 15, "bold")).pack(pady=(0, 4))
        tk.Label(self, text="Que voulez-vous gérer ?",
                 font=("Segoe UI", 10), fg="#555").pack(pady=(0, 20))

        for name in CONTENT_TYPES:
            tk.Button(self, text=name, width=30, height=2,
                      font=("Segoe UI", 10),
                      command=lambda n=name: on_choose(n)).pack(pady=4)

        tk.Label(self, text=f"\nSite : {SITE_ROOT}",
                 font=("Segoe UI", 7), fg="#aaa").pack(side="bottom", pady=(20, 0))


# ════════════════════════════════════════════════════════
#  APPLICATION
# ════════════════════════════════════════════════════════
class App(tk.Tk):
    def __init__(self):
        super().__init__()
        self.title("IECP — Gestion du contenu")
        self.geometry("600x600")
        self.current = None
        self.show_menu()

    def clear(self):
        if self.current:
            self.current.destroy()
            self.current = None

    def show_menu(self):
        self.clear()
        self.current = MenuFrame(self, self.show_manager)
        self.current.pack(fill="both", expand=True)

    def show_manager(self, type_name):
        self.clear()
        self.current = ManagerFrame(self, type_name, self.show_menu)
        self.current.pack(fill="both", expand=True)


if __name__ == "__main__":
    if not os.path.isdir(DATA_DIR):
        root = tk.Tk(); root.withdraw()
        messagebox.showerror(
            "Dossier introuvable",
            f"Impossible de trouver le dossier :\n{DATA_DIR}\n\n"
            "Placez cet outil dans 'tool/' à la racine du site, à côté de 'data/'.")
        sys.exit(1)
    App().mainloop()
