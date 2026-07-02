#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
============================================================
 IECP — Gestion des réservations d'équipement
============================================================
Outil pour le gestionnaire de la plateforme.
Permet de VOIR les réservations, les CONFIRMER ou les REFUSER.

Il lit et écrit le fichier assets/bookings.csv.

Colonnes du CSV :
  instrument, date_start, start_time, duration, user,
  comment, channels, status[, end_date, end_time]

  status = pending | confirmed

Lancement : double-clic sur l'exe, OU `python gestion_reservations.py`
============================================================
"""

import csv
import os
import sys
import tkinter as tk
from tkinter import ttk, messagebox


# ════════════════════════════════════════════════════════
#  LOCALISATION DU FICHIER
# ════════════════════════════════════════════════════════
def find_site_root():
    here = os.path.dirname(os.path.abspath(sys.argv[0]))
    candidates = [here, os.path.dirname(here), os.getcwd()]
    for base in candidates:
        if os.path.exists(os.path.join(base, "assets", "bookings.csv")):
            return base
    return os.path.dirname(here)

SITE_ROOT = find_site_root()
CSV_FILE = os.path.join(SITE_ROOT, "assets", "bookings.csv")

# Colonnes attendues (on garde l'ordre du fichier d'origine)
BASE_COLUMNS = ["instrument", "date_start", "start_time", "duration",
                "user", "comment", "channels", "status"]
# Colonnes optionnelles (réservations multi-jours)
OPT_COLUMNS = ["end_date", "end_time"]


# ════════════════════════════════════════════════════════
#  LECTURE / ÉCRITURE CSV
# ════════════════════════════════════════════════════════
def load_bookings():
    if not os.path.exists(CSV_FILE):
        return [], list(BASE_COLUMNS)
    with open(CSV_FILE, "r", encoding="utf-8-sig", newline="") as f:
        reader = csv.DictReader(f)
        fieldnames = reader.fieldnames or list(BASE_COLUMNS)
        rows = []
        for r in reader:
            # statut par défaut = confirmed si absent
            if not r.get("status"):
                r["status"] = "confirmed"
            rows.append(r)
    return rows, fieldnames


def save_bookings(rows, fieldnames):
    # garantit que toutes les colonnes de base existent
    cols = list(fieldnames)
    for c in BASE_COLUMNS:
        if c not in cols:
            cols.append(c)
    with open(CSV_FILE, "w", encoding="utf-8", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=cols, extrasaction="ignore")
        writer.writeheader()
        for r in rows:
            writer.writerow(r)


# ════════════════════════════════════════════════════════
#  APPLICATION
# ════════════════════════════════════════════════════════
class App(tk.Tk):
    def __init__(self):
        super().__init__()
        self.title("IECP — Gestion des réservations")
        self.geometry("860x560")
        self.configure(padx=16, pady=16)

        self.rows = []
        self.fieldnames = list(BASE_COLUMNS)
        self.filter_mode = tk.StringVar(value="pending")

        # ── En-tête ──
        tk.Label(self, text="Réservations d'équipement",
                 font=("Segoe UI", 14, "bold")).pack(anchor="w")
        tk.Label(self, text=f"Fichier : {CSV_FILE}",
                 font=("Segoe UI", 7), fg="#888").pack(anchor="w", pady=(2, 8))

        # ── Résumé ──
        self.summary = tk.Label(self, text="", font=("Segoe UI", 10),
                                fg="#333", justify="left")
        self.summary.pack(anchor="w", pady=(0, 10))

        # ── Filtres ──
        filter_frame = tk.Frame(self)
        filter_frame.pack(fill="x", pady=(0, 8))
        tk.Label(filter_frame, text="Afficher : ", font=("Segoe UI", 9)).pack(side="left")
        for label, val in [("En attente", "pending"), ("Confirmées", "confirmed"), ("Toutes", "all")]:
            tk.Radiobutton(filter_frame, text=label, variable=self.filter_mode,
                           value=val, command=self.refresh,
                           font=("Segoe UI", 9)).pack(side="left", padx=4)
        tk.Button(filter_frame, text="↻ Recharger", command=self.reload,
                  font=("Segoe UI", 9)).pack(side="right")

        # ── Tableau (Treeview) ──
        table_frame = tk.Frame(self)
        table_frame.pack(fill="both", expand=True)

        cols = ("status", "instrument", "date", "time", "duration", "channels", "user", "comment")
        self.tree = ttk.Treeview(table_frame, columns=cols, show="headings", height=14)
        headings = {
            "status": ("Statut", 90),
            "instrument": ("Équipement", 120),
            "date": ("Date", 90),
            "time": ("Heure", 60),
            "duration": ("Durée", 55),
            "channels": ("Voies", 50),
            "user": ("Utilisateur", 120),
            "comment": ("Commentaire", 200),
        }
        for c in cols:
            text, width = headings[c]
            self.tree.heading(c, text=text)
            self.tree.column(c, width=width, anchor="w")

        # couleurs selon statut
        self.tree.tag_configure("pending", background="#fdf6e3")
        self.tree.tag_configure("confirmed", background="#eafaf5")

        vsb = ttk.Scrollbar(table_frame, orient="vertical", command=self.tree.yview)
        self.tree.configure(yscrollcommand=vsb.set)
        vsb.pack(side="right", fill="y")
        self.tree.pack(side="left", fill="both", expand=True)

        # ── Boutons d'action ──
        action_frame = tk.Frame(self)
        action_frame.pack(fill="x", pady=(12, 0))
        tk.Button(action_frame, text="✓ Confirmer", command=self.confirm_selected,
                  width=16, bg="#00b4a0", fg="white",
                  font=("Segoe UI", 9, "bold")).pack(side="left", padx=2)
        tk.Button(action_frame, text="✗ Refuser (supprimer)", command=self.reject_selected,
                  width=20, bg="#c0392b", fg="white",
                  font=("Segoe UI", 9)).pack(side="left", padx=2)
        tk.Label(action_frame, text="  (sélectionnez une ou plusieurs lignes)",
                 font=("Segoe UI", 8), fg="#888").pack(side="left")

        self.reload()

    # ── Données ──
    def reload(self):
        self.rows, self.fieldnames = load_bookings()
        self.refresh()

    def refresh(self):
        # Résumé
        n_pending = sum(1 for r in self.rows if r.get("status") == "pending")
        n_confirmed = sum(1 for r in self.rows if r.get("status") == "confirmed")
        self.summary.config(
            text=f"📋  {n_pending} en attente    •    ✓ {n_confirmed} confirmées    •    "
                 f"total : {len(self.rows)}")

        # Vide le tableau
        for item in self.tree.get_children():
            self.tree.delete(item)

        # Remplit selon le filtre
        mode = self.filter_mode.get()
        for idx, r in enumerate(self.rows):
            status = r.get("status", "confirmed")
            if mode != "all" and status != mode:
                continue
            status_label = "⏳ En attente" if status == "pending" else "✓ Confirmée"
            self.tree.insert(
                "", "end", iid=str(idx),
                values=(
                    status_label,
                    r.get("instrument", ""),
                    r.get("date_start", ""),
                    r.get("start_time", ""),
                    r.get("duration", ""),
                    r.get("channels", "1"),
                    r.get("user", ""),
                    r.get("comment", ""),
                ),
                tags=(status,),
            )

    def selected_indices(self):
        return [int(iid) for iid in self.tree.selection()]

    def confirm_selected(self):
        idxs = self.selected_indices()
        if not idxs:
            messagebox.showinfo("Sélection", "Sélectionnez au moins une réservation.")
            return
        count = 0
        for i in idxs:
            if self.rows[i].get("status") != "confirmed":
                self.rows[i]["status"] = "confirmed"
                count += 1
        save_bookings(self.rows, self.fieldnames)
        self.refresh()
        messagebox.showinfo("Confirmé", f"{count} réservation(s) confirmée(s).")

    def reject_selected(self):
        idxs = self.selected_indices()
        if not idxs:
            messagebox.showinfo("Sélection", "Sélectionnez au moins une réservation.")
            return
        names = "\n".join(
            f"  • {self.rows[i].get('instrument')} — {self.rows[i].get('date_start')} "
            f"{self.rows[i].get('start_time')} ({self.rows[i].get('user')})"
            for i in idxs
        )
        if not messagebox.askyesno(
            "Confirmer le refus",
            f"Supprimer définitivement {len(idxs)} réservation(s) ?\n\n{names}"):
            return
        # supprime en partant de la fin pour ne pas décaler les index
        for i in sorted(idxs, reverse=True):
            self.rows.pop(i)
        save_bookings(self.rows, self.fieldnames)
        self.refresh()


if __name__ == "__main__":
    if not os.path.exists(CSV_FILE):
        root = tk.Tk(); root.withdraw()
        messagebox.showerror(
            "Fichier introuvable",
            f"Impossible de trouver :\n{CSV_FILE}\n\n"
            "Placez cet outil dans 'tool/' à la racine du site, "
            "à côté du dossier 'assets/'.")
        sys.exit(1)
    App().mainloop()
