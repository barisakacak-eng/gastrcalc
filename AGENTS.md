# Arbeitsanweisung für KI-Agenten

Diese Datei lesen Coding-Agenten automatisch. Sie gilt für jeden Auftrag in diesem Repo.

## Was GastroCalc ist
Handy-Web-App (PWA, Vanilla JS, kein Bauschritt) für kleine Imbisse: Döner, Pizza, Asia, Foodtruck, 1–15 Mitarbeiter.
Nutzer: Inhaber ohne BWL-Wissen, wenig Zeit, oft mit Sprachbarriere. Live: https://barisakacak-eng.github.io/gastrcalc/

## Erste Sorgfaltspflicht: das Schweizer Uhrwerk
Innen darf es komplex sein, nach außen zeigt die App nur „die Uhrzeit“: eine Zahl, ein kurzer Satz, eine Haupthandlung.
Im Laden höchstens 15 Wörter je Bildschirm. Alles für Amt, Steuerberater, Buchhalter, Einrichtung und Erklärung gehört ins Büro.
Jede Änderung muss die App einfacher machen, nicht voller. Im Zweifel weglassen.

## Wer entscheidet
- Baris ist der Eigentümer. KI-Trio seit 19.10.2026: Zoro (Claude) führt das Projekt, schreibt den App-Code und entscheidet; Sanji (ChatGPT) macht Design, Bilder, Präsentationen und Texte; Franky (Gemini) macht Google-Werkstatt, Recherche und Gegenprüfung.
- Code in diesem Repo schreibt Zoro. Andere liefern Vorschläge nur auf eigenem Branch als Pull Request, nie direkt auf `main`, nie mergen.
- Übergaben als Block, der mit „FÜR ZORO:“, „FÜR SANJI:“ oder „FÜR FRANKY:“ beginnt: 1. was fertig ist, 2. echter Link oder Datei, 3. konkrete Aufgabe.
- Keine neuen Funktionen ohne ausdrücklichen Auftrag. Keine Änderung an Rechenregeln (js/*.js) ohne Auftrag.

## Aufbau
- `js/*.js` = Rechenwerk, rein (keine DOM-Zugriffe). `js/screens/*.js` = nur Anzeige. `tests/trennung.test.mjs` prüft das.
- Texte nur über `js/i18n.js` und `js/lang/*.js`, nie fest im Bildschirm-Code. Deutsch ist führend.
- Farben und Maße nur aus `css/tokens.css` (Zielbild „Kräuter & Kupfer“).
- Neue oder geänderte Dateien: danach `python3 tools/sw_liste.py` laufen lassen (erzeugt `sw.js` und `js/fassung.js`). `sw.js` nie von Hand ändern.

## Prüfen vor dem Pull Request
```
python3 tools/sw_liste.py
TZ=UTC node --test tests/*.mjs
TZ=Europe/Berlin node --test tests/*.mjs
node tools/sprachpruefung.mjs
```
Browser-Prüfungen (brauchen Playwright + Chromium): `python3 tests/regeln.py` und `python3 tests/durchlauf_personal.py`.
Die GitHub-Prüfung läuft bei jedem Pull Request automatisch mit. Rot = nicht fertig.

## Harte Regeln
- Keine erfundenen Zahlen, Grenzwerte, Paragraphen oder Steuerregeln. Jede Zahl mit Quelle und Datum, Schätzungen mit „≈“.
- Dieses Repo ist öffentlich: keine Zugangsdaten, Tokens, Kundendaten, Partner- oder Gesprächsnamen, Pitch-Inhalte, Ladenfotos.
- Verbotene Wörter: revolutionär, disruptiv, Marktführer, GoBD-konform, betriebsprüfungsfest, steuersicher, rechtssicher.
- Einfache Sprache in Texten und Commit-Nachrichten (Deutsch).
