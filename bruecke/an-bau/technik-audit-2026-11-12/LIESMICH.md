# Technik-Audit 12.11.2026 – Prüfskripte

Hilfsskripte der sechs Prüfer vom 12.11.2026 (Stand main dbc96c2). Die Berichte selbst liegen im Projekt:
„GastroCash Technik-Audit Rohberichte 12.11.2026“ und „GastroCash Technik-Bilanz und Masterprompt Lauf 6 12.11.2026“.

- `P1_rechenkern/` – Zufallstests für Geld, Zeit und doppelte Logik.
- `P2_daten/` – Rundreise, Zwei-Handy-Abgleich, Service-Worker-Update, Mengentest.
- `P4_architektur/` – `mut.json` (20 Mutationen) mit `runmut.mjs`, `dead.mjs` (tote Exporte), `graph.mjs` (Importkreise), `perf.py` (Startmessung), `css.mjs`, `srcregex.mjs`.
- `P6_chaos/` – Monkey-Test, Unterbrechungen, Uhrsprünge, Layout 360 px.

Die Skripte der Sicherheitsprüfung liegen bewusst nicht hier (öffentliches Repo).
Die Skripte sind Arbeitsstände: Pfade und Ports stehen fest drin und müssen angepasst werden. Dieser Ordner wird am Ende von Lauf 6 wieder entfernt.
